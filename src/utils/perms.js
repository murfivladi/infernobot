const { db } = require('../db');

/**
 * Check if a user has a specific bot permission (via role_permissions table).
 * Discord Administrators always pass.
 */
async function hasPermission(guild, userId, permissionKey) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;
  if (member.permissions.has('Administrator') || member.permissions.has('ManageGuild')) return true;

  for (const roleId of member.roles.cache.keys()) {
    const { rows } = await db.getRolePermissions(guild.id, roleId);
    if (rows[0]?.permissions?.[permissionKey] === true) return true;
  }
  return false;
}

/**
 * Return merged permission map for a user across all their roles.
 */
async function getUserPermissions(guild, userId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return {};
  const result = {};
  for (const roleId of member.roles.cache.keys()) {
    const { rows } = await db.getRolePermissions(guild.id, roleId);
    if (rows[0]) {
      for (const [k, v] of Object.entries(rows[0].permissions || {})) {
        if (v === true) result[k] = true;
      }
    }
  }
  return result;
}

module.exports = { hasPermission, getUserPermissions };
