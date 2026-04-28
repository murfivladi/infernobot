const { Pool } = require('pg');

// ── Connection ────────────────────────────────────────────────
const connStr = process.env.DATABASE_URL;
if (!connStr) throw new Error('DATABASE_URL environment variable is not set');

let poolConfig;
try {
  const url = new URL(connStr.replace(/^postgres(ql)?:\/\//, 'http://'));
  poolConfig = {
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
} catch {
  throw new Error(`DATABASE_URL is malformed: ${connStr}`);
}

const pool = new Pool(poolConfig);

// ── Schema ────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS warnings (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bans (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS mutes (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      duration_ms BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS kicks (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS mod_actions (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      target_id TEXT,
      reason TEXT NOT NULL,
      is_otchet BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'open',
      reply TEXT,
      rating INT,
      evidence TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS otchety (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      data TEXT NOT NULL,
      name TEXT NOT NULL,
      chto_sdelal TEXT NOT NULL,
      chto_ostalos TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      locale TEXT DEFAULT 'ru',
      log_channel TEXT,
      mod_channel TEXT,
      report_channel TEXT,
      welcome_channel TEXT,
      welcome_message TEXT,
      mute_role TEXT,
      admin_role TEXT,
      mod_role TEXT
    );
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'moderator',
      permissions TEXT[] DEFAULT '{}',
      added_by TEXT NOT NULL,
      added_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      permissions JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by TEXT,
      UNIQUE(guild_id, role_id)
    );
    CREATE TABLE IF NOT EXISTS guild_requests (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      guild_name TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS scheduled_actions (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      execute_at TIMESTAMPTZ NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS staff_role_links (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      discord_role_id TEXT NOT NULL,
      staff_role TEXT NOT NULL,
      UNIQUE(guild_id, discord_role_id)
    );
    CREATE TABLE IF NOT EXISTS polls (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '[]',
      sent_by TEXT NOT NULL,
      sent_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS poll_templates (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      question TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '[]',
      image TEXT,
      channel_id TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Migrations: add columns if missing
  await pool.query(`
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reply TEXT;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS rating INT;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ru';
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS log_channel TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS mod_channel TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS report_channel TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS welcome_channel TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS welcome_message TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS mute_role TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS admin_role TEXT;
    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS mod_role TEXT;
  `);
}

// ── Settings ──────────────────────────────────────────────────
async function getSettings(guild_id) {
  const { rows } = await pool.query('SELECT * FROM guild_settings WHERE guild_id=$1', [guild_id]);
  return rows[0] || { guild_id, locale: 'ru' };
}

const VALID_SETTING_KEYS = new Set([
  'locale', 'log_channel', 'mod_channel', 'report_channel',
  'welcome_channel', 'welcome_message', 'mute_role', 'admin_role', 'mod_role',
]);

async function setSetting(guild_id, key, value) {
  if (!VALID_SETTING_KEYS.has(key)) throw new Error(`Invalid setting key: ${key}`);
  await pool.query(
    `INSERT INTO guild_settings (guild_id, ${key}) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET ${key}=$2`,
    [guild_id, value],
  );
}

// ── DB helpers ────────────────────────────────────────────────
const db = {
  // Warnings
  addWarning: (guild_id, user_id, moderator_id, reason) =>
    pool.query('INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES ($1,$2,$3,$4)', [guild_id, user_id, moderator_id, reason]),
  getWarnings: (guild_id, user_id) =>
    pool.query('SELECT * FROM warnings WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC', [guild_id, user_id]),
  removeLastWarning: (guild_id, user_id) =>
    pool.query('DELETE FROM warnings WHERE id = (SELECT id FROM warnings WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1)', [guild_id, user_id]),

  // Bans
  addBan: (guild_id, user_id, moderator_id, reason) =>
    pool.query('INSERT INTO bans (guild_id, user_id, moderator_id, reason) VALUES ($1,$2,$3,$4)', [guild_id, user_id, moderator_id, reason]),
  getBans: (guild_id, user_id) =>
    pool.query('SELECT * FROM bans WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC', [guild_id, user_id]),

  // Mutes
  addMute: (guild_id, user_id, moderator_id, reason, duration_ms) =>
    pool.query('INSERT INTO mutes (guild_id, user_id, moderator_id, reason, duration_ms) VALUES ($1,$2,$3,$4,$5)', [guild_id, user_id, moderator_id, reason, duration_ms]),
  getMutes: (guild_id, user_id) =>
    pool.query('SELECT * FROM mutes WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC', [guild_id, user_id]),

  // Kicks
  addKick: (guild_id, user_id, moderator_id, reason) =>
    pool.query('INSERT INTO kicks (guild_id, user_id, moderator_id, reason) VALUES ($1,$2,$3,$4)', [guild_id, user_id, moderator_id, reason]),
  getKicks: (guild_id, user_id) =>
    pool.query('SELECT * FROM kicks WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC', [guild_id, user_id]),

  // Mod actions log
  logAction: (guild_id, user_id, moderator_id, action, reason) =>
    pool.query('INSERT INTO mod_actions (guild_id, user_id, moderator_id, action, reason) VALUES ($1,$2,$3,$4,$5)', [guild_id, user_id, moderator_id, action, reason]),
  getActions: (guild_id, user_id) =>
    pool.query('SELECT * FROM mod_actions WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC', [guild_id, user_id]),
  getRecentActions: (guild_id, limit = 20) =>
    pool.query('SELECT * FROM mod_actions WHERE guild_id=$1 ORDER BY created_at DESC LIMIT $2', [guild_id, limit]),

  // Reports
  addReport: (guild_id, reporter_id, target_id, reason, evidence = null) =>
    pool.query('INSERT INTO reports (guild_id, reporter_id, target_id, reason, is_otchet, evidence) VALUES ($1,$2,$3,$4,FALSE,$5)', [guild_id, reporter_id, target_id, reason, evidence]),
  getReport: (id) =>
    pool.query('SELECT * FROM reports WHERE id=$1', [id]),
  replyReport: (id, reply) =>
    pool.query("UPDATE reports SET reply=$2, status='replied' WHERE id=$1", [id, reply]),
  rateReport: (id, rating) =>
    pool.query('UPDATE reports SET rating=$2 WHERE id=$1', [id, rating]),
  deleteReport: (id) =>
    pool.query('DELETE FROM reports WHERE id=$1', [id]),
  getRecentReports: (guild_id, limit = 20, is_otchet = false) =>
    pool.query('SELECT * FROM reports WHERE guild_id=$1 AND is_otchet=$2 ORDER BY created_at DESC LIMIT $3', [guild_id, is_otchet, limit]),
  getReportsByUser: (guild_id, user_id) =>
    pool.query('SELECT * FROM reports WHERE guild_id=$1 AND reporter_id=$2 ORDER BY created_at DESC', [guild_id, user_id]),

  // Otchety
  addOtchet: (guild_id, author_id, data, name, chto_sdelal, chto_ostalos, notes) =>
    pool.query('INSERT INTO otchety (guild_id, author_id, data, name, chto_sdelal, chto_ostalos, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [guild_id, author_id, data, name, chto_sdelal, chto_ostalos, notes]),
  getOtchety: (guild_id) =>
    pool.query('SELECT * FROM otchety WHERE guild_id=$1 ORDER BY created_at DESC', [guild_id]),
  getOtchet: (id) =>
    pool.query('SELECT * FROM otchety WHERE id=$1', [id]),
  deleteOtchet: (id) =>
    pool.query('DELETE FROM otchety WHERE id=$1', [id]),
  updateOtchet: (id, data, name, chto_sdelal, chto_ostalos, notes) =>
    pool.query('UPDATE otchety SET data=$2, name=$3, chto_sdelal=$4, chto_ostalos=$5, notes=$6 WHERE id=$1', [id, data, name, chto_sdelal, chto_ostalos, notes]),

  // Staff
  addStaff: (guild_id, user_id, role, added_by) =>
    pool.query('INSERT INTO staff (guild_id, user_id, role, added_by) VALUES ($1,$2,$3,$4) ON CONFLICT (guild_id, user_id) DO UPDATE SET role=$3', [guild_id, user_id, role, added_by]),
  removeStaff: (guild_id, user_id) =>
    pool.query('DELETE FROM staff WHERE guild_id=$1 AND user_id=$2', [guild_id, user_id]),
  getStaff: (guild_id) =>
    pool.query('SELECT * FROM staff WHERE guild_id=$1 ORDER BY added_at ASC', [guild_id]),
  getStaffMember: (guild_id, user_id) =>
    pool.query('SELECT * FROM staff WHERE guild_id=$1 AND user_id=$2', [guild_id, user_id]),
  updateStaffRole: (guild_id, user_id, role) =>
    pool.query('UPDATE staff SET role=$3 WHERE guild_id=$1 AND user_id=$2', [guild_id, user_id, role]),
  updateStaffPerms: (guild_id, user_id, permissions) =>
    pool.query('UPDATE staff SET permissions=$3 WHERE guild_id=$1 AND user_id=$2', [guild_id, user_id, permissions]),

  // Role Permissions
  getRolePermissions: (guild_id, role_id) =>
    pool.query('SELECT * FROM role_permissions WHERE guild_id=$1 AND role_id=$2', [guild_id, role_id]),
  getAllRolePermissions: (guild_id) =>
    pool.query('SELECT * FROM role_permissions WHERE guild_id=$1 ORDER BY role_id ASC', [guild_id]),
  setRolePermissions: (guild_id, role_id, permissions, updated_by) =>
    pool.query(
      `INSERT INTO role_permissions (guild_id, role_id, permissions, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (guild_id, role_id) DO UPDATE SET permissions=$3, updated_by=$4, updated_at=NOW()`,
      [guild_id, role_id, JSON.stringify(permissions), updated_by],
    ),
  deleteRolePermissions: (guild_id, role_id) =>
    pool.query('DELETE FROM role_permissions WHERE guild_id=$1 AND role_id=$2', [guild_id, role_id]),

  // Guild Requests
  addGuildRequest: (guild_id, guild_name, requester_id, requester_name, notes = null) =>
    pool.query('INSERT INTO guild_requests (guild_id, guild_name, requester_id, requester_name, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id', [guild_id, guild_name, requester_id, requester_name, notes]),
  getGuildRequest: (id) =>
    pool.query('SELECT * FROM guild_requests WHERE id=$1', [id]),
  getPendingGuildRequests: () =>
    pool.query("SELECT * FROM guild_requests WHERE status='pending' ORDER BY created_at DESC"),
  getAllGuildRequests: () =>
    pool.query('SELECT * FROM guild_requests ORDER BY created_at DESC'),
  approveGuildRequest: (id, reviewed_by) =>
    pool.query("UPDATE guild_requests SET status='approved', reviewed_by=$2, reviewed_at=NOW() WHERE id=$1", [id, reviewed_by]),
  rejectGuildRequest: (id, reviewed_by, notes = null) =>
    pool.query("UPDATE guild_requests SET status='rejected', reviewed_by=$2, notes=$3, reviewed_at=NOW() WHERE id=$1", [id, reviewed_by, notes]),

  // Scheduled actions (persistent ban/mute expiry)
  addScheduledAction: (guild_id, user_id, action, execute_at) =>
    pool.query('INSERT INTO scheduled_actions (guild_id, user_id, action, execute_at) VALUES ($1,$2,$3,$4) RETURNING id', [guild_id, user_id, action, execute_at]),
  getPendingScheduledActions: () =>
    pool.query("SELECT * FROM scheduled_actions WHERE done=FALSE AND execute_at <= NOW()"),
  getAllPendingScheduledActions: () =>
    pool.query("SELECT * FROM scheduled_actions WHERE done=FALSE"),
  markScheduledDone: (id) =>
    pool.query('UPDATE scheduled_actions SET done=TRUE WHERE id=$1', [id]),

  // Staff role links (discord role → staff role name)
  setStaffRoleLink: (guild_id, discord_role_id, staff_role) =>
    pool.query(
      'INSERT INTO staff_role_links (guild_id, discord_role_id, staff_role) VALUES ($1,$2,$3) ON CONFLICT (guild_id, discord_role_id) DO UPDATE SET staff_role=$3',
      [guild_id, discord_role_id, staff_role],
    ),
  getStaffRoleLinks: (guild_id) =>
    pool.query('SELECT * FROM staff_role_links WHERE guild_id=$1', [guild_id]),
  deleteStaffRoleLink: (guild_id, discord_role_id) =>
    pool.query('DELETE FROM staff_role_links WHERE guild_id=$1 AND discord_role_id=$2', [guild_id, discord_role_id]),

  // Polls
  addPoll: (guild_id, channel_id, message_id, question, options, sent_by) =>
    pool.query('INSERT INTO polls (guild_id, channel_id, message_id, question, options, sent_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [guild_id, channel_id, message_id, question, JSON.stringify(options), sent_by]),
  getPolls: (guild_id, limit = 5, offset = 0) =>
    pool.query('SELECT * FROM polls WHERE guild_id=$1 ORDER BY sent_at DESC LIMIT $2 OFFSET $3', [guild_id, limit, offset]),
  countPolls: (guild_id) =>
    pool.query('SELECT COUNT(*) FROM polls WHERE guild_id=$1', [guild_id]),
  getPoll: (id) =>
    pool.query('SELECT * FROM polls WHERE id=$1', [id]),

  // Poll templates
  addPollTemplate: (guild_id, name, question, options, created_by, channel_id = null) =>
    pool.query('INSERT INTO poll_templates (guild_id, name, question, options, channel_id, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [guild_id, name, question, JSON.stringify(options), channel_id, created_by]),
  getPollTemplates: (guild_id, limit = 5, offset = 0) =>
    pool.query('SELECT * FROM poll_templates WHERE guild_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [guild_id, limit, offset]),
  countPollTemplates: (guild_id) =>
    pool.query('SELECT COUNT(*) FROM poll_templates WHERE guild_id=$1', [guild_id]),
  getPollTemplate: (id) =>
    pool.query('SELECT * FROM poll_templates WHERE id=$1', [id]),
  updatePollTemplate: (id, name, question, options, image = null, channel_id = null) =>
    pool.query('UPDATE poll_templates SET name=$2, question=$3, options=$4, image=$5, channel_id=$6 WHERE id=$1', [id, name, question, JSON.stringify(options), image, channel_id]),
  deletePollTemplate: (id) =>
    pool.query('DELETE FROM poll_templates WHERE id=$1', [id]),
};

module.exports = { pool, initDB, db, getSettings, setSetting };
