const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// t is injected via deps for backwards compat, but falls back to shared util
module.exports = function createStaffHandlers({ db, t: tInject, Design, Embed, Button, Row }) {
  const t = tInject || require('../utils/locale').t;
  async function handleStaffPanel(interaction, locale) {
    const embed = new EmbedBuilder()
      .setTitle(t('ASTAFF_TITLE', locale))
      .setDescription(t('ASTAFF_SELECT_TAB', locale))
      .setColor(Design.colors.staff)
      .setTimestamp()
      .setFooter({ text: '🔥 InfernoBot • Staff' });

    await interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('astaff_tab_staff').setLabel(t('ASTAFF_TAB_STAFF', locale)).setStyle(ButtonStyle.Primary).setEmoji('👮'),
        new ButtonBuilder().setCustomId('astaff_tab_users').setLabel(t('ASTAFF_TAB_USERS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('👥'),
        new ButtonBuilder().setCustomId('astaff_tab_roles').setLabel(t('ASTAFF_TAB_ROLES', locale) || '🔗 Ruoli').setStyle(ButtonStyle.Secondary).setEmoji('🔗'),
        Button.back('admin_root')
      )]
    });
  }

  async function handleStaffTabs(interaction, locale) {
    if (interaction.customId === 'astaff_tab_staff') {
      const { rows } = await db.getStaff(interaction.guildId);
      if (!rows.length) {
        await interaction.update({ embeds: [Embed.panel(t('ASTAFF_TAB_STAFF', locale), t('ASTAFF_STAFF_EMPTY', locale), 'staff')], components: [Row.withBack([], 'admin_staff')] });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle(t('ASTAFF_TAB_STAFF', locale))
        .setColor(Design.colors.staff)
        .setDescription(rows.map((s, i) => `**${i + 1}.** <@${s.user_id}> — **${s.role}**`).join('\n'))
        .setTimestamp()
        .setFooter({ text: `👥 ${rows.length} membri staff • 🔥 InfernoBot` });

      const components = rows.slice(0, 4).map(s =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`astaff_promote_${s.user_id}`).setLabel('⬆️').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`astaff_setrole_${s.user_id}`).setLabel(`🎭 ${s.role}`).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`astaff_perms_${s.user_id}`).setLabel('🔑').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`astaff_remove_${s.user_id}`).setLabel('❌').setStyle(ButtonStyle.Danger)
        )
      );
      components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('astaff_tab_users').setLabel(t('ASTAFF_TAB_USERS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('👥'),
        Button.back('admin_staff')
      ));
      await interaction.update({ embeds: [embed], components });
      return;
    }

    if (interaction.customId === 'astaff_tab_users') {
      const modal = new ModalBuilder().setCustomId('astaff_user_search').setTitle(t('ASTAFF_USER_SEARCH_TITLE', locale));
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('user_id').setLabel(t('ASTAFF_INPUT_USER_ID', locale)).setStyle(TextInputStyle.Short).setRequired(true)
      ));
      await interaction.showModal(modal);
    }
  }

  async function handleRolesTab(interaction, locale) {
    await interaction.guild.roles.fetch();
    const { rows: links } = await db.getStaffRoleLinks(interaction.guildId);
    const linkMap = Object.fromEntries(links.map(l => [l.discord_role_id, l.staff_role]));

    const pageSize = 15;
    const allRoles = [...interaction.guild.roles.cache
      .filter(r => r.id !== interaction.guildId)
      .sort((a, b) => b.position - a.position)
      .values()];

    const totalRoles = allRoles.length;
    const totalPages = Math.max(1, Math.ceil(totalRoles / pageSize));
    const requestedPage = Number.isFinite(Number(interaction?.customId?.split('astaff_roles_page_')[1]))
      ? Number(interaction.customId.split('astaff_roles_page_')[1])
      : 0;
    const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);

    const roles = allRoles.slice(page * pageSize, page * pageSize + pageSize);

    const desc = roles.map(r => {
      const linked = linkMap[r.id];
      return `${linked ? '🔗' : '⚫'} <@&${r.id}>${linked ? ` → **${linked}**` : ''}`;
    }).join('\n') || '—';

    const embed = new EmbedBuilder()
      .setTitle(t('ASTAFF_TAB_ROLES', locale) || '🔗 Abbinamento Ruoli')
      .setDescription(desc)
      .setColor(Design.colors.staff)
      .setTimestamp()
      .setFooter({ text: `🔥 InfernoBot • Staff Ruoli • Pagina ${page + 1}/${totalPages} • ${totalRoles} ruoli` });

    const buttonRows = [];
    for (let i = 0; i < roles.length; i += 5) {
      buttonRows.push(new ActionRowBuilder().addComponents(
        roles.slice(i, i + 5).map(r =>
          new ButtonBuilder()
            .setCustomId(`astaff_link_role_${r.id}`)
            .setLabel(r.name.substring(0, 20) + (linkMap[r.id] ? ' ✓' : ''))
            .setStyle(linkMap[r.id] ? ButtonStyle.Success : ButtonStyle.Secondary)
        )
      ));
    }
    if (totalPages > 1) {
      buttonRows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`astaff_roles_page_${page - 1}`)
          .setLabel('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(`astaff_roles_page_${page + 1}`)
          .setLabel('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
        Button.back('admin_staff'),
      ));
    } else {
      buttonRows.push(new ActionRowBuilder().addComponents(Button.back('admin_staff')));
    }
    await interaction.update({ embeds: [embed], components: buttonRows });
  }

  return { handleStaffPanel, handleStaffTabs, handleRolesTab };
};
