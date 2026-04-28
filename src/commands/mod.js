const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, getSettings } = require('../db');
const { getMutedRole, parseDuration } = require('../modUtils');
const { hasPermission } = require('../utils/perms');
const { t } = require('../utils/locale');
const { sendLog } = require('../utils/log');
const bus = require('../utils/events');

const PERM_MAP = {
  kick: 'kick', ban: 'ban', unban: 'ban',
  mute: 'mute', unmute: 'unmute', warn: 'warn', remwarn: 'remwarn',
};

function successEmbed(action, userId, moderatorId, description, locale, client) {
  const TITLES = {
    kick: 'MOD_KICK_TITLE', ban: 'MOD_BAN_TITLE', unban: 'MOD_UNBAN_TITLE',
    mute: 'MOD_MUTE_TITLE', unmute: 'MOD_UNMUTE_TITLE',
    warn: 'MOD_WARN_TITLE', remwarn: 'MOD_REMWARN_TITLE',
  };
  return new EmbedBuilder()
    .setTitle(`✅ ${t(TITLES[action] || action, locale)}`)
    .setDescription(description)
    .setColor(0x57F287)
    .addFields(
      { name: t('LABEL_USER', locale), value: `<@${userId}>`, inline: true },
      { name: t('LABEL_MODERATOR', locale), value: `<@${moderatorId}>`, inline: true },
    )
    .setFooter({ text: '🔥 InfernoBot', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

function errorEmbed(title, description, client) {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(0xED4245)
    .setFooter({ text: '🔥 InfernoBot', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('🛡️ Moderation Actions')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s => s.setName('kick').setDescription('👢 Kick user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('ban').setDescription('🔨 Ban user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 2h, 7d)')))
    .addSubcommand(s => s.setName('unban').setDescription('🔓 Unban user')
      .addStringOption(o => o.setName('user_id').setDescription('User ID').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('mute').setDescription('🔇 Mute user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 2h, 7d)')))
    .addSubcommand(s => s.setName('unmute').setDescription('🔊 Unmute user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('warn').setDescription('⚠️ Warn user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('remwarn').setDescription('🗑️ Remove last warning')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = await getSettings(interaction.guildId);
    const locale = settings.locale || 'ru';
    const guild = interaction.guild;
    const moderatorId = interaction.user.id;
    const reason = interaction.options.getString('reason') || null;
    const durationRaw = interaction.options.getString('duration') || null;
    const durationMs = parseDuration(durationRaw);

    await interaction.deferReply({ flags: 64 });

    // Permission check
    const requiredPerm = PERM_MAP[sub];
    if (requiredPerm && !await hasPermission(guild, moderatorId, requiredPerm)) {
      return interaction.editReply({ embeds: [errorEmbed(t('MOD_NO_PERMISSION', locale), t('MOD_NO_PERMISSION_DESC', locale), interaction.client)] });
    }

    const user = sub === 'unban' ? null : interaction.options.getUser('user');
    const userId = sub === 'unban' ? interaction.options.getString('user_id') : user?.id;

    if (!userId) {
      return interaction.editReply({ embeds: [errorEmbed(t('MOD_ERROR', locale), t('MOD_USER_NOT_FOUND', locale), interaction.client)] });
    }

    const notSpec = t('MOD_NOT_SPECIFIED', locale);
    const durLabel = t('DURATION', locale);
    const permLabel = t('PERMANENT', locale);
    const durText = durationMs ? ` (${durLabel}: ${durationRaw})` : ` (${permLabel})`;

    const emitAction = (action, extra = {}) => {
      bus.emit('mod:action', { guild, action, userId, moderatorId, reason, duration: durationRaw, ...extra });
    };

    try {
      if (sub === 'kick') {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) throw new Error(t('MOD_USER_NOT_FOUND', locale));
        await member.kick(reason ?? undefined);
        await db.addKick(guild.id, userId, moderatorId, reason);
        await db.logAction(guild.id, userId, moderatorId, 'kick', reason);
        await sendLog(guild, { action: 'kick', userId, moderatorId, reason });
        emitAction('kick');
        const msg = `👢 <@${userId}> ${t('MOD_KICKED', locale)}\n\n**${t('REASON', locale)}:** ${reason || notSpec}`;
        return interaction.editReply({ embeds: [successEmbed('kick', userId, moderatorId, msg, locale, interaction.client)] });
      }

      if (sub === 'ban') {
        await guild.members.ban(userId, { reason: reason ?? undefined });
        await db.addBan(guild.id, userId, moderatorId, reason);
        await db.logAction(guild.id, userId, moderatorId, 'ban', reason);
        await sendLog(guild, { action: 'ban', userId, moderatorId, reason, duration: durationRaw });
        emitAction('ban');
        // Persistent scheduled unban
        if (durationMs) {
          const executeAt = new Date(Date.now() + durationMs);
          await db.addScheduledAction(guild.id, userId, 'unban', executeAt);
        }
        const msg = `🔨 <@${userId}> ${t('MOD_BANNED', locale)}${durText}\n\n**${t('REASON', locale)}:** ${reason || notSpec}`;
        return interaction.editReply({ embeds: [successEmbed('ban', userId, moderatorId, msg, locale, interaction.client)] });
      }

      if (sub === 'unban') {
        await guild.members.unban(userId, reason ?? undefined);
        await db.logAction(guild.id, userId, moderatorId, 'unban', reason);
        await sendLog(guild, { action: 'unban', userId, moderatorId, reason });
        emitAction('unban');
        const msg = `🔓 \`${userId}\` ${t('MOD_UNBANNED', locale)}\n\n**${t('REASON', locale)}:** ${reason || notSpec}`;
        return interaction.editReply({ embeds: [successEmbed('unban', userId, moderatorId, msg, locale, interaction.client)] });
      }

      if (sub === 'mute') {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) throw new Error(t('MOD_USER_NOT_FOUND', locale));
        const timeoutMs = durationMs || 28 * 24 * 60 * 60 * 1000;
        await member.timeout(timeoutMs, reason ?? undefined).catch(e => console.error('[TIMEOUT]', e.message));
        const mutedRole = await getMutedRole(guild);
        await member.roles.add(mutedRole, reason ?? undefined).catch(() => {});
        await db.addMute(guild.id, userId, moderatorId, reason, durationMs);
        await db.logAction(guild.id, userId, moderatorId, 'mute', reason);
        await sendLog(guild, { action: 'mute', userId, moderatorId, reason, duration: durationRaw });
        emitAction('mute');
        // Persistent scheduled unmute
        if (durationMs) {
          const executeAt = new Date(Date.now() + durationMs);
          await db.addScheduledAction(guild.id, userId, 'unmute', executeAt);
        }
        const msg = `🔇 <@${userId}> ${t('MOD_MUTED', locale)}${durText}\n\n**${t('REASON', locale)}:** ${reason || notSpec}`;
        return interaction.editReply({ embeds: [successEmbed('mute', userId, moderatorId, msg, locale, interaction.client)] });
      }

      if (sub === 'unmute') {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) throw new Error(t('MOD_USER_NOT_FOUND', locale));
        if (member.moderatable) await member.timeout(null, reason ?? undefined).catch(() => {});
        const mutedRole = guild.roles.cache.find(r => r.name === 'Muted');
        if (mutedRole) await member.roles.remove(mutedRole).catch(() => {});
        await db.logAction(guild.id, userId, moderatorId, 'unmute', reason);
        await sendLog(guild, { action: 'unmute', userId, moderatorId, reason });
        emitAction('unmute');
        const msg = `🔊 <@${userId}> ${t('MOD_UNMUTED', locale)}\n\n**${t('REASON', locale)}:** ${reason || notSpec}`;
        return interaction.editReply({ embeds: [successEmbed('unmute', userId, moderatorId, msg, locale, interaction.client)] });
      }

      if (sub === 'warn') {
        await db.addWarning(guild.id, userId, moderatorId, reason);
        await db.logAction(guild.id, userId, moderatorId, 'warn', reason);
        await sendLog(guild, { action: 'warn', userId, moderatorId, reason });
        emitAction('warn');
        const msg = `⚠️ <@${userId}> ${t('MOD_WARNED', locale)}\n\n**${t('REASON', locale)}:** ${reason || notSpec}`;
        return interaction.editReply({ embeds: [successEmbed('warn', userId, moderatorId, msg, locale, interaction.client)] });
      }

      if (sub === 'remwarn') {
        await db.removeLastWarning(guild.id, userId);
        await db.logAction(guild.id, userId, moderatorId, 'remwarn', reason);
        emitAction('remwarn');
        const msg = `🗑️ ${t('MOD_REMWARN', locale)} <@${userId}> ${t('MOD_REMOVED', locale)}\n\n**${t('REASON', locale)}:** ${reason || notSpec}`;
        return interaction.editReply({ embeds: [successEmbed('remwarn', userId, moderatorId, msg, locale, interaction.client)] });
      }

    } catch (err) {
      console.error('[mod]', err);
      return interaction.editReply({ embeds: [errorEmbed(t('MOD_ERROR', locale), `${t('MOD_ERROR_DESC', locale)}: ${err.message}`, interaction.client)] });
    }
  },
};
