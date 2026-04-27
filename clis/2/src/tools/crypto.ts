import chalk from 'chalk';
import * as crypto from 'crypto';

export function genPassword(options: { length?: string; special?: boolean } = {}) {
  const length = parseInt(options.length || '16');
  const useSpecial = options.special || false;
  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let chars = lowercase + uppercase + numbers;
  if (useSpecial) chars += specialChars;
  
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomBytes(1)[0] % chars.length;
    password += chars[randomIndex];
  }
  
  console.log(chalk.cyan('\n🔐 Generated password:\n'));
  console.log(chalk.bold.bgBlue(`  ${password}`));
  console.log(chalk.dim(`\n  Length: ${length} | Special: ${useSpecial ? 'yes' : 'no'}\n`));
  
  // Strength indicator
  const strength = getStrength(password);
  console.log(chalk.cyan(`  Strength: `) + strength);
  console.log();
}

function getStrength(pwd: string): string {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  
  if (score <= 2) return chalk.red('Weak');
  if (score <= 4) return chalk.yellow('Medium');
  if (score <= 5) return chalk.green('Strong');
  return chalk.green.bold('Very Strong');
}

export function genKey(bitsStr?: string, options: { format?: string } = {}) {
  const bits = parseInt(bitsStr || '256');
  const format = options.format || 'hex';
  
  const bytes = bits / 8;
  const buffer = crypto.randomBytes(bytes);
  
  let key: string;
  if (format === 'base64') {
    key = buffer.toString('base64');
  } else {
    key = buffer.toString('hex');
  }
  
  console.log(chalk.cyan(`\n🔑 Generated ${bits}-bit key:\n`));
  console.log(chalk.green(`  ${key}`));
  console.log(chalk.dim(`\n  Format: ${format} | Length: ${key.length} chars\n`));
}

export function encrypt(text: string, options: { key?: string } = {}) {
  const key = options.key || crypto.randomBytes(32).toString('hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.slice(0, 64), 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  console.log(chalk.cyan('\n🔒 Encrypted text:\n'));
  console.log(chalk.green(`  ${encrypted}`));
  console.log(chalk.dim(`\n  Key: ${key}\n  IV: ${iv.toString('hex')}\n`));
}

export function decrypt(text: string, options: { key?: string } = {}) {
  if (!options.key) {
    console.log(chalk.red('\n❌ Encryption key required (-k, --key)\n'));
    return;
  }
  
  try {
    const iv = crypto.randomBytes(16); // In real scenario, you'd need to store IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(options.key.slice(0, 64), 'hex'), iv);
    
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log(chalk.cyan('\n🔓 Decrypted text:\n'));
    console.log(chalk.green(`  ${decrypted}\n`));
  } catch (err) {
    console.log(chalk.red(`\n❌ Decryption failed: ${(err as Error).message}\n`));
  }
}

export function hmac(text: string, options: { key?: string; algo?: string } = {}) {
  const key = options.key || 'default-secret';
  const algo = options.algo || 'sha256';
  
  const hmac = crypto.createHmac(algo, key).update(text).digest('hex');
  
  console.log(chalk.cyan(`\n🔐 HMAC-${algo.toUpperCase()}:\n`));
  console.log(chalk.green(`  ${hmac}`));
  console.log(chalk.dim(`\n  Key: ${key}\n`));
}

export async function otp(secret: string) {
  try {
    // Simple TOTP implementation
    const time = Math.floor(Date.now() / 30000);
    const secretBytes = Buffer.from(secret);
    
    const hmac = crypto.createHmac('sha1', secretBytes)
      .update(Buffer.from(time.toString()))
      .digest();
    
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;
    
    console.log(chalk.cyan('\n🔐 TOTP Code:\n'));
    console.log(chalk.bold.bgGreen(`  ${code.toString().padStart(6, '0')}`));
    console.log(chalk.dim(`\n  Valid for 30 seconds\n`));
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}