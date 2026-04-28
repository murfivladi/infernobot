const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { db, getSettings } = require('../db');
const { t } = require('../utils/locale');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('👮 Staff Panel'),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const locale = settings.locale || 'ru';

    let staffData = null;
    try {
      const { rows } = await db.getStaffMember(interaction.guildId, interaction.user.id);
      if (rows.length) staffData = rows[0];
    } catch (err) {
      console.error('[staff cmd]', err.message);
    }

    const embed = new EmbedBuilder()
      .setTitle(`👮 ${t('STAFF_TITLE', locale)}`)
      .setDescription(`**${t('STAFF_HELLO', locale)}, ${interaction.user.username}!** 👋\n\n${t('STAFF_WELCOME', locale)}`)
      .setColor(0x0099FF)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: `🛡️ ${t('STAFF_MODERATION', locale)}`, value: t('STAFF_MOD_DESC', locale), inline: true },
        { name: `💬 ${t('STAFF_COMMUNICATION', locale)}`, value: t('STAFF_COMM_DESC', locale), inline: true },
        { name: `👤 ${t('STAFF_PROFILE', locale)}`, value: t('STAFF_PROFILE_DESC', locale), inline: true },
      )
      .setFooter({ text: `InfernoBot Staff • ${new Date().toLocaleDateString(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'it-IT')}`, iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    if (staffData) {
      embed.addFields({
        name: `📊 ${t('STAFF_STATS', locale)}`,
        value: t('STAFF_STATS_VALUE', locale, { rank: staffData.role || 'Member', warns: staffData.total_warns || 0, actions: staffData.total_actions || 0 }),
        inline: false,
      });
    }

    await interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('moderation').setLabel(t('BTN_MODERATION', locale)).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
          new ButtonBuilder().setCustomId('communication').setLabel(t('BTN_COMMUNICATION', locale)).setStyle(ButtonStyle.Success).setEmoji('💬'),
          new ButtonBuilder().setCustomId('profile').setLabel(t('BTN_PROFILE', locale)).setStyle(ButtonStyle.Secondary).setEmoji('👤'),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('comm_reports').setLabel(t('BTN_MY_REPORTS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('📋'),
          new ButtonBuilder().setCustomId('staff_root').setLabel(t('BTN_SETTINGS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
        ),
      ],
      flags: 64,
    });
  },
};
