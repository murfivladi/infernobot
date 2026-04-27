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
exports.ping = ping;
exports.dns = dns;
exports.http = http;
exports.port = port;
exports.myip = myip;
exports.headers = headers;
exports.speed = speed;
var chalk_1 = require("chalk");
var child_process_1 = require("child_process");
var util_1 = require("util");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
function ping(host_1) {
    return __awaiter(this, arguments, void 0, function (host, options) {
        var count, stdout, lines, err_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    count = options.count || '4';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCE1 Pinging ".concat(host, "...\n")));
                    return [4 /*yield*/, execAsync("ping -c ".concat(count, " ").concat(host))];
                case 2:
                    stdout = (_a.sent()).stdout;
                    lines = stdout.split('\n');
                    lines.forEach(function (line) {
                        if (line.includes('time=')) {
                            var timeMatch = line.match(/time=([\/\\.]+)/);
                            if (timeMatch) {
                                console.log(chalk_1.default.green("  \u2713 ".concat(line.trim())));
                            }
                        }
                        else if (line.includes('rtt') || line.includes('avg')) {
                            console.log(chalk_1.default.yellow("  ".concat(line.trim())));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Ping failed: ".concat(err_1.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function dns(domain_1) {
    return __awaiter(this, arguments, void 0, function (domain, options) {
        var recordType, stdout, records, err_2;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    recordType = options.type || 'A';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDD0D DNS lookup for ".concat(domain, " (").concat(recordType, ")\n")));
                    return [4 /*yield*/, execAsync("dig +short ".concat(domain, " ").concat(recordType))];
                case 2:
                    stdout = (_a.sent()).stdout;
                    records = stdout.trim().split('\n').filter(function (r) { return r.length > 0; });
                    if (records.length === 0) {
                        console.log(chalk_1.default.yellow('  No records found'));
                    }
                    else {
                        records.forEach(function (record) {
                            console.log(chalk_1.default.green("  \u2713 ".concat(record)));
                        });
                    }
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C DNS lookup failed: ".concat(err_2.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function http(url_1) {
    return __awaiter(this, arguments, void 0, function (url, options) {
        var method, curlCmd, stdout, statusMatch, err_3;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    method = options.method || 'GET';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83C\uDF10 ".concat(method, " ").concat(url, "\n")));
                    curlCmd = "curl -s -X ".concat(method, " -w '\\n{status: %{http_code}, time: %{time_total}s}' '").concat(url, "'");
                    return [4 /*yield*/, execAsync(curlCmd)];
                case 2:
                    stdout = (_a.sent()).stdout;
                    statusMatch = stdout.match(/{status: (\/), time: ([\/\/\/\/\/\/\/]+)s}/);
                    if (statusMatch) {
                        console.log(chalk_1.default.green("  Status: ".concat(statusMatch[1])));
                        console.log(chalk_1.default.green("  Time: ".concat(statusMatch[2], "s")));
                    }
                    console.log(chalk_1.default.gray('  Response:'));
                    console.log(chalk_1.default.white(stdout.slice(0, 500) + (stdout.length > 500 ? '...' : '')));
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C HTTP request failed: ".concat(err_3.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function port(portStr_1) {
    return __awaiter(this, arguments, void 0, function (portStr, options) {
        var host, stdout, err_4;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    host = options.host || 'localhost';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDD0C Checking port ".concat(portStr, " on ").concat(host, "...\n")));
                    return [4 /*yield*/, execAsync("nc -zv ".concat(host, " ").concat(portStr, " 2>&1"))];
                case 2:
                    stdout = (_a.sent()).stdout;
                    if (stdout.includes('succeeded') || stdout.includes('open')) {
                        console.log(chalk_1.default.green("  \u2713 Port ".concat(portStr, " is OPEN")));
                    }
                    else {
                        console.log(chalk_1.default.red("  \u2717 Port ".concat(portStr, " is CLOSED")));
                    }
                    console.log();
                    return [3 /*break*/, 4];
                case 3:
                    err_4 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Port check failed\n"));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function myip() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan('\n🌍 Your public IP address:\n'));
                    return [4 /*yield*/, execAsync('curl -s ifconfig.me')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    console.log(chalk_1.default.bold.green("  ".concat(stdout.trim(), "\n")));
                    return [3 /*break*/, 3];
                case 2:
                    err_5 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Could not determine IP: ".concat(err_5.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function headers(url) {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCCB HTTP Headers for ".concat(url, ":\n")));
                    return [4 /*yield*/, execAsync("curl -sI '".concat(url, "'"))];
                case 1:
                    stdout = (_a.sent()).stdout;
                    stdout.split('\n').forEach(function (line) {
                        if (line.includes(':')) {
                            var _a = line.split(':'), key = _a[0], valueParts = _a.slice(1);
                            console.log(chalk_1.default.green("  ".concat(key.trim(), ":")) + chalk_1.default.white(valueParts.join(':').trim()));
                        }
                        else if (line.trim()) {
                            console.log(chalk_1.default.dim("  ".concat(line.trim())));
                        }
                    });
                    console.log();
                    return [3 /*break*/, 3];
                case 2:
                    err_6 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Failed to get headers: ".concat(err_6.message, "\n")));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function speed() {
    return __awaiter(this, void 0, void 0, function () {
        var start, end, duration, speedMbps, err_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(chalk_1.default.cyan('\n⚡ Testing internet speed...\n'));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    start = Date.now();
                    return [4 /*yield*/, execAsync('curl -s https://speed.cloudflare.com/__down?bytes=10000000 -o /dev/null')];
                case 2:
                    _a.sent();
                    end = Date.now();
                    duration = (end - start) / 1000;
                    speedMbps = (10 / duration * 8).toFixed(2);
                    console.log(chalk_1.default.green("  Download speed: ~".concat(speedMbps, " Mbps")));
                    console.log(chalk_1.default.dim("  Downloaded: 10 MB in ".concat(duration.toFixed(2), "s\n")));
                    return [3 /*break*/, 4];
                case 3:
                    err_7 = _a.sent();
                    console.log(chalk_1.default.red("\n\u274C Speed test failed: ".concat(err_7.message, "\n")));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
