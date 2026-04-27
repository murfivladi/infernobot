/**
 * 🔥 INFERNO BOT - Moderation Commands
 * Professional moderation commands with modern UI and localization
 */

const { 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');
const { db, pool, getSettings } = require('../db');
const fs = require('fs');
const path = require('path');
const { getMutedRole, parseDuration } = require('../modUtils');

// Load locales
const locales = {};
const localesPath = path.join(__dirname, '../locales');
fs.readdirSync(localesPath).forEach(file => {
  if (file.endsWith('.json')) locales[file.split('.')[0]] = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
});

// Translation helper
function t(key, locale, vars) {
  locale = locale || 'ru';
  vars = vars || {};
  let str = locales[locale]?.[key] || locales['ru']?.[key] || key;
  for (var k in vars) str = str.split('{' + k + '}').join(vars[k]);
  return str;
}

// Permission mapping
const PERM_MAP = {
  kick: 'kick', ban: 'ban', unban: 'ban',
  mute: 'mute', unmute: 'unmute', warn: 'warn', remwarn: 'remwarn',
};

// Check role permission
async function hasRolePermission(guild, userId, permissionKey) {
  const member = await guild.members.fetch({ user: userId, force: true }).catch(function() { return null; });
  if (!member) return false;
  // Discord admins bypass bot permission system
  if (member.permissions.has('Administrator') || member.permissions.has('ManageGuild')) return true;
  const userRoleIds = member.roles.cache.map(function(r) { return r.id; });
  for (var i = 0; i < userRoleIds.length; i++) {
    var roleId = userRoleIds[i];
    var result = await db.getRolePermissions(guild.id, roleId);
    var rows = result.rows || result;
    if (rows.length > 0 && rows[0].permissions && rows[0].permissions[permissionKey] === true) return true;
  }
  return false;
}

// Create success embed
function createSuccessEmbed(action, userId, moderatorId, description, locale, client) {
  var titles = {
    kick: t('MOD_KICK_TITLE', locale), ban: t('MOD_BAN_TITLE', locale),
    unban: t('MOD_UNBAN_TITLE', locale), mute: t('MOD_MUTE_TITLE', locale),
    unmute: t('MOD_UNMUTE_TITLE', locale), warn: t('MOD_WARN_TITLE', locale),
    remwarn: t('MOD_REMWARN_TITLE', locale),
  };
  return new EmbedBuilder()
    .setTitle('✅ ' + (titles[action] || action))
    .setDescription(description)
    .setColor(0x57F287)
    .addFields(
      { name: t('LABEL_USER', locale), value: '<@' + userId + '>', inline: true },
      { name: t('LABEL_MODERATOR', locale), value: '<@' + moderatorId + '>', inline: true },
      { name: t('LABEL_DATE', locale), value: new Date().toLocaleString(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'it-IT'), inline: true }
    )
    .setFooter({ text: '🔥 InfernoBot', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

// Create error embed
function createErrorEmbed(title, description, locale, client) {
  return new EmbedBuilder()
    .setTitle('❌ ' + title)
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
    .addSubcommand(function(s) { return s.setName('kick').setDescription('👢 Kick user')
      .addUserOption(function(o) { return o.setName('user').setDescription('User').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason'); }); })
    .addSubcommand(function(s) { return s.setName('ban').setDescription('🔨 Ban user')
      .addUserOption(function(o) { return o.setName('user').setDescription('User').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason'); })
      .addStringOption(function(o) { return o.setName('duration').setDescription('Duration (e.g. 10m, 2h, 7d)'); }); })
    .addSubcommand(function(s) { return s.setName('unban').setDescription('🔓 Unban user')
      .addStringOption(function(o) { return o.setName('user_id').setDescription('User ID').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason'); }); })
    .addSubcommand(function(s) { return s.setName('mute').setDescription('🔇 Mute user')
      .addUserOption(function(o) { return o.setName('user').setDescription('User').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason'); })
      .addStringOption(function(o) { return o.setName('duration').setDescription('Duration (e.g. 10m, 2h, 7d)'); }); })
    .addSubcommand(function(s) { return s.setName('unmute').setDescription('🔊 Unmute user')
      .addUserOption(function(o) { return o.setName('user').setDescription('User').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason'); }); })
    .addSubcommand(function(s) { return s.setName('warn').setDescription('⚠️ Warn user')
      .addUserOption(function(o) { return o.setName('user').setDescription('User').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason'); }); })
    .addSubcommand(function(s) { return s.setName('remwarn').setDescription('🗑️ Remove last warning')
      .addUserOption(function(o) { return o.setName('user').setDescription('User').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason'); }); }),

  async execute(interaction) {
    var sub = interaction.options.getSubcommand();
    var settings = await getSettings(interaction.guildId);
    var locale = settings && settings.locale || 'ru';
    var guild = interaction.guild;
    var moderatorId = interaction.user.id;
    var reason = interaction.options.getString('reason') || interaction.options.getString('motivo') || interaction.options.data[0]?.options?.find(o => o.name === 'reason' || o.name === 'motivo')?.value || null;
    var durationRaw = interaction.options.getString('duration') || interaction.options.getString('durata') || interaction.options.data[0]?.options?.find(o => o.name === 'duration' || o.name === 'durata')?.value || null;
    var durationMs = parseDuration(durationRaw);
    await interaction.deferReply({ flags: 64 });

    var user = sub === 'unban' ? null : (interaction.options.getUser('user') || interaction.options.getUser('utente') || interaction.options.data[0]?.options?.find(o => o.type === 6)?.user || null);
    if (!user && sub !== 'unban') {
      var embed = createErrorEmbed(t('MOD_ERROR', locale), t('MOD_USER_NOT_FOUND', locale), locale, interaction.client);
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    var userId = sub === 'unban' ? interaction.options.getString('user_id') : user.id;

    var requiredPerm = PERM_MAP[sub];
    if (requiredPerm) {
      var hasPerm = await hasRolePermission(guild, moderatorId, requiredPerm);
      if (!hasPerm) {
        var embed = createErrorEmbed(t('MOD_NO_PERMISSION', locale), t('MOD_NO_PERMISSION_DESC', locale), locale, interaction.client);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    }

    var notSpecified = t('MOD_NOT_SPECIFIED', locale);
    var durationLabel = t('DURATION', locale);
    var permanentLabel = t('PERMANENT', locale);
    var reasonLabel = t('REASON', locale);

    try {
      if (sub === 'kick') {
        var member = interaction.options.getMember('user') || interaction.options.getMember('utente') || await guild.members.fetch({ user: userId, force: true }).catch(function() { return null; });
        if (!member) throw new Error(t('MOD_USER_NOT_FOUND', locale));
        await member.kick(reason || undefined);
        await db.addKick(guild.id, userId, moderatorId, reason);
        await db.logAction(guild.id, userId, moderatorId, 'kick', reason);
        var msg = '👢 <@' + userId + '> ' + t('MOD_KICKED', locale) + '\n\n**' + reasonLabel + ':** ' + (reason || notSpecified);
        await interaction.editReply({ embeds: [createSuccessEmbed('kick', userId, moderatorId, msg, locale, interaction.client)] });

      } else if (sub === 'ban') {
        await guild.members.ban(userId, { reason: reason || undefined });
        await db.addBan(guild.id, userId, moderatorId, reason);
        await db.logAction(guild.id, userId, moderatorId, 'ban', reason);
        var durText = durationMs ? ' (' + durationLabel + ': ' + durationRaw + ')' : ' (' + permanentLabel + ')';
        var msg = '🔨 <@' + userId + '> ' + t('MOD_BANNED', locale) + durText + '\n\n**' + reasonLabel + ':** ' + (reason || notSpecified);
        await interaction.editReply({ embeds: [createSuccessEmbed('ban', userId, moderatorId, msg, locale, interaction.client)] });
        if (durationMs) setTimeout(function() { guild.members.unban(userId).catch(function() {}); }, durationMs);

      } else if (sub === 'unban') {
        await guild.members.unban(userId, reason || undefined);
        await db.logAction(guild.id, userId, moderatorId, 'unban', reason);
        var msg = '🔓 `' + userId + '` ' + t('MOD_UNBANNED', locale) + '\n\n**' + reasonLabel + ':** ' + (reason || notSpecified);
        await interaction.editReply({ embeds: [createSuccessEmbed('unban', userId, moderatorId, msg, locale, interaction.client)] });

      } else if (sub === 'mute') {
        var m = interaction.options.getMember('user') || interaction.options.getMember('utente') || await guild.members.fetch({ user: userId, force: true }).catch(function() { return null; });
        if (!m) throw new Error(t('MOD_USER_NOT_FOUND', locale));
        // Apply both timeout and muted role
        var timeoutMs = durationMs || 28 * 24 * 60 * 60 * 1000;
        await m.timeout(timeoutMs, reason || undefined).catch(function(e) { console.error('[TIMEOUT ERR]', e.message); });
        var mutedRole = await getMutedRole(guild);
        await m.roles.add(mutedRole, reason || undefined).catch(function() {});
        if (durationMs) setTimeout(function() {
          guild.members.fetch(userId).then(function(mem) { if (mem) mem.roles.remove(mutedRole).catch(function() {}); }).catch(function() {});
        }, durationMs);
        await db.addMute(guild.id, userId, moderatorId, reason, durationMs);
        await db.logAction(guild.id, userId, moderatorId, 'mute', reason);
        var durText = durationMs ? ' (' + durationLabel + ': ' + durationRaw + ')' : ' (' + permanentLabel + ')';
        var msg = '🔇 <@' + userId + '> ' + t('MOD_MUTED', locale) + durText + '\n\n**' + reasonLabel + ':** ' + (reason || notSpecified);
        await interaction.editReply({ embeds: [createSuccessEmbed('mute', userId, moderatorId, msg, locale, interaction.client)] });

      } else if (sub === 'unmute') {
        var m = interaction.options.getMember('user') || interaction.options.getMember('utente') || await guild.members.fetch({ user: userId, force: true }).catch(function() { return null; });
        if (!m) throw new Error(t('MOD_USER_NOT_FOUND', locale));
        if (m.moderatable) await m.timeout(null, reason || undefined).catch(function() {});
        var mr = guild.roles.cache.find(function(r) { return r.name === 'Muted'; });
        if (mr) await m.roles.remove(mr).catch(function() {});
        await db.logAction(guild.id, userId, moderatorId, 'unmute', reason);
        var msg = '🔊 <@' + userId + '> ' + t('MOD_UNMUTED', locale) + '\n\n**' + reasonLabel + ':** ' + (reason || notSpecified);
        await interaction.editReply({ embeds: [createSuccessEmbed('unmute', userId, moderatorId, msg, locale, interaction.client)] });

      } else if (sub === 'warn') {
        await db.addWarning(guild.id, userId, moderatorId, reason);
        await db.logAction(guild.id, userId, moderatorId, 'warn', reason);
        var msg = '⚠️ <@' + userId + '> ' + t('MOD_WARNED', locale) + '\n\n**' + reasonLabel + ':** ' + (reason || notSpecified);
        await interaction.editReply({ embeds: [createSuccessEmbed('warn', userId, moderatorId, msg, locale, interaction.client)] });

      } else if (sub === 'remwarn') {
        await pool.query('DELETE FROM warnings WHERE id = (SELECT id FROM warnings WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1)', [guild.id, userId]);
        await db.logAction(guild.id, userId, moderatorId, 'remwarn', reason);
        var msg = '🗑️ ' + t('MOD_REMWARN', locale) + ' <@' + userId + '> ' + t('MOD_REMOVED', locale) + '\n\n**' + reasonLabel + ':** ' + (reason || notSpecified);
        await interaction.editReply({ embeds: [createSuccessEmbed('remwarn', userId, moderatorId, msg, locale, interaction.client)] });
      }
    } catch (err) {
      console.error(err);
      var errMsg = t('MOD_ERROR_DESC', locale) + ': ' + err.message;
      await interaction.editReply({ embeds: [createErrorEmbed(t('MOD_ERROR', locale), errMsg, locale, interaction.client)] });
    }
  }
};