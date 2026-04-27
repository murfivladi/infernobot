const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = function createStaffHandlers({ db, t, Design, Embed, Button, Row }) {
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

  return { handleStaffPanel, handleStaffTabs };
};
