const readline = require('readline');
const bus = require('./utils/events');

// ── ANSI colors ───────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  info:   '\x1b[36m',   // cyan
  warn:   '\x1b[33m',   // yellow
  error:  '\x1b[31m',   // red
  success:'\x1b[32m',   // green
  prompt: '\x1b[35m',   // magenta
  time:   '\x1b[90m',   // gray
};

const LEVEL_COLOR = { info: C.info, warn: C.warn, error: C.error, debug: C.dim };

function timestamp() {
  return new Date().toTimeString().slice(0, 8);
}

function formatLog({ level, message }) {
  const col = LEVEL_COLOR[level] || C.info;
  const icon = { info: 'ℹ', warn: '⚠', error: '✖', debug: '·' }[level] || 'ℹ';
  return `${C.time}[${timestamp()}]${C.reset} ${col}${icon}${C.reset} ${message}`;
}

// ── Commands ──────────────────────────────────────────────────
const COMMANDS = {
  help() {
    print([
      `${C.bold}Comandi disponibili:${C.reset}`,
      `  ${C.success}help${C.reset}              — mostra questo messaggio`,
      `  ${C.success}status${C.reset}            — stato del bot`,
      `  ${C.success}guilds${C.reset}            — lista guild connesse`,
      `  ${C.success}reload guilds${C.reset}     — ricarica whitelist guilds.json`,
      `  ${C.success}reload perms${C.reset}      — ricarica permissions.json`,
      `  ${C.success}reload commands${C.reset}   — rideploya slash commands`,
      `  ${C.success}clear${C.reset}             — pulisce lo schermo`,
      `  ${C.success}exit${C.reset}              — spegne il bot`,
    ].join('\n'));
  },

  status() {
    const client = global.__botClient;
    if (!client?.isReady()) return print(`${C.warn}Bot non ancora pronto.${C.reset}`);
    const uptime = Math.floor(client.uptime / 1000);
    const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = uptime % 60;
    print([
      `${C.bold}── Bot Status ──────────────────${C.reset}`,
      `  Tag:      ${C.success}${client.user.tag}${C.reset}`,
      `  ID:       ${client.user.id}`,
      `  Guilds:   ${client.guilds.cache.size}`,
      `  Uptime:   ${h}h ${m}m ${s}s`,
      `  Ping:     ${client.ws.ping}ms`,
    ].join('\n'));
  },

  guilds() {
    const client = global.__botClient;
    if (!client?.isReady()) return print(`${C.warn}Bot non ancora pronto.${C.reset}`);
    const list = client.guilds.cache.map(g => {
      const allowed = global.__isGuildAllowed?.(g.id);
      const mark = allowed ? `${C.success}✔${C.reset}` : `${C.warn}✘${C.reset}`;
      return `  ${mark} ${g.name} ${C.dim}(${g.id}, ${g.memberCount} membri)${C.reset}`;
    });
    print(`${C.bold}── Guilds (${list.length}) ──────────────────${C.reset}\n${list.join('\n')}`);
  },

  async 'reload guilds'() {
    const count = global.__reloadGuildsConfig?.();
    print(`${C.success}✔ Whitelist ricaricata: ${count} guild(s)${C.reset}`);
  },

  async 'reload perms'() {
    const ok = global.__reloadPermissionsConfig?.();
    print(ok ? `${C.success}✔ permissions.json ricaricato${C.reset}` : `${C.warn}⚠ permissions.json non trovato${C.reset}`);
  },

  async 'reload commands'() {
    const client = global.__botClient;
    if (!client?.isReady()) return print(`${C.warn}Bot non ancora pronto.${C.reset}`);
    try {
      const { REST, Routes } = require('discord.js');
      const path = require('path');
      const fs = require('fs');

      const commandsPath = path.join(__dirname, 'commands');
      const allCommands = [];
      for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
        const fp = path.join(commandsPath, file);
        delete require.cache[require.resolve(fp)];
        const loaded = require(fp);
        for (const cmd of (Array.isArray(loaded) ? loaded : [loaded])) {
          if (cmd?.data) allCommands.push(cmd);
        }
      }

      const rest = new REST().setToken(process.env.DISCORD_TOKEN);
      const globalCmds = allCommands.filter(c => c.data.name === 'guildrequest').map(c => c.data.toJSON());
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globalCmds });

      const guildCmds = allCommands.filter(c => c.data.name !== 'guildrequest').map(c => c.data.toJSON());
      const targets = client.guilds.cache.map(g => g.id).filter(id => global.__isGuildAllowed?.(id));
      let ok = 0;
      for (const guildId of targets) {
        try {
          await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: guildCmds });
          ok++;
        } catch (e) { print(`${C.error}✖ guild ${guildId}: ${e.message}${C.reset}`); }
      }
      print(`${C.success}✔ ${guildCmds.length} comandi ridepoyati in ${ok} guild(s)${C.reset}`);
    } catch (err) {
      print(`${C.error}✖ ${err.message}${C.reset}`);
    }
  },

  clear() { process.stdout.write('\x1bc'); },

  exit() {
    print(`${C.warn}Spegnimento...${C.reset}`);
    process.exit(0);
  },
};

// ── Output helpers ────────────────────────────────────────────
let rl;

function print(text) {
  if (rl) readline.clearLine(process.stdout, 0), readline.cursorTo(process.stdout, 0);
  process.stdout.write(text + '\n');
  if (rl) rl.prompt(true);
}

// ── Start ─────────────────────────────────────────────────────
function startCLI() {
  // Subscribe to log:entry events
  bus.on('log:entry', entry => print(formatLog(entry)));

  rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: `${C.prompt}inferno>${C.reset} ` });

  process.stdout.write('\x1bc'); // clear screen
  print(`${C.bold}${C.success}🔥 InfernoBot CLI${C.reset}  ${C.dim}digita "help" per i comandi${C.reset}`);
  print('');
  rl.prompt();

  rl.on('line', async line => {
    const input = line.trim().toLowerCase();
    if (!input) { rl.prompt(); return; }

    const handler = COMMANDS[input];
    if (handler) {
      await handler();
    } else {
      print(`${C.warn}Comando sconosciuto: "${input}". Digita "help".${C.reset}`);
    }
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

module.exports = { startCLI, print };
