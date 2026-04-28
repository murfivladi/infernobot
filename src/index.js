const {
  Client, GatewayIntentBits, Collection, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
require('dotenv').config();

const { Design, Embed, Button, Row, Panels } = require('./ui/components');
const { initDB, db, getSettings, setSetting }  = require('./db');
const { getMutedRole, parseDuration }           = require('./modUtils');
const { t }                                     = require('./utils/locale');
const { hasPermission }                         = require('./utils/perms');
const { sendLog }                               = require('./utils/log');
const { startScheduler }                        = require('./utils/scheduler');
const bus                                       = require('./utils/events');
const { SETTING_MODAL_MAP, buildSettingsFields, buildSettingsButtons } = require('./handlers/settings');
const { isOwner } = require('./utils/owners');
const { startCLI } = require('./cli');

// ── Intercept console → emit log:entry ───────────────────────
;['log', 'warn', 'error', 'debug'].forEach(level => {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
    bus.emit('log:entry', { level: level === 'log' ? 'info' : level, message, timestamp: new Date() });
    orig(...args);
  };
});

// ── Guild whitelist ───────────────────────────────────────────
let allowedGuilds = [];

function loadGuildsConfig() {
  try {
    const p = path.join(__dirname, '..', 'guilds.json');
    allowedGuilds = fs.existsSync(p)
      ? (JSON.parse(fs.readFileSync(p, 'utf8')).allowed_guilds || [])
      : [];
    console.log(`✅ Guild whitelist: ${allowedGuilds.length} server(s)`);
  } catch (err) {
    console.error('❌ guilds.json error:', err.message);
    allowedGuilds = [];
  }
}

function isGuildAllowed(guildId) {
  if (!allowedGuilds.length) return false;
  const s = String(guildId);
  return allowedGuilds.includes(s) || allowedGuilds.includes(Number(s));
}

loadGuildsConfig();
global.__reloadGuildsConfig  = () => { loadGuildsConfig(); return allowedGuilds.length; };
global.__isGuildAllowed      = isGuildAllowed;

// ── Permissions config (permissions.json → DB sync) ──────────
let permissionsConfig = {};
global.permissionsConfig = permissionsConfig;

try {
  const p = path.join(__dirname, '..', 'permissions.json');
  if (fs.existsSync(p)) {
    permissionsConfig = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log('✅ permissions.json loaded');
  }
} catch (err) {
  console.error('❌ permissions.json error:', err.message);
}

async function syncPermissionsFromConfig(guildId) {
  const cfg = Object.values(permissionsConfig).find(g => g.guild_id === guildId) || permissionsConfig[guildId];
  if (!cfg) return 0;
  let synced = 0;
  for (const roleData of Object.values(cfg.roles || {})) {
    const roleId = roleData.role_id;
    if (!roleId || roleId.startsWith('<') || roleId === 'SET_ROLE_ID') continue;
    try { await db.setRolePermissions(guildId, roleId, roleData.permissions || {}, 'config_sync'); synced++; }
    catch (err) { console.error(`❌ sync role ${roleId}:`, err.message); }
  }
  console.log(`📝 Synced ${synced} roles for guild ${guildId}`);
  return synced;
}

function reloadPermissionsConfig() {
  try {
    const p = path.join(__dirname, '..', 'permissions.json');
    if (!fs.existsSync(p)) return false;
    permissionsConfig = JSON.parse(fs.readFileSync(p, 'utf8'));
    global.permissionsConfig = permissionsConfig;
    return true;
  } catch { return false; }
}

global.__reloadPermissionsConfig  = reloadPermissionsConfig;
global.__syncPermissionsFromConfig = syncPermissionsFromConfig;

// ── Locale cache ──────────────────────────────────────────────
const guildLocaleCache = new Map();
async function guildLocale(guildId) {
  if (!guildLocaleCache.has(guildId)) {
    const s = await getSettings(guildId);
    guildLocaleCache.set(guildId, s.locale || 'ru');
  }
  return guildLocaleCache.get(guildId);
}

// ── Poll template wizard state ────────────────────────────────
// key: `${guildId}_${userId}` → { step, name, question, options[], image, channel_id, awaitingInput }
const pollWizard = new Map();

const POLL_EMOJI = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

async function sendPoll(guild, channel, question, options, image, sentBy, footer = '🔥 InfernoBot') {
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setDescription(options.map((o, i) => `${POLL_EMOJI[i]} ${o}`).join('\n'))
    .setColor(0x5865F2)
    .setTimestamp()
    .setFooter({ text: footer });
  if (image) embed.setImage(image);
  const msg = await channel.send({ embeds: [embed] });
  for (let i = 0; i < options.length; i++) await msg.react(POLL_EMOJI[i]);
  await db.addPoll(guild.id, channel.id, msg.id, question, options, sentBy);
  return msg;
}

// ── Client ────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const loaded = require(path.join(commandsPath, file));
    for (const cmd of (Array.isArray(loaded) ? loaded : [loaded])) {
      client.commands.set(cmd.data.name, cmd);
    }
  }
}

// Handler modules
const deps = { db, t, Design, Embed, Button, Row };
const { handlePermissionsPanel, handlePermsEdit, handlePermsToggle, handlePermsSelectAll, PERMISSIONS } = require('./handlers/perms')(deps);
const { handleStaffPanel, handleStaffTabs, handleRolesTab } = require('./handlers/staff')(deps);

async function showStaffPermsPanel(interaction, locale, userId, page = 0) {
  const { rows } = await db.getStaffMember(interaction.guildId, userId);
  const member = rows[0];
  if (!member) return interaction.reply({ content: t('ASTAFF_NOT_FOUND', locale), flags: 64 });
  const perms = new Set(member.permissions || []);

  // read page from footer if not explicitly passed
  if (page === 0) {
    const footer = interaction.message?.embeds?.[0]?.footer?.text || '';
    const m = footer.match(/(\d+)\/(\d+)/);
    if (m) page = parseInt(m[1]) - 1;
  }
  if (interaction.customId === `astaff_pprev_${userId}`) page = Math.max(0, page - 1);
  if (interaction.customId === `astaff_pnext_${userId}`) page++;

  const PERMS_PER_PAGE = 6;
  const totalPages = Math.ceil(PERMISSIONS.length / PERMS_PER_PAGE);
  page = Math.min(page, totalPages - 1);
  const pagePerms = PERMISSIONS.slice(page * PERMS_PER_PAGE, (page + 1) * PERMS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setTitle(`🔑 ${t('ASTAFF_PERMS_TITLE', locale)} — <@${userId}>`)
    .setDescription(`**${perms.size}/${PERMISSIONS.length}** ${t('PERMS_SAVED', locale).replace('✅ ', '')}`)
    .setColor(Design.colors.primary)
    .setFooter({ text: `📄 ${page + 1}/${totalPages} • 🔥 InfernoBot` });

  const toggleRows = [];
  for (let i = 0; i < pagePerms.length; i += 2) {
    toggleRows.push(new ActionRowBuilder().addComponents(
      [pagePerms[i], pagePerms[i + 1]].filter(Boolean).map(p =>
        new ButtonBuilder()
          .setCustomId(`astaff_ptoggle_${userId}_${p.key}`)
          .setLabel(`${p.icon} ${t(p.labelKey, locale)}`)
          .setStyle(perms.has(p.key) ? ButtonStyle.Success : ButtonStyle.Secondary)
      )
    ));
  }
  toggleRows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`astaff_pall_${userId}`).setLabel(t('SELECT_ALL', locale)).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`astaff_pnone_${userId}`).setLabel(t('DESELECT_ALL', locale)).setStyle(ButtonStyle.Secondary),
  ));
  toggleRows.push(Row.nav(page + 1, totalPages, `astaff_pprev_${userId}`, `astaff_pnext_${userId}`, 'astaff_tab_staff'));
  await interaction.update({ embeds: [embed], components: toggleRows });
}

