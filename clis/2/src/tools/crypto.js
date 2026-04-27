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
exports.genPassword = genPassword;
exports.genKey = genKey;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.hmac = hmac;
exports.otp = otp;
var chalk_1 = require("chalk");
var crypto_1 = require("crypto");
function genPassword(options) {
    if (options === void 0) { options = {}; }
    var length = parseInt(options.length || '16');
    var useSpecial = options.special || false;
    var lowercase = 'abcdefghijklmnopqrstuvwxyz';
    var uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var numbers = '0123456789';
    var specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    var chars = lowercase + uppercase + numbers;
    if (useSpecial)
        chars += specialChars;
    var password = '';
    for (var i = 0; i < length; i++) {
        password += chars[crypto_1.default.randomInt(chars.length)];
    }
    console.log(chalk_1.default.cyan('\n🔐 Generated password:\n'));
    console.log(chalk_1.default.bold.bgBlue("  ".concat(password)));
    console.log(chalk_1.default.dim("\n  Length: ".concat(length, " | Special: ").concat(useSpecial ? 'yes' : 'no', "\n")));
    // Strength indicator
    var strength = getStrength(password);
    console.log(chalk_1.default.cyan("  Strength: ") + strength);
    console.log();
}
function getStrength(pwd) {
    var score = 0;
    if (pwd.length >= 8)
        score++;
    if (pwd.length >= 12)
        score++;
    if (pwd.length >= 16)
        score++;
    if (/[A-Z]/.test(pwd))
        score++;
    if (/[a-z]/.test(pwd))
        score++;
    if (/[0-9]/.test(pwd))
        score++;
    if (/[^A-Za-z0-9]/.test(pwd))
        score++;
    if (score <= 2)
        return chalk_1.default.red('Weak');
    if (score <= 4)
        return chalk_1.default.yellow('Medium');
    if (score <= 5)
        return chalk_1.default.green('Strong');
    return chalk_1.default.green.bold('Very Strong');
}
function genKey(bitsStr, options) {
    if (options === void 0) { options = {}; }
    var bits = parseInt(bitsStr || '256');
    var format = options.format || 'hex';
    var bytes = bits / 8;
    var buffer = crypto_1.default.randomBytes(bytes);
    var key;
    if (format === 'base64') {
        key = buffer.toString('base64');
    }
    else {
        key = buffer.toString('hex');
    }
    console.log(chalk_1.default.cyan("\n\uD83D\uDD11 Generated ".concat(bits, "-bit key:\n")));
    console.log(chalk_1.default.green("  ".concat(key)));
    console.log(chalk_1.default.dim("\n  Format: ".concat(format, " | Length: ").concat(key.length, " chars\n")));
}
function encrypt(text, options) {
    if (options === void 0) { options = {}; }
    var key = options.key || crypto_1.default.randomBytes(32).toString('hex');
    var iv = crypto_1.default.randomBytes(16);
    var cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(key.slice(0, 64), 'hex'), iv);
    var encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    console.log(chalk_1.default.cyan('\n🔒 Encrypted text:\n'));
    console.log(chalk_1.default.green("  ".concat(encrypted)));
    console.log(chalk_1.default.dim("\n  Key: ".concat(key, "\n  IV: ").concat(iv.toString('hex'), "\n")));
}
function decrypt(text, options) {
    if (options === void 0) { options = {}; }
    if (!options.key) {
        console.log(chalk_1.default.red('\n❌ Encryption key required (-k, --key)\n'));
        return;
    }
    try {
        var iv = crypto_1.default.randomBytes(16); // In real scenario, you'd need to store IV
        var decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(options.key.slice(0, 64), 'hex'), iv);
        var decrypted = decipher.update(text, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.log(chalk_1.default.cyan('\n🔓 Decrypted text:\n'));
        console.log(chalk_1.default.green("  ".concat(decrypted, "\n")));
    }
    catch (err) {
        console.log(chalk_1.default.red("\n\u274C Decryption failed: ".concat(err.message, "\n")));
    }
}
function hmac(text, options) {
    if (options === void 0) { options = {}; }
    var key = options.key || 'default-secret';
    var algo = options.algo || 'sha256';
    var hmac = crypto_1.default.createHmac(algo, key).update(text).digest('hex');
    console.log(chalk_1.default.cyan("\n\uD83D\uDD10 HMAC-".concat(algo.toUpperCase(), ":\n")));
    console.log(chalk_1.default.green("  ".concat(hmac)));
    console.log(chalk_1.default.dim("\n  Key: ".concat(key, "\n")));
}
function otp(secret) {
    return __awaiter(this, void 0, void 0, function () {
        var time, secretBytes, hmac_1, offset, code;
        return __generator(this, function (_a) {
            try {
                time = Math.floor(Date.now() / 30000);
                secretBytes = Buffer.from(secret);
                hmac_1 = crypto_1.default.createHmac('sha1', secretBytes)
                    .update(Buffer.from(time.toString()))
                    .digest();
                offset = hmac_1[hmac_1.length - 1] & 0xf;
                code = (((hmac_1[offset] & 0x7f) << 24) |
                    ((hmac_1[offset + 1] & 0xff) << 16) |
                    ((hmac_1[offset + 2] & 0xff) << 8) |
                    (hmac_1[offset + 3] & 0xff)) % 1000000;
                console.log(chalk_1.default.cyan('\n🔐 TOTP Code:\n'));
                console.log(chalk_1.default.bold.bgGreen("  ".concat(code.toString().padStart(6, '0'))));
                console.log(chalk_1.default.dim("\n  Valid for 30 seconds\n"));
            }
            catch (err) {
                console.log(chalk_1.default.red("\n\u274C Error: ".concat(err.message, "\n")));
            }
            return [2 /*return*/];
        });
    });
}
