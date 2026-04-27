#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var commander_1 = require("commander");
var chalk_1 = require("chalk");
var fileTools = require("./tools/file.js");
var textTools = require("./tools/text.js");
var cryptoTools = require("./tools/crypto.js");
var networkTools = require("./tools/network.js");
var systemTools = require("./tools/system.js");
var gitTools = require("./tools/git.js");
var dockerTools = require("./tools/docker.js");
var program = new commander_1.Command();
// Banner
console.log(chalk_1.default.cyan("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551   \uD83D\uDD25 INFERNO CLI - 100+ Developer Tools   \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n"));
// Version
program
    .version('1.0.0')
    .description('A powerful CLI with tools for every developer');
// Register all commands
// FILE TOOLS
var fileCmd = program.command('file').alias('f').description('📁 File operations');
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
var textCmd = program.command('text').alias('t').description('📝 Text operations');
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
var cryptoCmd = program.command('crypto').alias('c').description('🔐 Cryptography');
cryptoCmd.command('gen-password').description('Generate secure password').option('-l, --length <n>', 'Length', '16').option('-s, --special', 'Include special chars').action(cryptoTools.genPassword);
cryptoCmd.command('gen-key [bits]').description('Generate random key').option('-f, --format <format>', 'Format (hex, base64)', 'hex').action(cryptoTools.genKey);
cryptoCmd.command('encrypt <text>').description('Encrypt text (AES)').option('-k, --key <key>', 'Encryption key').action(cryptoTools.encrypt);
cryptoCmd.command('decrypt <text>').description('Decrypt text (AES)').option('-k, --key <key>', 'Decryption key').action(cryptoTools.decrypt);
cryptoCmd.command('hmac <text>').description('Calculate HMAC').option('-k, --key <key>', 'HMAC key').option('-a, --algo <algo>', 'Algorithm', 'sha256').action(cryptoTools.hmac);
cryptoCmd.command('otp <secret>').description('Generate TOTP code').action(cryptoTools.otp);
// NETWORK TOOLS
var netCmd = program.command('net').alias('n').description('🌐 Network operations');
netCmd.command('ping <host>').description('Ping a host').option('-c, --count <n>', 'Number of pings', '4').action(networkTools.ping);
netCmd.command('dns <domain>').description('DNS lookup').option('-t, --type <type>', 'Record type', 'A').action(networkTools.dns);
netCmd.command('http <url>').description('HTTP request').option('-X, --method <method>', 'HTTP method', 'GET').option('-H, --headers <json>', 'Headers as JSON').option('-d, --data <body>', 'Request body').action(networkTools.http);
netCmd.command('port <port>').description('Check if port is open').option('-h, --host <host>', 'Host', 'localhost').action(networkTools.port);
netCmd.command('ip').description('Show public IP address').action(networkTools.myip);
netCmd.command('headers <url>').description('Show HTTP headers').action(networkTools.headers);
netCmd.command('speed').description('Test internet speed').action(networkTools.speed);
// SYSTEM TOOLS
var sysCmd = program.command('sys').alias('s').description('💻 System operations');
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
var gitCmd = program.command('git').alias('g').description('📦 Git operations');
gitCmd.command('log [count]').description('Show recent commits').action(gitTools.log);
gitCmd.command('status').description('Git status summary').action(gitTools.status);
gitCmd.command('branches').description('List all branches').action(gitTools.branches);
gitCmd.command('stash-list').description('List stashed changes').action(gitTools.stashList);
gitCmd.command('untracked').description('Show untracked files').action(gitTools.untracked);
gitCmd.command('conflicts').description('Show files with conflicts').action(gitTools.conflicts);
// DOCKER TOOLS
var dockerCmd = program.command('docker').alias('d').description('🐳 Docker operations');
dockerCmd.command('ps').description('List running containers').option('-a, --all', 'Show all containers').action(dockerTools.ps);
dockerCmd.command('images').description('List Docker images').action(dockerTools.images);
dockerCmd.command('logs <id>').description('Show container logs').option('-f, --follow', 'Follow logs').option('-n, --lines <n>', 'Number of lines', '50').action(dockerTools.logs);
dockerCmd.command('stats').description('Show container stats').action(dockerTools.stats);
dockerCmd.command('clean').description('Clean up Docker (prune containers, images, volumes)').option('-a, --all', 'Remove all unused').action(dockerTools.clean);
// Interactive mode
program
    .command('interactive').alias('i')
    .description('Launch interactive mode with menu')
    .action(function () { return __awaiter(void 0, void 0, void 0, function () {
    var inquirer, choices, choice;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('inquirer'); })];
            case 1:
                inquirer = _a.sent();
                choices = [
                    { name: '📁 File Tools', value: 'file' },
                    { name: '📝 Text Tools', value: 'text' },
                    { name: '🔐 Crypto Tools', value: 'crypto' },
                    { name: '🌐 Network Tools', value: 'net' },
                    { name: '💻 System Tools', value: 'sys' },
                    { name: '📦 Git Tools', value: 'git' },
                    { name: '🐳 Docker Tools', value: 'docker' },
                    { name: '❌ Exit', value: 'exit' }
                ];
                _a.label = 2;
            case 2:
                if (!true) return [3 /*break*/, 4];
                return [4 /*yield*/, inquirer.default.prompt([{
                            type: 'list',
                            name: 'choice',
                            message: chalk_1.default.cyan('🔥 Select a tool category:'),
                            choices: choices
                        }])];
            case 3:
                choice = (_a.sent()).choice;
                if (choice === 'exit')
                    return [3 /*break*/, 4];
                console.log(chalk_1.default.yellow("\nRun: inferno ".concat(choice, " --help for available commands\n")));
                return [3 /*break*/, 2];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Help
program.on('--help', function () {
    console.log(chalk_1.default.cyan("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551              QUICK EXAMPLES               \u2551\n\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563\n\u2551  inferno file ls ./src                    \u2551\n\u2551  inferno text json '{}'                   \u2551\n\u2551  inferno crypto gen-password -l 24        \u2551\n\u2551  inferno net ping google.com              \u2551\n\u2551  inferno sys ps                           \u2551\n\u2551  inferno git log 5                        \u2551\n\u2551  inferno docker ps                        \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n"));
});
program.parse();
