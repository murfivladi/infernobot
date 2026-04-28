const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, getSettings } = require('../db');
const { t } = require('../utils/locale');

module.exports = [
  // ── /report ──────────────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('report')
      .setDescription('📢 Submit a report')
      .addUserOption(o => o.setName('user').setDescription('User to report').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
      .addStringOption(o => o.setName('evidence').setDescription('Evidence links (optional)')),

    async execute(interaction) {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const evidence = interaction.options.getString('evidence');
      const settings = await getSettings(interaction.guildId);
      const locale = settings.locale || 'ru';

      await interaction.deferReply({ flags: 64 });

      try {
        await db.addReport(interaction.guildId, interaction.user.id, target.id, reason, evidence);

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`✅ ${t('REPORT_SENT', locale)}`)
              .setDescription(t('REPORT_SENT_DESC', locale))
              .setColor(0x57F287)
              .addFields(
                { name: t('LABEL_REPORTED', locale), value: `<@${target.id}>`, inline: true },
                { name: t('LABEL_REPORTER', locale), value: `<@${interaction.user.id}>`, inline: true },
                { name: t('LABEL_REASON', locale), value: reason },
              )
              .setFooter({ text: t('REPORT_FOOTER', locale), iconURL: interaction.client.user.displayAvatarURL() })
              .setTimestamp(),
          ],
        });

        // Notify report_channel if configured
        if (settings.report_channel) {
          const channel = await interaction.guild.channels.fetch(settings.report_channel).catch(() => null);
          if (channel?.isTextBased()) {
            const notif = new EmbedBuilder()
              .setTitle(`📢 ${t('NEW_REPORT', locale)}`)
              .setColor(0xFFA500)
              .addFields(
                { name: t('LABEL_REPORTED', locale), value: `<@${target.id}> (${target.tag})`, inline: true },
                { name: t('LABEL_BY', locale), value: `<@${interaction.user.id}>`, inline: true },
                { name: t('LABEL_REASON', locale), value: reason },
              )
              .setTimestamp();
            if (evidence) notif.addFields({ name: t('LABEL_EVIDENCE', locale), value: evidence });
            await channel.send({
              embeds: [notif],
              components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setLabel(t('BTN_MANAGE_REPORT', locale))
                  .setStyle(ButtonStyle.Link)
                  .setURL(`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`),
              )],
            });
          }
        }
      } catch (err) {
        console.error('[report]', err);
        await interaction.editReply({
          embeds: [new EmbedBuilder().setTitle(`❌ ${t('ERROR', locale)}`).setDescription(t('REPORT_ERROR', locale)).setColor(0xED4245).setTimestamp()],
        });
      }
    },
  },

  // ── /myreports ───────────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('myreports')
      .setDescription('📋 View your submitted reports'),

    async execute(interaction) {
      await interaction.deferReply({ flags: 64 });
      const settings = await getSettings(interaction.guildId);
      const locale = settings.locale || 'ru';

      try {
        const { rows } = await db.getReportsByUser(interaction.guildId, interaction.user.id);

        if (!rows.length) {
          return interaction.editReply({
            embeds: [new EmbedBuilder().setTitle(`📋 ${t('MY_REPORTS', locale)}`).setDescription(t('NO_REPORTS', locale)).setColor(0x949BA4).setTimestamp()],
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`📋 ${t('MY_REPORTS', locale)} (${rows.length})`)
          .setColor(0x5865F2)
          .setTimestamp()
          .setFooter({ text: '🔥 InfernoBot', iconURL: interaction.client.user.displayAvatarURL() });

        for (const report of rows.slice(0, 10)) {
          const statusEmoji = { resolved: '✅', rejected: '❌' }[report.status] ?? '⏳';
          const date = new Date(report.created_at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'it-IT');
          embed.addFields({
            name: `${statusEmoji} ${t('REPORT_DATE', locale, { date })}`,
            value: `**${t('USER', locale)}:** <@${report.target_id}>\n**${t('REASON', locale)}:** ${report.reason}\n**${t('STATUS', locale)}:** ${report.status}`,
          });
        }

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('[myreports]', err);
        return interaction.editReply({
          embeds: [new EmbedBuilder().setTitle(`❌ ${t('ERROR', locale)}`).setDescription(t('ERROR_OCCURRED', locale)).setColor(0xED4245).setTimestamp()],
        });
      }
    },
  },
];
