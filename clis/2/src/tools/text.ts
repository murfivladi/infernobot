import chalk from 'chalk';
import * as crypto from 'crypto';

export function json(jsonStr: string, options: { minify?: boolean } = {}) {
  try {
    const parsed = JSON.parse(jsonStr);
    
    if (options.minify) {
      console.log(chalk.cyan('\n📄 Minified JSON:\n'));
      console.log(chalk.green(JSON.stringify(parsed)));
    } else {
      console.log(chalk.cyan('\n📄 Formatted JSON:\n'));
      console.log(chalk.green(JSON.stringify(parsed, null, 2)));
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Invalid JSON: ${(err as Error).message}\n`));
  }
}

export function base64(text: string, options: { decode?: boolean } = {}) {
  try {
    if (options.decode) {
      const decoded = Buffer.from(text, 'base64').toString('utf-8');
      console.log(chalk.cyan('\n🔓 Decoded from Base64:\n'));
      console.log(chalk.green(decoded));
    } else {
      const encoded = Buffer.from(text).toString('base64');
      console.log(chalk.cyan('\n🔒 Encoded to Base64:\n'));
      console.log(chalk.green(encoded));
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}

export function url(text: string, options: { decode?: boolean } = {}) {
  try {
    if (options.decode) {
      const decoded = decodeURIComponent(text);
      console.log(chalk.cyan('\n🔓 URL Decoded:\n'));
      console.log(chalk.green(decoded));
    } else {
      const encoded = encodeURIComponent(text);
      console.log(chalk.cyan('\n🔒 URL Encoded:\n'));
      console.log(chalk.green(encoded));
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}

export function uuid(options: { count?: string } = {}) {
  const count = parseInt(options.count || '1');
  console.log(chalk.cyan('\n🆔 Generated UUIDs:\n'));
  for (let i = 0; i < count; i++) {
    console.log(chalk.green(`  ${crypto.randomUUID()}`));
  }
  console.log();
}

export function hashText(text: string, options: { algo?: string } = {}) {
  const algorithm = options.algo || 'sha256';
  const hash = crypto.createHash(algorithm).update(text).digest('hex');
  
  console.log(chalk.cyan(`\n🔐 ${algorithm.toUpperCase()} hash:\n`));
  console.log(chalk.green(`  ${hash}\n`));
}

export function reverse(text: string) {
  const reversed = text.split('').reverse().join('');
  console.log(chalk.cyan('\n🔄 Reversed text:\n'));
  console.log(chalk.green(reversed));
  console.log();
}

export function sort(text: string, options: { reverse?: boolean; numeric?: boolean } = {}) {
  const lines = text.split('\n').filter(l => l.length > 0);
  
  let sorted: string[];
  if (options.numeric) {
    sorted = lines.sort((a, b) => parseFloat(a) - parseFloat(b));
  } else {
    sorted = lines.sort((a, b) => a.localeCompare(b));
  }
  
  if (options.reverse) sorted.reverse();
  
  console.log(chalk.cyan('\n📊 Sorted lines:\n'));
  sorted.forEach(line => console.log(chalk.green(`  ${line}`)));
  console.log();
}

export function count(text: string, options: { substring?: string } = {}) {
  const sub = options.substring || text;
  const regex = new RegExp(escapeRegex(sub), 'gi');
  const matches = text.match(regex);
  const count = matches ? matches.length : 0;
  
  console.log(chalk.cyan('\n🔢 Count results:\n'));
  console.log(chalk.green(`  '${sub}': ${count} occurrences\n`));
}

export function template(templateStr: string, options: { vars?: string } = {}) {
  try {
    const vars = options.vars ? JSON.parse(options.vars) : {};
    let result = templateStr;
    
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    });
    
    console.log(chalk.cyan('\n📝 Template result:\n'));
    console.log(chalk.green(result));
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}

export function slug(text: string) {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  console.log(chalk.cyan('\n🔗 URL slug:\n'));
  console.log(chalk.green(`  ${slug}\n`));
}

export function camel(text: string) {
  const camel = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  
  console.log(chalk.cyan('\n🐪 camelCase:\n'));
  console.log(chalk.green(`  ${camel}\n`));
}

export function snake(text: string) {
  const snake = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  
  console.log(chalk.cyan('\n🐍 snake_case:\n'));
  console.log(chalk.green(`  ${snake}\n`));
}

export function lint(text: string, options: { format?: string } = {}) {
  const format = options.format || 'json';
  
  if (format === 'json') {
    try {
      JSON.parse(text);
      console.log(chalk.green('\n✅ Valid JSON\n'));
    } catch (err) {
      console.log(chalk.red(`\n❌ Invalid JSON: ${(err as Error).message}\n`));
    }
  } else if (format === 'yaml') {
    console.log(chalk.yellow('\n⚠️ YAML validation not implemented (needs js-yaml)\n'));
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\"]\\]/g, '\\$&');
}