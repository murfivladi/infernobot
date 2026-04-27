const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reloadperms')
    .setDescription('Reload permissions from permissions.json without restarting the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, t) {
    const locale = await guildLocale(interaction.guildId);
    
    try {
      // Use global exported functions from index.js
      const success = global.__reloadPermissionsConfig ? global.__reloadPermissionsConfig() : false;
      
      if (!success) {
        await interaction.reply({ 
          content: t('RELOADPERMS_FAILED', locale) || '❌ Failed to reload permissions.json', 
          flags: 64 
        });
        return;
      }
      
      // Sync permissions for current guild
      const synced = global.__syncPermissionsFromConfig 
        ? await global.__syncPermissionsFromConfig(interaction.guildId) 
        : 0;
      
      const embed = new EmbedBuilder()
        .setTitle(t('RELOADPERMS_TITLE', locale))
        .setDescription(t('RELOADPERMS_SUCCESS', locale) + `\n\n📊 **${synced}** roles synchronized from config.`)
        .setColor(0x00ff00);
      
      await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (err) {
      console.error('Error reloading permissions:', err);
      await interaction.reply({ 
        content: `❌ Error: ${err.message}`, 
        flags: 64 
      });
    }
  }
};

async function guildLocale(guildId) {
  if (typeof global.guildLocale === 'function') {
    return await global.guildLocale(guildId);
  }
  return 'en';
}