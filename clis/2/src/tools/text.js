"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.json = json;
exports.base64 = base64;
exports.url = url;
exports.uuid = uuid;
exports.hashText = hashText;
exports.reverse = reverse;
exports.sort = sort;
exports.count = count;
exports.template = template;
exports.slug = slug;
exports.camel = camel;
exports.snake = snake;
exports.lint = lint;
var chalk_1 = require("chalk");
var crypto_1 = require("crypto");
function json(jsonStr, options) {
    if (options === void 0) { options = {}; }
    try {
        var parsed = JSON.parse(jsonStr);
        if (options.minify) {
            console.log(chalk_1.default.cyan('\n📄 Minified JSON:\n'));
            console.log(chalk_1.default.green(JSON.stringify(parsed)));
        }
        else {
            console.log(chalk_1.default.cyan('\n📄 Formatted JSON:\n'));
            console.log(chalk_1.default.green(JSON.stringify(parsed, null, 2)));
        }
        console.log();
    }
    catch (err) {
        console.log(chalk_1.default.red("\n\u274C Invalid JSON: ".concat(err.message, "\n")));
    }
}
function base64(text, options) {
    if (options === void 0) { options = {}; }
    try {
        if (options.decode) {
            var decoded = Buffer.from(text, 'base64').toString('utf-8');
            console.log(chalk_1.default.cyan('\n🔓 Decoded from Base64:\n'));
            console.log(chalk_1.default.green(decoded));
        }
        else {
            var encoded = Buffer.from(text).toString('base64');
            console.log(chalk_1.default.cyan('\n🔒 Encoded to Base64:\n'));
            console.log(chalk_1.default.green(encoded));
        }
        console.log();
    }
    catch (err) {
        console.log(chalk_1.default.red("\n\u274C Error: ".concat(err.message, "\n")));
    }
}
function url(text, options) {
    if (options === void 0) { options = {}; }
    try {
        if (options.decode) {
            var decoded = decodeURIComponent(text);
            console.log(chalk_1.default.cyan('\n🔓 URL Decoded:\n'));
            console.log(chalk_1.default.green(decoded));
        }
        else {
            var encoded = encodeURIComponent(text);
            console.log(chalk_1.default.cyan('\n🔒 URL Encoded:\n'));
            console.log(chalk_1.default.green(encoded));
        }
        console.log();
    }
    catch (err) {
        console.log(chalk_1.default.red("\n\u274C Error: ".concat(err.message, "\n")));
    }
}
function uuid(options) {
    if (options === void 0) { options = {}; }
    var count = parseInt(options.count || '1');
    console.log(chalk_1.default.cyan('\n🆔 Generated UUIDs:\n'));
    for (var i = 0; i < count; i++) {
        console.log(chalk_1.default.green("  ".concat(crypto_1.default.randomUUID())));
    }
    console.log();
}
function hashText(text, options) {
    if (options === void 0) { options = {}; }
    var algorithm = options.algo || 'sha256';
    var hash = crypto_1.default.createHash(algorithm).update(text).digest('hex');
    console.log(chalk_1.default.cyan("\n\uD83D\uDD10 ".concat(algorithm.toUpperCase(), " hash:\n")));
    console.log(chalk_1.default.green("  ".concat(hash, "\n")));
}
function reverse(text) {
    var reversed = text.split('').reverse().join('');
    console.log(chalk_1.default.cyan('\n🔄 Reversed text:\n'));
    console.log(chalk_1.default.green(reversed));
    console.log();
}
function sort(text, options) {
    if (options === void 0) { options = {}; }
    var lines = text.split('\n').filter(function (l) { return l.length > 0; });
    var sorted;
    if (options.numeric) {
        sorted = lines.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
    }
    else {
        sorted = lines.sort(function (a, b) { return a.localeCompare(b); });
    }
    if (options.reverse)
        sorted.reverse();
    console.log(chalk_1.default.cyan('\n📊 Sorted lines:\n'));
    sorted.forEach(function (line) { return console.log(chalk_1.default.green("  ".concat(line))); });
    console.log();
}
function count(text, options) {
    if (options === void 0) { options = {}; }
    var sub = options.substring || text;
    var regex = new RegExp(escapeRegex(sub), 'gi');
    var matches = text.match(regex);
    var count = matches ? matches.length : 0;
    console.log(chalk_1.default.cyan('\n🔢 Count results:\n'));
    console.log(chalk_1.default.green("  '".concat(sub, "': ").concat(count, " occurrences\n")));
}
function template(templateStr, options) {
    if (options === void 0) { options = {}; }
    try {
        var vars = options.vars ? JSON.parse(options.vars) : {};
        var result_1 = templateStr;
        Object.entries(vars).forEach(function (_a) {
            var key = _a[0], value = _a[1];
            var regex = new RegExp("\\{\\{".concat(key, "\\}\\}"), 'g');
            result_1 = result_1.replace(regex, String(value));
        });
        console.log(chalk_1.default.cyan('\n📝 Template result:\n'));
        console.log(chalk_1.default.green(result_1));
        console.log();
    }
    catch (err) {
        console.log(chalk_1.default.red("\n\u274C Error: ".concat(err.message, "\n")));
    }
}
function slug(text) {
    var slug = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    console.log(chalk_1.default.cyan('\n🔗 URL slug:\n'));
    console.log(chalk_1.default.green("  ".concat(slug, "\n")));
}
function camel(text) {
    var camel = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, function (_, chr) { return chr.toUpperCase(); });
    console.log(chalk_1.default.cyan('\n🐪 camelCase:\n'));
    console.log(chalk_1.default.green("  ".concat(camel, "\n")));
}
function snake(text) {
    var snake = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    console.log(chalk_1.default.cyan('\n🐍 snake_case:\n'));
    console.log(chalk_1.default.green("  ".concat(snake, "\n")));
}
function lint(text, options) {
    if (options === void 0) { options = {}; }
    var format = options.format || 'json';
    if (format === 'json') {
        try {
            JSON.parse(text);
            console.log(chalk_1.default.green('\n✅ Valid JSON\n'));
        }
        catch (err) {
            console.log(chalk_1.default.red("\n\u274C Invalid JSON: ".concat(err.message, "\n")));
        }
    }
    else if (format === 'yaml') {
        console.log(chalk_1.default.yellow('\n⚠️ YAML validation not implemented (needs js-yaml)\n'));
    }
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\"]\\]/g, '\\$&');
}
