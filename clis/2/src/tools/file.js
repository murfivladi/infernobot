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
exports.ls = ls;
exports.find = find;
exports.size = size;
exports.tree = tree;
exports.watch = watch;
exports.hash = hash;
exports.diff = diff;
exports.info = info;
exports.mime = mime;
exports.wc = wc;
var chalk_1 = require("chalk");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var crypto_1 = require("crypto");
var fs_1 = require("fs");
function formatSize(bytes) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return "".concat(bytes.toFixed(2), " ").concat(units[i]);
}
function ls() {
    return __awaiter(this, arguments, void 0, function (path) {
        var entries, table, err_1;
        if (path === void 0) { path = '.'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, promises_1.readdir)(path, { withFileTypes: true })];
                case 1:
                    entries = _a.sent();
                    table = entries.map(function (entry) {
                        var icon = entry.isDirectory() ? '📁' : '📄';
                        var color = entry.isDirectory() ? chalk_1.default.blue : chalk_1.default.white;
                        return { icon: icon, name: color(entry.name), type: entry.isDirectory() ? 'dir' : (0, path_1.extname)(entry.name) || 'file' };
                    });
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCC2 Contents of ".concat(path, ":")));
                    console.log(chalk_1.default.gray('─'.repeat(50)));
                    table.forEach(function (t) { return console.log("  ".concat(t.icon, " ").concat(t.name, " ").concat(chalk_1.default.dim("[".concat(t.type, "]")))); });
                    console.log(chalk_1.default.gray('─'.repeat(50)));
                    console.log(chalk_1.default.yellow("  Total: ".concat(entries.length, " items\n")));
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_1.message)));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function find(pattern_1) {
    return __awaiter(this, arguments, void 0, function (pattern, options) {
        function walk(dir) {
            return __awaiter(this, void 0, void 0, function () {
                var entries, _i, entries_1, entry, fullPath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, promises_1.readdir)(dir, { withFileTypes: true })];
                        case 1:
                            entries = _a.sent();
                            _i = 0, entries_1 = entries;
                            _a.label = 2;
                        case 2:
                            if (!(_i < entries_1.length)) return [3 /*break*/, 5];
                            entry = entries_1[_i];
                            fullPath = (0, path_1.join)(dir, entry.name);
                            if (entry.name.includes(pattern)) {
                                results_1.push(fullPath);
                            }
                            if (!(entry.isDirectory() && !entry.name.startsWith('.'))) return [3 /*break*/, 4];
                            return [4 /*yield*/, walk(fullPath)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        var searchDir, results_1, err_2;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    searchDir = options.dir || process.cwd();
                    console.log(chalk_1.default.cyan("\n\uD83D\uDD0D Searching for '".concat(pattern, "' in ").concat(searchDir, "...\n")));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    results_1 = [];
                    return [4 /*yield*/, walk(searchDir)];
                case 2:
                    _a.sent();
                    if (results_1.length === 0) {
                        console.log(chalk_1.default.yellow('  No matches found'));
                    }
                    else {
                        results_1.forEach(function (r) { return console.log(chalk_1.default.green("  \u2713 ".concat(r))); });
                    }
                    console.log(chalk_1.default.gray("\n  Found ".concat(results_1.length, " matches\n")));
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_2.message)));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function size(path) {
    return __awaiter(this, void 0, void 0, function () {
        function getSize(dir) {
            return __awaiter(this, void 0, void 0, function () {
                var total, entries, _i, entries_2, entry, fullPath, s, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            total = 0;
                            return [4 /*yield*/, (0, promises_1.readdir)(dir, { withFileTypes: true })];
                        case 1:
                            entries = _b.sent();
                            _i = 0, entries_2 = entries;
                            _b.label = 2;
                        case 2:
                            if (!(_i < entries_2.length)) return [3 /*break*/, 7];
                            entry = entries_2[_i];
                            fullPath = (0, path_1.join)(dir, entry.name);
                            return [4 /*yield*/, (0, promises_1.stat)(fullPath)];
                        case 3:
                            s = _b.sent();
                            if (!s.isDirectory()) return [3 /*break*/, 5];
                            _a = total;
                            return [4 /*yield*/, getSize(fullPath)];
                        case 4:
                            total = _a + _b.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            total += s.size;
                            _b.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [2 /*return*/, total];
                    }
                });
            });
        }
        var s, total, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, promises_1.stat)(path)];
                case 1:
                    s = _a.sent();
                    if (!s.isDirectory()) return [3 /*break*/, 3];
                    return [4 /*yield*/, getSize(path)];
                case 2:
                    total = _a.sent();
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCCA Size of ".concat(path, ":")));
                    console.log(chalk_1.default.green("\n  Total: ".concat(formatSize(total), "\n")));
                    return [3 /*break*/, 4];
                case 3:
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCCA Size of ".concat(path, ":")));
                    console.log(chalk_1.default.green("\n  ".concat(formatSize(s.size), "\n")));
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    err_3 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_3.message)));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function tree() {
    return __awaiter(this, arguments, void 0, function (path, options) {
        function printTree(dir_1) {
            return __awaiter(this, arguments, void 0, function (dir, prefix, depth) {
                var entries, i, entry, isLast, connector, icon, color, newPrefix;
                if (prefix === void 0) { prefix = ''; }
                if (depth === void 0) { depth = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (depth >= maxDepth)
                                return [2 /*return*/];
                            return [4 /*yield*/, (0, promises_1.readdir)(dir, { withFileTypes: true })];
                        case 1:
                            entries = _a.sent();
                            entries.sort(function (a, b) { return a.name.localeCompare(b.name); });
                            i = 0;
                            _a.label = 2;
                        case 2:
                            if (!(i < entries.length)) return [3 /*break*/, 5];
                            entry = entries[i];
                            isLast = i === entries.length - 1;
                            connector = isLast ? '└── ' : '├── ';
                            icon = entry.isDirectory() ? '📁' : '📄';
                            color = entry.isDirectory() ? chalk_1.default.blue : chalk_1.default.white;
                            console.log(prefix + connector + icon + ' ' + color(entry.name));
                            if (!(entry.isDirectory() && !entry.name.startsWith('.'))) return [3 /*break*/, 4];
                            newPrefix = prefix + (isLast ? '    ' : '│   ');
                            return [4 /*yield*/, printTree((0, path_1.join)(dir, entry.name), newPrefix, depth + 1)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        var maxDepth, err_4;
        if (path === void 0) { path = '.'; }
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    maxDepth = parseInt(options.depth || '3');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83C\uDF33 Directory tree: ".concat(path, "\n")));
                    console.log(chalk_1.default.bold('📂 ' + path));
                    return [4 /*yield*/, printTree(path, '', 0)];
                case 2:
                    _a.sent();
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_4 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_4.message)));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function watch(path) {
    return __awaiter(this, void 0, void 0, function () {
        var watcher;
        return __generator(this, function (_a) {
            console.log(chalk_1.default.cyan("\n\uD83D\uDC40 Watching ".concat(path, " for changes...\n")));
            console.log(chalk_1.default.yellow('Press Ctrl+C to stop\n'));
            watcher = fs_1.default.watch(path, { recursive: true }, function (eventType, filename) {
                var timestamp = new Date().toLocaleTimeString();
                console.log(chalk_1.default.green("[".concat(timestamp, "] ").concat(eventType, ": ").concat(filename)));
            });
            process.on('SIGINT', function () {
                watcher.close();
                console.log(chalk_1.default.red('\n\n👋 Stopped watching\n'));
                process.exit();
            });
            return [2 /*return*/];
        });
    });
}
function hash(path_2) {
    return __awaiter(this, arguments, void 0, function (path, options) {
        var algorithm, content, hashSum, err_5;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    algorithm = options.algo || 'sha256';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, promises_1.readFile)(path)];
                case 2:
                    content = _a.sent();
                    hashSum = (0, crypto_1.createHash)(algorithm).update(content).digest('hex');
                    console.log(chalk_1.default.cyan("\n\uD83D\uDD10 ".concat(algorithm.toUpperCase(), " hash of ").concat(path, ":")));
                    console.log(chalk_1.default.green("\n  ".concat(hashSum, "\n")));
                    console.log(chalk_1.default.dim("  Algorithm: ".concat(algorithm)));
                    console.log(chalk_1.default.dim("  Size: ".concat(formatSize(content.length), "\n")));
                    return [3 /*break*/, 4];
                case 3:
                    err_5 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_5.message)));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function diff(file1, file2) {
    return __awaiter(this, void 0, void 0, function () {
        var content1, content2, lines1, lines2, same, different, maxLines, i, l1, l2, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCCA Comparing ".concat(file1, " vs ").concat(file2, "\n")));
                    return [4 /*yield*/, (0, promises_1.readFile)(file1, 'utf-8')];
                case 1:
                    content1 = _a.sent();
                    return [4 /*yield*/, (0, promises_1.readFile)(file2, 'utf-8')];
                case 2:
                    content2 = _a.sent();
                    lines1 = content1.split('\n');
                    lines2 = content2.split('\n');
                    same = 0, different = 0;
                    maxLines = Math.max(lines1.length, lines2.length);
                    for (i = 0; i < maxLines; i++) {
                        if (lines1[i] === lines2[i]) {
                            same++;
                        }
                        else {
                            different++;
                            l1 = lines1[i] || '(empty)';
                            l2 = lines2[i] || '(empty)';
                            console.log(chalk_1.default.yellow("  Line ".concat(i + 1, ":")));
                            console.log(chalk_1.default.red("    - ".concat(l1)));
                            console.log(chalk_1.default.green("    + ".concat(l2)));
                        }
                    }
                    console.log(chalk_1.default.cyan("\n  Summary: ".concat(chalk_1.default.green(same), " same, ").concat(chalk_1.default.red(different), " different\n")));
                    return [3 /*break*/, 4];
                case 3:
                    err_6 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_6.message)));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function info(path) {
    return __awaiter(this, void 0, void 0, function () {
        var s, err_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, promises_1.stat)(path)];
                case 1:
                    s = _a.sent();
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCCB Info: ".concat(path, "\n")));
                    console.log(chalk_1.default.bold('  File Statistics:'));
                    console.log(chalk_1.default.dim("    Size: ".concat(formatSize(s.size))));
                    console.log(chalk_1.default.dim("    Created: ".concat(s.birthtime.toLocaleString())));
                    console.log(chalk_1.default.dim("    Modified: ".concat(s.mtime.toLocaleString())));
                    console.log(chalk_1.default.dim("    Accessed: ".concat(s.atime.toLocaleString())));
                    console.log(chalk_1.default.dim("    Mode: ".concat(s.mode.toString(8))));
                    console.log(chalk_1.default.dim("    Is Directory: ".concat(s.isDirectory())));
                    console.log(chalk_1.default.dim("    Is File: ".concat(s.isFile())));
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_7 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_7.message)));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function mime(path) {
    return __awaiter(this, void 0, void 0, function () {
        var ext, mimeTypes;
        return __generator(this, function (_a) {
            try {
                ext = (0, path_1.extname)(path).toLowerCase();
                mimeTypes = {
                    '.txt': 'text/plain', '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
                    '.json': 'application/json', '.xml': 'application/xml', '.pdf': 'application/pdf',
                    '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
                    '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.zip': 'application/zip',
                    '.ts': 'text/typescript', '.tsx': 'text/tsx', '.py': 'text/python',
                    '.go': 'text/x-go', '.rs': 'text/x-rust', '.java': 'text/x-java'
                };
                console.log(chalk_1.default.cyan("\n\uD83C\uDFAF MIME type for ".concat(path, ":")));
                console.log(chalk_1.default.green("\n  ".concat(mimeTypes[ext] || 'application/octet-stream', "\n")));
                console.log(chalk_1.default.dim("  Extension: ".concat(ext || 'none', "\n")));
            }
            catch (err) {
                console.log(chalk_1.default.red("\u274C Error: ".concat(err.message)));
            }
            return [2 /*return*/];
        });
    });
}
function wc(path) {
    return __awaiter(this, void 0, void 0, function () {
        var content, lines, words, chars, err_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, promises_1.readFile)(path, 'utf-8')];
                case 1:
                    content = _a.sent();
                    lines = content.split('\n');
                    words = content.split(/\\s+/).filter(function (w) { return w.length > 0; });
                    chars = content.length;
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCCA Statistics for ".concat(path, ":")));
                    console.log(chalk_1.default.green("\n  Lines: ".concat(chalk_1.default.bold(lines.length.toString()))));
                    console.log(chalk_1.default.green("  Words: ".concat(chalk_1.default.bold(words.length.toString()))));
                    console.log(chalk_1.default.green("  Chars: ".concat(chalk_1.default.bold(chars.toString()), "\n")));
                    return [3 /*break*/, 3];
                case 2:
                    err_8 = _a.sent();
                    console.log(chalk_1.default.red("\u274C Error: ".concat(err_8.message)));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
