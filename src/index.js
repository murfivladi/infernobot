/**
 * 🔥 INFERNO BOT - Main Entry Point
 * Discord bot with modern UI design system
 */

const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  REST, 
  Routes, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

// UI Design System
const { Design, Embed, Button, Row, Panels } = require('./ui/components');
const { initDB, db, pool, getSettings, setSetting } = require('./db');
const { getMutedRole, parseDuration } = require('./modUtils');
const { SETTING_MODAL_MAP, buildSettingsFields, buildSettingsButtons } = require('./handlers/settings');

// ═══════════════════════════════════════════════════════════════
// 🛡️ GUILD WHITELIST
// ═══════════════════════════════════════════════════════════════

let allowedGuilds = [];

function loadGuildsConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'guilds.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      allowedGuilds = config.allowed_guilds || [];
      console.log('✅ Guild whitelist loaded: ' + allowedGuilds.length + ' server(s) allowed');
    } else {
      console.log('⚠️ guilds.json not found - all guilds will be blocked');
      allowedGuilds = [];
    }
  } catch (err) {
    console.error('❌ Error loading guilds.json:', err.message);
    allowedGuilds = [];
  }
}

function isGuildAllowed(guildId) {
  if (allowedGuilds.length === 0) {
    // No guilds configured - block all for security
    console.warn('⚠️ Nessun server autorizzato in guilds.json - tutte le interazioni bloccate');
    return false;
  }
  // Ensure type matching (guildId can be string or number)
  const guildIdStr = String(guildId);
  if (!allowedGuilds.includes(guildIdStr) && !allowedGuilds.includes(Number(guildIdStr))) {
    console.log('🔒 Guild ' + guildId + ' non autorizzato');
    return false;
  }
  return true;
}

// Load guilds config on startup
loadGuildsConfig();

// Hot reload function (can be called via admin command)
global.__reloadGuildsConfig = function() { 
  loadGuildsConfig(); 
  return allowedGuilds.length; 
};

// Expose isGuildAllowed for other modules
global.__isGuildAllowed = isGuildAllowed;

// ═══════════════════════════════════════════════════════════════
// 📦 PERMISSIONS CONFIG
// ═══════════════════════════════════════════════════════════════

let permissionsConfig = {};
global.permissionsConfig = permissionsConfig;
global.__reloadPermissionsConfig = function() { return reloadPermissionsConfig(); };
global.__syncPermissionsFromConfig = syncPermissionsFromConfig;

try {
  const configPath = path.join(__dirname, '..', 'permissions.json');
  if (fs.existsSync(configPath)) {
    permissionsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Permissions config loaded from permissions.json');
  } else {
    console.log('⚠️ permissions.json not found - using default role-based permissions');
  }
} catch (err) {
  console.error('❌ Error loading permissions.json:', err.message);
}

async function syncPermissionsFromConfig(guildId) {
  const guildConfig = Object.values(permissionsConfig).find(g => g.guild_id === guildId) || permissionsConfig[guildId];
  if (!guildConfig) {
    console.log(`⚠️ No config found for guild ${guildId}`);
    return 0;
  }
  
  let synced = 0, skipped = 0;
  for (const [, roleData] of Object.entries(guildConfig.roles || {})) {
    const roleId = roleData.role_id;
    if (!roleId || roleId === 'SET_ROLE_ID' || roleId === '<SET_ROLE_ID>' || roleId.startsWith('<Set_')) {
      skipped++;
      continue;
    }
    try {
      await db.setRolePermissions(guildId, roleId, roleData.permissions || {}, 'config_sync');
      synced++;
    } catch (err) {
      console.error(`❌ Error syncing role ${roleId}:`, err.message);
    }
  }
  console.log(`📝 Synced ${synced} roles from config for guild ${guildId} (skipped ${skipped} placeholders)`);
  return synced;
}

function reloadPermissionsConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'permissions.json');
    if (fs.existsSync(configPath)) {
      permissionsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      global.permissionsConfig = permissionsConfig;
      console.log('✅ Permissions config reloaded successfully');
      return true;
    }
    console.log('⚠️ permissions.json not found');
    return false;
  } catch (err) {
    console.error('❌ Error reloading permissions.json:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// ⚙️ PERMISSIONS SYSTEM
// ═══════════════════════════════════════════════════════════════

async function hasPermission(guild, userId, permissionKey) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;
  
  const userRoleIds = member.roles.cache.map(r => r.id);
  for (const roleId of userRoleIds) {
    const { rows } = await db.getRolePermissions(guild.id, roleId);
    if (rows.length > 0 && rows[0].permissions?.[permissionKey] === true) return true;
  }
  return false;
}

async function getUserPermissions(guild, userId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return {};
  
  const userRoleIds = member.roles.cache.map(r => r.id);
  const result = {};
  
  for (const roleId of userRoleIds) {
    const { rows } = await db.getRolePermissions(guild.id, roleId);
    if (rows.length > 0) {
      for (const [key, value] of Object.entries(rows[0].permissions || {})) {
        if (value === true) result[key] = true;
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// 🌍 LOCALIZATION
// ═══════════════════════════════════════════════════════════════

const locales = {};
const localesPath = path.join(__dirname, 'locales');
fs.readdirSync(localesPath).forEach(file => {
  if (file.endsWith('.json')) {
    locales[file.split('.')[0]] = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
  }
});

function t(key, locale = 'ru', params = {}) {
  let text = locales[locale]?.[key] || locales.ru?.[key] || key;
  for (const [k, v] of Object.entries(params)) text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return text;
}

const guildLocaleCache = new Map();
async function guildLocale(guildId) {
  if (!guildLocaleCache.has(guildId)) {
    const s = await getSettings(guildId);
    guildLocaleCache.set(guildId, s.language || 'ru');
  }
  return guildLocaleCache.get(guildId);
}

// ═══════════════════════════════════════════════════════════════
// 🤖 CLIENT SETUP
// ═══════════════════════════════════════════════════════════════

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const loaded = require(path.join(commandsPath, file));
    const commands = Array.isArray(loaded) ? loaded : [loaded];
    for (const command of commands) client.commands.set(command.data.name, command);
  }
}

// Initialize handler modules
const deps = { db, t, Design, Embed, Button, Row };
const { handlePermissionsPanel, handlePermsEdit, handlePermsToggle, handlePermsSelectAll, PERMISSIONS } = require('./handlers/perms')(deps);
const { handleStaffPanel, handleStaffTabs } = require('./handlers/staff')(deps);

// ═══════════════════════════════════════════════════════════════
// 🚀 READY EVENT
// ═══════════════════════════════════════════════════════════════

client.once('clientReady', async () => {
  try {
    await initDB();
    console.log('✅ DB connesso e inizializzato');
  } catch (err) {
    console.error('❌ Errore DB:', err);
  }

  // Auto-sync permissions
  try {
    const guildIds = process.env.GUILD_ID ? process.env.GUILD_ID.split(',').map(id => id.trim()) : [];
    for (const guildId of guildIds) await syncPermissionsFromConfig(guildId);
  } catch (err) {
    console.error('❌ Errore sync permessi:', err);
  }

  // Deploy slash commands only to allowed guilds
  try {
    const commands = [...client.commands.values()].map(c => c.data.toJSON());
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    
    // Get guilds the bot is actually connected to
    const connectedGuilds = client.guilds.cache.map(g => g.id);
    console.log('🔍 Guilds connessi: ' + connectedGuilds.length);
    if (connectedGuilds.length > 0) {
      console.log('📋 IDs: ' + connectedGuilds.join(', '));
    }
    
    // Use allowed guilds from guilds.json, not GUILD_ID env
    if (allowedGuilds.length > 0) {
      let successCount = 0;
      for (const guildId of allowedGuilds) {
        const guildIdStr = String(guildId);
        
        // Check if bot is actually in this guild
        if (!connectedGuilds.includes(guildIdStr) && !connectedGuilds.includes(Number(guildIdStr))) {
          console.log('⚠️ Bot non presente in guild ' + guildId + ' - skip deploy comandi');
          continue;
        }
        
        try {
          await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildIdStr), { body: commands });
          console.log('✅ Comandi registrati in guild ' + guildId);
          successCount++;
        } catch (err) {
          console.error('❌ Errore deploy in guild ' + guildId + ':', err.message);
        }
      }
      console.log('✅ ' + commands.length + ' comandi registrati in ' + successCount + ' guild(s) (skippati ' + (allowedGuilds.length - successCount) + ' non raggiungibili)');
    } else if (process.env.GUILD_ID) {
      // Fallback to env var if no guilds.json
      const guildIds = process.env.GUILD_ID.split(',').map(id => id.trim());
      for (const guildId of guildIds) {
        if (!connectedGuilds.includes(guildId)) {
          console.log('⚠️ Bot non presente in guild ' + guildId + ' - skip');
          continue;
        }
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
      }
      console.log('✅ ' + commands.length + ' comandi registrati in ' + guildIds.length + ' guild(s) (via GUILD_ID)');
    } else {
      // Global commands as last resort (not recommended with whitelist)
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('⚠️ ' + commands.length + ' comandi registrati globalmente (nessuna whitelist)');
    }
  } catch (err) {
    console.error('❌ Errore deploy comandi:', err);
  }

  console.log(t('BOT_READY', 'ru'));
});

// ═══════════════════════════════════════════════════════════════
// 🎮 INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════════

client.on('interactionCreate', async interaction => {
  // Check if guild is allowed
  if (!isGuildAllowed(interaction.guildId)) {
    // Silently ignore - don't respond to unauthorized servers
    return;
  }

  const locale = await guildLocale(interaction.guildId);

  try {

  // ═══════════════════════════════════════════════════════════════
  // SLASH COMMANDS
  // ═══════════════════════════════════════════════════════════════

  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({ content: t('COMMAND_NOT_FOUND', locale), flags: 64 });
      return;
    }
    try {
      await command.execute(interaction, t);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: t('ERROR', locale), flags: 64 });
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // BUTTON INTERACTIONS
  // ═══════════════════════════════════════════════════════════════

  if (interaction.isButton()) {
    const { customId } = interaction;

    // ─── ADMIN ROOT PANEL ───────────────────────────────────────
    if (customId === 'admin_root') {
      const panel = Panels.adminMain(locale);
      await interaction.update(panel);
      return;
    }

    // ─── SETTINGS PANEL ─────────────────────────────────────────
    if (customId === 'admin_settings') {
      const panel = Panels.settingsBot(await getSettings(interaction.guildId), locale);
      panel.components.push(Row.withBack([], 'admin_root'));
      await interaction.update(panel);
      return;
    }

    if (customId === 'admin_bot_settings') {
      const s = await getSettings(interaction.guildId);
      const embed = Embed.panel(
        t('SETTINGS_BOT_TITLE', locale), 
        t('SETTINGS_BOT_DESC', locale), 
        'settings',
        { fields: buildSettingsFields(s, locale, t) }
      );
      await interaction.update({
        embeds: [embed],
        components: buildSettingsButtons(locale, t, Button)
      });
      return;
    }

    if (customId === 'admin_server_settings') {
      const guild = interaction.guild;
      await guild.fetch();
      const embed = Embed.serverInfo(guild);
      await interaction.update({
        embeds: [embed],
        components: [Row.withBack([], 'admin_settings')]
      });
      return;
    }

    // ─── PERMISSIONS PANEL ──────────────────────────────────────
    if (customId === 'admin_permissions' || customId.startsWith('perms_page_')) {
      await handlePermissionsPanel(interaction, locale);
      return;
    }

    if (customId.startsWith('perms_edit_')) {
      await handlePermsEdit(interaction, locale);
      return;
    }

    if (customId.startsWith('perms_toggle_')) {
      await handlePermsToggle(interaction, locale);
      return;
    }

    if (customId.startsWith('perms_select_all_')) {
      await handlePermsSelectAll(interaction, locale, true);
      return;
    }

    if (customId.startsWith('perms_deselect_all_')) {
      await handlePermsSelectAll(interaction, locale, false);
      return;
    }

    if (customId.startsWith('perms_reset_')) {
      const roleId = customId.replace('perms_reset_', '');
      const guild = interaction.guild;
      const role = guild.roles.cache.get(roleId);
      
      const embed = Embed.confirm(
        t('CONFIRM_RESET_TITLE', locale),
        t('CONFIRM_RESET_DESC', locale).replace('{roleId}', roleId),
        true
      );
      
      await interaction.update({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`perms_reset_confirm_${roleId}`).setLabel(t('CONFIRM_YES_RESET', locale)).setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('admin_permissions').setLabel(t('CONFIRM_CANCEL', locale)).setStyle(ButtonStyle.Secondary)
        )]
      });
      return;
    }

    if (customId.startsWith('perms_reset_confirm_')) {
      const roleId = customId.replace('perms_reset_confirm_', '');
      await db.setRolePermissions(interaction.guildId, roleId, {}, interaction.user.id);
      await handlePermsEdit(interaction, locale, true);
      return;
    }

    // ─── STAFF PANEL ────────────────────────────────────────────
    if (customId === 'admin_staff') {
      await handleStaffPanel(interaction, locale);
      return;
    }

    if (customId === 'astaff_tab_staff' || customId === 'astaff_tab_users') {
      await handleStaffTabs(interaction, locale);
      return;
    }

    if (customId.startsWith('astaff_promote_')) {
      if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_manage')) {
        await interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 }); return;
      }
      const userId = customId.replace('astaff_promote_', '');
      const { rows } = await db.getStaffMember(interaction.guildId, userId);
      if (!rows.length) { await interaction.reply({ content: t('ASTAFF_NOT_FOUND', locale), flags: 64 }); return; }
      const next = { moderator: 'admin', admin: 'owner', owner: 'moderator' };
      await db.updateStaffRole(interaction.guildId, userId, next[rows[0].role] || 'moderator');
      await interaction.reply({ content: t('ASTAFF_ROLE_UPDATED', locale).replace('{user}', `<@${userId}>`).replace('{role}', next[rows[0].role]), flags: 64 });
      return;
    }

    if (customId.startsWith('astaff_remove_')) {
      if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_manage')) {
        await interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 }); return;
      }
      const userId = customId.replace('astaff_remove_', '');
      await db.removeStaff(interaction.guildId, userId);
      await interaction.reply({ content: t('ASTAFF_REMOVED', locale).replace('{user}', `<@${userId}>`), flags: 64 });
      return;
    }

    // ─── STAFF MENU ─────────────────────────────────────────────
    if (customId === 'staff_root') {
      const panel = Panels.staffMain(locale);
      await interaction.update(panel);
      return;
    }

    if (customId === 'moderation') {
      const embed = Embed.panel(t('STAFF_TITLE', locale), t('STAFF_SECTION_MODERATION', locale), 'moderation');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('mod_actions').setLabel(t('BUTTON_MOD_ACTIONS', locale)).setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
        new ButtonBuilder().setCustomId('mod_history').setLabel(t('BUTTON_MOD_HISTORY', locale)).setStyle(ButtonStyle.Primary).setEmoji('📋'),
        Button.back('staff_root')
      );
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    if (customId === 'mod_history') {
      const { rows } = await db.getRecentActions(interaction.guildId, 100);
      if (!rows.length) {
        await interaction.update({ embeds: [Embed.success(t('MOD_HISTORY_TITLE', locale), t('MOD_HISTORY_EMPTY', locale))], components: [Row.withBack([], 'moderation')] });
        return;
      }
      const lines = rows.slice(0, 20).map((r, i) => `**${i + 1}.** **${r.action}** <@${r.user_id}> — ${r.reason || '—'} (<@${r.moderator_id}>, ${new Date(r.created_at).toLocaleDateString('ru')})`);
      const embed = Embed.list(t('MOD_HISTORY_TITLE', locale), lines, 1, 1, 'moderation');
      await interaction.update({ embeds: [embed], components: [Row.withBack([], 'moderation')] });
      return;
    }

    if (customId === 'mod_actions') {
      const embed = Embed.panel(t('MOD_ACTIONS_TITLE', locale), [
        '`/mod kick @user [reason]`',
        '`/mod ban @user [reason] [duration]`',
        '`/mod unban <id> [reason]`',
        '`/mod mute @user [reason] [duration]`',
        '`/mod unmute @user [reason]`',
        '`/mod warn @user [reason]`',
        '`/mod remwarn @user`',
      ].join('\n'), 'moderation');
      await interaction.update({ embeds: [embed], components: [Row.withBack([], 'moderation')] });
      return;
    }

    if (customId === 'communication') {
      const embed = Embed.panel(t('STAFF_TITLE', locale), t('STAFF_SECTION_COMMUNICATION', locale), 'reports');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('comm_reports').setLabel(t('BUTTON_COMM_REPORTS', locale)).setStyle(ButtonStyle.Primary).setEmoji('📋'),
        new ButtonBuilder().setCustomId('comm_otchety').setLabel(t('BUTTON_COMM_OTCHETY', locale)).setStyle(ButtonStyle.Primary).setEmoji('📊'),
        Button.back('staff_root')
      );
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    if (customId === 'comm_reports') {
      const { rows } = await db.getRecentReports(interaction.guildId, 5);
      if (!rows.length) {
        await interaction.update({ embeds: [Embed.success(t('BUTTON_COMM_REPORTS', locale), t('REPORT_EMPTY', locale))], components: [Row.withBack([], 'communication')] });
        return;
      }
      const desc = rows.map((r, i) => `**${i + 1}.** <@${r.reporter_id}> → <@${r.target_id}>: ${r.reason} [${r.status}]`).join('\n');
      const embed = Embed.panel(t('BUTTON_COMM_REPORTS', locale), desc, 'reports');
      const components = rows.map(r => 
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`rep_reply_${r.id}`).setLabel(t('REPORT_BTN_REPLY', locale)).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`rep_rate_${r.id}`).setLabel(t('REPORT_BTN_RATE', locale)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rep_del_${r.id}`).setLabel(t('REPORT_BTN_DELETE', locale)).setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`rep_punish_${r.id}`).setLabel(t('REPORT_BTN_PUNISH', locale)).setStyle(ButtonStyle.Danger)
        )
      );
      components.push(Row.withBack([], 'communication'));
      await interaction.update({ embeds: [embed], components });
      return;
    }

    if (customId.startsWith('rep_del_')) {
      if (!await hasPermission(interaction.guild, interaction.user.id, 'reports_manage')) {
        await interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 }); return;
      }
      const id = customId.replace('rep_del_', '');
      await db.deleteReport(id);
      await interaction.update({ embeds: [Embed.success(t('BUTTON_COMM_REPORTS', locale), t('REPORT_DELETED', locale))], components: [Row.withBack([], 'comm_reports')] });
      return;
    }

    if (customId.startsWith('rep_reply_') || customId.startsWith('rep_rate_')) {
      if (!await hasPermission(interaction.guild, interaction.user.id, 'reports_manage')) {
        await interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 }); return;
      }
      const isReply = customId.startsWith('rep_reply_');
      const id = customId.replace(isReply ? 'rep_reply_' : 'rep_rate_', '');
      const modal = new ModalBuilder().setCustomId(isReply ? `rep_submit_reply_${id}` : `rep_submit_rate_${id}`).setTitle(t(isReply ? 'REPORT_MODAL_REPLY' : 'REPORT_MODAL_RATE', locale));
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('value').setLabel(t(isReply ? 'REPORT_INPUT_REPLY' : 'REPORT_INPUT_RATING', locale)).setStyle(isReply ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(true)
      ));
      await interaction.showModal(modal);
      return;
    }

    if (customId.startsWith('rep_punish_')) {
      if (!await hasPermission(interaction.guild, interaction.user.id, 'reports_manage')) {
        await interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 }); return;
      }
      const id = customId.replace('rep_punish_', '');
      const { rows } = await db.getReport(id);
      if (!rows.length) { await interaction.reply({ content: t('REPORT_NOT_FOUND', locale), flags: 64 }); return; }
      const target = rows[0].target_id;
      const embed = Embed.panel(t('REPORT_BTN_PUNISH', locale), `Seleziona il castigo per <@${target}>:`, 'moderation');
      await interaction.update({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`modaction_kick_${target}`).setLabel('👢 Kick').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`modaction_ban_${target}`).setLabel('🔨 Ban').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`modaction_mute_${target}`).setLabel('🔇 Mute').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`modaction_warn_${target}`).setLabel('⚠️ Warn').setStyle(ButtonStyle.Secondary),
          Button.back('comm_reports')
        )]
      });
      return;
    }

    if (customId === 'comm_otchety') {
      const embed = Embed.panel(t('OTCHET_TITLE', locale), t('OTCHET_SELECT_ACTION', locale), 'otchety');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('otch_list').setLabel(t('OTCHET_BTN_LIST', locale)).setStyle(ButtonStyle.Primary).setEmoji('📋'),
        new ButtonBuilder().setCustomId('otch_create').setLabel(t('OTCHET_BTN_SEND', locale)).setStyle(ButtonStyle.Success).setEmoji('✏️'),
        Button.back('communication')
      );
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    if (customId === 'otch_list') {
      const { rows } = await db.getOtchety(interaction.guildId);
      if (!rows.length) {
        await interaction.update({ embeds: [Embed.panel(t('OTCHET_LIST_TITLE', locale), t('OTCHET_EMPTY', locale), 'otchety')], components: [Row.withBack([], 'comm_otchety')] });
        return;
      }
      const desc = rows.map((r, i) => `**${i + 1}.** **${r.name}** — ${r.data} (<@${r.author_id}>)`).join('\n');
      const embed = Embed.panel(t('OTCHET_LIST_TITLE', locale), desc, 'otchety');
      const components = rows.slice(0, 4).map(r =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`otch_view_${r.id}`).setLabel(`${r.name}`).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`otch_edit_${r.id}`).setLabel('✏️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`otch_del_${r.id}`).setLabel('🗑️').setStyle(ButtonStyle.Danger)
        )
      );
      components.push(Row.withBack([], 'comm_otchety'));
      await interaction.update({ embeds: [embed], components });
      return;
    }

    if (customId.startsWith('otch_view_')) {
      const id = customId.replace('otch_view_', '');
      const { rows } = await db.getOtchet(id);
      if (!rows.length) { await interaction.reply({ content: t('OTCHET_NOT_FOUND', locale), flags: 64 }); return; }
      const r = rows[0];
      const embed = new EmbedBuilder()
        .setTitle(`📄 ${r.name}`)
        .setColor(Design.colors.otchety)
        .addFields(
          { name: t('OTCHET_FIELD_DATE', locale), value: r.data, inline: true },
          { name: t('OTCHET_FIELD_AUTHOR', locale), value: `<@${r.author_id}>`, inline: true },
          { name: t('OTCHET_FIELD_DONE', locale), value: r.chto_sdelal },
          { name: t('OTCHET_FIELD_TODO', locale), value: r.chto_ostalos },
          { name: t('OTCHET_FIELD_NOTES', locale), value: r.notes || t('OTCHET_NO_NOTES', locale) }
        )
        .setTimestamp();
      await interaction.update({ embeds: [embed], components: [Row.withBack([], 'otch_list')] });
      return;
    }

    if (customId.startsWith('otch_del_')) {
      if (!await hasPermission(interaction.guild, interaction.user.id, 'otchety_view')) {
        await interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 }); return;
      }
      const id = customId.replace('otch_del_', '');
      await db.deleteOtchet(id);
      await interaction.update({ embeds: [Embed.success(t('OTCHET_DELETED_TITLE', locale), t('OTCHET_DELETED', locale))], components: [Row.withBack([], 'otch_list')] });
      return;
    }

    if (customId === 'otch_create' || customId.startsWith('otch_edit_')) {
      const editId = customId.startsWith('otch_edit_') ? customId.replace('otch_edit_', '') : null;
      const modal = new ModalBuilder().setCustomId(editId ? `otch_submit_edit_${editId}` : 'otch_submit_new').setTitle(t(editId ? 'OTCHET_MODAL_EDIT' : 'OTCHET_MODAL_NEW', locale));
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('data').setLabel(t('OTCHET_INPUT_DATE', locale)).setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel(t('OTCHET_INPUT_NAME', locale)).setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('chto_sdelal').setLabel(t('OTCHET_INPUT_DONE', locale)).setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('chto_ostalos').setLabel(t('OTCHET_INPUT_TODO', locale)).setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel(t('OTCHET_INPUT_NOTES', locale)).setStyle(TextInputStyle.Paragraph).setRequired(false))
      );
      await interaction.showModal(modal);
      return;
    }

    // ─── PROFILE ────────────────────────────────────────────────
    if (customId === 'profile') {
      const member = interaction.member;
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      const [warns, bans, mutes, kicks] = await Promise.all([
        db.getWarnings(guildId, userId),
        db.getBans(guildId, userId),
        db.getMutes(guildId, userId),
        db.getKicks(guildId, userId),
      ]);

      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `<@&${r.id}>`)
        .join(' ') || t('PROFILE_NO_ROLES', locale);

      const joinedAt = member.joinedAt ? `<t:${Math.floor(member.joinedAt / 1000)}:R>` : '—';

      const embed = new EmbedBuilder()
        .setTitle(`👤 ${interaction.user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .setColor(member.displayColor || Design.colors.primary)
        .addFields(
          { name: '📅 Entrato', value: joinedAt, inline: true },
          { name: '⚠️ Warnings', value: String(warns.rows.length), inline: true },
          { name: '🔨 Bans', value: String(bans.rows.length), inline: true },
          { name: '🔇 Mute', value: String(mutes.rows.length), inline: true },
          { name: '👢 Kick', value: String(kicks.rows.length), inline: true },
          { name: '🎭 Ruoli', value: roles, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: '🔥 InfernoBot • Profilo' });

      await interaction.update({ embeds: [embed], components: [Row.withBack([], 'staff_root')] });
      return;
    }

    // ─── PLACEHOLDER SECTIONS ───────────────────────────────────
    if (customId.startsWith('admin_')) {
      const section = customId.replace('admin_', '');
      const titles = { community: t('ADMIN_COMMUNITY', locale), system: t('ADMIN_SYSTEM', locale) };
      const embed = Embed.panel(titles[section] || section, t('IN_DEVELOPMENT', locale), 'system');
      await interaction.update({ embeds: [embed], components: [Row.withBack([], 'admin_root')] });
      return;
    }

    // Mod action buttons (punish)
    if (customId.match(/^modaction_(kick|ban|mute|warn)_\d+$/)) {
      const parts = customId.split('_');
      const action = parts[1];
      const userId = parts[2];
      const modal = new ModalBuilder().setCustomId(`modexec_${action}_${userId}`).setTitle(`${action.toUpperCase()} <@${userId}>`);
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Motivo').setStyle(TextInputStyle.Short).setRequired(false)));
      if (action === 'ban' || action === 'mute') {
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel('Durata (10m, 2h, 7d)').setStyle(TextInputStyle.Short).setRequired(false)));
      }
      await interaction.showModal(modal);
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MODAL SUBMISSIONS
  // ═══════════════════════════════════════════════════════════════

  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    // Settings modals
    if (customId.startsWith('setting_submit_')) {
      const key = customId.replace('setting_submit_', '');
      const value = interaction.fields.getTextInputValue('value').trim();
      await setSetting(interaction.guildId, key, value);
      if (key === 'locale') guildLocaleCache.delete(interaction.guildId);
      await interaction.reply({ content: t('SETTINGS_SAVED', locale), flags: 64 });
      return;
    }

    // Mod execution modals
    if (customId.match(/^modexec_(kick|ban|mute|warn)_\d+$/)) {
      const parts = customId.split('_');
      const action = parts[1];
      const userId = parts[2];
      const reason = interaction.fields.getTextInputValue('reason') || null;
      const durationRaw = (action === 'ban' || action === 'mute') ? interaction.fields.getTextInputValue('duration') || null : null;
      const durationMs = parseDuration(durationRaw);
      const guild = interaction.guild;
      const moderatorId = interaction.user.id;

      try {
        if (action === 'kick') {
          const m = await guild.members.fetch(userId).catch(() => null);
          if (m) await m.kick(reason || undefined);
          await db.addKick(guild.id, userId, moderatorId, reason);
        } else if (action === 'ban') {
          await guild.members.ban(userId, { reason: reason || undefined });
          await db.addBan(guild.id, userId, moderatorId, reason);
          if (durationMs) setTimeout(() => guild.members.unban(userId).catch(() => {}), durationMs);
        } else if (action === 'mute') {
          const m = await guild.members.fetch(userId).catch(() => null);
          if (m) {
            const mutedRole = await getMutedRole(guild);
            await m.roles.add(mutedRole, reason || undefined);
            if (durationMs) setTimeout(async () => { const mm = await guild.members.fetch(userId).catch(() => null); if (mm) await mm.roles.remove(mutedRole).catch(() => {}); }, durationMs);
          }
          await db.addMute(guild.id, userId, moderatorId, reason, durationMs);
        } else if (action === 'warn') {
          await db.addWarning(guild.id, userId, moderatorId, reason);
        }
        await db.logAction(guild.id, userId, moderatorId, action, reason);
        await interaction.reply({ content: `✅ ${action} su <@${userId}>.`, flags: 64 });
      } catch (err) {
        await interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
      }
      return;
    }

    // Report modals
    if (customId.startsWith('rep_submit_reply_')) {
      const id = customId.replace('rep_submit_reply_', '');
      const reply = interaction.fields.getTextInputValue('value');
      await db.replyReport(id, reply);
      await interaction.reply({ content: t('REPORT_REPLIED', locale), flags: 64 });
      return;
    }

    if (customId.startsWith('rep_submit_rate_')) {
      const id = customId.replace('rep_submit_rate_', '');
      const raw = interaction.fields.getTextInputValue('value').trim().toLowerCase();
      const accepted = ['1', 'да', 'принято', 'yes', 'accept'].includes(raw);
      await db.rateReport(id, accepted ? 1 : 0);
      await interaction.reply({ content: t('REPORT_RATED', locale), flags: 64 });
      return;
    }

    // Otchety modals
    if (customId === 'otch_submit_new' || customId.startsWith('otch_submit_edit_')) {
      const data = interaction.fields.getTextInputValue('data');
      const name = interaction.fields.getTextInputValue('name');
      const chto_sdelal = interaction.fields.getTextInputValue('chto_sdelal');
      const chto_ostalos = interaction.fields.getTextInputValue('chto_ostalos');
      const notes = interaction.fields.getTextInputValue('notes') || null;

      if (customId.startsWith('otch_submit_edit_')) {
        const id = customId.replace('otch_submit_edit_', '');
        await db.updateOtchet(id, data, name, chto_sdelal, chto_ostalos, notes);
        await interaction.reply({ content: t('OTCHET_UPDATED', locale), flags: 64 });
      } else {
        await db.addOtchet(interaction.guildId, interaction.user.id, data, name, chto_sdelal, chto_ostalos, notes);
        await interaction.reply({ content: t('OTCHET_OK', locale), flags: 64 });
      }
      return;
    }

    // Staff modals
    if (customId === 'astaff_user_search') {
      const userId = interaction.fields.getTextInputValue('user_id').trim();
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) { await interaction.reply({ content: t('ASTAFF_USER_NOT_FOUND', locale), flags: 64 }); return; }
      const { rows } = await db.getStaffMember(interaction.guildId, userId);
      const isStaff = rows.length > 0;
      const embed = new EmbedBuilder()
        .setTitle(t('ASTAFF_USER_INFO_TITLE', locale))
        .setDescription(`<@${userId}> — ${member.user.tag}`)
        .addFields({ name: t('ASTAFF_FIELD_STATUS', locale), value: isStaff ? `✅ ${rows[0].role}` : t('ASTAFF_NOT_STAFF', locale), inline: true })
        .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
        .setColor(Design.colors.primary);
      
      const row = new ActionRowBuilder().addComponents(
        isStaff
          ? new ButtonBuilder().setCustomId(`astaff_remove_${userId}`).setLabel(t('ASTAFF_BTN_REMOVE', locale)).setStyle(ButtonStyle.Danger)
          : new ButtonBuilder().setCustomId(`astaff_addstaff_${userId}`).setLabel(t('ASTAFF_BTN_ADD', locale)).setStyle(ButtonStyle.Success)
      );
      if (isStaff) {
        row.addComponents(
          new ButtonBuilder().setCustomId(`astaff_setrole_${userId}`).setLabel(t('ASTAFF_BTN_SETROLE', locale)).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`astaff_perms_${userId}`).setLabel(t('ASTAFF_BTN_PERMS', locale)).setStyle(ButtonStyle.Secondary)
        );
      }
      await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
      return;
    }

    if (customId.startsWith('astaff_setrole_')) {
      const userId = customId.replace('astaff_setrole_submit_', '').replace('astaff_setrole_', '');
      const role = interaction.fields.getTextInputValue('role').trim().toLowerCase();
      const valid = ['moderator', 'admin', 'owner'];
      if (!valid.includes(role)) { await interaction.reply({ content: t('ASTAFF_INVALID_ROLE', locale), flags: 64 }); return; }
      await db.updateStaffRole(interaction.guildId, userId, role);
      await interaction.reply({ content: t('ASTAFF_ROLE_UPDATED', locale).replace('{user}', `<@${userId}>`).replace('{role}', role), flags: 64 });
      return;
    }

    if (customId.startsWith('astaff_perms_submit_')) {
      const userId = customId.replace('astaff_perms_submit_', '');
      const raw = interaction.fields.getTextInputValue('perms').trim();
      const perms = raw ? raw.split(',').map(p => p.trim()).filter(Boolean) : [];
      await db.updateStaffPerms(interaction.guildId, userId, perms);
      await interaction.reply({ content: t('ASTAFF_PERMS_UPDATED', locale).replace('{user}', `<@${userId}>`), flags: 64 });
      return;
    }

    if (customId.startsWith('astaff_addstaff_')) {
      const userId = customId.replace('astaff_addstaff_submit_', '').replace('astaff_addstaff_', '');
      const role = interaction.fields.getTextInputValue('role').trim().toLowerCase();
      const valid = ['moderator', 'admin', 'owner'];
      if (!valid.includes(role)) { await interaction.reply({ content: t('ASTAFF_INVALID_ROLE', locale), flags: 64 }); return; }
      await db.addStaff(interaction.guildId, userId, role, interaction.user.id);
      await interaction.reply({ content: t('ASTAFF_ADDED', locale).replace('{user}', `<@${userId}>`).replace('{role}', role), flags: 64 });
      return;
    }
  } // end isModalSubmit
  } catch (err) {
    console.error('Interaction error:', err);
    try {
      const errMsg = t('ERROR', locale) || '❌ Si è verificato un errore.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errMsg, flags: 64 });
      } else {
        await interaction.reply({ content: errMsg, flags: 64 });
      }
    } catch (_) {}
  }
});

