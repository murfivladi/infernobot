import chalk from 'chalk';
import * as cryptoNode from 'crypto';
import * as fileTools from './tools/file.js';
import * as textTools from './tools/text.js';
import * as cryptoTools from './tools/crypto.js';
import * as networkTools from './tools/network.js';
import * as systemTools from './tools/system.js';
import * as gitTools from './tools/git.js';
import * as dockerTools from './tools/docker.js';

async function pause() {
  const inquirer = await import('inquirer');
  await inquirer.default.prompt([{
    type: 'input',
    name: 'continue',
    message: chalk.dim('Press Enter to continue...')
  }]);
}

async function runFileTool(tool: string, inquirer: typeof import('inquirer')) {
  switch (tool) {
    case 'ls': {
      const { path } = await inquirer.default.prompt([{
        type: 'input',
        name: 'path',
        message: '📁 Directory path:',
        default: '.'
      }]);
      await fileTools.ls(path || '.');
      break;
    }
    case 'find': {
      const { pattern, dir } = await inquirer.default.prompt([
        { type: 'input', name: 'pattern', message: '🔍 Pattern to search:' },
        { type: 'input', name: 'dir', message: '📂 Directory:', default: process.cwd() }
      ]);
      await fileTools.find(pattern, { dir });
      break;
    }
    case 'size': {
      const { path } = await inquirer.default.prompt([{
        type: 'input',
        name: 'path',
        message: '📊 Path to analyze:'
      }]);
      await fileTools.size(path);
      break;
    }
    case 'tree': {
      const { path, depth } = await inquirer.default.prompt([
        { type: 'input', name: 'path', message: '🌳 Directory:', default: '.' },
        { type: 'input', name: 'depth', message: '📏 Max depth:', default: '3' }
      ]);
      await fileTools.tree(path, { depth });
      break;
    }
    case 'watch': {
      const { path } = await inquirer.default.prompt([{
        type: 'input',
        name: 'path',
        message: '👀 Path to watch:'
      }]);
      await fileTools.watch(path);
      break;
    }
    case 'hash': {
      const { path, algo } = await inquirer.default.prompt([
        { type: 'input', name: 'path', message: '🔐 File path:' },
        { type: 'list', name: 'algo', message: '📋 Algorithm:', choices: ['md5', 'sha1', 'sha256'], default: 'sha256' }
      ]);
      await fileTools.hash(path, { algo });
      break;
    }
    case 'diff': {
      const { file1, file2 } = await inquirer.default.prompt([
        { type: 'input', name: 'file1', message: '📄 First file:' },
        { type: 'input', name: 'file2', message: '📄 Second file:' }
      ]);
      await fileTools.diff(file1, file2);
      break;
    }
    case 'info': {
      const { path } = await inquirer.default.prompt([{
        type: 'input',
        name: 'path',
        message: '📋 File path:'
      }]);
      await fileTools.info(path);
      break;
    }
    case 'mime': {
      const { path } = await inquirer.default.prompt([{
        type: 'input',
        name: 'path',
        message: '🎯 File path:'
      }]);
      await fileTools.mime(path);
      break;
    }
    case 'wc': {
      const { path } = await inquirer.default.prompt([{
        type: 'input',
        name: 'path',
        message: '📊 File path:'
      }]);
      await fileTools.wc(path);
      break;
    }
  }
  await pause();
}

