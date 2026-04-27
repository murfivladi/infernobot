/**
 * 🔥 INFERNO BOT - Reload Guilds Command
 * Reload the guild whitelist configuration with localization
 */

const { 
  SlashCommandBuilder, 
  EmbedBuilder
} = require('discord.js');
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
    .setName('reloadguilds')
    .setDescription('🔄 Reload server whitelist')
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    // Check if user is bot owner
    if (interaction.user.id !== process.env.OWNER_ID) {
      const embed = new EmbedBuilder()
        .setTitle(t('RELOADGUILDS_ACCESS_DENIED'))
        .setDescription(t('RELOADGUILDS_ACCESS_DENIED_DESC'))
        .setColor(0xED4245)
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    try {
      // Reload guilds config
      const count = global.__reloadGuildsConfig();
      
      const embed = new EmbedBuilder()
        .setTitle(t('RELOADGUILDS_TITLE'))
        .setDescription(t('RELOADGUILDS_DESC', { count: count }))
        .setColor(0x57F287)
        .addFields(
          { name: t('RELOADGUILDS_SERVERS'), value: String(count), inline: true },
          { name: t('RELOADGUILDS_TIMESTAMP'), value: new Date().toLocaleString('ru'), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: '🔥 InfernoBot • Admin' });

      await interaction.reply({ embeds: [embed], flags: 64 });
      
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle(t('RELOADGUILDS_ERROR'))
        .setDescription(t('RELOADGUILDS_ERROR_DESC', { error: err.message }))
        .setColor(0xED4245)
        .setTimestamp();
      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};