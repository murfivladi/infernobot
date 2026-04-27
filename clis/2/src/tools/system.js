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
exports.ps = ps;
exports.top = top;
exports.df = df;
exports.du = du;
exports.free = free;
exports.uptime = uptime;
exports.whoami = whoami;
exports.env = env;
exports.date = date;
exports.kill = kill;
exports.services = services;
var chalk_1 = require("chalk");
var child_process_1 = require("child_process");
var util_1 = require("util");
var os_1 = require("os");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
function formatUptime(seconds) {
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor((seconds % 86400) / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var parts = [];
    if (days > 0)
        parts.push("".concat(days, "d"));
    if (hours > 0)
        parts.push("".concat(hours, "h"));
    if (minutes > 0)
        parts.push("".concat(minutes, "m"));
    return parts.join(' ') || '< 1m';
}
function ps() {
    return __awaiter(this, arguments, void 0, function (options) {
        var sort, stdout, lines, header, i, cols, pid, cpu, mem, cmd, err_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n📊 Running processes:\n'));
                    sort = options.cpu ? 'pcpu' : options.mem ? 'pmem' : 'pid';
                    return [4 /*yield*/, execAsync("ps aux --sort=-".concat(sort, " | head -20"))];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n');
                    header = lines[0].split(/\t+/).map(function (h) { return chalk_1.default.yellow(h); }).join(chalk_1.default.dim(' | '));
                    console.log(chalk_1.default.dim(header));
                    for (i = 1; i < Math.min(lines.length, 15); i++) {
                        cols = lines[i].trim().split(/\t+/);
                        if (cols.length >= 11) {
                            pid = chalk_1.default.green(cols[1]);
                            cpu = chalk_1.default.cyan(cols[2] + '%');
                            mem = chalk_1.default.magenta(cols[3] + '%');
                            cmd = cols[10] ? cols[10].substring(0, 50) : cols[10];
                            console.log("  ".concat(pid, "  ").concat(cpu, "  ").concat(mem, "  ").concat(chalk_1.default.white(cmd)));
                        }
                    }
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Error: ".concat(err_1.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function top() {
    return __awaiter(this, arguments, void 0, function (options) {
        var count, stdout, lines, err_2;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    count = parseInt(options.count || '10');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDD25 Top ".concat(count, " processes by CPU:\n")));
                    return [4 /*yield*/, execAsync("ps aux --sort=-pcpu | head -".concat(count + 1))];
                case 2:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n');
                    lines.forEach(function (line, i) {
                        var _a;
                        var cols = line.trim().split(/\t+/);
                        if (cols.length >= 11) {
                            var pid = chalk_1.default.green(cols[1]);
                            var cpu = parseFloat(cols[2]) > 80 ? chalk_1.default.red(cols[2]) : chalk_1.default.cyan(cols[2]);
                            var mem = chalk_1.default.magenta(cols[3] + '%');
                            var cmd = ((_a = cols[10]) === null || _a === void 0 ? void 0 : _a.substring(0, 60)) || '';
                            console.log("  ".concat(chalk_1.default.bold(pid.padStart(6)), "  CPU: ").concat(cpu.padStart(7), "  MEM: ").concat(mem, "  ").concat(chalk_1.default.white(cmd)));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Error: ".concat(err_2.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function df() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n💾 Disk usage:\n'));
                    return [4 /*yield*/, execAsync('df -h | grep -E \"^/|^Filesystem\"')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n');
                    console.log(chalk_1.default.yellow('  Filesystem      Size    Used   Avail  Use%  Mounted'));
                    console.log(chalk_1.default.gray('  '.repeat(70)));
                    lines.forEach(function (line) {
                        var cols = line.trim().split(/\t+/);
                        if (cols.length >= 6) {
                            var fs = chalk_1.default.white(cols[0].substring(0, 15).padEnd(15));
                            var size = chalk_1.default.cyan(cols[1].padEnd(7));
                            var used = chalk_1.default.yellow(cols[2].padEnd(7));
                            var avail = chalk_1.default.green(cols[3].padEnd(7));
                            var use = parseInt(cols[4]) > 80 ? chalk_1.default.red(cols[4]) : chalk_1.default.white(cols[4]);
                            var mount = chalk_1.default.dim(cols[5]);
                            console.log("  ".concat(fs, " ").concat(size, " ").concat(used, " ").concat(avail, " ").concat(use, " ").concat(mount));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_3 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Error: ".concat(err_3.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function du() {
    return __awaiter(this, arguments, void 0, function (path, options) {
        var depth, stdout, lines, err_4;
        if (path === void 0) { path = '.'; }
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    depth = options.depth || '1';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCC1 Directory usage for ".concat(path, ":\n")));
                    return [4 /*yield*/, execAsync("du -h --max-depth=".concat(depth, " ").concat(path, " | sort -rh | head -20"))];
                case 2:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    lines.forEach(function (line) {
                        var match = line.match(/^([\/\/\/\/\/\/\/\/\/\/]+)\t(.+)$/);
                        if (match) {
                            var size = chalk_1.default.cyan(match[1].trim());
                            var dir = chalk_1.default.white(match[2]);
                            console.log("  ".concat(size.padStart(10), "  ").concat(dir));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_4 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Error: ".concat(err_4.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function free() {
    return __awaiter(this, void 0, void 0, function () {
        function formatBytes(bytes) {
            return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
        }
        var mem, swap, usedPct, barLen, filled, bar, stdout, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mem = {
                        total: os_1.default.totalmem(),
                        free: os_1.default.freemem(),
                        used: os_1.default.totalmem() - os_1.default.freemem()
                    };
                    swap = { total: 0, used: 0, free: 0 };
                    console.log(chalk_1.default.cyan('\n🧠 Memory usage:\n'));
                    usedPct = ((mem.used / mem.total) * 100).toFixed(1);
                    barLen = 30;
                    filled = Math.round((mem.used / mem.total) * barLen);
                    bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
                    console.log(chalk_1.default.white("  RAM:"));
                    console.log(chalk_1.default.gray("  [".concat(bar, "]")));
                    console.log("  ".concat(chalk_1.default.green(formatBytes(mem.free)), " free  ").concat(chalk_1.default.red(formatBytes(mem.used)), " used  ").concat(chalk_1.default.cyan(formatBytes(mem.total)), " total"));
                    console.log(chalk_1.default.dim("  Usage: ".concat(usedPct, "%\n")));
                    // Show top 5 processes by memory
                    console.log(chalk_1.default.yellow('  Top memory consumers:'));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync('ps aux --sort=-pmem k %mem | head -6')];
                case 2:
                    stdout = (_b.sent()).stdout;
                    stdout.split('\n').slice(1, 6).forEach(function (line) {
                        var _a;
                        var cols = line.trim().split(/\t+/);
                        if (cols.length >= 6) {
                            console.log(chalk_1.default.dim("    ".concat(cols[3], "% ").concat(((_a = cols[10]) === null || _a === void 0 ? void 0 : _a.substring(0, 50)) || '')));
                        }
                    });
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    console.log();
                    return [2 /*return*/];
            }
        });
    });
}
function uptime() {
    return __awaiter(this, void 0, void 0, function () {
        var uptimeSeconds, formatted, now, bootTime;
        return __generator(this, function (_a) {
            uptimeSeconds = os_1.default.uptime();
            formatted = formatUptime(uptimeSeconds);
            console.log(chalk_1.default.cyan('\n⏰ System uptime:\n'));
            console.log(chalk_1.default.bold.green("  ".concat(formatted)));
            now = new Date();
            bootTime = new Date(now.getTime() - uptimeSeconds * 1000);
            console.log(chalk_1.default.dim("  Boot time: ".concat(bootTime.toLocaleString(), "\n")));
            return [2 /*return*/];
        });
    });
}
function whoami() {
    console.log(chalk_1.default.cyan('\n👤 Current user:\n'));
    console.log(chalk_1.default.bold.green("  ".concat(os_1.default.userInfo().username)));
    console.log(chalk_1.default.dim("  UID: ".concat(os_1.default.userInfo().uid, "  GID: ").concat(os_1.default.userInfo().gid, "\n")));
}
function env() {
    return __awaiter(this, void 0, void 0, function () {
        var envVars, groups;
        return __generator(this, function (_a) {
            envVars = Object.entries(process.env)
                .filter(function (_a) {
                var k = _a[0];
                return !k.startsWith('_') && !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD');
            })
                .sort();
            console.log(chalk_1.default.cyan('\n🔧 Environment variables:\n'));
            groups = {};
            envVars.forEach(function (_a) {
                var key = _a[0], value = _a[1];
                var prefix = key.split('_')[0] || 'OTHER';
                if (!groups[prefix])
                    groups[prefix] = [];
                groups[prefix].push("  ".concat(chalk_1.default.green(key.padEnd(30)), " ").concat(chalk_1.default.dim(value || '')));
            });
            Object.entries(groups).slice(0, 15).forEach(function (_a) {
                var group = _a[0], lines = _a[1];
                console.log(chalk_1.default.yellow("  ".concat(group, ":")));
                lines.slice(0, 5).forEach(function (l) { return console.log(l); });
                if (lines.length > 5)
                    console.log(chalk_1.default.dim("    ... and ".concat(lines.length - 5, " more")));
            });
            console.log();
            return [2 /*return*/];
        });
    });
}
function date() {
    var now = new Date();
    console.log(chalk_1.default.cyan('\n📅 Current date/time:\n'));
    var formats = [
        ['ISO 8601', now.toISOString()],
        ['Local', now.toLocaleString()],
        ['UTC', now.toUTCString()],
        ['Unix (s)', Math.floor(now.getTime() / 1000).toString()],
        ['Unix (ms)', now.getTime().toString()]
    ];
    formats.forEach(function (_a) {
        var label = _a[0], value = _a[1];
        console.log("  ".concat(chalk_1.default.yellow(label.padEnd(15)), " ").concat(chalk_1.default.green(value)));
    });
    console.log(chalk_1.default.dim("\n  Timezone: ".concat(Intl.DateTimeFormat().resolvedOptions().timeZone, "\n")));
}
function kill(pidStr) {
    return __awaiter(this, void 0, void 0, function () {
        var pid;
        return __generator(this, function (_a) {
            pid = parseInt(pidStr);
            try {
                console.log(chalk_1.default.cyan("\n\u2620\uFE0F Killing process ".concat(pid, "...\n")));
                process.kill(pid, 'SIGTERM');
                console.log(chalk_1.default.green("  Process ".concat(pid, " terminated\n")));
            }
            catch (err) {
                console.log(chalk_1.default.red("\n\u274C Failed to kill process: ".concat(err.message, "\n")));
            }
            return [2 /*return*/];
        });
    });
}
function services() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n🔧 Running services:\n'));
                    return [4 /*yield*/, execAsync('systemctl list-units --type=service --state=running 2>/dev/null || ps aux | grep -E \"[s]shd|[n]ginx|[a]pache|[d]ocker\"')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    lines.slice(0, 20).forEach(function (line) {
                        var service = line.split(/\t+/)[0] || line.split(' ')[0];
                        if (service && !service.includes('grep')) {
                            console.log(chalk_1.default.green("  \u2713 ".concat(service)));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_5 = _a.sent();
                    console.log(chalk_1.default.yellow('\n  Service listing not available on this system\n'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
