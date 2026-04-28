const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, getSettings } = require('../db');
const { t } = require('../utils/locale');
const { isOwner } = require('../utils/owners');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guildrequests')
    .setDescription('📋 Manage server access requests'),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const locale = settings.locale || 'ru';
    if (!isOwner(interaction.user.id))
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(t('GUILDREQUESTS_ACCESS_DENIED', locale)).setDescription(t('GUILDREQUESTS_ACCESS_DENIED_DESC', locale)).setColor(0xED4245).setTimestamp()], flags: 64 });

    await interaction.deferReply({ flags: 64 });

    try {
      const { rows } = await db.getAllGuildRequests();

      if (!rows.length)
        return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(t('GUILDREQUESTS_TITLE', locale)).setDescription(t('GUILDREQUESTS_EMPTY', locale)).setColor(0x5865F2).setTimestamp().setFooter({ text: '🔥 InfernoBot' })] });

      const pending  = rows.filter(r => r.status === 'pending');
      const approved = rows.filter(r => r.status === 'approved');
      const rejected = rows.filter(r => r.status === 'rejected');

      const embed = new EmbedBuilder()
        .setTitle(t('GUILDREQUESTS_TITLE', locale))
        .setColor(0x5865F2)
        .addFields(
          { name: t('GUILDREQUESTS_PENDING', locale),  value: String(pending.length),  inline: true },
          { name: t('GUILDREQUESTS_APPROVED', locale), value: String(approved.length), inline: true },
          { name: t('GUILDREQUESTS_REJECTED', locale), value: String(rejected.length), inline: true },
        )
        .setTimestamp()
        .setFooter({ text: '🔥 InfernoBot • Owner Panel' });

      const components = [];
      for (const req of pending.slice(0, 5)) {
        embed.addFields({
          name: req.guild_name,
          value: `ID: \`${req.guild_id}\`\nDa: ${req.requester_name}\n${new Date(req.created_at).toLocaleDateString(locale)}`,
          inline: true,
        });
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`gapprove_${req.id}`).setLabel(`✅ ${req.guild_name.substring(0, 15)}`).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`greject_${req.id}`).setLabel('❌ Rifiuta').setStyle(ButtonStyle.Danger),
        ));
      }

      await interaction.editReply({ embeds: [embed], components });
    } catch (err) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle(t('ERROR', locale)).setDescription(err.message).setColor(0xED4245).setTimestamp()] });
    }
  },
};
