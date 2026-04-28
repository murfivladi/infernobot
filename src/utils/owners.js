const ownerIds = new Set(
  (process.env.OWNER_IDS || process.env.OWNER_ID || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

/**
 * Returns true if userId is a bot owner.
 * Reads OWNER_IDS (comma-separated) or falls back to OWNER_ID.
 * @param {string} userId
 */
function isOwner(userId) {
  return ownerIds.has(userId);
}

module.exports = { isOwner, ownerIds };