async function runTextTool(tool: string, inquirer: typeof import('inquirer')) {
  switch (tool) {
    case 'json': {
      const { jsonStr, minify } = await inquirer.default.prompt([
        { type: 'input', name: 'jsonStr', message: '📄 JSON string:' },
        { type: 'confirm', name: 'minify', message: '🔬 Minify output?', default: false }
      ]);
      textTools.json(jsonStr, { minify });
      break;
    }
    case 'base64': {
      const { text, decode } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '🔤 Text:' },
        { type: 'confirm', name: 'decode', message: '🔓 Decode mode?', default: false }
      ]);
      textTools.base64(text, { decode });
      break;
    }
    case 'url': {
      const { text, decode } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '🔗 URL text:' },
        { type: 'confirm', name: 'decode', message: '🔓 Decode mode?', default: false }
      ]);
      textTools.url(text, { decode });
      break;
    }
    case 'uuid': {
      const { count } = await inquirer.default.prompt([{
        type: 'input',
        name: 'count',
        message: '🔢 Number of UUIDs:',
        default: '5'
      }]);
      textTools.uuid({ count });
      break;
    }
    case 'hash': {
      const { text, algo } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '🔐 Text to hash:' },
        { type: 'list', name: 'algo', message: '📋 Algorithm:', choices: ['md5', 'sha1', 'sha256', 'sha512'], default: 'sha256' }
      ]);
      textTools.hashText(text, { algo });
      break;
    }
    case 'reverse': {
      const { text } = await inquirer.default.prompt([{
        type: 'input',
        name: 'text',
        message: '🔄 Text to reverse:'
      }]);
      textTools.reverse(text);
      break;
    }
    case 'sort': {
      const { text, reverse, numeric } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '📊 Lines to sort (one per line):' },
        { type: 'confirm', name: 'reverse', message: '🔃 Reverse order?', default: false },
        { type: 'confirm', name: 'numeric', message: '🔢 Numeric sort?', default: false }
      ]);
      textTools.sort(text, { reverse, numeric });
      break;
    }
    case 'count': {
      const { text, substring } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '📝 Text:' },
        { type: 'input', name: 'substring', message: '🔢 Substring to count:' }
      ]);
      textTools.count(text, { substring });
      break;
    }
    case 'template': {
      const { template, vars } = await inquirer.default.prompt([
        { type: 'input', name: 'template', message: '📝 Template (use {{var}}):' },
        { type: 'input', name: 'vars', message: '📋 Variables (JSON):', default: '{}' }
      ]);
      textTools.template(template, { vars });
      break;
    }
    case 'slug': {
      const { text } = await inquirer.default.prompt([{
        type: 'input',
        name: 'text',
        message: '🔗 Text to slugify:'
      }]);
      textTools.slug(text);
      break;
    }
    case 'camel': {
      const { text } = await inquirer.default.prompt([{
        type: 'input',
        name: 'text',
        message: '🐪 Text to camelCase:'
      }]);
      textTools.camel(text);
      break;
    }
    case 'snake': {
      const { text } = await inquirer.default.prompt([{
        type: 'input',
        name: 'text',
        message: '🐍 Text to snake_case:'
      }]);
      textTools.snake(text);
      break;
    }
    case 'lint': {
      const { text, format } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '📋 Text to lint:' },
        { type: 'list', name: 'format', message: '📄 Format:', choices: ['json', 'yaml'], default: 'json' }
      ]);
      textTools.lint(text, { format });
      break;
    }
  }
  await pause();
}

async function runCryptoTool(tool: string, inquirer: typeof import('inquirer')) {
  switch (tool) {
    case 'gen-password': {
      const { length, special } = await inquirer.default.prompt([
        { type: 'input', name: 'length', message: '🔢 Password length:', default: '16' },
        { type: 'confirm', name: 'special', message: '✨ Include special characters?', default: true }
      ]);
      cryptoTools.genPassword({ length, special });
      break;
    }
    case 'gen-key': {
      const { bits, format } = await inquirer.default.prompt([
        { type: 'input', name: 'bits', message: '🔑 Key size (bits):', default: '256' },
        { type: 'list', name: 'format', message: '📋 Format:', choices: ['hex', 'base64'], default: 'hex' }
      ]);
      cryptoTools.genKey(bits, { format });
      break;
    }
    case 'encrypt': {
      const { text, key } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '🔒 Text to encrypt:' },
        { type: 'input', name: 'key', message: '🔑 Encryption key (optional):' }
      ]);
      cryptoTools.encrypt(text, { key });
      break;
    }
    case 'decrypt': {
      const { text, key } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '🔓 Text to decrypt:' },
        { type: 'input', name: 'key', message: '🔑 Decryption key:' }
      ]);
      cryptoTools.decrypt(text, { key });
      break;
    }
    case 'hmac': {
      const { text, key, algo } = await inquirer.default.prompt([
        { type: 'input', name: 'text', message: '📝 Text:' },
        { type: 'input', name: 'key', message: '🔑 HMAC key:' },
        { type: 'list', name: 'algo', message: '📋 Algorithm:', choices: ['sha256', 'sha1', 'sha512'], default: 'sha256' }
      ]);
      cryptoTools.hmac(text, { key, algo });
      break;
    }
    case 'otp': {
      const { secret } = await inquirer.default.prompt([{
        type: 'input',
        name: 'secret',
        message: '🔐 TOTP secret:'
      }]);
      await cryptoTools.otp(secret);
      break;
    }
  }
  await pause();
}

