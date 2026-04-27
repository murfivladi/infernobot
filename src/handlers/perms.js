const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const PERMISSIONS = [
  { key: 'kick', labelKey: 'PERM_KICK', category: 'moderation', icon: '👢' },
  { key: 'ban', labelKey: 'PERM_BAN', category: 'moderation', icon: '🔨' },
  { key: 'mute', labelKey: 'PERM_MUTE', category: 'moderation', icon: '🔇' },
  { key: 'unmute', labelKey: 'PERM_UNMUTE', category: 'moderation', icon: '🔊' },
  { key: 'warn', labelKey: 'PERM_WARN', category: 'moderation', icon: '⚠️' },
  { key: 'remwarn', labelKey: 'PERM_REMWARN', category: 'moderation', icon: '🧹' },
  { key: 'reports_view', labelKey: 'PERM_REPORTS_VIEW', category: 'reports', icon: '📋' },
  { key: 'reports_manage', labelKey: 'PERM_REPORTS_MANAGE', category: 'reports', icon: '✏️' },
  { key: 'otchety_view', labelKey: 'PERM_OTCHETY_VIEW', category: 'otchety', icon: '📊' },
  { key: 'otchety_create', labelKey: 'PERM_OTCHETY_CREATE', category: 'otchety', icon: '📝' },
  { key: 'staff_view', labelKey: 'PERM_STAFF_VIEW', category: 'staff', icon: '👥' },
  { key: 'staff_manage', labelKey: 'PERM_STAFF_MANAGE', category: 'staff', icon: '🎭' },
  { key: 'settings_view', labelKey: 'PERM_SETTINGS_VIEW', category: 'settings', icon: '⚙️' },
  { key: 'settings_edit', labelKey: 'PERM_SETTINGS_EDIT', category: 'settings', icon: '🔧' },
];

const PERM_CATEGORY_KEYS = {
  moderation: 'STAFF_MOD',
  reports: 'BUTTON_COMM_REPORTS',
  otchety: 'BUTTON_COMM_OTCHETY',
  staff: 'ASTAFF_TAB_STAFF',
  settings: 'ADMIN_SETTINGS',
};

const ROLES_PER_PAGE = 10;
const PERMS_PER_PAGE = 6;

