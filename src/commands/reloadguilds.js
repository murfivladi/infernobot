const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSettings } = require('../db');
const { t } = require('../utils/locale');
const { isOwner } = require('../utils/owners');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reloadguilds')
    .setDescription('🔄 Reload server whitelist')
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const locale = settings.locale || 'ru';
    if (!isOwner(interaction.user.id))
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(t('RELOADGUILDS_ACCESS_DENIED', locale)).setDescription(t('RELOADGUILDS_ACCESS_DENIED_DESC', locale)).setColor(0xED4245).setTimestamp()], flags: 64 });

    try {
      const count = global.__reloadGuildsConfig();
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(t('RELOADGUILDS_TITLE', locale))
          .setDescription(t('RELOADGUILDS_DESC', locale, { count }))
          .setColor(0x57F287)
          .addFields(
            { name: t('RELOADGUILDS_SERVERS', locale), value: String(count), inline: true },
            { name: t('RELOADGUILDS_TIMESTAMP', locale), value: new Date().toLocaleString(locale), inline: true },
          )
          .setTimestamp()
          .setFooter({ text: '🔥 InfernoBot • Admin' })],
        flags: 64,
      });
    } catch (err) {
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle(t('RELOADGUILDS_ERROR', locale)).setDescription(err.message).setColor(0xED4245).setTimestamp()], flags: 64 });
    }
  },
};
