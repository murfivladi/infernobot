/**
 * 🔥 INFERNO BOT - UI Components
 * Reusable UI components with modern design
 * Now supports external locale files for full i18n
 */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  SelectMenuBuilder,
  SelectMenuOptionBuilder,
} = require('discord.js');

const Design = require('./designSystem');

// Load locales
const locales = {};
const localesPath = '../locales';
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, localesPath))) {
  fs.readdirSync(path.join(__dirname, localesPath)).forEach(file => {
    if (file.endsWith('.json')) {
      locales[file.split('.')[0]] = JSON.parse(fs.readFileSync(path.join(__dirname, localesPath, file), 'utf8'));
    }
  });
}

// Locale helper function
function t(key, locale = 'ru') {
  return locales[locale]?.[key] || locales.ru?.[key] || key;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 EMBED BUILDER - Modern embed creation helpers
// ═══════════════════════════════════════════════════════════════

const Embed = {
  /**
   * Create a modern panel embed with icon and styling
   */
  panel: (title, description, category, options = {}) => {
    const cat = Design.categories[category] || Design.categories.settings;
    const embed = new EmbedBuilder()
      .setTitle(`${cat.icon} ${title}`)
      .setDescription(description)
      .setColor(cat.color)
      .setTimestamp();

    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.footer) embed.setFooter({ text: options.footer, iconURL: options.footerIcon });
    if (options.fields) embed.addFields(options.fields);
    if (options.author) embed.setAuthor(options.author);
    
    return embed;
  },

  /**
   * Create a success embed
   */
  success: (title, description, options = {}) => {
    const embed = new EmbedBuilder()
      .setTitle(`✅ ${title}`)
      .setDescription(description)
      .setColor(Design.colors.success)
      .setTimestamp();
    
    if (options.footer) embed.setFooter({ text: options.footer });
    return embed;
  },

  /**
   * Create an error embed
   */
  error: (title, description, options = {}) => {
    const embed = new EmbedBuilder()
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setColor(Design.colors.danger)
      .setTimestamp();
    
    if (options.footer) embed.setFooter({ text: options.footer });
    return embed;
  },

  /**
   * Create a loading embed
   */
  loading: (title, locale = 'ru') => {
    return new EmbedBuilder()
      .setTitle(`⏳ ${title}`)
      .setDescription(t('LOADING', locale) || 'Загрузка...')
      .setColor(Design.colors.primary)
      .setTimestamp();
  },

  /**
   * Create a stats embed with value display
   */
  stats: (title, stats, category = 'system', locale = 'ru') => {
    const cat = Design.categories[category] || Design.categories.system;
    const fields = Object.entries(stats).map(([key, value]) => ({
      name: key,
      value: String(value),
      inline: true,
    }));

    return new EmbedBuilder()
      .setTitle(`📊 ${title}`)
      .setColor(cat.color)
      .addFields(fields)
      .setTimestamp();
  },

  /**
   * Create a list embed with pagination info
   */
  list: (title, items, page = 1, totalPages = 1, category = 'reports', locale = 'ru') => {
    const cat = Design.categories[category] || Design.categories.reports;
    const content = items.join('\n') || t('LIST_NO_ITEMS', locale);
    
    return new EmbedBuilder()
      .setTitle(`${cat.icon} ${title}`)
      .setDescription(content)
      .setColor(cat.color)
      .setFooter({ 
        text: `📄 ${t('PAGE', locale)} ${page}/${totalPages} • 🔥 InfernoBot`,
      })
      .setTimestamp();
  },

  /**
   * Create a user profile embed
   */
  profile: (member, stats, locale = 'ru') => {
    const joinedAt = member.joinedAt 
      ? `<t:${Math.floor(member.joinedAt / 1000)}:R>` 
      : '—';
    
    const roles = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .join(' ') || t('PROFILE_NO_ROLES', locale);

    return new EmbedBuilder()
      .setTitle(`👤 ${member.user.username}`)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setColor(member.displayColor || Design.colors.primary)
      .addFields(
        { name: t('PROFILE_JOINED', locale), value: joinedAt, inline: true },
        { name: t('PROFILE_WARNS', locale), value: String(stats.warnings || 0), inline: true },
        { name: t('PROFILE_BANS', locale), value: String(stats.bans || 0), inline: true },
        { name: t('PROFILE_MUTES', locale), value: String(stats.mutes || 0), inline: true },
        { name: t('PROFILE_KICKS', locale), value: String(stats.kicks || 0), inline: true },
      )
      .addFields({ name: t('PROFILE_ROLES', locale), value: roles, inline: false })
      .setTimestamp()
      .setFooter({ text: t('FOOTER_PROFILE', locale) });
  },

  /**
   * Create a confirmation embed
   */
  confirm: (title, description, warning = false) => {
    return new EmbedBuilder()
      .setTitle(warning ? `⚠️ ${title}` : `🔔 ${title}`)
      .setDescription(description)
      .setColor(warning ? Design.colors.warning : Design.colors.primary)
      .setTimestamp();
  },

  /**
   * Create a server info embed
   */
  serverInfo: (guild, locale = 'ru') => {
    return new EmbedBuilder()
      .setTitle(`${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .setColor(Design.colors.primary)
      .addFields(
        { name: t('SERVER_ID', locale), value: guild.id, inline: true },
        { name: t('SERVER_OWNER', locale), value: `<@${guild.ownerId}>`, inline: true },
        { name: t('SERVER_MEMBERS', locale), value: String(guild.memberCount), inline: true },
        { name: t('SERVER_CREATED', locale), value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: t('SERVER_VERIFY', locale), value: String(guild.verificationLevel), inline: true },
        { name: t('SERVER_CHANNELS', locale), value: String(guild.channels.cache.size), inline: true },
        { name: t('SERVER_ROLES', locale), value: String(guild.roles.cache.size), inline: true },
        { name: t('SERVER_EMOJIS', locale), value: String(guild.emojis.cache.size), inline: true },
      )
      .setTimestamp()
      .setFooter({ text: t('FOOTER_DEFAULT', locale) });
  },
};

// ═══════════════════════════════════════════════════════════════
// 🔘 BUTTON BUILDERS - Pre-styled button components
// ═══════════════════════════════════════════════════════════════

const Button = {
  /**
   * Create a styled button
   */
  create: (customId, label, style = ButtonStyle.Secondary, emoji = null) => {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(style)
      .setEmoji(emoji || null);
  },

  /**
   * Create back button
   */
  back: (parentId, locale = 'ru') => {
    return new ButtonBuilder()
      .setCustomId(parentId)
      .setLabel(t('BACK', locale))
      .setStyle(Design.actions.back.style)
      .setEmoji(Design.actions.back.emoji);
  },

  /**
   * Create home button
   */
  home: (locale = 'ru') => {
    return new ButtonBuilder()
      .setCustomId('admin_root')
      .setLabel(t('HOME', locale))
      .setStyle(Design.actions.home.style)
      .setEmoji(Design.actions.home.emoji);
  },

  /**
   * Create navigation buttons
   */
  nav: (currentPage, totalPages, prevId, nextId, locale = 'ru') => {
    const nextLabel = currentPage >= totalPages ? t('END', locale) : `${currentPage + 1}`;
    return [
      new ButtonBuilder()
        .setCustomId(prevId)
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1),
      new ButtonBuilder()
        .setCustomId(nextId)
        .setLabel(nextLabel)
        .setStyle(currentPage >= totalPages ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages),
    ];
  },

  /**
   * Create action buttons (edit, delete, etc.)
   */
  actions: (actions) => {
    return actions.map(action => {
      const config = Design.actions[action.type] || Design.actions.edit;
      return new ButtonBuilder()
        .setCustomId(action.customId)
        .setLabel(action.label || config.label)
        .setStyle(action.style || config.style)
        .setEmoji(config.emoji);
    });
  },

  /**
   * Create confirmation buttons
   */
  confirm: (confirmId, cancelId = 'cancel', locale = 'ru') => {
    return [
      new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel('✅')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel(t('BACK', locale))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️'),
    ];
  },
};

// ═══════════════════════════════════════════════════════════════
// 📋 ACTION ROW BUILDERS - Organize buttons in rows
// ═══════════════════════════════════════════════════════════════

const Row = {
  /**
   * Create a row from array of buttons
   */
  fromButtons: (buttons) => {
    return new ActionRowBuilder().addComponents(buttons);
  },

  /**
   * Create multiple rows from button array (auto-paginate)
   */
  paginateButtons: (buttons, perRow = 5) => {
    const rows = [];
    for (let i = 0; i < buttons.length; i += perRow) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + perRow)));
    }
    return rows;
  },

  /**
   * Create navigation row
   */
  nav: (currentPage, totalPages, prevId, nextId, backId = null, locale = 'ru') => {
    const buttons = [
      new ButtonBuilder()
        .setCustomId(prevId)
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1),
      new ButtonBuilder()
        .setCustomId(nextId)
        .setLabel(currentPage >= totalPages ? t('END', locale) : `${currentPage + 1}`)
        .setStyle(currentPage >= totalPages ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages),
    ];
    
    if (backId) {
      buttons.push(new ButtonBuilder()
        .setCustomId(backId)
        .setLabel(t('HOME', locale))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏠'));
    }

    return new ActionRowBuilder().addComponents(buttons);
  },

  /**
   * Create action row with back button
   */
  withBack: (buttons, backId, locale = 'ru') => {
    const rowButtons = [...buttons];
    if (backId) {
      rowButtons.push(new ButtonBuilder()
        .setCustomId(backId)
        .setLabel(t('BACK', locale))
        .setStyle(Design.actions.back.style)
        .setEmoji(Design.actions.back.emoji));
    }
    return new ActionRowBuilder().addComponents(rowButtons);
  },
};

// ═══════════════════════════════════════════════════════════════
// 🎛️ SELECT MENUS - Dropdown components
// ═══════════════════════════════════════════════════════════════

const Select = {
  /**
   * Create a select menu
   */
  menu: (customId, placeholder, options, minValues = 1, maxValues = 1) => {
    return new SelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(minValues)
      .setMaxValues(maxValues)
      .addOptions(options);
  },

  /**
   * Create select for roles
   */
  roles: (guild, customId, selectedRoleId = null, locale = 'ru') => {
    const roles = guild.roles.cache
      .filter(r => r.id && r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .first(25); // Discord limit

    const options = roles.map(role => 
      new SelectMenuOptionBuilder()
        .setLabel(role.name)
        .setValue(role.id)
        .setDefault(selectedRoleId === role.id)
    );

    const placeholder = t('SELECT_ROLE', locale) || 'Select a role...';
    return Select.menu(customId, placeholder, options);
  },

  /**
   * Create select for locales
   */
  locales: (customId, locale = 'ru') => {
    const options = [
      new SelectMenuOptionBuilder().setLabel('🇮🇹 Italiano').setValue('it').setDefault(locale === 'it'),
      new SelectMenuOptionBuilder().setLabel('🇬🇧 English').setValue('en').setDefault(locale === 'en'),
      new SelectMenuOptionBuilder().setLabel('🇷🇺 Русский').setValue('ru').setDefault(locale === 'ru'),
    ];
    const placeholder = t('SELECT_LANG', locale) || 'Select language...';
    return Select.menu(customId, placeholder, options);
  },
};

// ═══════════════════════════════════════════════════════════════
// 📊 TABLES & LISTS - Structured content display
// ═══════════════════════════════════════════════════════════════

const Table = {
  /**
   * Create a formatted list with numbers
   */
  numberedList: (items, options = {}) => {
    const startNum = options.start || 1;
    return items.map((item, i) => {
      const num = String(i + startNum).padStart(2, '0');
      return `**${num}.** ${item}`;
    }).join('\n');
  },

  /**
   * Create a key-value table
   */
  kvTable: (data, options = {}) => {
    const maxKeyLen = options.maxKeyLen || 20;
    return Object.entries(data)
      .map(([key, value]) => {
        const paddedKey = key.padEnd(maxKeyLen, ' ');
        return `**${paddedKey}** ${value}`;
      })
      .join('\n');
  },

  /**
   * Create permission display
   */
  permissions: (perms, allPerms, locale = 'ru') => {
    return allPerms.map(p => {
      const enabled = perms[p.key] === true;
      const icon = enabled ? '🟢' : '⚫';
      const label = t(p.labelKey, locale) || p.key;
      return `${icon} **${p.icon} ${label}**`;
    }).join('\n');
  },

  /**
   * Create status indicator bar
   */
  statusBar: (current, total, size = 10) => {
    const filled = Math.round((current / total) * size);
    const empty = size - filled;
    return '🟩'.repeat(filled) + '⬛'.repeat(empty) + ` **${current}/${total}**`;
  },
};

// ═══════════════════════════════════════════════════════════════
// 🎨 SPECIAL COMPONENTS - Rich UI elements
// ═══════════════════════════════════════════════════════════════

const Special = {
  /**
   * Create role card for permissions panel
   */
  roleCard: (role, permCount, totalPerms) => {
    const bar = Design.helpers.permBar(permCount, totalPerms, 7);
    const hasCustom = permCount > 0;
    return `> ${hasCustom ? '🟢' : '⚫'} **${role.name}**\n> ${bar} \n`;
  },

  /**
   * Create stat card
   */
  statCard: (emoji, label, value, color = Design.colors.primary) => {
    return {
      name: `${emoji} ${label}`,
      value: `**${value}**`,
      inline: true,
    };
  },

  /**
   * Create divider with text
   */
  divider: (text = '') => {
    if (text) return `═══════════════════\n**${text}**\n═══════════════════`;
    return '═══════════════════';
  },

  /**
   * Create inline badge
   */
  badge: (emoji, text, style = 'default') => {
    const styles = {
      success: '🟢',
      warning: '🟡',
      danger: '🔴',
      info: '🔵',
      default: '⚫',
    };
    return `${styles[style] || styles.default} ${text}`;
  },
};

// ═══════════════════════════════════════════════════════════════
// 🚀 QUICK PANEL CREATORS
// ═══════════════════════════════════════════════════════════════

const Panels = {
  /**
   * Create admin main panel
   */
  adminMain: (locale = 'ru') => {
    return {
      embeds: [new EmbedBuilder()
        .setTitle(t('ADMIN_TITLE', locale))
        .setDescription(t('ADMIN_DESC', locale))
        .setColor(Design.colors.primary)
        .setTimestamp()
        .setFooter({ text: t('FOOTER_ADMIN', locale) })],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('admin_settings').setLabel(t('ADMIN_SETTINGS', locale)).setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
          new ButtonBuilder().setCustomId('admin_staff').setLabel(t('ADMIN_STAFF', locale)).setStyle(ButtonStyle.Primary).setEmoji('👮'),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('admin_community').setLabel(t('ADMIN_COMMUNITY', locale)).setStyle(ButtonStyle.Primary).setEmoji('👥'),
          new ButtonBuilder().setCustomId('admin_permissions').setLabel(t('ADMIN_PERMISSIONS', locale)).setStyle(ButtonStyle.Primary).setEmoji('🔑'),
          new ButtonBuilder().setCustomId('admin_system').setLabel(t('ADMIN_SYSTEM', locale)).setStyle(ButtonStyle.Danger).setEmoji('🖥️'),
        ),
      ],
    };
  },

  /**
   * Create staff main panel
   */
  staffMain: (locale = 'ru') => {
    return {
      embeds: [new EmbedBuilder()
        .setTitle(t('STAFF_PANEL_TITLE', locale))
        .setDescription(t('STAFF_PANEL_DESC', locale))
        .setColor(Design.colors.staff)
        .setTimestamp()
        .setFooter({ text: t('FOOTER_STAFF', locale) })],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('moderation').setLabel(t('STAFF_MOD', locale)).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
          new ButtonBuilder().setCustomId('communication').setLabel(t('STAFF_COMM', locale)).setStyle(ButtonStyle.Primary).setEmoji('💬'),
          new ButtonBuilder().setCustomId('profile').setLabel(t('STAFF_PROF', locale)).setStyle(ButtonStyle.Primary).setEmoji('👤'),
        ),
      ],
    };
  },

  /**
   * Create settings panel
   */
  settingsBot: (settings, locale = 'ru') => {
    const notSet = t('SETTINGS_NOT_SET', locale);
    
    const formatValue = (val, type = 'text') => {
      if (!val) return notSet;
      if (type === 'channel') return `<#${val}>`;
      if (type === 'role') return `<@&${val}>`;
      return val;
    };

    return {
      embeds: [new EmbedBuilder()
        .setTitle(t('SETTINGS_BOT_TITLE', locale))
        .setColor(Design.colors.settings)
        .addFields(
          { name: t('SETTINGS_LANG', locale), value: formatValue(settings.language), inline: true },
          { name: t('SETTINGS_LOG_CH', locale), value: formatValue(settings.log_channel, 'channel'), inline: true },
          { name: t('SETTINGS_MOD_CH', locale), value: formatValue(settings.mod_channel, 'channel'), inline: true },
          { name: t('SETTINGS_REPORT_CH', locale), value: formatValue(settings.report_channel, 'channel'), inline: true },
          { name: t('SETTINGS_WELCOME_CH', locale), value: formatValue(settings.welcome_channel, 'channel'), inline: true },
          { name: t('SETTINGS_MUTE_ROLE', locale), value: formatValue(settings.mute_role, 'role'), inline: true },
          { name: t('SETTINGS_ADMIN_ROLE', locale), value: formatValue(settings.admin_role, 'role'), inline: true },
          { name: t('SETTINGS_MOD_ROLE', locale), value: formatValue(settings.mod_role, 'role'), inline: true },
        )
        .setTimestamp()
        .setFooter({ text: t('FOOTER_SETTINGS', locale) })],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_lang').setLabel(t('BTN_SET_LANG', locale)).setStyle(ButtonStyle.Secondary).setEmoji('🌐'),
          new ButtonBuilder().setCustomId('set_log_ch').setLabel(t('BTN_LOG', locale) + ' Log').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
          new ButtonBuilder().setCustomId('set_mod_ch').setLabel(t('BTN_MOD', locale) + ' Mod').setStyle(ButtonStyle.Secondary).setEmoji('🔨'),
          new ButtonBuilder().setCustomId('set_report_ch').setLabel(t('BTN_REPORTS', locale) + ' Reports').setStyle(ButtonStyle.Secondary).setEmoji('📩'),
          new ButtonBuilder().setCustomId('set_welcome_ch').setLabel(t('BTN_WELCOME', locale) + ' Welcome').setStyle(ButtonStyle.Secondary).setEmoji('👋'),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_mute_role').setLabel(t('BTN_MUTE', locale) + ' Mute').setStyle(ButtonStyle.Secondary).setEmoji('🔇'),
          new ButtonBuilder().setCustomId('set_admin_role').setLabel(t('BTN_ADMIN', locale) + ' Admin').setStyle(ButtonStyle.Secondary).setEmoji('🛡️'),
          new ButtonBuilder().setCustomId('set_mod_role').setLabel(t('BTN_MOD_ROLE', locale) + ' Mod').setStyle(ButtonStyle.Secondary).setEmoji('👮'),
          new ButtonBuilder().setCustomId('admin_settings').setLabel(t('BACK', locale)).setStyle(ButtonStyle.Secondary).setEmoji('◀️'),
        ),
      ],
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  Design,
  Embed,
  Button,
  Row,
  Select,
  Table,
  Special,
  Panels,
  t, // Export t function for use in other modules
};