// ── Ready ─────────────────────────────────────────────────────
client.once('clientReady', async () => {
  try { await initDB(); console.log('✅ DB inizializzato'); }
  catch (err) { console.error('❌ DB error:', err); process.exit(1); }

  startScheduler(client);

  // ── Event bus listeners ──────────────────────────────────────
  // mod:action → send to log channel (handled by sendLog in mod.js already,
  // but bus allows other subscribers like future analytics)
  bus.on('mod:action', ({ guild, action, userId, moderatorId, reason, duration }) => {
    // sendLog is already called directly in mod.js; this is for future subscribers
  });

  // guild:memberAdd → send welcome message if configured
  bus.on('guild:memberAdd', async ({ member }) => {
    try {
      const settings = await getSettings(member.guild.id);
      if (!settings.welcome_channel || !settings.welcome_message) return;
      const channel = await member.guild.channels.fetch(settings.welcome_channel).catch(() => null);
      if (!channel?.isTextBased()) return;
      const msg = settings.welcome_message
        .replace('{user}', `<@${member.id}>`)
        .replace('{server}', member.guild.name)
        .replace('{count}', String(member.guild.memberCount));
      await channel.send(msg);
    } catch (err) {
      console.error('[welcome]', err.message);
    }
  });

  bus.emit('bot:ready');
  console.log(t('BOT_READY'));
  try {
    const ids = process.env.GUILD_ID ? process.env.GUILD_ID.split(',').map(s => s.trim()) : [];
    for (const id of ids) await syncPermissionsFromConfig(id);
  } catch (err) { console.error('❌ sync perms:', err); }

  // Deploy slash commands
  try {
    const allCommands = [...client.commands.values()];
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const connected = client.guilds.cache.map(g => g.id);

    // /guildrequest must be global so non-whitelisted servers can use it
    const globalCmds = allCommands.filter(c => c.data.name === 'guildrequest').map(c => c.data.toJSON());
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globalCmds });
    console.log('✅ /guildrequest registrato globalmente');

    // All other commands go to whitelisted guilds only
    const guildCmds = allCommands.filter(c => c.data.name !== 'guildrequest').map(c => c.data.toJSON());
    const targets = allowedGuilds.length
      ? allowedGuilds.map(String)
      : process.env.GUILD_ID ? process.env.GUILD_ID.split(',').map(s => s.trim()) : [];

    if (targets.length) {
      let ok = 0;
      for (const guildId of targets) {
        if (!connected.includes(guildId)) { console.log(`⚠️ skip guild ${guildId}`); continue; }
        try {
          await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: guildCmds });
          ok++;
        } catch (err) { console.error(`❌ deploy guild ${guildId}:`, err.message); }
      }
      console.log(`✅ ${guildCmds.length} comandi in ${ok}/${targets.length} guild(s)`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [...globalCmds, ...guildCmds] });
      console.log(`⚠️ ${allCommands.length} comandi globali`);
    }
  } catch (err) { console.error('❌ deploy comandi:', err); }
});

// ── Welcome: forward Discord guildMemberAdd to bus ───────────
client.on('guildMemberAdd', member => {
  if (!isGuildAllowed(member.guild.id)) return;
  bus.emit('guild:memberAdd', { member });
});

// ── Guild-request buttons (work from DMs, owner-only) ─────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const { customId } = interaction;
  if (!customId.startsWith('gapprove_') && !customId.startsWith('greject_')) return;

  if (!isOwner(interaction.user.id)) {
    return interaction.reply({ content: '❌ Solo il proprietario del bot.', flags: 64 });
  }

  const isApprove = customId.startsWith('gapprove_');
  const requestId = customId.replace('gapprove_', '').replace('greject_', '');

  try {
    const { rows } = await db.getGuildRequest(requestId);
    if (!rows.length) return interaction.reply({ content: '❌ Richiesta non trovata.', flags: 64 });
    const req = rows[0];

    if (isApprove) {
      await db.approveGuildRequest(requestId, interaction.user.id);
      const cfgPath = path.join(__dirname, '..', 'guilds.json');
      const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : { allowed_guilds: [] };
      if (!cfg.allowed_guilds.includes(req.guild_id)) {
        cfg.allowed_guilds.push(req.guild_id);
        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        loadGuildsConfig();
      }
      await interaction.update({
        embeds: [new EmbedBuilder().setTitle('✅ Approvata').setDescription(`**${req.guild_name}** aggiunto alla whitelist.`).setColor(0x57F287).setTimestamp()],
        components: [],
      });
    } else {
      await db.rejectGuildRequest(requestId, interaction.user.id, null);
      await interaction.update({
        embeds: [new EmbedBuilder().setTitle('❌ Rifiutata').setDescription(`Richiesta per **${req.guild_name}** rifiutata.`).setColor(0xED4245).setTimestamp()],
        components: [],
      });
    }
  } catch (err) {
    await interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
  }
});

// ── Setting buttons → open modal ─────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  if (!SETTING_MODAL_MAP[interaction.customId]) return;
  const locale = await guildLocale(interaction.guildId);
  const { key, label, title } = SETTING_MODAL_MAP[interaction.customId];
  const isParagraph = key === 'welcome_message';
  const modal = new ModalBuilder()
    .setCustomId(`setting_submit_${key}`)
    .setTitle(t(title, locale))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('value').setLabel(t(label, locale))
        .setStyle(isParagraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder(isParagraph ? 'Usa {user}, {server}, {count}' : ''),
    ));
  await interaction.showModal(modal).catch(err => console.error('showModal:', err));
});

