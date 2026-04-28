const { getSettings } = require('./db');

/**
 * Get (or create) the muted role for a guild.
 * Prefers the role_id stored in guild_settings.mute_role.
 * Falls back to finding/creating a role named "Muted".
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<import('discord.js').Role>}
 */
async function getMutedRole(guild) {
  // 1. Try role from settings
  const settings = await getSettings(guild.id);
  if (settings.mute_role) {
    const saved = guild.roles.cache.get(settings.mute_role)
      ?? await guild.roles.fetch(settings.mute_role).catch(() => null);
    if (saved) return saved;
  }

  // 2. Find by name
  let role = guild.roles.cache.find(r => r.name === 'Muted');

  // 3. Create if missing
  if (!role) {
    role = await guild.roles.create({
      name: 'Muted',
      color: 0x808080,
      permissions: 0n,
      reason: 'Auto-created by InfernoBot',
    });
    // Apply channel overrides (rate-limit safe: fire-and-forget per channel)
    for (const [, channel] of guild.channels.cache) {
      channel.permissionOverwrites.create(role, {
        SendMessages: false,
        SendMessagesInThreads: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        AddReactions: false,
        Speak: false,
        Stream: false,
        Connect: false,
        UseApplicationCommands: false,
      }).catch(() => {});
    }
  }

  return role;
}

/**
 * Parse a duration string like "10m", "2h", "7d", "30s".
 * Returns milliseconds, or null if invalid/zero/negative.
 * @param {string|null} str
 * @returns {number|null}
 */
function parseDuration(str) {
  if (!str) return null;
  const match = str.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const ms = parseInt(match[1], 10) * mult[match[2].toLowerCase()];
  return ms > 0 ? ms : null;
}

module.exports = { getMutedRole, parseDuration };
