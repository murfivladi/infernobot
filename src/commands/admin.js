/**
 * 🔥 INFERNO BOT - Admin Command
 * Professional admin panel with modern UI design
 */

const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('🛡️ Administrator Panel')
    .setDescriptionLocalizations({
      'ru': '🛡️ Панель администратора',
      'it': '🛡️ Pannello Amministratore'
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { getSettings } = require('../db');
    const fs = require('fs');
    const path = require('path');
    const settings = await getSettings(interaction.guild.id);
    const lang = settings.language || 'it';
    const t = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', `${lang}.json`), 'utf8'));

    const embed = new EmbedBuilder()
      .setTitle(t.ADMIN_TITLE)
      .setDescription(t.ADMIN_DESC)
      .setColor(0x5865F2)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null)
      .setFooter({ 
        text: t.FOOTER_ADMIN, 
        iconURL: interaction.client.user.displayAvatarURL() 
      })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('admin_settings')
        .setLabel(t.ADMIN_SETTINGS)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_staff')
        .setLabel(t.ADMIN_STAFF)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin_permissions')
        .setLabel(t.ADMIN_PERMISSIONS)
        .setStyle(ButtonStyle.Primary),
    );

    const buttons2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('admin_community')
        .setLabel(t.ADMIN_COMMUNITY)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_system')
        .setLabel(t.ADMIN_SYSTEM)
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      embeds: [embed],
      components: [buttons, buttons2],
      flags: 64
    });
  }
};