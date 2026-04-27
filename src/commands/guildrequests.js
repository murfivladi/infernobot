/**
 * 🔥 INFERNO BOT - Guild Requests Management Command
 * View and manage pending server access requests with localization
 */

const { 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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
    .setName('guildrequests')
    .setDescription('📋 Manage server access requests'),

  async execute(interaction) {
    // Check if user is bot owner
    if (interaction.user.id !== process.env.OWNER_ID) {
      const embed = new EmbedBuilder()
        .setTitle(t('GUILDREQUESTS_ACCESS_DENIED'))
        .setDescription(t('GUILDREQUESTS_ACCESS_DENIED_DESC'))
        .setColor(0xED4245)
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const { rows } = await db.getAllGuildRequests();

      if (rows.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(t('GUILDREQUESTS_TITLE'))
          .setDescription(t('GUILDREQUESTS_EMPTY'))
          .setColor(0x5865F2)
          .setTimestamp()
          .setFooter({ text: '🔥 InfernoBot' });
        return await interaction.editReply({ embeds: [embed] });
      }

      // Separate pending and processed
      const pending = rows.filter(r => r.status === 'pending');
      const approved = rows.filter(r => r.status === 'approved');
      const rejected = rows.filter(r => r.status === 'rejected');

      const embed = new EmbedBuilder()
        .setTitle(t('GUILDREQUESTS_TITLE'))
        .setDescription(t('GUILDREQUESTS_DESC'))
        .setColor(0x5865F2)
        .addFields(
          { name: t('GUILDREQUESTS_PENDING'), value: String(pending.length), inline: true },
          { name: t('GUILDREQUESTS_APPROVED'), value: String(approved.length), inline: true },
          { name: t('GUILDREQUESTS_REJECTED'), value: String(rejected.length), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: '🔥 InfernoBot • Owner Panel' });

      // Show pending requests as buttons
      const components = [];
      
      if (pending.length > 0) {
        embed.addFields({ name: t('GUILDREQUESTS_PENDING_LABEL'), value: '\u200b' });
        
        for (const req of pending.slice(0, 10)) {
          embed.addFields({
            name: req.guild_name,
            value: t('GUILDREQUESTS_ID') + ': ' + req.guild_id + '\n' + t('GUILDREQUESTS_BY') + ': ' + req.requester_name + '\n' + t('GUILDREQUESTS_DATE') + ': ' + new Date(req.created_at).toLocaleDateString('ru'),
            inline: true
          });
        }

        // Add approve/reject buttons for each pending request
        for (const req of pending.slice(0, 5)) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('gapprove_' + req.id)
              .setLabel(req.guild_name.substring(0, 15))
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('greject_' + req.id)
              .setLabel(t('GUILDREQUESTS_REJECT'))
              .setStyle(ButtonStyle.Danger)
          );
          components.push(row);
        }
      }

      if (components.length === 0) {
        embed.setDescription(t('GUILDREQUESTS_NO_PENDING'));
      }

      await interaction.editReply({ embeds: [embed], components });

    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle(t('ERROR'))
        .setDescription(err.message)
        .setColor(0xED4245)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  }
};