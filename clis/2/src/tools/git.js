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
exports.log = log;
exports.status = status;
exports.branches = branches;
exports.stashList = stashList;
exports.untracked = untracked;
exports.conflicts = conflicts;
var chalk_1 = require("chalk");
var child_process_1 = require("child_process");
var util_1 = require("util");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
function log(countStr) {
    return __awaiter(this, void 0, void 0, function () {
        var count, stdout, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    count = parseInt(countStr || '10');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCDC Recent ".concat(count, " commits:\n")));
                    return [4 /*yield*/, execAsync("git log --oneline --graph --decorate -n ".concat(count))];
                case 2:
                    stdout = (_a.sent()).stdout;
                    stdout.split('\n').forEach(function (line) {
                        if (line.includes('*')) {
                            console.log(chalk_1.default.green(line));
                        }
                        else {
                            console.log(chalk_1.default.gray(line));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Not a git repository or error: ".concat(err_1.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function status() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, staged_1, modified_1, untracked_1, branch, tracking, _a, ahead, behind, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    console.log(chalk_1.default.cyan('\n📊 Git status:\n'));
                    return [4 /*yield*/, execAsync('git status --short')];
                case 1:
                    stdout = (_b.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    if (lines.length === 0) {
                        console.log(chalk_1.default.green('  ✓ Working tree clean'));
                    }
                    else {
                        staged_1 = [];
                        modified_1 = [];
                        untracked_1 = [];
                        lines.forEach(function (line) {
                            var status = line.substring(0, 2).trim();
                            var file = line.substring(3);
                            if (status.includes('M') && !status.includes('?')) {
                                modified_1.push(file);
                            }
                            else if (status.includes('?')) {
                                untracked_1.push(file);
                            }
                            else {
                                staged_1.push(file);
                            }
                        });
                        if (staged_1.length > 0) {
                            console.log(chalk_1.default.green("  Staged (".concat(staged_1.length, "):")));
                            staged_1.forEach(function (f) { return console.log(chalk_1.default.dim("    + ".concat(f))); });
                        }
                        if (modified_1.length > 0) {
                            console.log(chalk_1.default.yellow("  Modified (".concat(modified_1.length, "):")));
                            modified_1.forEach(function (f) { return console.log(chalk_1.default.dim("    ~ ".concat(f))); });
                        }
                        if (untracked_1.length > 0) {
                            console.log(chalk_1.default.gray("  Untracked (".concat(untracked_1.length, "):")));
                            untracked_1.forEach(function (f) { return console.log(chalk_1.default.dim("    ? ".concat(f))); });
                        }
                    }
                    return [4 /*yield*/, execAsync('git branch --show-current').catch(function () { return ({ stdout: '' }); })];
                case 2:
                    branch = _b.sent();
                    if (branch.stdout.trim()) {
                        console.log(chalk_1.default.cyan("\n  Current branch: ".concat(chalk_1.default.bold(branch.stdout.trim()))));
                    }
                    return [4 /*yield*/, execAsync('git rev-list --left-right --count HEAD...@{upstream}').catch(function () { return ({ stdout: '' }); })];
                case 3:
                    tracking = _b.sent();
                    if (tracking.stdout.trim()) {
                        _a = tracking.stdout.trim().split('\t'), ahead = _a[0], behind = _a[1];
                        if (ahead !== '0')
                            console.log(chalk_1.default.green("  \u2191 ".concat(ahead, " ahead")));
                        if (behind !== '0')
                            console.log(chalk_1.default.red("  \u2193 ".concat(behind, " behind")));
                    }
                    console.log();
                    return [3 /*break*/, 5];
                case 4:
                    err_2 = _b.sent();
                    console.log(chalk_1.default.red("\n\u274C Git error: ".concat(err_2.message, "\n")));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function branches() {
    return __awaiter(this, void 0, void 0, function () {
        var current_1, stdout, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log(chalk_1.default.cyan('\n🌿 Git branches:\n'));
                    return [4 /*yield*/, execAsync('git branch --show-current')];
                case 1:
                    current_1 = (_a.sent()).stdout.trim();
                    return [4 /*yield*/, execAsync('git for-each-ref --sort=-committerdate refs/heads/ --format=\"| %(refname:short) | %(committerdate:short) | %(subject) | %(commitauthorname) |\"| column -t -s \"|\"')];
                case 2:
                    stdout = (_a.sent()).stdout;
                    console.log(chalk_1.default.yellow('  Branch              Date       Subject                        Author'));
                    console.log(chalk_1.default.gray('  '.repeat(80)));
                    stdout.split('\n').forEach(function (line) {
                        var parts = line.trim().split(/\t+/);
                        if (parts.length >= 4) {
                            var isCurrent = parts[0].trim() === current_1;
                            var branchName = isCurrent ? chalk_1.default.green('* ' + parts[0].trim()) : chalk_1.default.white('  ' + parts[0].trim());
                            console.log("  ".concat(branchName.padEnd(20), " ").concat(parts[1].padEnd(10), " ").concat(parts[2].substring(0, 30).padEnd(30), " ").concat(parts[3]));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Git error: ".concat(err_3.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function stashList() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n📦 Stashed changes:\n'));
                    return [4 /*yield*/, execAsync('git stash list')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    if (lines.length === 0) {
                        console.log(chalk_1.default.yellow('  No stashed changes'));
                    }
                    else {
                        lines.forEach(function (line) {
                            var match = line.match(/stash@{(\/d+)}: (.+)/);
                            if (match) {
                                console.log(chalk_1.default.green("  ".concat(match[1], " ").concat(match[2])));
                            }
                            else {
                                console.log(chalk_1.default.green("  ".concat(line)));
                            }
                        });
                    }
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_4 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Git error: ".concat(err_4.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function untracked() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n❓ Untracked files:\n'));
                    return [4 /*yield*/, execAsync('git ls-files --others --exclude-standard')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    if (lines.length === 0) {
                        console.log(chalk_1.default.green('  ✓ No untracked files'));
                    }
                    else {
                        console.log(chalk_1.default.gray("  Found ".concat(lines.length, " untracked file(s):\n")));
                        lines.forEach(function (file) {
                            var ext = file.split('.').pop() || '';
                            var icon = ['ts', 'js', 'tsx', 'jsx'].includes(ext) ? '📄' :
                                ['json', 'yml', 'yaml'].includes(ext) ? '📋' :
                                    ['md', 'txt'].includes(ext) ? '📝' : '📄';
                            console.log(chalk_1.default.gray("  ".concat(icon, " ").concat(file)));
                        });
                    }
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_5 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Git error: ".concat(err_5.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function conflicts() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, lines, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n⚠️ Files with conflicts:\n'));
                    return [4 /*yield*/, execAsync('git diff --name-only --diff-filter=U')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n').filter(function (l) { return l.trim(); });
                    if (lines.length === 0) {
                        console.log(chalk_1.default.green('  ✓ No conflicts'));
                    }
                    else {
                        lines.forEach(function (file) {
                            console.log(chalk_1.default.red("  \u26A0 ".concat(file)));
                        });
                        console.log(chalk_1.default.yellow("\n  ".concat(lines.length, " file(s) need resolution\n")));
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_6 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Git error: ".concat(err_6.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
