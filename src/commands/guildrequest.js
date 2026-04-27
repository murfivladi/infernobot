/**
 * 🔥 INFERNO BOT - Guild Request Command
 * Request access for a server to use the bot with localization
 */

const { 
  SlashCommandBuilder, 
  EmbedBuilder
} = require('discord.js');
const { db } = require('../db');
const fs = require('fs');
const path = require('path');

// Load locales
const locales = {};
const localesPath = path.join(__dirname, '../locales');
fs.readdirSync(localesPath).forEach(file => {
  if (file.endsWith('.json')) {
    locales[file.split('.')[0]] = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
  }
});

// Translation helper - use BOT_LOCALE env or default to 'ru'
function t(key, params = {}) {
  const locale = process.env.BOT_LOCALE || 'ru';
  let text = locales[locale]?.[key] || locales['ru']?.[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
  }
  return text;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guildrequest')
    .setDescription('📩 Request access for your server')
    .addStringOption(o => o.setName('message').setDescription('Optional message for the request').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    
    // Check if already allowed (use global function)
    if (global.__isGuildAllowed && global.__isGuildAllowed(guildId)) {
      const embed = new EmbedBuilder()
        .setTitle(t('GUILDREQUEST_ALREADY_ALLOWED'))
        .setDescription(t('GUILDREQUEST_ALREADY_ALLOWED_DESC'))
        .setColor(0x57F287)
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    // Check if request already exists
    try {
      const existing = await db.getAllGuildRequests();
      const existingRequest = existing.rows.find(r => r.guild_id === String(guildId) && r.status === 'pending');
      
      if (existingRequest) {
        const embed = new EmbedBuilder()
          .setTitle(t('GUILDREQUEST_EXISTS'))
          .setDescription(t('GUILDREQUEST_EXISTS_DESC'))
          .setColor(0xFFA500)
          .setTimestamp();
        return await interaction.reply({ embeds: [embed], flags: 64 });
      }
    } catch (err) {}

    const message = interaction.options.getString('message');
    const guild = interaction.guild;
    const user = interaction.user;

    try {
      // Save request to database
      await db.addGuildRequest(
        guild.id,
        guild.name,
        user.id,
        user.tag,
        message
      );

      const embed = new EmbedBuilder()
        .setTitle(t('GUILDREQUEST_SENT_TITLE'))
        .setDescription(t('GUILDREQUEST_SENT_DESC'))
        .setColor(0x5865F2)
        .addFields(
          { name: t('GUILDREQUEST_SERVER'), value: guild.name, inline: true },
          { name: t('GUILDREQUEST_REQUESTED_BY'), value: user.tag, inline: true },
          { name: t('GUILDREQUEST_STATUS'), value: t('GUILDREQUEST_STATUS_PENDING'), inline: true }
        )
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: '🔥 InfernoBot • Access Requests' });

      await interaction.reply({ embeds: [embed], flags: 64 });

      // Notify bot owner via console
      console.log('📩 NEW ACCESS REQUEST: ' + guild.name + ' (' + guild.id + ') from ' + user.tag);
      
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle(t('GUILDREQUEST_ERROR'))
        .setDescription(t('GUILDREQUEST_ERROR_DESC', { error: err.message }))
        .setColor(0xED4245)
        .setTimestamp();
      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};