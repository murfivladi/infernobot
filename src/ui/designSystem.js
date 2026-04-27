/**
 * 🔥 INFERNO BOT - Design System
 * Centralized design tokens and UI constants
 */

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // 🎨 COLOR PALETTE - Modern Discord-inspired theme
  // ═══════════════════════════════════════════════════════════════
  
  colors: {
    // Primary brand colors
    primary:       0x5865F2,  // Discord Blurple
    secondary:     0x7289DA,  // Light Blurple
    accent:        0x00D9FF,  // Cyan accent
    danger:        0xED4245,  // Red (Destructive)
    success:       0x57F287,  // Green
    warning:       0xFEE75C,  // Yellow
    
    // Neutral colors
    dark:          0x23272A,  // Dark background
    darker:        0x1E1F22,  // Darker
    darkest:       0x16181D,  // Darkest (sidebar)
    light:         0xF4F4F5,  // Light text
    muted:         0x949BA4,  // Muted text
    
    // Category colors (for embeds)
    moderation:    0xFF4757,  // Red
    reports:       0x5352ED,  // Indigo
    otchety:       0x00D9FF,  // Cyan
    staff:         0x3742FA,  // Blue
    settings:      0xA4B0BE,  // Gray
    system:        0x2ED573,  // Green
    
    // Gradients (as array of colors for future use)
    gradients: {
      admin:     [0x5865F2, 0x7289DA],
      mod:       [0xFF4757, 0xFF6B81],
      staff:     [0x3742FA, 0x5352ED],
      success:   [0x2ED573, 0x7BED9F],
      danger:    [0xED4245, 0xFF6B6B],
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // 📝 EMBED TEMPLATES - Pre-configured embed styles
  // ═══════════════════════════════════════════════════════════════
  
  embedTemplates: {
    // Base embed structure
    base: (title, description, color = 0x5865F2) => ({
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
    }),
    
    // Success embed
    success: (title, description) => ({
      title: `✅ ${title}`,
      description,
      color: 0x57F287,
      timestamp: new Date().toISOString(),
    }),
    
    // Error embed
    error: (title, description) => ({
      title: `❌ ${title}`,
      description,
      color: 0xED4245,
      timestamp: new Date().toISOString(),
    }),
    
    // Warning embed
    warning: (title, description) => ({
      title: `⚠️ ${title}`,
      description,
      color: 0xFEE75C,
      timestamp: new Date().toISOString(),
    }),
    
    // Info embed
    info: (title, description) => ({
      title: `ℹ️ ${title}`,
      description,
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // 🧩 BUTTON STYLES & CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  
  buttonStyles: {
    primary:   1, // Primary (Bluurple)
    secondary: 2, // Secondary (Gray)
    success:   3, // Success (Green)
    danger:    4, // Danger (Red)
  },

  buttonSizes: {
    small: { maxLength: 20, style: 'compact' },
    medium: { maxLength: 30, style: 'normal' },
    large: { maxLength: 45, style: 'spacious' },
  },

  // ═══════════════════════════════════════════════════════════════
  // 🏷️ CATEGORY ICONS & LABELS
  // ═══════════════════════════════════════════════════════════════
  
  categories: {
    moderation: {
      icon: '🛡️',
      name: 'Moderazione',
      color: 0xFF4757,
    },
    reports: {
      icon: '📋',
      name: 'Reports',
      color: 0x5352ED,
    },
    otchety: {
      icon: '📊',
      name: 'Otchety',
      color: 0x00D9FF,
    },
    staff: {
      icon: '👥',
      name: 'Staff',
      color: 0x3742FA,
    },
    settings: {
      icon: '⚙️',
      name: 'Impostazioni',
      color: 0xA4B0BE,
    },
    system: {
      icon: '🖥️',
      name: 'Sistema',
      color: 0x2ED573,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 📊 PERMISSION ICONS & CONFIGURATION  
  // ═══════════════════════════════════════════════════════════════
  
  permissions: {
    kick:        { icon: '👢', label: 'Kick',      category: 'moderation' },
    ban:         { icon: '🔨', label: 'Ban',       category: 'moderation' },
    mute:        { icon: '🔇', label: 'Mute',      category: 'moderation' },
    unmute:      { icon: '🔊', label: 'Unmute',    category: 'moderation' },
    warn:        { icon: '⚠️', label: 'Warn',      category: 'moderation' },
    remwarn:     { icon: '🧹', label: 'Rem. Warn', category: 'moderation' },
    reports_view:   { icon: '👁️', label: 'View',  category: 'reports' },
    reports_manage: { icon: '✏️', label: 'Manage', category: 'reports' },
    otchety_view:   { icon: '📄', label: 'View',  category: 'otchety' },
    otchety_create: { icon: '📝', label: 'Create', category: 'otchety' },
    staff_view:     { icon: '👥', label: 'View',  category: 'staff' },
    staff_manage:   { icon: '🎭', label: 'Manage', category: 'staff' },
    settings_view:  { icon: '🔍', label: 'View',  category: 'settings' },
    settings_edit:  { icon: '🔧', label: 'Edit',  category: 'settings' },
  },

  // ═══════════════════════════════════════════════════════════════
  // 🎯 ACTION ICONS - Consistent action buttons
  // ═══════════════════════════════════════════════════════════════
  
  actions: {
    back:        { emoji: '◀️', label: 'Indietro', style: 2 },
    home:        { emoji: '🏠', label: 'Home',     style: 2 },
    settings:    { emoji: '⚙️', label: 'Impostazioni', style: 2 },
    save:        { emoji: '💾', label: 'Salva',    style: 3 },
    cancel:      { emoji: '❌', label: 'Annulla',  style: 4 },
    delete:      { emoji: '🗑️', label: 'Elimina',  style: 4 },
    edit:        { emoji: '✏️', label: 'Modifica', style: 1 },
    add:         { emoji: '➕', label: 'Aggiungi', style: 3 },
    remove:      { emoji: '➖', label: 'Rimuovi',  style: 4 },
    view:        { emoji: '👁️', label: 'Vedi',    style: 2 },
    next:        { emoji: '▶️', label: 'Avanti',   style: 2 },
    prev:        { emoji: '◀️', label: 'Indietro', style: 2 },
    confirm:     { emoji: '✅', label: 'Conferma', style: 3 },
    search:      { emoji: '🔍', label: 'Cerca',    style: 2 },
  },

  // ═══════════════════════════════════════════════════════════════
  // 📐 LAYOUT CONSTANTS
  // ═══════════════════════════════════════════════════════════════
  
  layout: {
    maxFieldsPerEmbed: 25,
    maxFieldValueLength: 1024,
    maxFieldNameLength: 256,
    maxDescriptionLength: 4096,
    maxTitleLength: 256,
    buttonsPerRow: 5,
    maxRows: 5,
    pagination: {
      rolesPerPage: 10,
      permsPerPage: 6,
      reportsPerPage: 5,
      otchetyPerPage: 5,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 🎬 ANIMATION & FEEDBACK
  // ═══════════════════════════════════════════════════════════════
  
  animations: {
    loadingEmoji: '⚡',
    successEmoji: '✨',
    errorEmoji: '💥',
    typingIndicator: 'typing...',
  },

  // ═══════════════════════════════════════════════════════════════
  // 🏷️ STATUS BADGES
  // ═══════════════════════════════════════════════════════════════
  
  statusBadges: {
    open:      { emoji: '🟢', label: 'Aperto' },
    pending:   { emoji: '🟡', label: 'In attesa' },
    resolved:  { emoji: '🔵', label: 'Risolto' },
    closed:    { emoji: '⚫', label: 'Chiuso' },
    rejected:  { emoji: '🔴', label: 'Rifiutato' },
  },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  helpers: {
    // Create colored bar for permissions
    permBar: (count, max, size = 7) => {
      const filled = '▰'.repeat(Math.min(count, size));
      const empty = '▱'.repeat(Math.max(0, size - Math.min(count, size)));
      return filled + empty;
    },
    
    // Format timestamp
    formatDate: (date) => {
      return new Date(date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    
    // Format relative time
    relativeTime: (date) => {
      const now = Date.now();
      const diff = now - new Date(date).getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'Ora';
      if (minutes < 60) return `${minutes}m fa`;
      if (hours < 24) return `${hours}h fa`;
      return `${days}g fa`;
    },
    
    // Truncate text
    truncate: (text, maxLength = 100) => {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    },
    
    // Get category color
    getCategoryColor: (category) => {
      const colors = {
        moderation: 0xFF4757,
        reports: 0x5352ED,
        otchety: 0x00D9FF,
        staff: 0x3742FA,
        settings: 0xA4B0BE,
        system: 0x2ED573,
      };
      return colors[category] || 0x5865F2;
    },
    
    // Status indicator
    statusIndicator: (status) => {
      const indicators = {
        online: '🟢 Online',
        idle: '🟡 Idle',
        dnd: '🔴 DND',
        offline: '⚫ Offline',
      };
      return indicators[status] || '⚫ Offline';
    },
    
    // Role badge
    roleBadge: (roleName, color) => {
      return `<@&${roleName}>`;
    },
  },
};