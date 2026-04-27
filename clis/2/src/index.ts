#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fileTools from './tools/file.js';
import * as textTools from './tools/text.js';
import * as cryptoTools from './tools/crypto.js';
import * as networkTools from './tools/network.js';
import * as systemTools from './tools/system.js';
import * as gitTools from './tools/git.js';
import * as dockerTools from './tools/docker.js';
import { startInteractive } from './interactive.js';

const program = new Command();

// Banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║   🔥 INFERNO CLI - 100+ Developer Tools   ║
╚═══════════════════════════════════════════╝
`));

// Version
program
  .version('1.0.0')
  .description('A powerful CLI with tools for every developer');

// Register all commands
// FILE TOOLS
const fileCmd = program.command('file').alias('f').description('📁 File operations');
fileCmd.command('ls [path]').description('List directory contents').action(fileTools.ls);
fileCmd.command('find <pattern>').description('Find files matching pattern').option('-d, --dir <path>', 'Directory to search').action(fileTools.find);
fileCmd.command('size <path>').description('Show file/directory sizes').action(fileTools.size);
fileCmd.command('tree [path]').description('Display directory tree').option('-d, --depth <n>', 'Max depth', '3').action(fileTools.tree);
fileCmd.command('watch <path>').description('Watch file for changes').action(fileTools.watch);
fileCmd.command('hash <path>').description('Calculate file hash (md5, sha1, sha256)').option('-a, --algo <algo>', 'Algorithm', 'sha256').action(fileTools.hash);
fileCmd.command('diff <file1> <file2>').description('Compare two files').action(fileTools.diff);
fileCmd.command('info <path>').description('Show file info').action(fileTools.info);
fileCmd.command('mime <path>').description('Show MIME type of file').action(fileTools.mime);
fileCmd.command('wc <path>').description('Count lines, words, chars in file').action(fileTools.wc);

// TEXT TOOLS
const textCmd = program.command('text').alias('t').description('📝 Text operations');
textCmd.command('json <json>').description('Format/validate JSON').option('-m, --minify', 'Minify output').action(textTools.json);
textCmd.command('base64 <text>').description('Encode/decode base64').option('-d, --decode', 'Decode mode').action(textTools.base64);
textCmd.command('url <text>').description('Encode/decode URL').option('-d, --decode', 'Decode mode').action(textTools.url);
textCmd.command('uuid').description('Generate UUID v4').option('-n, --count <n>', 'Number of UUIDs', '1').action(textTools.uuid);
textCmd.command('hash <text>').description('Hash text (md5, sha1, sha256, sha512)').option('-a, --algo <algo>', 'Algorithm', 'sha256').action(textTools.hashText);
textCmd.command('reverse <text>').description('Reverse text').action(textTools.reverse);
textCmd.command('sort <text>').description('Sort lines alphabetically').option('-r, --reverse', 'Reverse order').option('-n, --numeric', 'Numeric sort').action(textTools.sort);
textCmd.command('count <text>').description('Count occurrences of substring').option('-s, --substring <sub>', 'Substring to count').action(textTools.count);
textCmd.command('template <template>').description('Process template with variables').option('-v, --vars <json>', 'Variables as JSON').action(textTools.template);
textCmd.command('slug <text>').description('Convert text to URL slug').action(textTools.slug);
textCmd.command('camel <text>').description('Convert text to camelCase').action(textTools.camel);
textCmd.command('snake <text>').description('Convert text to snake_case').action(textTools.snake);
textCmd.command('lint <text>').description('Lint JSON/YAML').option('-f, --format <format>', 'Format (json, yaml)').action(textTools.lint);

// CRYPTO TOOLS
const cryptoCmd = program.command('crypto').alias('c').description('🔐 Cryptography');
cryptoCmd.command('gen-password').description('Generate secure password').option('-l, --length <n>', 'Length', '16').option('-s, --special', 'Include special chars').action(cryptoTools.genPassword);
cryptoCmd.command('gen-key [bits]').description('Generate random key').option('-f, --format <format>', 'Format (hex, base64)', 'hex').action(cryptoTools.genKey);
cryptoCmd.command('encrypt <text>').description('Encrypt text (AES)').option('-k, --key <key>', 'Encryption key').action(cryptoTools.encrypt);
cryptoCmd.command('decrypt <text>').description('Decrypt text (AES)').option('-k, --key <key>', 'Decryption key').action(cryptoTools.decrypt);
cryptoCmd.command('hmac <text>').description('Calculate HMAC').option('-k, --key <key>', 'HMAC key').option('-a, --algo <algo>', 'Algorithm', 'sha256').action(cryptoTools.hmac);
cryptoCmd.command('otp <secret>').description('Generate TOTP code').action(cryptoTools.otp);

// NETWORK TOOLS
const netCmd = program.command('net').alias('n').description('🌐 Network operations');
netCmd.command('ping <host>').description('Ping a host').option('-c, --count <n>', 'Number of pings', '4').action(networkTools.ping);
netCmd.command('dns <domain>').description('DNS lookup').option('-t, --type <type>', 'Record type', 'A').action(networkTools.dns);
netCmd.command('http <url>').description('HTTP request').option('-X, --method <method>', 'HTTP method', 'GET').option('-H, --headers <json>', 'Headers as JSON').option('-d, --data <body>', 'Request body').action(networkTools.http);
netCmd.command('port <port>').description('Check if port is open').option('-h, --host <host>', 'Host', 'localhost').action(networkTools.port);
netCmd.command('ip').description('Show public IP address').action(networkTools.myip);
netCmd.command('headers <url>').description('Show HTTP headers').action(networkTools.headers);
netCmd.command('speed').description('Test internet speed').action(networkTools.speed);

// SYSTEM TOOLS
const sysCmd = program.command('sys').alias('s').description('💻 System operations');
sysCmd.command('ps').description('List running processes').option('-c, --cpu', 'Sort by CPU').option('-m, --mem', 'Sort by memory').action(systemTools.ps);
sysCmd.command('top').description('Show top processes').option('-n, --count <n>', 'Number of processes', '10').action(systemTools.top);
sysCmd.command('df').description('Show disk usage').action(systemTools.df);
sysCmd.command('du [path]').description('Show directory space usage').option('-d, --depth <n>', 'Max depth', '1').action(systemTools.du);
sysCmd.command('free').description('Show memory usage').action(systemTools.free);
sysCmd.command('uptime').description('Show system uptime').action(systemTools.uptime);
sysCmd.command('whoami').description('Show current user').action(systemTools.whoami);
sysCmd.command('env').description('Show environment variables').action(systemTools.env);
sysCmd.command('date').description('Show current date/time in various formats').action(systemTools.date);
sysCmd.command('kill <pid>').description('Kill a process').action(systemTools.kill);
sysCmd.command('services').description('List running services').action(systemTools.services);

// GIT TOOLS
const gitCmd = program.command('git').alias('g').description('📦 Git operations');
gitCmd.command('log [count]').description('Show recent commits').action(gitTools.log);
gitCmd.command('status').description('Git status summary').action(gitTools.status);
gitCmd.command('branches').description('List all branches').action(gitTools.branches);
gitCmd.command('stash-list').description('List stashed changes').action(gitTools.stashList);
gitCmd.command('untracked').description('Show untracked files').action(gitTools.untracked);
gitCmd.command('conflicts').description('Show files with conflicts').action(gitTools.conflicts);

// DOCKER TOOLS
const dockerCmd = program.command('docker').alias('d').description('🐳 Docker operations');
dockerCmd.command('ps').description('List running containers').option('-a, --all', 'Show all containers').action(dockerTools.ps);
dockerCmd.command('images').description('List Docker images').action(dockerTools.images);
dockerCmd.command('logs <id>').description('Show container logs').option('-f, --follow', 'Follow logs').option('-n, --lines <n>', 'Number of lines', '50').action(dockerTools.logs);
dockerCmd.command('stats').description('Show container stats').action(dockerTools.stats);
dockerCmd.command('clean').description('Clean up Docker (prune containers, images, volumes)').option('-a, --all', 'Remove all unused').action(dockerTools.clean);

// Interactive mode
program
  .command('interactive').alias('i')
  .description('🔥 Launch full interactive menu mode')
  .action(async () => {
    await startInteractive();
  });

// Help
program.on('--help', () => {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║              QUICK EXAMPLES               ║
╠═══════════════════════════════════════════╣
║  inferno file ls ./src                    ║
║  inferno text json '{}'                   ║
║  inferno crypto gen-password -l 24        ║
║  inferno net ping google.com              ║
║  inferno sys ps                           ║
║  inferno git log 5                        ║
║  inferno docker ps                        ║
╚═══════════════════════════════════════════╝
`));
});

program.parse();