/**
 * 🔥 INFERNO BOT - Communication Commands
 * Reports and communication with modern UI and localization
 */

const { 
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

module.exports = [
  // ═══════════════════════════════════════════════════════════
  // 📢 REPORT COMMAND
  // ═══════════════════════════════════════════════════════════
  {
    data: new SlashCommandBuilder()
      .setName('report')
      .setDescription('📢 Submit a report')
      .addUserOption(function(o) { return o.setName('user').setDescription('User to report').setRequired(true); })
      .addStringOption(function(o) { return o.setName('reason').setDescription('Reason').setRequired(true); })
      .addStringOption(function(o) { return o.setName('evidence').setDescription('Evidence links (optional)'); }),
    
    async execute(interaction) {
      var target = interaction.options.getUser('user');
      var reason = interaction.options.getString('reason');
      var evidence = interaction.options.getString('evidence');
      
      // Get locale from server settings
      var settings = await getSettings(interaction.guildId);
      var locale = settings && settings.locale || 'ru';
      
      await interaction.deferReply({ flags: 64 });
      
      try {
        await db.addReport(interaction.guildId, interaction.user.id, target.id, reason, evidence);
        
        var embed = new EmbedBuilder()
          .setTitle('✅ ' + t('REPORT_SENT', locale))
          .setDescription(t('REPORT_SENT_DESC', locale))
          .setColor(0x57F287)
          .addFields(
            { name: t('LABEL_REPORTED', locale), value: '<@' + target.id + '>', inline: true },
            { name: t('LABEL_REPORTER', locale), value: '<@' + interaction.user.id + '>', inline: true },
            { name: t('LABEL_REASON', locale), value: reason, inline: false }
          )
          .setFooter({ text: t('REPORT_FOOTER', locale), iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // Notify staff channel if configured
        try {
          var stg = await getSettings(interaction.guildId);
          if (stg && stg.report_channel) {
            var channel = await interaction.guild.channels.fetch(stg.report_channel);
            if (channel) {
              var notif = new EmbedBuilder()
                .setTitle('📢 ' + t('NEW_REPORT', locale))
                .setDescription(t('NEW_REPORT_DESC', locale))
                .setColor(0xFFA500)
                .addFields(
                  { name: t('LABEL_REPORTED', locale), value: '<@' + target.id + '> (' + target.tag + ')', inline: true },
                  { name: t('LABEL_BY', locale), value: '<@' + interaction.user.id + '>', inline: true },
                  { name: t('LABEL_REASON', locale), value: reason, inline: false }
                )
                .setTimestamp();
              
              if (evidence) notif.addFields({ name: t('LABEL_EVIDENCE', locale), value: evidence, inline: false });
              
              var viewBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel(t('BTN_MANAGE_REPORT', locale)).setStyle(ButtonStyle.Link)
                  .setURL('https://discord.com/channels/' + interaction.guildId + '/' + interaction.channelId)
              );
              
              await channel.send({ embeds: [notif], components: [viewBtn] });
            }
          }
        } catch (notifyErr) {
          console.log('Could not notify staff channel:', notifyErr.message);
        }
        
      } catch (err) {
        console.error('Report error:', err);
        var errorEmbed = new EmbedBuilder()
          .setTitle('❌ ' + t('ERROR', locale))
          .setDescription(t('REPORT_ERROR', locale))
          .setColor(0xED4245)
          .setTimestamp();
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 📊 MY REPORTS COMMAND
  // ═══════════════════════════════════════════════════════════
  {
    data: new SlashCommandBuilder()
      .setName('myreports')
      .setDescription('📋 View your submitted reports'),
    
    async execute(interaction) {
      await interaction.deferReply({ flags: 64 });
      
      // Get locale from server settings
      var settings = await getSettings(interaction.guildId);
      var locale = settings && settings.locale || 'ru';
      
      try {
        var rows = await db.getReportsByUser(interaction.guildId, interaction.user.id);
        
        if (rows.length === 0) {
          var embed = new EmbedBuilder()
            .setTitle('📋 ' + t('MY_REPORTS', locale))
            .setDescription(t('NO_REPORTS', locale))
            .setColor(0x949BA4)
            .setTimestamp();
          return await interaction.editReply({ embeds: [embed] });
        }
        
        var embed = new EmbedBuilder()
          .setTitle('📋 ' + t('MY_REPORTS', locale) + ' (' + rows.length + ')')
          .setDescription(t('MY_REPORTS_DESC', locale))
          .setColor(0x5865F2)
          .setTimestamp();
        
        var recentReports = rows.slice(0, 10);
        for (var i = 0; i < recentReports.length; i++) {
          var report = recentReports[i];
          var status = report.status || 'open';
          var statusEmoji = status === 'resolved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
          var date = new Date(report.created_at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'it-IT');
          
          embed.addFields({
            name: statusEmoji + ' ' + t('REPORT_DATE', locale, { date: date }),
            value: '**' + t('USER', locale) + ':** <@' + report.target_id + '>\n**' + t('REASON', locale) + ':** ' + report.reason + '\n**' + t('STATUS', locale) + ':** ' + status,
            inline: false
          });
        }
        
        embed.setFooter({ text: '🔥 InfernoBot', iconURL: interaction.client.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        
      } catch (err) {
        console.error('MyReports error:', err);
        var errorEmbed = new EmbedBuilder()
          .setTitle('❌ ' + t('ERROR', locale))
          .setDescription(t('ERROR_OCCURRED', locale))
          .setColor(0xED4245)
          .setTimestamp();
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    }
  }
];