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
exports.images = images;
exports.logs = logs;
exports.stats = stats;
exports.clean = clean;
var chalk_1 = require("chalk");
var child_process_1 = require("child_process");
var util_1 = require("util");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
function ps() {
    return __awaiter(this, arguments, void 0, function (options) {
        var flags, stdout, lines, err_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n🐳 Docker containers:\n'));
                    flags = options.all ? '-a' : '';
                    return [4 /*yield*/, execAsync("docker ps ".concat(flags, " --format \"table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}\\t{{.Names}}\""))];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n');
                    console.log(chalk_1.default.yellow('  ID           Image          Status          Ports          Names'));
                    console.log(chalk_1.default.gray('  '.repeat(85)));
                    lines.slice(1).forEach(function (line) {
                        var _a, _b;
                        var cols = line.split('\t');
                        if (cols.length >= 5) {
                            var id = chalk_1.default.green(((_a = cols[0]) === null || _a === void 0 ? void 0 : _a.substring(0, 12)) || '');
                            var image = chalk_1.default.cyan(cols[1] || '');
                            var status_1 = ((_b = cols[2]) === null || _b === void 0 ? void 0 : _b.includes('Up')) ? chalk_1.default.green(cols[2]) : chalk_1.default.yellow(cols[2] || '');
                            var ports = chalk_1.default.dim(cols[3] || '-');
                            var name_1 = chalk_1.default.white(cols[4] || '');
                            console.log("  ".concat(id.padEnd(12), " ").concat(image.padEnd(15), " ").concat(status_1.padEnd(15), " ").concat(ports.padEnd(13), " ").concat(name_1));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Docker error: ".concat(err_1.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function images() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n📦 Docker images:\n'));
                    return [4 /*yield*/, execAsync('docker images --format \"table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}\"')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n');
                    console.log(chalk_1.default.yellow('  Repository        Tag          Size      Created'));
                    console.log(chalk_1.default.gray('  '.repeat(70)));
                    lines.slice(1).forEach(function (line) {
                        var _a;
                        var cols = line.split('\t');
                        if (cols.length >= 4) {
                            var repo = chalk_1.default.cyan(cols[0] || '');
                            var tag = cols[1] === '<none>' ? chalk_1.default.gray(cols[1]) : chalk_1.default.green(cols[1] || '');
                            var size = chalk_1.default.yellow(cols[2] || '');
                            var created = chalk_1.default.dim(((_a = cols[3]) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) || '');
                            console.log("  ".concat(repo.padEnd(18), " ").concat(tag.padEnd(12), " ").concat(size.padEnd(10), " ").concat(created));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_2 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Docker error: ".concat(err_2.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function logs(id_1) {
    return __awaiter(this, arguments, void 0, function (id, options) {
        var follow, num, _a, stdout, stderr, output, err_3;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCDC Container logs: ".concat(id, "\n")));
                    follow = options.follow ? '-f' : '';
                    num = options.lines || '50';
                    return [4 /*yield*/, execAsync("docker logs ".concat(follow, " --tail ").concat(num, " ").concat(id, " 2>&1"))];
                case 1:
                    _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                    output = stdout || stderr;
                    output.split('\n').slice(-parseInt(num)).forEach(function (line) {
                        if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
                            console.log(chalk_1.default.red("  ".concat(line)));
                        }
                        else if (line.includes('warn') || line.includes('Warn')) {
                            console.log(chalk_1.default.yellow("  ".concat(line)));
                        }
                        else {
                            console.log(chalk_1.default.white("  ".concat(line)));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_3 = _b.sent();
                    console.log(chalk_1.default.red("\n\u274C Docker error: ".concat(err_3.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function stats() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n📊 Container stats:\n'));
                    return [4 /*yield*/, execAsync('docker stats --no-stream --format \"table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.BlockIO}}\"')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n');
                    console.log(chalk_1.default.yellow('  Name          CPU%     MEM Usage     NET IO      Block IO'));
                    console.log(chalk_1.default.gray('  '.repeat(80)));
                    lines.slice(1).forEach(function (line) {
                        var cols = line.split('\t');
                        if (cols.length >= 5) {
                            var name_2 = chalk_1.default.cyan(cols[0] || '');
                            var cpu = parseFloat(cols[1]) > 80 ? chalk_1.default.red(cols[1]) : chalk_1.default.white(cols[1] || '');
                            var mem = chalk_1.default.white(cols[2] || '');
                            var net = chalk_1.default.dim(cols[3] || '');
                            var block = chalk_1.default.dim(cols[4] || '');
                            console.log("  ".concat(name_2.padEnd(14), " ").concat(cpu.padEnd(10), " ").concat(mem.padEnd(15), " ").concat(net.padEnd(12), " ").concat(block));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_4 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Docker error: ".concat(err_4.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function clean() {
    return __awaiter(this, arguments, void 0, function (options) {
        var all, psOut, err_5;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    all = options.all || false;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    console.log(chalk_1.default.cyan('\n🧹 Cleaning Docker...\n'));
                    return [4 /*yield*/, execAsync('docker ps -q').catch(function () { return ({ stdout: '' }); })];
                case 2:
                    psOut = (_a.sent()).stdout;
                    if (!psOut.trim()) return [3 /*break*/, 4];
                    console.log(chalk_1.default.yellow('  Stopping containers...'));
                    return [4 /*yield*/, execAsync('docker stop $(docker ps -q)').catch(function () { })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    // Prune containers
                    console.log(chalk_1.default.dim('  Removing stopped containers...'));
                    return [4 /*yield*/, execAsync('docker container prune -f').catch(function () { })];
                case 5:
                    _a.sent();
                    // Prune images
                    console.log(chalk_1.default.dim('  Removing dangling images...'));
                    return [4 /*yield*/, execAsync('docker image prune -f').catch(function () { })];
                case 6:
                    _a.sent();
                    if (!all) return [3 /*break*/, 10];
                    // Remove all unused images
                    console.log(chalk_1.default.dim('  Removing unused images...'));
                    return [4 /*yield*/, execAsync('docker image prune -a -f').catch(function () { })];
                case 7:
                    _a.sent();
                    // Prune volumes
                    console.log(chalk_1.default.dim('  Removing unused volumes...'));
                    return [4 /*yield*/, execAsync('docker volume prune -f').catch(function () { })];
                case 8:
                    _a.sent();
                    // Prune networks
                    console.log(chalk_1.default.dim('  Removing unused networks...'));
                    return [4 /*yield*/, execAsync('docker network prune -f').catch(function () { })];
                case 9:
                    _a.sent();
                    _a.label = 10;
                case 10:
                    console.log(chalk_1.default.green('\n  ✓ Docker cleaned successfully\n'));
                    return [3 /*break*/, 12];
                case 11:
                    err_5 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Docker error: ".concat(err_5.message, "\n")));
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
