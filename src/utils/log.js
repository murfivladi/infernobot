const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../db');
const { t } = require('./locale');

async function sendLog(guild, { action, userId, moderatorId, reason, duration }) {
  try {
    const settings = await getSettings(guild.id);
    if (!settings.log_channel) return;

    const channel = await guild.channels.fetch(settings.log_channel).catch(() => null);
    if (!channel?.isTextBased()) return;

    const locale = settings.locale || 'ru';

    const ACTION_COLORS = {
      kick: 0xFFA500, ban: 0xED4245, unban: 0x57F287,
      mute: 0xFF6B6B, unmute: 0x57F287, warn: 0xFEE75C, remwarn: 0x949BA4,
    };

    const embed = new EmbedBuilder()
      .setTitle(`🔨 ${action.toUpperCase()}`)
      .setColor(ACTION_COLORS[action] ?? 0x5865F2)
      .addFields(
        { name: t('LOG_USER', locale),      value: `<@${userId}>`,          inline: true },
        { name: t('LOG_MODERATOR', locale), value: `<@${moderatorId}>`,     inline: true },
        { name: t('LOG_REASON', locale),    value: reason || '—',           inline: false },
      )
      .setTimestamp()
      .setFooter({ text: '🔥 InfernoBot • Log' });

    if (duration) embed.addFields({ name: t('LOG_DURATION', locale), value: duration, inline: true });

    await channel.send({ embeds: [embed] });
  } catch (_) {}
}

module.exports = { sendLog };