module.exports = function createPermsHandlers({ db, t, Design, Row }) {
  async function handlePermissionsPanel(interaction, locale) {
    const guild = interaction.guild;
    if (!guild) { await interaction.reply({ content: t('SERVER_ONLY', locale), flags: 64 }); return; }
    await guild.roles.fetch();

    const savedPerms = await db.getAllRolePermissions(guild.id);
    const savedMap = {};
    savedPerms.rows.forEach(r => { savedMap[r.role_id] = r.permissions; });

    const allRoles = Array.from(guild.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position).values())
      .map(role => {
        const permCount = Object.values(savedMap[role.id] || {}).filter(Boolean).length;
        return { name: role.name, id: role.id, color: role.color || 0x808080, permCount, hasCustom: permCount > 0 };
      });

    let currentPage = 0;
    const footerText = interaction.message?.embeds?.[0]?.footer?.text || '';
    const pageMatch = footerText.match(/(\d+)\//);
    if (pageMatch) currentPage = parseInt(pageMatch[1]) - 1;
    if (interaction.customId === 'perms_page_next') currentPage++;
    if (interaction.customId === 'perms_page_prev') currentPage = Math.max(0, currentPage - 1);

    const totalPages = Math.max(1, Math.ceil(allRoles.length / ROLES_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages - 1);

    const pageRoles = allRoles.slice(currentPage * ROLES_PER_PAGE, (currentPage + 1) * ROLES_PER_PAGE);
    const totalPerms = Object.values(savedMap).reduce((acc, p) => acc + Object.values(p || {}).filter(Boolean).length, 0);

    const embed = new EmbedBuilder()
      .setTitle(`🔑 ${t('PERMS_TITLE', locale)}`)
      .setDescription(`**${t('ROLES_SERVER', locale)}** (${allRoles.length})\n\n` +
        (pageRoles.map(r => {
          const bars = r.hasCustom ? Design.helpers.permBar(r.permCount, PERMISSIONS.length, 7) : '▱'.repeat(7);
          return `${r.hasCustom ? '🟢' : '⚫'} <@&${r.id}> ${bars} **${r.permCount}/${PERMISSIONS.length}**`;
        }).join('\n') || t('PERMS_NO_ROLES', locale)))
      .addFields(
        { name: t('PERMS_TOTAL', locale), value: String(totalPerms), inline: true },
        { name: t('PERMS_ROLES_WITH', locale), value: String(allRoles.filter(r => r.hasCustom).length), inline: true },
        { name: t('PERMS_AVAILABLE', locale), value: String(PERMISSIONS.length), inline: true }
      )
      .setColor(Design.colors.primary)
      .setFooter({ text: `📄 ${currentPage + 1}/${totalPages} • 🔥 InfernoBot` });

    const roleButtons = pageRoles.map(r =>
      new ButtonBuilder()
        .setCustomId(`perms_edit_${r.id}`)
        .setLabel(`${r.name.substring(0, 16)}${r.hasCustom ? ` (${r.permCount})` : ''}`)
        .setStyle(r.hasCustom ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    const buttonRows = [];
    for (let i = 0; i < roleButtons.length; i += 5)
      buttonRows.push(new ActionRowBuilder().addComponents(roleButtons.slice(i, i + 5)));
    buttonRows.push(Row.nav(currentPage + 1, totalPages, 'perms_page_prev', 'perms_page_next', 'admin_root'));
    await interaction.update({ embeds: [embed], components: buttonRows });
  }

  async function handlePermsEdit(interaction, locale, showResetMsg = false) {
    const { customId } = interaction;
    const roleId = customId.startsWith('perms_edit_')
      ? customId.replace('perms_edit_', '')
      : customId.replace('perms_toggle_', '').split('_')[0];

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) { await interaction.reply({ content: t('PERMS_NOT_FOUND', locale), flags: 64 }); return; }

    let permPage = 0;
    const footer = interaction.message?.embeds?.[0]?.footer?.text || '';
    const match = footer.match(/(\d+)\/(\d+)/);
    if (match) permPage = parseInt(match[1]) - 1;
    if (customId === 'perms_page_perms_next') permPage++;
    if (customId === 'perms_page_perms_prev') permPage = Math.max(0, permPage - 1);

    const { rows } = await db.getRolePermissions(interaction.guild.id, roleId);
    const currentPerms = rows[0]?.permissions || {};
    const enabledCount = Object.values(currentPerms).filter(Boolean).length;
    const totalPermPages = Math.ceil(PERMISSIONS.length / PERMS_PER_PAGE);
    const pagePerms = PERMISSIONS.slice(permPage * PERMS_PER_PAGE, Math.min((permPage + 1) * PERMS_PER_PAGE, PERMISSIONS.length));
    const categoryNames = [...new Set(pagePerms.map(p => p.category))].map(c => t(PERM_CATEGORY_KEYS[c] || c, locale)).join(' | ');

    const embed = new EmbedBuilder()
      .setTitle(`🔑 ${t('PERMS_ROLE_PANEL_TITLE', locale).replace('{role}', role.name)}`)
      .setDescription(`**${categoryNames}**\n\n📊 **${enabledCount}/${PERMISSIONS.length}** ${t('PERMS_SAVED', locale).replace('✅ ', '')}${showResetMsg ? `\n${t('RESET_DONE', locale)}` : ''}\n\n*${t('CLICK_TO_TOGGLE', locale)}*`)
      .setColor(role.color || Design.colors.primary)
      .setFooter({ text: `${t('PERMS_PAGE_LABEL', locale).replace('{current}', permPage + 1).replace('{total}', totalPermPages)} | 🔥 InfernoBot` });

    const toggleRows = [];
    for (let i = 0; i < pagePerms.length; i += 2) {
      const row = new ActionRowBuilder();
      [pagePerms[i], pagePerms[i + 1]].filter(Boolean).forEach(p => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`perms_toggle_${roleId}_${p.key}`)
            .setLabel(`${p.icon} ${t(p.labelKey, locale)}`)
            .setStyle(currentPerms[p.key] === true ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
      });
      toggleRows.push(row);
    }
    toggleRows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`perms_select_all_${roleId}`).setLabel(t('SELECT_ALL', locale)).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`perms_deselect_all_${roleId}`).setLabel(t('DESELECT_ALL', locale)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`perms_reset_${roleId}`).setLabel(t('RESET', locale)).setStyle(ButtonStyle.Danger)
    ));
    toggleRows.push(Row.nav(permPage + 1, totalPermPages, 'perms_page_perms_prev', 'perms_page_perms_next', 'admin_permissions'));
    await interaction.update({ embeds: [embed], components: toggleRows });
  }

  async function handlePermsToggle(interaction, locale) {
    const parts = interaction.customId.split('_');
    const roleId = parts[2];
    const permKey = parts[3];
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) { await interaction.reply({ content: t('PERMS_NOT_FOUND', locale), flags: 64 }); return; }

    const { rows } = await db.getRolePermissions(interaction.guild.id, roleId);
    const currentPerms = { ...(rows[0]?.permissions || {}) };
    currentPerms[permKey] = !currentPerms[permKey];
    await db.setRolePermissions(interaction.guild.id, roleId, currentPerms, interaction.user.id);
    await handlePermsEdit(interaction, locale);
  }

  async function handlePermsSelectAll(interaction, locale, enable) {
    const roleId = interaction.customId.replace('perms_select_all_', '').replace('perms_deselect_all_', '');
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) { await interaction.reply({ content: t('PERMS_NOT_FOUND', locale), flags: 64 }); return; }

    let permPage = 0;
    const match = (interaction.message?.embeds?.[0]?.footer?.text || '').match(/(\d+)\/(\d+)/);
    if (match) permPage = parseInt(match[1]) - 1;

    const { rows } = await db.getRolePermissions(interaction.guild.id, roleId);
    const currentPerms = { ...(rows[0]?.permissions || {}) };
    PERMISSIONS.slice(permPage * PERMS_PER_PAGE, Math.min((permPage + 1) * PERMS_PER_PAGE, PERMISSIONS.length))
      .forEach(p => { currentPerms[p.key] = enable; });
    await db.setRolePermissions(interaction.guild.id, roleId, currentPerms, interaction.user.id);
    await handlePermsEdit(interaction, locale);
  }

  return { handlePermissionsPanel, handlePermsEdit, handlePermsToggle, handlePermsSelectAll, PERMISSIONS };
};