async function runNetworkTool(tool: string, inquirer: typeof import('inquirer')) {
  switch (tool) {
    case 'ping': {
      const { host, count } = await inquirer.default.prompt([
        { type: 'input', name: 'host', message: '🌐 Host to ping:' },
        { type: 'input', name: 'count', message: '🔢 Number of pings:', default: '4' }
      ]);
      await networkTools.ping(host, { count });
      break;
    }
    case 'dns': {
      const { domain, type } = await inquirer.default.prompt([
        { type: 'input', name: 'domain', message: '🔍 Domain:' },
        { type: 'list', name: 'type', message: '📋 Record type:', choices: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'], default: 'A' }
      ]);
      await networkTools.dns(domain, { type });
      break;
    }
    case 'http': {
      const { url, method } = await inquirer.default.prompt([
        { type: 'input', name: 'url', message: '🌐 URL:' },
        { type: 'list', name: 'method', message: '📋 Method:', choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' }
      ]);
      await networkTools.http(url, { method });
      break;
    }
    case 'port': {
      const { port, host } = await inquirer.default.prompt([
        { type: 'input', name: 'port', message: '🔌 Port:' },
        { type: 'input', name: 'host', message: '🖥️ Host:', default: 'localhost' }
      ]);
      await networkTools.port(port, { host });
      break;
    }
    case 'ip':
      await networkTools.myip();
      await pause();
      return;
    case 'headers': {
      const { url } = await inquirer.default.prompt([{
        type: 'input',
        name: 'url',
        message: '🌐 URL:'
      }]);
      await networkTools.headers(url);
      break;
    }
    case 'speed':
      await networkTools.speed();
      await pause();
      return;
  }
  await pause();
}

async function runSystemTool(tool: string, inquirer: typeof import('inquirer')) {
  switch (tool) {
    case 'ps': {
      const { sort } = await inquirer.default.prompt([{
        type: 'list',
        name: 'sort',
        message: '📊 Sort by:',
        choices: [
          { name: 'PID', value: 'pid' },
          { name: 'CPU Usage', value: 'cpu' },
          { name: 'Memory Usage', value: 'mem' }
        ],
        default: 'pid'
      }]);
      await systemTools.ps({ cpu: sort === 'cpu', mem: sort === 'mem' });
      break;
    }
    case 'top': {
      const { count } = await inquirer.default.prompt([{
        type: 'input',
        name: 'count',
        message: '🔢 Number of processes:',
        default: '10'
      }]);
      await systemTools.top({ count });
      break;
    }
    case 'df':
      await systemTools.df();
      await pause();
      return;
    case 'du': {
      const { path, depth } = await inquirer.default.prompt([
        { type: 'input', name: 'path', message: '📁 Directory:', default: '.' },
        { type: 'input', name: 'depth', message: '📏 Max depth:', default: '1' }
      ]);
      await systemTools.du(path, { depth });
      break;
    }
    case 'free':
      await systemTools.free();
      await pause();
      return;
    case 'uptime':
      await systemTools.uptime();
      await pause();
      return;
    case 'whoami':
      systemTools.whoami();
      await pause();
      return;
    case 'env':
      await systemTools.env();
      await pause();
      return;
    case 'date':
      systemTools.date();
      await pause();
      return;
    case 'kill': {
      const { pid } = await inquirer.default.prompt([{
        type: 'input',
        name: 'pid',
        message: '☠️ Process ID to kill:'
      }]);
      await systemTools.kill(pid);
      break;
    }
    case 'services':
      await systemTools.services();
      await pause();
      return;
  }
  await pause();
}

async function runGitTool(tool: string, inquirer: typeof import('inquirer')) {
  switch (tool) {
    case 'log': {
      const { count } = await inquirer.default.prompt([{
        type: 'input',
        name: 'count',
        message: '🔢 Number of commits:',
        default: '10'
      }]);
      await gitTools.log(count);
      break;
    }
    case 'status':
      await gitTools.status();
      await pause();
      return;
    case 'branches':
      await gitTools.branches();
      await pause();
      return;
    case 'stash-list':
      await gitTools.stashList();
      await pause();
      return;
    case 'untracked':
      await gitTools.untracked();
      await pause();
      return;
    case 'conflicts':
      await gitTools.conflicts();
      await pause();
      return;
  }
  await pause();
}

async function runDockerTool(tool: string, inquirer: typeof import('inquirer')) {
  switch (tool) {
    case 'ps': {
      const { all } = await inquirer.default.prompt([{
        type: 'confirm',
        name: 'all',
        message: '📋 Show all containers (including stopped)?',
        default: false
      }]);
      await dockerTools.ps({ all });
      break;
    }
    case 'images':
      await dockerTools.images();
      await pause();
      return;
    case 'logs': {
      const { id, lines } = await inquirer.default.prompt([
        { type: 'input', name: 'id', message: '🐳 Container ID/Name:' },
        { type: 'input', name: 'lines', message: '📜 Number of lines:', default: '50' }
      ]);
      await dockerTools.logs(id, { lines });
      break;
    }
    case 'stats':
      await dockerTools.stats();
      await pause();
      return;
    case 'clean': {
      const { all } = await inquirer.default.prompt([{
        type: 'confirm',
        name: 'all',
        message: '🧹 Remove ALL unused (images, volumes, networks)?',
        default: false
      }]);
      await dockerTools.clean({ all });
      break;
    }
  }
  await pause();
}

export async function startInteractive() {
  const inquirer = await import('inquirer');
  
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║     🔥 INFERNO CLI - INTERACTIVE MODE     ║
╚═══════════════════════════════════════════╝
  `));
  
  console.log(chalk.yellow('  Benvenuto! Seleziona una categoria o usa i menu.\n'));
  
  while (true) {
    console.clear();
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║     🔥 INFERNO CLI - INTERACTIVE MODE     ║
╚═══════════════════════════════════════════╝
    `));
    
    const { mainChoice } = await inquirer.default.prompt([{
      type: 'list',
      name: 'mainChoice',
      message: chalk.cyan('🔥 Seleziona una categoria:'),
      choices: [
        { name: '📁 File Tools - Gestione file e cartelle', value: 'file' },
        { name: '📝 Text Tools - Manipolazione testo', value: 'text' },
        { name: '🔐 Crypto Tools - Crittografia e sicurezza', value: 'crypto' },
        { name: '🌐 Network Tools - Diagnostica di rete', value: 'net' },
        { name: '💻 System Tools - Informazioni di sistema', value: 'sys' },
        { name: '📦 Git Tools - Comandi Git rapidi', value: 'git' },
        { name: '🐳 Docker Tools - Gestione container', value: 'docker' },
        { name: '⚡ Quick Actions - Azioni rapide', value: 'quick' },
        new inquirer.default.Separator(),
        { name: '❌ Exit - Esci', value: 'exit' }
      ]
    }]);
    
    if (mainChoice === 'exit') {
      console.log(chalk.green('\n  👋 Arrivederci!\n'));
      break;
    }
    
    if (mainChoice === 'quick') {
      await runQuickActions(inquirer);
      continue;
    }
    
    const toolMenus: Record<string, { name: string; value: string }[]> = {
      file: [
        { name: '📂 ls - Lista contenuti directory', value: 'ls' },
        { name: '🔍 find - Cerca file per pattern', value: 'find' },
        { name: '📊 size - Dimensioni file/directory', value: 'size' },
        { name: '🌳 tree - Albero directory', value: 'tree' },
        { name: '👀 watch - Monitora modifiche file', value: 'watch' },
        { name: '🔐 hash - Calcola hash file', value: 'hash' },
        { name: '📄 diff - Confronta due file', value: 'diff' },
        { name: '📋 info - Informazioni file', value: 'info' },
        { name: '🎯 mime - Tipo MIME file', value: 'mime' },
        { name: '📈 wc - Statistiche file', value: 'wc' }
      ],
      text: [
        { name: '📄 json - Formatta/valida JSON', value: 'json' },
        { name: '🔒 base64 - Encode/decode base64', value: 'base64' },
        { name: '🔗 url - Encode/decode URL', value: 'url' },
        { name: '🆔 uuid - Genera UUID', value: 'uuid' },
        { name: '🔐 hash - Hash text', value: 'hash' },
        { name: '🔄 reverse - Inverti testo', value: 'reverse' },
        { name: '📊 sort - Ordina linee', value: 'sort' },
        { name: '🔢 count - Conta occorrenze', value: 'count' },
        { name: '📝 template - Processa template', value: 'template' },
        { name: '🔗 slug - Converti in URL slug', value: 'slug' },
        { name: '🐪 camel - Converti in camelCase', value: 'camel' },
        { name: '🐍 snake - Converti in snake_case', value: 'snake' },
        { name: '✅ lint - Valida JSON/YAML', value: 'lint' }
      ],
      crypto: [
        { name: '🔑 gen-password - Genera password sicura', value: 'gen-password' },
        { name: '🔐 gen-key - Genera chiave casuale', value: 'gen-key' },
        { name: '🔒 encrypt - Crittografa testo', value: 'encrypt' },
        { name: '🔓 decrypt - Decrittografa testo', value: 'decrypt' },
        { name: '📝 hmac - Calcola HMAC', value: 'hmac' },
        { name: '⏱️ otp - Genera codice TOTP', value: 'otp' }
      ],
      net: [
        { name: '📡 ping - Ping host', value: 'ping' },
        { name: '🔍 dns - Lookup DNS', value: 'dns' },
        { name: '🌐 http - Richiesta HTTP', value: 'http' },
        { name: '🔌 port - Verifica porta', value: 'port' },
        { name: '🌍 ip - Mostra IP pubblico', value: 'ip' },
        { name: '📋 headers - Header HTTP', value: 'headers' },
        { name: '⚡ speed - Test velocità', value: 'speed' }
      ],
      sys: [
        { name: '📊 ps - Processi in esecuzione', value: 'ps' },
        { name: '🔥 top - Top processi CPU', value: 'top' },
        { name: '💾 df - Uso disco', value: 'df' },
        { name: '📁 du - Spazio directory', value: 'du' },
        { name: '🧠 free - Uso memoria', value: 'free' },
        { name: '⏰ uptime - Uptime sistema', value: 'uptime' },
        { name: '👤 whoami - Utente corrente', value: 'whoami' },
        { name: '🔧 env - Variabili ambiente', value: 'env' },
        { name: '📅 date - Data/ora corrente', value: 'date' },
        { name: '☠️ kill - Termina processo', value: 'kill' },
        { name: '🔧 services - Servizi attivi', value: 'services' }
      ],
      git: [
        { name: '📜 log - Commit recenti', value: 'log' },
        { name: '📊 status - Status Git', value: 'status' },
        { name: '🌿 branches - Lista branch', value: 'branches' },
        { name: '📦 stash-list - Stash changes', value: 'stash-list' },
        { name: '❓ untracked - File non tracciati', value: 'untracked' },
        { name: '⚠️ conflicts - File con conflitti', value: 'conflicts' }
      ],
      docker: [
        { name: '🐳 ps - Lista container', value: 'ps' },
        { name: '📦 images - Lista immagini', value: 'images' },
        { name: '📜 logs - Log container', value: 'logs' },
        { name: '📈 stats - Statistiche container', value: 'stats' },
        { name: '🧹 clean - Pulisci Docker', value: 'clean' }
      ]
    };
    
    const tools = toolMenus[mainChoice];
    
    if (tools) {
      const { tool } = await inquirer.default.prompt([{
        type: 'list',
        name: 'tool',
        message: chalk.cyan(`🛠️ Seleziona tool (${mainChoice}):`),
        choices: [
          ...tools,
          new inquirer.default.Separator(),
          { name: '⬅️ Torna al menu principale', value: 'back' }
        ]
      }]);
      
      if (tool === 'back') continue;
      
      const runner = 
        (mainChoice === 'file' ? runFileTool :
         mainChoice === 'text' ? runTextTool :
         mainChoice === 'crypto' ? runCryptoTool :
         mainChoice === 'net' ? runNetworkTool :
         mainChoice === 'sys' ? runSystemTool :
         mainChoice === 'git' ? runGitTool :
         runDockerTool);
      
      try {
        await runner(tool, inquirer);
      } catch (err) {
        console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
        await pause();
      }
    }
  }
}

