const { Pool } = require('pg');

// Parse connection string manually so ssl option is not overridden by sslmode in URL
const connStr = process.env.DATABASE_URL || '';
const url = new URL(connStr.replace('postgresql://', 'http://').replace('postgres://', 'http://'));
const pool = new Pool({
  host: url.hostname,
  port: Number(url.port),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

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
  `);  // Migrations: add columns if they don't exist yet
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
  `);
}

async function getSettings(guild_id) {
  const { rows } = await pool.query('SELECT * FROM guild_settings WHERE guild_id=$1', [guild_id]);
  return rows[0] || { guild_id, locale: 'ru' };
}

const VALID_SETTING_KEYS = new Set([
  'locale', 'log_channel', 'mod_channel', 'report_channel',
  'welcome_channel', 'welcome_message', 'mute_role', 'admin_role', 'mod_role'
]);

async function setSetting(guild_id, key, value) {
  if (!VALID_SETTING_KEYS.has(key)) throw new Error(`Invalid setting key: ${key}`);
  await pool.query(`
    INSERT INTO guild_settings (guild_id, ${key}) VALUES ($1, $2)
    ON CONFLICT (guild_id) DO UPDATE SET ${key}=$2
  `, [guild_id, value]);
}

// Generic helpers
const db = {
  // Warnings
  addWarning: (guild_id, user_id, moderator_id, reason) =>
    pool.query('INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES ($1,$2,$3,$4)', [guild_id, user_id, moderator_id, reason]),
  getWarnings: (guild_id, user_id) =>
    pool.query('SELECT * FROM warnings WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC', [guild_id, user_id]),

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
  getRecentActions: (guild_id, limit = 10) =>
    pool.query('SELECT * FROM mod_actions WHERE guild_id=$1 ORDER BY created_at DESC LIMIT $2', [guild_id, limit]),

  // Reports / Otchety
  addReport: (guild_id, reporter_id, target_id, reason, evidence = null) =>
    pool.query('INSERT INTO reports (guild_id, reporter_id, target_id, reason, is_otchet, evidence) VALUES ($1,$2,$3,$4,FALSE,$5)', [guild_id, reporter_id, target_id, reason, evidence]),
  getReport: (id) =>
    pool.query('SELECT * FROM reports WHERE id=$1', [id]),
  replyReport: (id, reply) =>
    pool.query('UPDATE reports SET reply=$2, status=\'replied\' WHERE id=$1', [id, reply]),
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
    pool.query(`
      INSERT INTO role_permissions (guild_id, role_id, permissions, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (guild_id, role_id) 
      DO UPDATE SET permissions=$3, updated_by=$4, updated_at=NOW()
    `, [guild_id, role_id, JSON.stringify(permissions), updated_by]),
  deleteRolePermissions: (guild_id, role_id) =>
    pool.query('DELETE FROM role_permissions WHERE guild_id=$1 AND role_id=$2', [guild_id, role_id]),

  // Guild Requests
  addGuildRequest: (guild_id, guild_name, requester_id, requester_name, notes = null) =>
    pool.query('INSERT INTO guild_requests (guild_id, guild_name, requester_id, requester_name, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id', [guild_id, guild_name, requester_id, requester_name, notes]),
  getGuildRequest: (id) =>
    pool.query('SELECT * FROM guild_requests WHERE id=$1', [id]),
  getPendingGuildRequests: () =>
    pool.query('SELECT * FROM guild_requests WHERE status=$1 ORDER BY created_at DESC', ['pending']),
  getAllGuildRequests: () =>
    pool.query('SELECT * FROM guild_requests ORDER BY created_at DESC'),
  approveGuildRequest: (id, reviewed_by) =>
    pool.query('UPDATE guild_requests SET status=$2, reviewed_by=$3, reviewed_at=NOW() WHERE id=$1', [id, 'approved', reviewed_by]),
  rejectGuildRequest: (id, reviewed_by, notes = null) =>
    pool.query('UPDATE guild_requests SET status=$2, reviewed_by=$3, notes=$4, reviewed_at=NOW() WHERE id=$1', [id, 'rejected', reviewed_by, notes]),
};

module.exports = { pool, initDB, db, getSettings, setSetting };
