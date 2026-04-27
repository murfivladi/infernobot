async function getMutedRole(guild) {
  let role = guild.roles.cache.find(r => r.name === 'Muted');
  if (!role) {
    role = await guild.roles.create({ name: 'Muted', color: 0x808080, permissions: 0n, reason: 'Auto-created by bot' });
    for (const [, channel] of guild.channels.cache) {
      await channel.permissionOverwrites.create(role, {
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

function parseDuration(str) {
  if (!str) return null;
  const match = str.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1]) * mult[match[2].toLowerCase()];
}

module.exports = { getMutedRole, parseDuration };
