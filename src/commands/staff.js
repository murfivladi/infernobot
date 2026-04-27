/**
 * 🔥 INFERNO BOT - Staff Command
 * Professional staff panel with modern UI and localization
 */

const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder
} = require('discord.js');
const { db, getSettings } = require('../db');
const fs = require('fs');
const path = require('path');

// Load locales
const locales = {};
const localesPath = path.join(__dirname, '../locales');
fs.readdirSync(localesPath).forEach(file => {
  if (file.endsWith('.json')) locales[file.split('.')[0]] = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
});

// Translation helper
function t(key, locale) {
  locale = locale || 'ru';
  return locales[locale]?.[key] || locales['ru']?.[key] || key;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('👮 Staff Panel'),

  async execute(interaction) {
    var staffId = interaction.user.id;
    
    // Get locale from server settings
    var settings = await getSettings(interaction.guildId);
    var locale = settings && settings.locale || 'ru';
    
    // Get staff data
    var staffData = null;
    try {
      var { rows } = await db.getStaffMember(interaction.guildId, staffId);
      if (rows.length > 0) staffData = rows[0];
    } catch (err) {
      console.error('Staff data fetch error:', err);
    }

    // Build embed with translations
    var embed = new EmbedBuilder()
      .setTitle('👮 ' + t('STAFF_TITLE', locale))
      .setDescription('**' + t('STAFF_HELLO', locale) + ', ' + interaction.user.username + '!** 👋\n\n' + t('STAFF_WELCOME', locale))
      .setColor(0x0099FF)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🛡️ ' + t('STAFF_MODERATION', locale), value: t('STAFF_MOD_DESC', locale), inline: true },
        { name: '💬 ' + t('STAFF_COMMUNICATION', locale), value: t('STAFF_COMM_DESC', locale), inline: true },
        { name: '👤 ' + t('STAFF_PROFILE', locale), value: t('STAFF_PROFILE_DESC', locale), inline: true }
      )
      .setFooter({ 
        text: 'InfernoBot Staff • ' + new Date().toLocaleDateString(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'it-IT'), 
        iconURL: interaction.client.user.displayAvatarURL() 
      })
      .setTimestamp();

    // Add staff stats if available
    if (staffData) {
      embed.addFields(
        { 
          name: '📊 ' + t('STAFF_STATS', locale), 
          value: t('STAFF_STATS_VALUE', locale, { rank: staffData.role || 'Member', warns: staffData.total_warns || 0, actions: staffData.total_actions || 0 }), 
          inline: false 
        }
      );
    }

    // Build buttons with translations
    var buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('moderation').setLabel(t('BTN_MODERATION', locale)).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
      new ButtonBuilder().setCustomId('communication').setLabel(t('BTN_COMMUNICATION', locale)).setStyle(ButtonStyle.Success).setEmoji('💬'),
      new ButtonBuilder().setCustomId('profile').setLabel(t('BTN_PROFILE', locale)).setStyle(ButtonStyle.Secondary).setEmoji('👤'),
    );

    var quickActions = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('comm_reports').setLabel(t('BTN_MY_REPORTS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('📋'),
      new ButtonBuilder().setCustomId('staff_root').setLabel(t('BTN_SETTINGS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
    );

    await interaction.reply({
      embeds: [embed],
      components: [buttons, quickActions],
      flags: 64
    });
  },
};