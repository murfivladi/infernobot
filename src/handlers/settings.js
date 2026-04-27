const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SETTING_MODAL_MAP = {
  set_lang:       { key: 'locale',          label: 'INPUT_LANG',       title: 'BTN_SET_LANG' },
  set_log_ch:     { key: 'log_channel',     label: 'INPUT_CHANNEL_ID', title: 'BTN_SET_LOG_CH' },
  set_mod_ch:     { key: 'mod_channel',     label: 'INPUT_CHANNEL_ID', title: 'BTN_SET_MOD_CH' },
  set_report_ch:  { key: 'report_channel',  label: 'INPUT_CHANNEL_ID', title: 'BTN_SET_REPORT_CH' },
  set_welcome_ch: { key: 'welcome_channel', label: 'INPUT_CHANNEL_ID', title: 'BTN_SET_WELCOME_CH' },
  set_mute_role:  { key: 'mute_role',       label: 'INPUT_ROLE_ID',    title: 'BTN_SET_MUTE_ROLE' },
  set_admin_role: { key: 'admin_role',      label: 'INPUT_ROLE_ID',    title: 'BTN_SET_ADMIN_ROLE' },
  set_mod_role:   { key: 'mod_role',        label: 'INPUT_ROLE_ID',    title: 'BTN_SET_MOD_ROLE' },
};

function buildSettingsFields(settings, locale, t) {
  const s = (key) => t(key, locale) || key;
  const ch = (id) => id ? `<#${id}>` : s('SETTINGS_NOT_SET');
  const ro = (id) => id ? `<@&${id}>` : s('SETTINGS_NOT_SET');
  return [
    { name: `🌐 ${s('SETTINGS_LANG')}`,      value: settings.locale || s('SETTINGS_NOT_SET'), inline: true },
    { name: `📋 ${s('SETTINGS_LOG_CH')}`,    value: ch(settings.log_channel),    inline: true },
    { name: `🔨 ${s('SETTINGS_MOD_CH')}`,    value: ch(settings.mod_channel),    inline: true },
    { name: `📩 ${s('SETTINGS_REPORT_CH')}`, value: ch(settings.report_channel), inline: true },
    { name: `👋 ${s('SETTINGS_WELCOME_CH')}`,value: ch(settings.welcome_channel),inline: true },
    { name: `🔇 ${s('SETTINGS_MUTE_ROLE')}`, value: ro(settings.mute_role),      inline: true },
    { name: `🛡️ ${s('SETTINGS_ADMIN_ROLE')}`,value: ro(settings.admin_role),     inline: true },
    { name: `👮 ${s('SETTINGS_MOD_ROLE')}`,  value: ro(settings.mod_role),       inline: true },
  ];
}

function buildSettingsButtons(locale, t, Button) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('set_lang').setLabel('🌐 Lingua').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_log_ch').setLabel('📋 Log').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_mod_ch').setLabel('🔨 Mod').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_report_ch').setLabel('📩 Reports').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_welcome_ch').setLabel('👋 Welcome').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('set_mute_role').setLabel('🔇 Mute').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_admin_role').setLabel('🛡️ Admin').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_mod_role').setLabel('👮 Mod').setStyle(ButtonStyle.Secondary),
      Button.back('admin_settings')
    ),
  ];
}

module.exports = { SETTING_MODAL_MAP, buildSettingsFields, buildSettingsButtons };
