const { db } = require('../db');
const { getMutedRole } = require('../modUtils');

const INTERVAL_MS = 60_000; // check every minute

/**
 * Start the persistent scheduler.
 * On startup it processes any overdue actions from the DB,
 * then polls every minute for new ones.
 * @param {import('discord.js').Client} client
 */
function startScheduler(client) {
  const run = async () => {
    try {
      const { rows } = await db.getPendingScheduledActions();
      const now = Date.now();
      for (const row of rows) {
        const executeAt = new Date(row.execute_at).getTime();
        if (executeAt > now) continue; // not yet due
        await processAction(client, row);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err.message);
    }
  };

  run(); // immediate pass on startup
  setInterval(run, INTERVAL_MS);
}

async function processAction(client, row) {
  try {
    const guild = await client.guilds.fetch(row.guild_id).catch(() => null);
    if (!guild) return;

    if (row.action === 'unban') {
      await guild.members.unban(row.user_id, 'Temporary ban expired').catch(() => {});
    } else if (row.action === 'unmute') {
      const member = await guild.members.fetch(row.user_id).catch(() => null);
      if (member) {
        await member.timeout(null, 'Temporary mute expired').catch(() => {});
        const mutedRole = await getMutedRole(guild).catch(() => null);
        if (mutedRole) await member.roles.remove(mutedRole).catch(() => {});
      }
    }

    await db.markScheduledDone(row.id);
    console.log(`[Scheduler] Executed ${row.action} for user ${row.user_id} in guild ${row.guild_id}`);
  } catch (err) {
    console.error(`[Scheduler] Failed to process action ${row.id}:`, err.message);
  }
}

module.exports = { startScheduler };
