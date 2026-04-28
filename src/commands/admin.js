const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getSettings } = require('../db');
const { t } = require('../utils/locale');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('🛡️ Administrator Panel')
    .setDescriptionLocalizations({ ru: '🛡️ Панель администратора', it: '🛡️ Pannello Amministratore' })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const settings = await getSettings(interaction.guild.id);
    const locale = settings.locale || 'ru';

    const embed = new EmbedBuilder()
      .setTitle(t('ADMIN_TITLE', locale))
      .setDescription(t('ADMIN_DESC', locale))
      .setColor(0x5865F2)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null)
      .setFooter({ text: t('FOOTER_ADMIN', locale), iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('admin_settings').setLabel(t('ADMIN_SETTINGS', locale)).setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('admin_staff').setLabel(t('ADMIN_STAFF', locale)).setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('admin_community').setLabel(t('ADMIN_COMMUNITY', locale)).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('admin_system').setLabel(t('ADMIN_SYSTEM', locale)).setStyle(ButtonStyle.Danger),
        ),
      ],
      flags: 64,
    });
  },
};