async function runQuickActions(inquirer: typeof import('inquirer')) {
  while (true) {
    console.clear();
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║        ⚡ QUICK ACTIONS - AZIONI RAPIDE    ║
╚═══════════════════════════════════════════╝
    `));
    
    const { action } = await inquirer.default.prompt([{
      type: 'list',
      name: 'action',
      message: chalk.cyan('⚡ Seleziona azione rapida:'),
      choices: [
        { name: '🔑 Genera password sicura (24 chars)', value: 'gen-pass' },
        { name: '🆔 Genera 5 UUID', value: 'uuid' },
        { name: '🌍 Il mio IP pubblico', value: 'ip' },
        { name: '📅 Data e ora corrente', value: 'date' },
        { name: '👤 Chi sono', value: 'whoami' },
        { name: '🧠 Memoria sistema', value: 'free' },
        { name: '💾 Spazio disco', value: 'df' },
        { name: '📊 Git status veloce', value: 'git-status' },
        { name: '🔍 DNS lookup veloce', value: 'dns' },
        { name: '🔐 Genera chiave casuale', value: 'gen-key' },
        { name: '🔢 Genera numeri casuali', value: 'random' },
        { name: '🌡️ Genera temperature casuali', value: 'temps' },
        { name: '🔢 Converti base numeriche', value: 'base' },
        { name: '🎲 Genera password facile da ricordare', value: 'passphrase' },
        new inquirer.default.Separator(),
        { name: '⬅️ Torna al menu principale', value: 'back' }
      ]
    }]);
    
    if (action === 'back') break;
    
    console.log('\n');
    
    switch (action) {
      case 'gen-pass':
        cryptoTools.genPassword({ length: '24', special: true });
        break;
      case 'uuid':
        textTools.uuid({ count: '5' });
        break;
      case 'ip':
        await networkTools.myip();
        break;
      case 'date':
        systemTools.date();
        break;
      case 'whoami':
        systemTools.whoami();
        break;
      case 'free':
        await systemTools.free();
        break;
      case 'df':
        await systemTools.df();
        break;
      case 'git-status':
        await gitTools.status();
        break;
      case 'dns': {
        const { domain } = await inquirer.default.prompt([{
          type: 'input',
          name: 'domain',
          message: '🔍 Domain:',
          default: 'google.com'
        }]);
        await networkTools.dns(domain);
        break;
      }
      case 'gen-key':
        cryptoTools.genKey('256', { format: 'hex' });
        break;
      case 'random': {
        const { min, max, count } = await inquirer.default.prompt([
          { type: 'input', name: 'min', message: 'Min:', default: '1' },
          { type: 'input', name: 'max', message: 'Max:', default: '100' },
          { type: 'input', name: 'count', message: 'Count:', default: '5' }
        ]);
        console.log(chalk.cyan('\n🎲 Numeri casuali:\n'));
        for (let i = 0; i < parseInt(count); i++) {
          const num = parseInt(min) + Math.floor(cryptoNode.randomBytes(4).readUInt32LE() / 0xFFFFFFFF * (parseInt(max) - parseInt(min) + 1));
          console.log(chalk.green(`  ${num}`));
        }
        console.log();
        break;
      }
      case 'temps': {
        console.log(chalk.cyan('\n🌡️ Temperature (°C):\n'));
        for (let i = 0; i < 10; i++) {
          const temp = (cryptoNode.randomBytes(2).readUInt16BE() / 65535 * 100 - 20).toFixed(1);
          const color = parseFloat(temp) > 30 ? chalk.red : parseFloat(temp) < 10 ? chalk.blue : chalk.yellow;
          console.log(color(`  ${temp}°C`));
        }
        console.log();
        break;
      }
      case 'base': {
        const { num, from, to } = await inquirer.default.prompt([
          { type: 'input', name: 'num', message: 'Numero:', default: '255' },
          { type: 'list', name: 'from', message: 'Da base:', choices: ['2', '10', '16'], default: '10' },
          { type: 'list', name: 'to', message: 'A base:', choices: ['2', '10', '16'], default: '16' }
        ]);
        console.log(chalk.cyan(`\n🔢 Conversione:\n`));
        const decimal = parseInt(num, parseInt(from));
        console.log(chalk.green(`  ${num} (base ${from}) = ${decimal.toString(parseInt(to))} (base ${to})\n`));
        break;
      }
      case 'passphrase': {
        const words = ['apple', 'banana', 'cherry', 'delta', 'eagle', 'forest', 'galaxy', 'harbor', 'island', 'jungle', 'knight', 'lemon', 'mango', 'nectar', 'ocean', 'palace', 'quantum', 'river', 'sunset', 'thunder', 'urban', 'village', 'whisper', 'xenon', 'yellow', 'zenith', 'alpha', 'bravo', 'cosmos', 'delta', 'echo', 'foxtrot'];
        const passphrase = Array.from({ length: 4 }, () => words[cryptoNode.randomBytes(2).readUInt16BE() % words.length]).join('-');
        console.log(chalk.cyan('\n🎲 Passphrase:\n'));
        console.log(chalk.bold.green(`  ${passphrase}\n`));
        break;
      }
    }
    
    await pause();
  }
}