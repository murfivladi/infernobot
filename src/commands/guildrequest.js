const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, getSettings } = require('../db');
const { t } = require('../utils/locale');
const { isOwner, ownerIds } = require('../utils/owners');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guildrequest')
    .setDescription('📩 Request access for your server')
    .addStringOption(o => o.setName('message').setDescription('Optional message').setRequired(false)),

  async execute(interaction) {
    const { guild, user } = interaction;
    const settings = await getSettings(interaction.guildId);
    const locale = settings.locale || 'ru';

    if (global.__isGuildAllowed?.(guild.id))
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(t('GUILDREQUEST_ALREADY_ALLOWED', locale)).setDescription(t('GUILDREQUEST_ALREADY_ALLOWED_DESC', locale)).setColor(0x57F287).setTimestamp()], flags: 64 });

    try {
      const { rows: existing } = await db.getPendingGuildRequests();
      if (existing.some(r => r.guild_id === String(guild.id)))
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(t('GUILDREQUEST_EXISTS', locale)).setDescription(t('GUILDREQUEST_EXISTS_DESC', locale)).setColor(0xFFA500).setTimestamp()], flags: 64 });

      const notes = interaction.options.getString('message');
      const { rows } = await db.addGuildRequest(guild.id, guild.name, user.id, user.tag, notes);
      const requestId = rows[0].id;

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(t('GUILDREQUEST_SENT_TITLE', locale))
          .setDescription(t('GUILDREQUEST_SENT_DESC', locale))
          .setColor(0x5865F2)
          .addFields(
            { name: t('GUILDREQUEST_SERVER', locale), value: guild.name, inline: true },
            { name: t('GUILDREQUEST_REQUESTED_BY', locale), value: user.tag, inline: true },
            { name: t('GUILDREQUEST_STATUS', locale), value: t('GUILDREQUEST_STATUS_PENDING', locale), inline: true },
          )
          .setThumbnail(guild.iconURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({ text: '🔥 InfernoBot • Access Requests' })],
        flags: 64,
      });

      // DM all bot owners with approve/reject buttons
      for (const ownerId of ownerIds) {
        try {
          const owner = await interaction.client.users.fetch(ownerId);
          await owner.send({
            embeds: [new EmbedBuilder()
              .setTitle('📩 Nuova richiesta accesso')
              .setColor(0x5865F2)
              .addFields(
                { name: 'Server', value: `${guild.name} (\`${guild.id}\`)`, inline: true },
                { name: 'Richiedente', value: `${user.tag} (\`${user.id}\`)`, inline: true },
                { name: 'Messaggio', value: notes || '—' },
              )
              .setTimestamp()],
            components: [new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`gapprove_${requestId}`).setLabel('✅ Approva').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId(`greject_${requestId}`).setLabel('❌ Rifiuta').setStyle(ButtonStyle.Danger),
            )],
          });
        } catch (dmErr) {
          console.warn('[guildrequest] Could not DM owner:', dmErr.message);
        }
      }

      console.log(`📩 NEW REQUEST: ${guild.name} (${guild.id}) from ${user.tag}`);
    } catch (err) {
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle(t('GUILDREQUEST_ERROR', locale)).setDescription(err.message).setColor(0xED4245).setTimestamp()], flags: 64 });
    }
  },
};
