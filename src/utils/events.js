const { EventEmitter } = require('events');

/**
 * Global event bus for InfernoBot.
 *
 * Events:
 *   bot:ready                        — bot is online
 *   guild:memberAdd  { member }      — user joined a guild
 *   mod:action       { guild, action, userId, moderatorId, reason, duration }
 *   log:entry        { level, message, timestamp }  — every console.log/warn/error
 */
const bus = new EventEmitter();
bus.setMaxListeners(20);

module.exports = bus;