// Handle setting buttons that open modals
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const { customId } = interaction;
  
  // Guild request management buttons (work even from DMs)
  if (customId.startsWith('gapprove_') || customId.startsWith('greject_')) {
    // Check owner only for guild request buttons
    if (interaction.user.id !== process.env.OWNER_ID) {
      await interaction.reply({ content: '❌ Solo il proprietario del bot.', flags: 64 });
      return;
    }
    
    const isApprove = customId.startsWith('gapprove_');
    const requestId = customId.replace('gapprove_', '').replace('greject_', '');
    
    try {
      const { rows } = await db.getGuildRequest(requestId);
      if (!rows.length) {
        await interaction.reply({ content: '❌ Richiesta non trovata.', flags: 64 });
        return;
      }
      
      const request = rows[0];
      
      if (isApprove) {
        // Approve request
        await db.approveGuildRequest(requestId, interaction.user.id);
        
        // Add to whitelist
        const configPath = path.join(__dirname, '..', 'guilds.json');
        let config = { allowed_guilds: [] };
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        if (!config.allowed_guilds) config.allowed_guilds = [];
        if (!config.allowed_guilds.includes(request.guild_id)) {
          config.allowed_guilds.push(request.guild_id);
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          loadGuildsConfig(); // Reload config
        }
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Richiesta Approvata')
          .setDescription(`Il server **${request.guild_name}** (${request.guild_id}) è stato aggiunto alla whitelist.`)
          .setColor(0x57F287)
          .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
        
        console.log('✅ Richiesta APPROVATA: ' + request.guild_name + ' (' + request.guild_id + ')');
        
      } else {
        // Reject request
        await db.rejectGuildRequest(requestId, interaction.user.id, null);
        
        const embed = new EmbedBuilder()
          .setTitle('❌ Richiesta Rifiutata')
          .setDescription(`La richiesta per **${request.guild_name}** è stata rifiutata.`)
          .setColor(0xED4245)
          .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
        
        console.log('❌ Richiesta RIFIUTATA: ' + request.guild_name + ' (' + request.guild_id + ')');
      }
      
      return;
    } catch (err) {
      await interaction.reply({ content: '❌ Errore: ' + err.message, flags: 64 });
      return;
    }
  }
  
  const locale = await guildLocale(interaction.guildId);

  if (SETTING_MODAL_MAP[customId]) {
    const { key, label, title } = SETTING_MODAL_MAP[customId];
    const modal = new ModalBuilder().setCustomId(`setting_submit_${key}`).setTitle(t(title, locale));
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('value').setLabel(t(label, locale)).setStyle(TextInputStyle.Short).setRequired(true)
    ));
    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error('showModal error:', err);
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// 🚀 START BOT
// ═══════════════════════════════════════════════════════════════

client.login(process.env.DISCORD_TOKEN);