// ── Main interaction handler ──────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!isGuildAllowed(interaction.guildId) && interaction.commandName !== 'guildrequest') return;
  const locale = await guildLocale(interaction.guildId);

  try {
    // ── Slash commands ──────────────────────────────────────────
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return interaction.reply({ content: t('COMMAND_NOT_FOUND', locale), flags: 64 });
      try { await command.execute(interaction, t); }
      catch (err) {
        console.error(err);
        const payload = { content: t('ERROR', locale), flags: 64 };
        interaction.replied || interaction.deferred
          ? await interaction.followUp(payload)
          : await interaction.reply(payload);
      }
      return;
    }

    // ── Buttons ─────────────────────────────────────────────────
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Admin panels
      if (customId === 'admin_root') {
        return interaction.update(Panels.adminMain(locale));
      }
      if (customId === 'admin_settings') {
        const panel = Panels.settingsBot(await getSettings(interaction.guildId), locale);
        panel.components.push(Row.withBack([], 'admin_root'));
        return interaction.update(panel);
      }
      if (customId === 'admin_bot_settings') {
        const s = await getSettings(interaction.guildId);
        return interaction.update({
          embeds: [Embed.panel(t('SETTINGS_BOT_TITLE', locale), t('SETTINGS_BOT_DESC', locale), 'settings', { fields: buildSettingsFields(s, locale, t) })],
          components: buildSettingsButtons(locale, t, Button),
        });
      }
      if (customId === 'admin_server_settings') {
        await interaction.guild.fetch();
        return interaction.update({ embeds: [Embed.serverInfo(interaction.guild)], components: [Row.withBack([], 'admin_settings')] });
      }

      // Permissions
      if (customId === 'admin_permissions' || customId.startsWith('perms_page_')) return handlePermissionsPanel(interaction, locale);
      if (customId.startsWith('perms_edit_'))        return handlePermsEdit(interaction, locale);
      if (customId.startsWith('perms_toggle_'))      return handlePermsToggle(interaction, locale);
      if (customId.startsWith('perms_select_all_'))  return handlePermsSelectAll(interaction, locale, true);
      if (customId.startsWith('perms_deselect_all_'))return handlePermsSelectAll(interaction, locale, false);

      if (customId.startsWith('perms_reset_') && !customId.startsWith('perms_reset_confirm_')) {
        const roleId = customId.replace('perms_reset_', '');
        return interaction.update({
          embeds: [Embed.confirm(t('CONFIRM_RESET_TITLE', locale), t('CONFIRM_RESET_DESC', locale, { roleId }), true)],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`perms_reset_confirm_${roleId}`).setLabel(t('CONFIRM_YES_RESET', locale)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('admin_permissions').setLabel(t('CONFIRM_CANCEL', locale)).setStyle(ButtonStyle.Secondary),
          )],
        });
      }
      if (customId.startsWith('perms_reset_confirm_')) {
        const roleId = customId.replace('perms_reset_confirm_', '');
        await db.setRolePermissions(interaction.guildId, roleId, {}, interaction.user.id);
        return handlePermsEdit(interaction, locale, true);
      }

      // Staff admin panel
      if (customId === 'admin_staff')                                    return handleStaffPanel(interaction, locale);
      if (customId === 'astaff_tab_staff' || customId === 'astaff_tab_users') return handleStaffTabs(interaction, locale);
      if (customId === 'astaff_tab_roles') return handleRolesTab(interaction, locale);
      if (customId.startsWith('astaff_roles_page_')) return handleRolesTab(interaction, locale);

      if (customId.startsWith('astaff_link_role_')) {
        const discordRoleId = customId.replace('astaff_link_role_', '');
        const role = interaction.guild.roles.cache.get(discordRoleId);
        const modal = new ModalBuilder()
          .setCustomId(`astaff_link_submit_${discordRoleId}`)
          .setTitle(`🔗 ${role?.name || discordRoleId}`)
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('staff_role')
              .setLabel('Ruolo staff (lascia vuoto per rimuovere)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setPlaceholder('es. moderatore, admin, capo...'),
          ));
        return interaction.showModal(modal);
      }

      if (customId.startsWith('astaff_promote_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_promote'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const userId = customId.replace('astaff_promote_', '');
        const { rows } = await db.getStaffMember(interaction.guildId, userId);
        if (!rows.length) return interaction.reply({ content: t('ASTAFF_NOT_FOUND', locale), flags: 64 });
        const next = { moderator: 'admin', admin: 'owner', owner: 'moderator' };
        const newRole = next[rows[0].role] || 'moderator';
        await db.updateStaffRole(interaction.guildId, userId, newRole);
        return interaction.reply({ content: t('ASTAFF_ROLE_UPDATED', locale, { user: `<@${userId}>`, role: newRole }), flags: 64 });
      }
      if (customId.startsWith('astaff_remove_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_remove'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const userId = customId.replace('astaff_remove_', '');
        await db.removeStaff(interaction.guildId, userId);
        return interaction.reply({ content: t('ASTAFF_REMOVED', locale, { user: `<@${userId}>` }), flags: 64 });
      }

      if (customId.startsWith('astaff_setrole_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_setrole'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const userId = customId.replace('astaff_setrole_', '');
        const modal = new ModalBuilder()
          .setCustomId(`astaff_setrole_submit_${userId}`)
          .setTitle(t('ASTAFF_SETROLE_TITLE', locale))
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('role').setLabel(t('ASTAFF_INPUT_ROLE', locale)).setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('moderator / admin / owner'),
          ));
        return interaction.showModal(modal);
      }

      if (customId.startsWith('astaff_addstaff_')) {
        const userId = customId.replace('astaff_addstaff_', '');
        const modal = new ModalBuilder()
          .setCustomId(`astaff_addstaff_submit_${userId}`)
          .setTitle(t('ASTAFF_ADD_TITLE', locale))
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('role').setLabel(t('ASTAFF_INPUT_ROLE', locale)).setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('es. moderatore, admin, capo...'),
          ));
        return interaction.showModal(modal);
      }

      if (customId.startsWith('astaff_perms_') && !customId.startsWith('astaff_ptoggle_') && !customId.startsWith('astaff_pall_') && !customId.startsWith('astaff_pnone_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_perms'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const userId = customId.replace('astaff_perms_', '');
        return showStaffPermsPanel(interaction, locale, userId, 0);
      }
      if (customId.startsWith('astaff_pprev_') || customId.startsWith('astaff_pnext_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_perms'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const userId = customId.replace('astaff_pprev_', '').replace('astaff_pnext_', '');
        return showStaffPermsPanel(interaction, locale, userId);
      }
      if (customId.startsWith('astaff_ptoggle_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'staff_perms'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const [,, userId, ...permParts] = customId.split('_');
        const permKey = permParts.join('_');
        const { rows } = await db.getStaffMember(interaction.guildId, userId);
        const perms = new Set(rows[0]?.permissions || []);
        perms.has(permKey) ? perms.delete(permKey) : perms.add(permKey);
        await db.updateStaffPerms(interaction.guildId, userId, [...perms]);
        return showStaffPermsPanel(interaction, locale, userId);
      }
      if (customId.startsWith('astaff_pall_')) {
        const userId = customId.replace('astaff_pall_', '');
        await db.updateStaffPerms(interaction.guildId, userId, PERMISSIONS.map(p => p.key));
        return showStaffPermsPanel(interaction, locale, userId);
      }
      if (customId.startsWith('astaff_pnone_')) {
        const userId = customId.replace('astaff_pnone_', '');
        await db.updateStaffPerms(interaction.guildId, userId, []);
        return showStaffPermsPanel(interaction, locale, userId);
      }

      // Staff menu
      if (customId === 'staff_root') return interaction.update(Panels.staffMain(locale));

      if (customId === 'moderation') {
        return interaction.update({
          embeds: [Embed.panel(t('STAFF_TITLE', locale), t('STAFF_SECTION_MODERATION', locale), 'moderation')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mod_actions').setLabel(t('BUTTON_MOD_ACTIONS', locale)).setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
            new ButtonBuilder().setCustomId('mod_history').setLabel(t('BUTTON_MOD_HISTORY', locale)).setStyle(ButtonStyle.Primary).setEmoji('📋'),
            Button.back('staff_root'),
          )],
        });
      }

      if (customId === 'mod_history' || customId.startsWith('mod_history_page_')) {
        const PAGE = 10;
        let page = 0;
        if (customId.startsWith('mod_history_page_')) page = parseInt(customId.replace('mod_history_page_', '')) || 0;
        const { rows } = await db.getRecentActions(interaction.guildId, 200);
        if (!rows.length)
          return interaction.update({ embeds: [Embed.success(t('MOD_HISTORY_TITLE', locale), t('MOD_HISTORY_EMPTY', locale))], components: [Row.withBack([], 'moderation')] });
        const totalPages = Math.ceil(rows.length / PAGE);
        page = Math.max(0, Math.min(page, totalPages - 1));
        const slice = rows.slice(page * PAGE, (page + 1) * PAGE);
        const lines = slice.map((r, i) =>
          `**${page * PAGE + i + 1}.** **${r.action}** <@${r.user_id}> — ${r.reason || '—'} (<@${r.moderator_id}>, ${new Date(r.created_at).toLocaleDateString('ru')})`
        );
        const navRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`mod_history_page_${page - 1}`).setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId(`mod_history_page_${page + 1}`).setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
          Button.back('moderation'),
        );
        return interaction.update({ embeds: [Embed.list(t('MOD_HISTORY_TITLE', locale), lines, page + 1, totalPages, 'moderation')], components: [navRow] });
      }

      if (customId === 'mod_actions') {
        return interaction.update({
          embeds: [Embed.panel(t('MOD_ACTIONS_TITLE', locale), [
            '`/mod kick @user [reason]`', '`/mod ban @user [reason] [duration]`',
            '`/mod unban <id> [reason]`', '`/mod mute @user [reason] [duration]`',
            '`/mod unmute @user [reason]`', '`/mod warn @user [reason]`', '`/mod remwarn @user`',
          ].join('\n'), 'moderation')],
          components: [Row.withBack([], 'moderation')],
        });
      }

      // Communication
      if (customId === 'communication') {
        return interaction.update({
          embeds: [Embed.panel(t('STAFF_TITLE', locale), t('STAFF_SECTION_COMMUNICATION', locale), 'reports')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('comm_reports').setLabel(t('BUTTON_COMM_REPORTS', locale)).setStyle(ButtonStyle.Primary).setEmoji('📋'),
            new ButtonBuilder().setCustomId('comm_otchety').setLabel(t('BUTTON_COMM_OTCHETY', locale)).setStyle(ButtonStyle.Primary).setEmoji('📊'),
            Button.back('staff_root'),
          )],
        });
      }

      if (customId === 'comm_reports') {
        const { rows } = await db.getRecentReports(interaction.guildId, 5);
        if (!rows.length)
          return interaction.update({ embeds: [Embed.success(t('BUTTON_COMM_REPORTS', locale), t('REPORT_EMPTY', locale))], components: [Row.withBack([], 'communication')] });
        const desc = rows.map((r, i) => `**${i + 1}.** <@${r.reporter_id}> → <@${r.target_id}>: ${r.reason} [${r.status}]`).join('\n');
        const components = rows.map(r => new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`rep_reply_${r.id}`).setLabel(t('REPORT_BTN_REPLY', locale)).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`rep_rate_${r.id}`).setLabel(t('REPORT_BTN_RATE', locale)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rep_del_${r.id}`).setLabel(t('REPORT_BTN_DELETE', locale)).setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`rep_punish_${r.id}`).setLabel(t('REPORT_BTN_PUNISH', locale)).setStyle(ButtonStyle.Danger),
        ));
        components.push(Row.withBack([], 'communication'));
        return interaction.update({ embeds: [Embed.panel(t('BUTTON_COMM_REPORTS', locale), desc, 'reports')], components });
      }

      if (customId.startsWith('rep_del_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'reports_delete'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        await db.deleteReport(customId.replace('rep_del_', ''));
        return interaction.update({ embeds: [Embed.success(t('BUTTON_COMM_REPORTS', locale), t('REPORT_DELETED', locale))], components: [Row.withBack([], 'comm_reports')] });
      }

      if (customId.startsWith('rep_reply_') || customId.startsWith('rep_rate_')) {
        const isReply = customId.startsWith('rep_reply_');
        if (!await hasPermission(interaction.guild, interaction.user.id, isReply ? 'reports_reply' : 'reports_rate'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const id = customId.replace(isReply ? 'rep_reply_' : 'rep_rate_', '');
        const modal = new ModalBuilder()
          .setCustomId(isReply ? `rep_submit_reply_${id}` : `rep_submit_rate_${id}`)
          .setTitle(t(isReply ? 'REPORT_MODAL_REPLY' : 'REPORT_MODAL_RATE', locale))
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('value')
              .setLabel(t(isReply ? 'REPORT_INPUT_REPLY' : 'REPORT_INPUT_RATING', locale))
              .setStyle(isReply ? TextInputStyle.Paragraph : TextInputStyle.Short)
              .setRequired(true),
          ));
        return interaction.showModal(modal);
      }

      if (customId.startsWith('rep_punish_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'reports_punish'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const { rows } = await db.getReport(customId.replace('rep_punish_', ''));
        if (!rows.length) return interaction.reply({ content: t('REPORT_NOT_FOUND', locale), flags: 64 });
        const target = rows[0].target_id;
        return interaction.update({
          embeds: [Embed.panel(t('REPORT_BTN_PUNISH', locale), `Seleziona il castigo per <@${target}>:`, 'moderation')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`modaction_kick_${target}`).setLabel('👢 Kick').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`modaction_ban_${target}`).setLabel('🔨 Ban').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`modaction_mute_${target}`).setLabel('🔇 Mute').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`modaction_warn_${target}`).setLabel('⚠️ Warn').setStyle(ButtonStyle.Secondary),
            Button.back('comm_reports'),
          )],
        });
      }

      // Otchety
      if (customId === 'comm_otchety') {
        return interaction.update({
          embeds: [Embed.panel(t('OTCHET_TITLE', locale), t('OTCHET_SELECT_ACTION', locale), 'otchety')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('otch_list').setLabel(t('OTCHET_BTN_LIST', locale)).setStyle(ButtonStyle.Primary).setEmoji('📋'),
            new ButtonBuilder().setCustomId('otch_create').setLabel(t('OTCHET_BTN_SEND', locale)).setStyle(ButtonStyle.Success).setEmoji('✏️'),
            Button.back('communication'),
          )],
        });
      }

      if (customId === 'otch_list' || customId.startsWith('otch_page_')) {
        const PAGE = 4;
        let page = 0;
        if (customId.startsWith('otch_page_')) page = parseInt(customId.replace('otch_page_', '')) || 0;
        const { rows } = await db.getOtchety(interaction.guildId);
        if (!rows.length)
          return interaction.update({ embeds: [Embed.panel(t('OTCHET_LIST_TITLE', locale), t('OTCHET_EMPTY', locale), 'otchety')], components: [Row.withBack([], 'comm_otchety')] });
        const totalPages = Math.ceil(rows.length / PAGE);
        page = Math.max(0, Math.min(page, totalPages - 1));
        const slice = rows.slice(page * PAGE, (page + 1) * PAGE);
        const desc = rows.map((r, i) => `**${i + 1}.** **${r.name}** — ${r.data} (<@${r.author_id}>)`).join('\n');
        const components = slice.map(r => new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`otch_view_${r.id}`).setLabel(r.name.substring(0, 20)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`otch_edit_${r.id}`).setLabel('✏️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`otch_del_${r.id}`).setLabel('🗑️').setStyle(ButtonStyle.Danger),
        ));
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`otch_page_${page - 1}`).setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId(`otch_page_${page + 1}`).setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
          Button.back('comm_otchety'),
        ));
        return interaction.update({ embeds: [Embed.list(t('OTCHET_LIST_TITLE', locale), desc.split('\n').slice(page * PAGE, (page + 1) * PAGE), page + 1, totalPages, 'otchety')], components });
      }

      if (customId.startsWith('otch_view_')) {
        const { rows } = await db.getOtchet(customId.replace('otch_view_', ''));
        if (!rows.length) return interaction.reply({ content: t('OTCHET_NOT_FOUND', locale), flags: 64 });
        const r = rows[0];
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`📄 ${r.name}`).setColor(Design.colors.otchety)
            .addFields(
              { name: t('OTCHET_FIELD_DATE', locale),   value: r.data,          inline: true },
              { name: t('OTCHET_FIELD_AUTHOR', locale),  value: `<@${r.author_id}>`, inline: true },
              { name: t('OTCHET_FIELD_DONE', locale),    value: r.chto_sdelal },
              { name: t('OTCHET_FIELD_TODO', locale),    value: r.chto_ostalos },
              { name: t('OTCHET_FIELD_NOTES', locale),   value: r.notes || t('OTCHET_NO_NOTES', locale) },
            ).setTimestamp()],
          components: [Row.withBack([], 'otch_list')],
        });
      }

      if (customId.startsWith('otch_del_')) {
        if (!await hasPermission(interaction.guild, interaction.user.id, 'otchety_delete'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        await db.deleteOtchet(customId.replace('otch_del_', ''));
        return interaction.update({ embeds: [Embed.success(t('OTCHET_DELETED_TITLE', locale), t('OTCHET_DELETED', locale))], components: [Row.withBack([], 'otch_list')] });
      }

      if (customId === 'otch_create' || customId.startsWith('otch_edit_')) {
        const editId = customId.startsWith('otch_edit_') ? customId.replace('otch_edit_', '') : null;
        if (!await hasPermission(interaction.guild, interaction.user.id, editId ? 'otchety_edit' : 'otchety_create'))
          return interaction.reply({ content: t('MOD_NO_PERMISSION', locale), flags: 64 });
        const modal = new ModalBuilder()
          .setCustomId(editId ? `otch_submit_edit_${editId}` : 'otch_submit_new')
          .setTitle(t(editId ? 'OTCHET_MODAL_EDIT' : 'OTCHET_MODAL_NEW', locale))
          .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('data').setLabel(t('OTCHET_INPUT_DATE', locale)).setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel(t('OTCHET_INPUT_NAME', locale)).setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('chto_sdelal').setLabel(t('OTCHET_INPUT_DONE', locale)).setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('chto_ostalos').setLabel(t('OTCHET_INPUT_TODO', locale)).setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel(t('OTCHET_INPUT_NOTES', locale)).setStyle(TextInputStyle.Paragraph).setRequired(false)),
          );
        return interaction.showModal(modal);
      }

      // Profile
      if (customId === 'profile') {
        const { user, member, guildId } = interaction;
        const [warns, bans, mutes, kicks] = await Promise.all([
          db.getWarnings(guildId, user.id), db.getBans(guildId, user.id),
          db.getMutes(guildId, user.id),    db.getKicks(guildId, user.id),
        ]);
        const roles = member.roles.cache
          .filter(r => r.id !== guildId)
          .sort((a, b) => b.position - a.position)
          .map(r => `<@&${r.id}>`).join(' ') || t('PROFILE_NO_ROLES', locale);
        return interaction.update({
          embeds: [new EmbedBuilder()
            .setTitle(`👤 ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setColor(member.displayColor || Design.colors.primary)
            .addFields(
              { name: '📅 Entrato', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt / 1000)}:R>` : '—', inline: true },
              { name: '⚠️ Warnings', value: String(warns.rows.length), inline: true },
              { name: '🔨 Bans',     value: String(bans.rows.length),  inline: true },
              { name: '🔇 Mute',     value: String(mutes.rows.length), inline: true },
              { name: '👢 Kick',     value: String(kicks.rows.length), inline: true },
              { name: '🎭 Ruoli',    value: roles, inline: false },
            ).setTimestamp().setFooter({ text: '🔥 InfernoBot • Profilo' })],
          components: [Row.withBack([], 'staff_root')],
        });
      }

      // Mod-action quick buttons (from report punish panel)
      // Fix: use \d+ to match numeric Discord IDs only
      if (/^modaction_(kick|ban|mute|warn)_\d+$/.test(customId)) {
        const [, action, userId] = customId.split('_');
        const modal = new ModalBuilder()
          .setCustomId(`modexec_${action}_${userId}`)
          .setTitle(`${action.toUpperCase()} <@${userId}>`)
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('reason').setLabel(t('LOG_REASON', locale)).setStyle(TextInputStyle.Short).setRequired(false),
          ));
        if (action === 'ban' || action === 'mute') {
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('duration').setLabel(t('MOD_DURATION_LABEL', locale)).setStyle(TextInputStyle.Short).setRequired(false),
          ));
        }
        return interaction.showModal(modal);
      }

      if (customId === 'admin_community') {
        return interaction.update({
          embeds: [Embed.panel(t('ADMIN_COMMUNITY', locale), t('ACOMMUNITY_SELECT_TAB', locale), 'community')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('acommunity_messages').setLabel(t('ACOMMUNITY_MESSAGES', locale)).setStyle(ButtonStyle.Primary).setEmoji('💬'),
            new ButtonBuilder().setCustomId('acommunity_polls').setLabel(t('ACOMMUNITY_POLLS', locale)).setStyle(ButtonStyle.Primary).setEmoji('📊'),
            new ButtonBuilder().setCustomId('acommunity_giveaways').setLabel(t('ACOMMUNITY_GIVEAWAYS', locale)).setStyle(ButtonStyle.Success).setEmoji('🎉'),
            Button.back('admin_root'),
          )],
        });
      }

      if (customId === 'apolls_templates' || customId.startsWith('apolls_templates_page_')) {
        const PAGE_SIZE = 4;
        const page = customId.startsWith('apolls_templates_page_')
          ? parseInt(customId.replace('apolls_templates_page_', ''), 10)
          : 0;
        const { rows: countRows } = await db.countPollTemplates(interaction.guildId);
        const total = parseInt(countRows[0].count, 10);
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const safePage = Math.min(Math.max(page, 0), totalPages - 1);
        const { rows } = await db.getPollTemplates(interaction.guildId, PAGE_SIZE, safePage * PAGE_SIZE);

        const embed = new EmbedBuilder()
          .setTitle(t('APOLLS_TEMPLATES', locale))
          .setColor(0x5865F2)
          .setFooter({ text: `🔥 InfernoBot • ${t('APOLLS_TEMPLATES', locale)} • ${safePage + 1}/${totalPages}` })
          .setTimestamp();

        if (!rows.length) {
          embed.setDescription(t('APOLLS_TEMPLATES_EMPTY', locale));
        } else {
          embed.setDescription(rows.map((r, i) =>
            `**${safePage * PAGE_SIZE + i + 1}.** ${r.name}\n> ${r.question}`
          ).join('\n\n'));
        }

        const components = [];
        for (const r of rows) {
          components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`apolls_tmpl_send_${r.id}`).setLabel(t('APOLLS_TMPL_SEND', locale)).setStyle(ButtonStyle.Success).setEmoji('📤'),
            new ButtonBuilder().setCustomId(`apolls_tmpl_view_${r.id}`).setLabel(t('APOLLS_TMPL_VIEW', locale)).setStyle(ButtonStyle.Secondary).setEmoji('👁️'),
            new ButtonBuilder().setCustomId(`apolls_tmpl_edit_${r.id}`).setLabel(t('APOLLS_TMPL_EDIT', locale)).setStyle(ButtonStyle.Primary).setEmoji('✏️'),
            new ButtonBuilder().setCustomId(`apolls_tmpl_del_${r.id}`).setLabel(t('APOLLS_TMPL_DEL', locale)).setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
          ));
        }

        const navButtons = [
          new ButtonBuilder().setCustomId(`apolls_templates_page_${safePage - 1}`).setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(safePage <= 0),
          new ButtonBuilder().setCustomId('apolls_tmpl_new').setLabel(t('APOLLS_CREATE', locale)).setStyle(ButtonStyle.Primary).setEmoji('➕'),
          new ButtonBuilder().setCustomId(`apolls_templates_page_${safePage + 1}`).setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(safePage >= totalPages - 1),
          Button.back('acommunity_polls'),
        ];
        components.push(new ActionRowBuilder().addComponents(navButtons));

        return interaction.update({ embeds: [embed], components });
      }

      // ── Poll template actions ─────────────────────────────────
      if (customId.startsWith('apolls_tmpl_view_')) {
        const id = customId.replace('apolls_tmpl_view_', '');
        const { rows } = await db.getPollTemplate(id);
        if (!rows.length) return interaction.update({ embeds: [Embed.error(t('ERROR', locale), t('APOLLS_NOT_FOUND', locale))], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });
        const r = rows[0];
        const embed = new EmbedBuilder()
          .setTitle(`📋 ${r.name}`)
          .setDescription(`**${r.question}**\n\n${r.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`)
          .setColor(0x5865F2)
          .setTimestamp()
          .setFooter({ text: `🔥 InfernoBot • Template #${r.id}${r.channel_id ? ` • <#${r.channel_id}>` : ''}` });
        if (r.image) embed.setImage(r.image);
        return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });
      }

      if (customId.startsWith('apolls_tmpl_del_confirm_')) {
        const id = customId.replace('apolls_tmpl_del_confirm_', '');
        await db.deletePollTemplate(id);
        return interaction.update({
          embeds: [Embed.success(t('APOLLS_DELETED_TITLE', locale), t('APOLLS_DELETED_DESC', locale))],
          components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))],
        });
      }
      if (customId.startsWith('apolls_tmpl_del_')) {
        const id = customId.replace('apolls_tmpl_del_', '');
        const { rows } = await db.getPollTemplate(id);
        if (!rows.length) return interaction.update({ embeds: [Embed.error(t('ERROR', locale), t('APOLLS_NOT_FOUND', locale))], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });
        return interaction.update({
          embeds: [Embed.panel(t('APOLLS_DEL_CONFIRM_TITLE', locale), t('APOLLS_DEL_CONFIRM_DESC', locale, { name: rows[0].name }), 'community')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`apolls_tmpl_del_confirm_${id}`).setLabel(t('APOLLS_DEL_CONFIRM_BTN', locale)).setStyle(ButtonStyle.Danger),
            Button.back('apolls_templates'),
          )],
        });
      }

      if (customId.startsWith('apolls_tmpl_send_')) {
        const id = customId.replace('apolls_tmpl_send_', '');
        const { rows } = await db.getPollTemplate(id);
        if (!rows.length) return interaction.update({ embeds: [Embed.error(t('ERROR', locale), t('APOLLS_NOT_FOUND', locale))], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });
        const r = rows[0];
        if (!r.channel_id) return interaction.update({ embeds: [Embed.error(t('ERROR', locale), t('APOLLS_NO_CHANNEL', locale))], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });
        const channel = interaction.guild.channels.cache.get(r.channel_id);
        if (!channel) return interaction.update({ embeds: [Embed.error(t('ERROR', locale), t('APOLLS_CHANNEL_NOT_FOUND', locale))], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });
        await sendPoll(interaction.guild, channel, r.question, r.options, r.image, interaction.user.id, `📋 ${r.name} • 🔥 InfernoBot`);
        return interaction.update({
          embeds: [Embed.success(t('APOLLS_SENT_TITLE', locale), t('APOLLS_SENT_DESC', locale, { name: r.name, channel: r.channel_id }))],
          components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))],
        });
      }

      if (customId.startsWith('apolls_tmpl_edit_')) {
        const id = customId.replace('apolls_tmpl_edit_', '');
        const { rows } = await db.getPollTemplate(id);
        if (!rows.length) return interaction.update({ embeds: [Embed.error(t('ERROR', locale), t('APOLLS_NOT_FOUND', locale))], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });
        const r = rows[0];
        const wKey = `${interaction.guildId}_${interaction.user.id}`;
        pollWizard.set(wKey, { step: 'name', name: r.name, question: r.question, options: r.options, image: r.image || null, channel_id: r.channel_id || null, chPage: 0, editId: id });

        // Reuse wizard — same flow, on channel select it updates instead of inserts
        const draft = pollWizard.get(wKey);
        function wizardEmbedEdit(d) {
          const steps = ['name', 'question', 'options', 'image', 'channel'];
          const stepIdx = steps.indexOf(d.step);
          const fields = [];
          if (d.name)     fields.push({ name: t('APOLLS_FIELD_NAME', locale),     value: d.name,              inline: true });
          if (d.question) fields.push({ name: t('APOLLS_FIELD_QUESTION', locale),  value: d.question,           inline: true });
          if (d.options.length) fields.push({ name: t('APOLLS_FIELD_OPTIONS', locale, { count: d.options.length }), value: d.options.map((o,i)=>`${i+1}. ${o}`).join('\n'), inline: false });
          if (d.image)    fields.push({ name: t('APOLLS_FIELD_IMAGE', locale),     value: d.image,              inline: false });
          if (d.channel_id) fields.push({ name: t('APOLLS_FIELD_CHANNEL_WIZ', locale), value: `<#${d.channel_id}>`, inline: true });
          const stepLabels = [t('APOLLS_STEP_1',locale),t('APOLLS_STEP_2',locale),t('APOLLS_STEP_3',locale),t('APOLLS_STEP_4',locale),t('APOLLS_STEP_5',locale)];
          return new EmbedBuilder()
            .setTitle(`✏️ Modifica template — ${stepLabels[stepIdx] || ''}`)
            .setDescription((() => {
              const map = { name: t('APOLLS_EDIT_NAME',locale), question: t('APOLLS_EDIT_QUESTION',locale), options: t('APOLLS_EDIT_OPTIONS',locale), image: t('APOLLS_EDIT_IMAGE',locale), channel: t('APOLLS_EDIT_CHANNEL',locale) };
              return map[d.step] || d.step;
            })())
            .setColor(0xFFA500)
            .addFields(fields)
            .setFooter({ text: t('APOLLS_WIZARD_FOOTER', locale) })
            .setTimestamp();
        }
        function wizardComponentsEdit(d) {
          if (d.step === 'options') {
            const row = [new ButtonBuilder().setCustomId('apolls_wizard_opts_confirm').setLabel(t('APOLLS_OPTS_CONFIRM_BTN', locale)).setStyle(ButtonStyle.Success).setDisabled(d.options.length < 2)];
            if (d.options.length > 0) row.push(new ButtonBuilder().setCustomId('apolls_wizard_opts_remove').setLabel(t('APOLLS_OPTS_REMOVE_BTN', locale)).setStyle(ButtonStyle.Danger));
            row.push(Button.back('apolls_templates'));
            return [new ActionRowBuilder().addComponents(row)];
          }
          if (d.step === 'image') return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('apolls_wizard_image_skip').setLabel(t('APOLLS_IMAGE_SKIP_BTN', locale)).setStyle(ButtonStyle.Secondary), Button.back('apolls_templates'))];
          if (d.step === 'channel') {
            const channels = [...interaction.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread()).values()].sort((a,b) => a.position - b.position);
            const PAGE = 8; const chPage = d.chPage || 0;
            const slice = channels.slice(chPage * PAGE, chPage * PAGE + PAGE);
            const rows = [];
            for (let i = 0; i < slice.length; i += 4) rows.push(new ActionRowBuilder().addComponents(slice.slice(i,i+4).map(c => new ButtonBuilder().setCustomId(`apolls_wizard_ch_${c.id}`).setLabel('#'+c.name.substring(0,18)).setStyle(ButtonStyle.Secondary))));
            const nav = [];
            if (chPage > 0) nav.push(new ButtonBuilder().setCustomId('apolls_wizard_ch_prev').setLabel('◀️').setStyle(ButtonStyle.Secondary));
            if ((chPage+1)*PAGE < channels.length) nav.push(new ButtonBuilder().setCustomId('apolls_wizard_ch_next').setLabel('▶️').setStyle(ButtonStyle.Secondary));
            nav.push(Button.back('apolls_templates'));
            rows.push(new ActionRowBuilder().addComponents(nav));
            return rows;
          }
          return [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))];
        }
        await interaction.update({ embeds: [wizardEmbedEdit(draft)], components: wizardComponentsEdit(draft) });
        const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 300_000 });
        collector.on('collect', async msg => {
          await msg.delete().catch(() => {});
          const d = pollWizard.get(wKey);
          if (!d) return collector.stop();
          if (d.step === 'name')         { d.name = msg.content.trim().substring(0,100); d.step = 'question'; }
          else if (d.step === 'question') { d.question = msg.content.trim().substring(0,256); d.step = 'options'; }
          else if (d.step === 'options')  { if (d.options.length < 10) d.options.push(msg.content.trim().substring(0,100)); }
          else if (d.step === 'image')    { d.image = msg.content.trim(); d.step = 'channel'; }
          pollWizard.set(wKey, d);
          await interaction.editReply({ embeds: [wizardEmbedEdit(d)], components: wizardComponentsEdit(d) }).catch(() => {});
        });
        return;
      }

      // ── Poll template wizard ──────────────────────────────────
      if (customId === 'apolls_create' || customId === 'apolls_tmpl_new' || customId.startsWith('apolls_wizard_')) {
        const wKey = `${interaction.guildId}_${interaction.user.id}`;
        const isSave = customId === 'apolls_tmpl_new';

        // Helper: render wizard embed
        function wizardEmbed(draft) {
          const steps = ['name', 'question', 'options', 'image', 'channel'];
          const stepIdx = steps.indexOf(draft.step);
          const fields = [];
          if (draft.name)     fields.push({ name: t('APOLLS_FIELD_NAME', locale),     value: draft.name,                          inline: true });
          if (draft.question) fields.push({ name: t('APOLLS_FIELD_QUESTION', locale),  value: draft.question,                      inline: true });
          if (draft.options.length) fields.push({ name: t('APOLLS_FIELD_OPTIONS', locale, { count: draft.options.length }), value: draft.options.map((o,i)=>`${i+1}. ${o}`).join('\n'), inline: false });
          if (draft.image)    fields.push({ name: t('APOLLS_FIELD_IMAGE', locale),     value: draft.image,                         inline: false });
          if (draft.channel_id) fields.push({ name: t('APOLLS_FIELD_CHANNEL_WIZ', locale), value: `<#${draft.channel_id}>`,        inline: true });

          const stepLabels = [t('APOLLS_STEP_1',locale),t('APOLLS_STEP_2',locale),t('APOLLS_STEP_3',locale),t('APOLLS_STEP_4',locale),t('APOLLS_STEP_5',locale)];
          return new EmbedBuilder()
            .setTitle(`➕ ${t('APOLLS_CREATE', locale)} — ${stepLabels[stepIdx] || ''}`)
            .setDescription(wizardPrompt(draft.step, locale))
            .setColor(0x5865F2)
            .addFields(fields)
            .setFooter({ text: t('APOLLS_WIZARD_FOOTER', locale) })
            .setTimestamp();
        }

        function wizardPrompt(step, loc) {
          const map = {
            name:     { it: 'Scrivi il **nome** del template:', ru: 'Напиши **название** шаблона:', en: 'Write the template **name**:' },
            question: { it: 'Scrivi la **domanda** del sondaggio:', ru: 'Напиши **вопрос** опроса:', en: 'Write the poll **question**:' },
            options:  { it: 'Scrivi una **risposta** (poi aggiungi altre o conferma):', ru: 'Напиши **вариант ответа** (потом добавь ещё или подтверди):', en: 'Write an **answer option** (then add more or confirm):' },
            image:    { it: 'Incolla l\'**URL immagine** (o premi Salta):', ru: 'Вставь **URL изображения** (или нажми Пропустить):', en: 'Paste the **image URL** (or press Skip):' },
            channel:  { it: 'Scegli il **canale** dove inviare il sondaggio:', ru: 'Выбери **канал** для отправки опроса:', en: 'Choose the **channel** to send the poll to:' },
          };
          return map[step]?.[loc] || map[step]?.it || step;
        }

        function wizardComponents(draft) {
          if (draft.step === 'options') {
            const row = [
              new ButtonBuilder().setCustomId('apolls_wizard_opts_confirm').setLabel(t('APOLLS_OPTS_CONFIRM_BTN', locale)).setStyle(ButtonStyle.Success).setDisabled(draft.options.length < 2),
            ];
            if (draft.options.length > 0)
              row.push(new ButtonBuilder().setCustomId('apolls_wizard_opts_remove').setLabel(t('APOLLS_OPTS_REMOVE_BTN', locale)).setStyle(ButtonStyle.Danger));
            row.push(Button.back('apolls_templates'));
            return [new ActionRowBuilder().addComponents(row)];
          }
          if (draft.step === 'image') {
            return [new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('apolls_wizard_image_skip').setLabel(t('APOLLS_IMAGE_SKIP_BTN', locale)).setStyle(ButtonStyle.Secondary),
              Button.back('apolls_templates'),
            )];
          }
          if (draft.step === 'channel') {
            // Show text channels paginated (up to 4 per row, max 2 rows = 8)
            const channels = [...interaction.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread()).values()]
              .sort((a, b) => a.position - b.position);
            const chPage = draft.chPage || 0;
            const PAGE = 8;
            const slice = channels.slice(chPage * PAGE, chPage * PAGE + PAGE);
            const rows = [];
            for (let i = 0; i < slice.length; i += 4) {
              rows.push(new ActionRowBuilder().addComponents(
                slice.slice(i, i + 4).map(c =>
                  new ButtonBuilder().setCustomId(`apolls_wizard_ch_${c.id}`).setLabel('#' + c.name.substring(0, 18)).setStyle(ButtonStyle.Secondary)
                )
              ));
            }
            const navBtns = [];
            if (chPage > 0) navBtns.push(new ButtonBuilder().setCustomId('apolls_wizard_ch_prev').setLabel('◀️').setStyle(ButtonStyle.Secondary));
            if ((chPage + 1) * PAGE < channels.length) navBtns.push(new ButtonBuilder().setCustomId('apolls_wizard_ch_next').setLabel('▶️').setStyle(ButtonStyle.Secondary));
            navBtns.push(Button.back('apolls_templates'));
            rows.push(new ActionRowBuilder().addComponents(navBtns));
            return rows;
          }
          return [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))];
        }

        // ── Start wizard ──
        if (customId === 'apolls_create' || customId === 'apolls_tmpl_new') {
          pollWizard.set(wKey, { step: 'name', name: '', question: '', options: [], image: null, channel_id: null, chPage: 0, save: isSave });
          const draft = pollWizard.get(wKey);
          await interaction.update({ embeds: [wizardEmbed(draft)], components: wizardComponents(draft) });

          // Collect text input
          const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 300_000 });
          collector.on('collect', async msg => {
            await msg.delete().catch(() => {});
            const d = pollWizard.get(wKey);
            if (!d) return collector.stop();
            if (d.step === 'name') {
              d.name = msg.content.trim().substring(0, 100);
              d.step = 'question';
            } else if (d.step === 'question') {
              d.question = msg.content.trim().substring(0, 256);
              d.step = 'options';
            } else if (d.step === 'options') {
              if (d.options.length < 10) d.options.push(msg.content.trim().substring(0, 100));
            } else if (d.step === 'image') {
              d.image = msg.content.trim();
              d.step = 'channel';
            }
            pollWizard.set(wKey, d);
            await interaction.editReply({ embeds: [wizardEmbed(d)], components: wizardComponents(d) }).catch(() => {});
          });
          collector.on('end', () => { /* wizard cleaned up on save/cancel */ });
          return;
        }

        // ── Wizard button actions ──
        const draft = pollWizard.get(wKey);
        if (!draft) return interaction.update({ embeds: [Embed.panel(t('APOLLS_TEMPLATES', locale), t('APOLLS_SESSION_EXPIRED', locale), 'community')], components: [new ActionRowBuilder().addComponents(Button.back('apolls_templates'))] });

        if (customId === 'apolls_wizard_opts_confirm') {
          draft.step = 'image';
          pollWizard.set(wKey, draft);
          return interaction.update({ embeds: [wizardEmbed(draft)], components: wizardComponents(draft) });
        }
        if (customId === 'apolls_wizard_opts_remove') {
          draft.options.pop();
          pollWizard.set(wKey, draft);
          return interaction.update({ embeds: [wizardEmbed(draft)], components: wizardComponents(draft) });
        }
        if (customId === 'apolls_wizard_image_skip') {
          draft.step = 'channel';
          pollWizard.set(wKey, draft);
          return interaction.update({ embeds: [wizardEmbed(draft)], components: wizardComponents(draft) });
        }
        if (customId === 'apolls_wizard_ch_prev') {
          draft.chPage = Math.max(0, (draft.chPage || 0) - 1);
          pollWizard.set(wKey, draft);
          return interaction.update({ embeds: [wizardEmbed(draft)], components: wizardComponents(draft) });
        }
        if (customId === 'apolls_wizard_ch_next') {
          draft.chPage = (draft.chPage || 0) + 1;
          pollWizard.set(wKey, draft);
          return interaction.update({ embeds: [wizardEmbed(draft)], components: wizardComponents(draft) });
        }
        if (customId.startsWith('apolls_wizard_ch_')) {
          const channelId = customId.replace('apolls_wizard_ch_', '');
          draft.channel_id = channelId;
          if (draft.editId) {
            await db.updatePollTemplate(draft.editId, draft.name, draft.question, draft.options, draft.image, channelId);
          } else if (draft.save) {
            await db.addPollTemplate(interaction.guildId, draft.name, draft.question, draft.options, interaction.user.id, channelId);
          } else {
            // Send directly without saving
            const channel = interaction.guild.channels.cache.get(channelId);
            if (channel) await sendPoll(interaction.guild, channel, draft.question, draft.options, draft.image, interaction.user.id);
          }
          pollWizard.delete(wKey);
          const successMsg = draft.editId ? t('APOLLS_SUCCESS_UPDATED', locale, { name: draft.name }) : draft.save ? t('APOLLS_SUCCESS_SAVED', locale, { name: draft.name, channel: channelId }) : t('APOLLS_SUCCESS_SENT', locale, { channel: channelId });
          return interaction.update({
            embeds: [Embed.success(draft.save || draft.editId ? t('APOLLS_TEMPLATES', locale) : t('APOLLS_CREATE', locale), successMsg)],
            components: [new ActionRowBuilder().addComponents(Button.back(draft.save || draft.editId ? 'apolls_templates' : 'acommunity_polls'))],
          });
        }
      }

      if (customId === 'apolls_results' || customId.startsWith('apolls_results_page_')) {
        const PAGE_SIZE = 5;
        const page = customId.startsWith('apolls_results_page_') ? parseInt(customId.replace('apolls_results_page_', ''), 10) : 0;
        const { rows: countRows } = await db.countPolls(interaction.guildId);
        const total = parseInt(countRows[0].count, 10);
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const safePage = Math.min(Math.max(page, 0), totalPages - 1);
        const { rows } = await db.getPolls(interaction.guildId, PAGE_SIZE, safePage * PAGE_SIZE);

        const embed = new EmbedBuilder()
          .setTitle(`📈 ${t('APOLLS_RESULTS', locale)}`)
          .setColor(0x5865F2)
          .setFooter({ text: `🔥 InfernoBot • ${safePage + 1}/${totalPages}` })
          .setTimestamp();

        if (!rows.length) {
          embed.setDescription(t('APOLLS_RESULTS_EMPTY', locale));
        } else {
          embed.setDescription(rows.map((r, i) =>
            `**${safePage * PAGE_SIZE + i + 1}.** ${r.question}\n> <#${r.channel_id}> • <t:${Math.floor(new Date(r.sent_at).getTime()/1000)}:R>`
          ).join('\n\n'));
        }

        const components = [];
        if (rows.length) {
          for (let i = 0; i < rows.length; i += 5) {
            components.push(new ActionRowBuilder().addComponents(
              rows.slice(i, i + 5).map((r, j) =>
                new ButtonBuilder().setCustomId(`apolls_poll_${r.id}`).setLabel(`${safePage * PAGE_SIZE + i + j + 1}. ${r.question.substring(0, 20)}`).setStyle(ButtonStyle.Secondary)
              )
            ));
          }
        }
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`apolls_results_page_${safePage - 1}`).setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(safePage <= 0),
          new ButtonBuilder().setCustomId(`apolls_results_page_${safePage + 1}`).setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(safePage >= totalPages - 1),
          Button.back('acommunity_polls'),
        ));
        return interaction.update({ embeds: [embed], components });
      }

      if (customId.startsWith('apolls_poll_')) {
        const id = customId.replace('apolls_poll_', '');
        const { rows } = await db.getPoll(id);
        if (!rows.length) return interaction.update({ embeds: [Embed.error(t('ERROR', locale), t('APOLLS_POLL_NOT_FOUND', locale))], components: [new ActionRowBuilder().addComponents(Button.back('apolls_results'))] });
        const poll = rows[0];

        // Fetch message to read reactions
        let reactionCounts = poll.options.map(() => 0);
        try {
          const channel = await interaction.guild.channels.fetch(poll.channel_id);
          const msg = await channel.messages.fetch({ message: poll.message_id, force: true });
          reactionCounts = await Promise.all(poll.options.map(async (_, i) => {
            const r = msg.reactions.cache.find(rx => rx.emoji.name === POLL_EMOJI[i]);
            if (!r) return 0;
            await r.fetch();
            return Math.max(0, r.count - 1);
          }));
        } catch { /* message deleted or channel inaccessible */ }

        const total = reactionCounts.reduce((a, b) => a + b, 0);
        const bar = (count) => {
          const pct = total > 0 ? count / total : 0;
          const filled = Math.round(pct * 10);
          return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${Math.round(pct * 100)}% (${count})`;
        };

        const embed = new EmbedBuilder()
          .setTitle(`📊 ${poll.question}`)
          .setDescription(poll.options.map((o, i) => `${POLL_EMOJI[i]} **${o}**\n${bar(reactionCounts[i])}`).join('\n\n'))
          .setColor(0x5865F2)
          .addFields({ name: t('APOLLS_FIELD_CHANNEL', locale), value: `<#${poll.channel_id}>`, inline: true }, { name: t('APOLLS_FIELD_VOTES', locale), value: `${total}`, inline: true }, { name: t('APOLLS_FIELD_SENT', locale), value: `<t:${Math.floor(new Date(poll.sent_at).getTime()/1000)}:R>`, inline: true })
          .setFooter({ text: `🔥 InfernoBot • #${poll.id}` })
          .setTimestamp();

        return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(Button.back('apolls_results'))] });
      }

      if (customId === 'acommunity_polls') {
        return interaction.update({
          embeds: [Embed.panel(t('ACOMMUNITY_POLLS', locale), t('APOLLS_SELECT_TAB', locale), 'community')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('apolls_templates').setLabel(t('APOLLS_TEMPLATES', locale)).setStyle(ButtonStyle.Secondary).setEmoji('📋'),
            new ButtonBuilder().setCustomId('apolls_create').setLabel(t('APOLLS_CREATE', locale)).setStyle(ButtonStyle.Primary).setEmoji('➕'),
            new ButtonBuilder().setCustomId('apolls_results').setLabel(t('APOLLS_RESULTS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('📈'),
            Button.back('admin_community'),
          )],
        });
      }

      // Fallback: unknown admin_ section → "in development"
      if (customId.startsWith('admin_')) {
        const section = customId.replace('admin_', '');
        const titles = { community: t('ADMIN_COMMUNITY', locale), system: t('ADMIN_SYSTEM', locale) };
        return interaction.update({
          embeds: [Embed.panel(titles[section] || section, t('IN_DEVELOPMENT', locale), 'system')],
          components: [Row.withBack([], 'admin_root')],
        });
      }
    } // end isButton

    // ── Modal submissions ───────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // Settings
      if (customId.startsWith('setting_submit_')) {
        const key = customId.replace('setting_submit_', '');
        await setSetting(interaction.guildId, key, interaction.fields.getTextInputValue('value').trim());
        if (key === 'locale') guildLocaleCache.delete(interaction.guildId);
        return interaction.reply({ content: t('SETTINGS_SAVED', locale), flags: 64 });
      }

      // Mod-exec from quick-action modal
      if (/^modexec_(kick|ban|mute|warn)_\d+$/.test(customId)) {
        const [, action, userId] = customId.split('_');
        const reason      = interaction.fields.getTextInputValue('reason') || null;
        const durationRaw = (action === 'ban' || action === 'mute') ? (interaction.fields.getTextInputValue('duration') || null) : null;
        const durationMs  = parseDuration(durationRaw);
        const { guild }   = interaction;
        const moderatorId = interaction.user.id;
        try {
          if (action === 'kick') {
            const m = await guild.members.fetch(userId).catch(() => null);
            if (m) await m.kick(reason ?? undefined);
            await db.addKick(guild.id, userId, moderatorId, reason);
          } else if (action === 'ban') {
            await guild.members.ban(userId, { reason: reason ?? undefined });
            await db.addBan(guild.id, userId, moderatorId, reason);
            if (durationMs) await db.addScheduledAction(guild.id, userId, 'unban', new Date(Date.now() + durationMs));
          } else if (action === 'mute') {
            const m = await guild.members.fetch(userId).catch(() => null);
            if (m) {
              const mutedRole = await getMutedRole(guild);
              await m.roles.add(mutedRole, reason ?? undefined);
              if (durationMs) await db.addScheduledAction(guild.id, userId, 'unmute', new Date(Date.now() + durationMs));
            }
            await db.addMute(guild.id, userId, moderatorId, reason, durationMs);
          } else if (action === 'warn') {
            await db.addWarning(guild.id, userId, moderatorId, reason);
          }
          await db.logAction(guild.id, userId, moderatorId, action, reason);
          await sendLog(guild, { action, userId, moderatorId, reason, duration: durationRaw });
          return interaction.reply({ content: `✅ ${action} su <@${userId}>.`, flags: 64 });
        } catch (err) {
          return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
        }
      }

      // Report reply/rate
      if (customId.startsWith('rep_submit_reply_')) {
        await db.replyReport(customId.replace('rep_submit_reply_', ''), interaction.fields.getTextInputValue('value'));
        return interaction.reply({ content: t('REPORT_REPLIED', locale), flags: 64 });
      }
      if (customId.startsWith('rep_submit_rate_')) {
        const raw = interaction.fields.getTextInputValue('value').trim().toLowerCase();
        const accepted = ['1', 'да', 'принято', 'yes', 'accept'].includes(raw);
        await db.rateReport(customId.replace('rep_submit_rate_', ''), accepted ? 1 : 0);
        return interaction.reply({ content: t('REPORT_RATED', locale), flags: 64 });
      }

      // Otchety
      if (customId === 'otch_submit_new' || customId.startsWith('otch_submit_edit_')) {
        const data         = interaction.fields.getTextInputValue('data');
        const name         = interaction.fields.getTextInputValue('name');
        const chto_sdelal  = interaction.fields.getTextInputValue('chto_sdelal');
        const chto_ostalos = interaction.fields.getTextInputValue('chto_ostalos');
        const notes        = interaction.fields.getTextInputValue('notes') || null;
        if (customId.startsWith('otch_submit_edit_')) {
          await db.updateOtchet(customId.replace('otch_submit_edit_', ''), data, name, chto_sdelal, chto_ostalos, notes);
          return interaction.reply({ content: t('OTCHET_UPDATED', locale), flags: 64 });
        }
        await db.addOtchet(interaction.guildId, interaction.user.id, data, name, chto_sdelal, chto_ostalos, notes);
        return interaction.reply({ content: t('OTCHET_OK', locale), flags: 64 });
      }

      // Staff user search
      if (customId === 'astaff_user_search') {
        const userId = interaction.fields.getTextInputValue('user_id').trim();
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.reply({ content: t('ASTAFF_USER_NOT_FOUND', locale), flags: 64 });
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
            : new ButtonBuilder().setCustomId(`astaff_addstaff_${userId}`).setLabel(t('ASTAFF_BTN_ADD', locale)).setStyle(ButtonStyle.Success),
        );
        if (isStaff) row.addComponents(
          new ButtonBuilder().setCustomId(`astaff_setrole_${userId}`).setLabel(t('ASTAFF_BTN_SETROLE', locale)).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`astaff_perms_${userId}`).setLabel(t('ASTAFF_BTN_PERMS', locale)).setStyle(ButtonStyle.Secondary),
        );
        return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
      }

      if (customId.startsWith('astaff_setrole_')) {
        const userId = customId.replace('astaff_setrole_submit_', '').replace('astaff_setrole_', '');
        const role = interaction.fields.getTextInputValue('role').trim();
        if (!role) return interaction.reply({ content: t('ASTAFF_INVALID_ROLE', locale), flags: 64 });
        await db.updateStaffRole(interaction.guildId, userId, role);
        return interaction.reply({ content: t('ASTAFF_ROLE_UPDATED', locale, { user: `<@${userId}>`, role }), flags: 64 });
      }

      if (customId.startsWith('astaff_addstaff_')) {
        const userId = customId.replace('astaff_addstaff_submit_', '').replace('astaff_addstaff_', '');
        const role = interaction.fields.getTextInputValue('role').trim();
        if (!role) return interaction.reply({ content: t('ASTAFF_INVALID_ROLE', locale), flags: 64 });
        await db.addStaff(interaction.guildId, userId, role, interaction.user.id);
        return interaction.reply({ content: t('ASTAFF_ADDED', locale, { user: `<@${userId}>`, role }), flags: 64 });
      }


      if (customId.startsWith('astaff_link_submit_')) {
        const discordRoleId = customId.replace('astaff_link_submit_', '');
        const staffRole = interaction.fields.getTextInputValue('staff_role').trim();
        if (staffRole) {
          await db.setStaffRoleLink(interaction.guildId, discordRoleId, staffRole);
          return interaction.reply({ content: `✅ <@&${discordRoleId}> → **${staffRole}**`, flags: 64 });
        } else {
          await db.deleteStaffRoleLink(interaction.guildId, discordRoleId);
          return interaction.reply({ content: `✅ Abbinamento rimosso per <@&${discordRoleId}>`, flags: 64 });
        }
      }
    } // end isModalSubmit

  } catch (err) {
    console.error('[interaction]', err);
    const payload = { content: t('ERROR', locale) || '❌ Errore.', flags: 64 };
    try {
      interaction.replied || interaction.deferred
        ? await interaction.followUp(payload)
        : await interaction.reply(payload);
    } catch (_) {}
  }
});

// ── Start ─────────────────────────────────────────────────────
global.__botClient = client;
startCLI();
client.login(process.env.DISCORD_TOKEN);
