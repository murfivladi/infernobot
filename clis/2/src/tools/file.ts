import chalk from 'chalk';
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { createHash } from 'crypto';
import * as fs from 'fs';

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

export async function ls(path = '.') {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const table = entries.map(entry => {
      const icon = entry.isDirectory() ? '📁' : '📄';
      const color = entry.isDirectory() ? chalk.blue : chalk.white;
      return { icon, name: color(entry.name), type: entry.isDirectory() ? 'dir' : extname(entry.name) || 'file' };
    });
    
    console.log(chalk.cyan(`\n📂 Contents of ${path}:`));
    console.log(chalk.gray('─'.repeat(50)));
    table.forEach(t => console.log(`  ${t.icon} ${t.name} ${chalk.dim(`[${t.type}]`)}`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow(`  Total: ${entries.length} items\n`));
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function find(pattern: string, options: { dir?: string } = {}) {
  const searchDir = options.dir || process.cwd();
  console.log(chalk.cyan(`\n🔍 Searching for '${pattern}' in ${searchDir}...\n`));
  
  try {
    const results: string[] = [];
    
    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.name.includes(pattern)) {
          results.push(fullPath);
        }
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await walk(fullPath);
        }
      }
    }
    
    await walk(searchDir);
    
    if (results.length === 0) {
      console.log(chalk.yellow('  No matches found'));
    } else {
      results.forEach(r => console.log(chalk.green(`  ✓ ${r}`)));
    }
    console.log(chalk.gray(`\n  Found ${results.length} matches\n`));
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function size(path: string) {
  async function getSize(dir: string): Promise<number> {
    let total = 0;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const s = await stat(fullPath);
      if (s.isDirectory()) {
        total += await getSize(fullPath);
      } else {
        total += s.size;
      }
    }
    return total;
  }
  
  try {
    const s = await stat(path);
    if (s.isDirectory()) {
      const total = await getSize(path);
      console.log(chalk.cyan(`\n📊 Size of ${path}:`));
      console.log(chalk.green(`\n  Total: ${formatSize(total)}\n`));
    } else {
      console.log(chalk.cyan(`\n📊 Size of ${path}:`));
      console.log(chalk.green(`\n  ${formatSize(s.size)}\n`));
    }
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function tree(path = '.', options: { depth?: string } = {}) {
  const maxDepth = parseInt(options.depth || '3');
  
  async function printTree(dir: string, prefix = '', depth = 0) {
    if (depth >= maxDepth) return;
    
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const icon = entry.isDirectory() ? '📁' : '📄';
      const color = entry.isDirectory() ? chalk.blue : chalk.white;
      
      console.log(prefix + connector + icon + ' ' + color(entry.name));
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        await printTree(join(dir, entry.name), newPrefix, depth + 1);
      }
    }
  }
  
  try {
    console.log(chalk.cyan(`\n🌳 Directory tree: ${path}\n`));
    console.log(chalk.bold('📂 ' + path));
    await printTree(path, '', 0);
    console.log();
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function watch(path: string) {
  console.log(chalk.cyan(`\n👀 Watching ${path} for changes...\n`));
  console.log(chalk.yellow('Press Ctrl+C to stop\n'));
  
  const watcher = fs.watch(path, { recursive: true }, (eventType, filename) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.green(`[${timestamp}] ${eventType}: ${filename}`));
  });
  
  process.on('SIGINT', () => {
    watcher.close();
    console.log(chalk.red('\n\n👋 Stopped watching\n'));
    process.exit();
  });
}

export async function hash(path: string, options: { algo?: string } = {}) {
  const algorithm = options.algo || 'sha256';
  
  try {
    const content = await readFile(path);
    const hashSum = createHash(algorithm).update(content).digest('hex');
    
    console.log(chalk.cyan(`\n🔐 ${algorithm.toUpperCase()} hash of ${path}:`));
    console.log(chalk.green(`\n  ${hashSum}\n`));
    
    console.log(chalk.dim(`  Algorithm: ${algorithm}`));
    console.log(chalk.dim(`  Size: ${formatSize(content.length)}\n`));
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function diff(file1: string, file2: string) {
  try {
    console.log(chalk.cyan(`\n📊 Comparing ${file1} vs ${file2}\n`));
    
    const content1 = await readFile(file1, 'utf-8');
    const content2 = await readFile(file2, 'utf-8');
    
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    let same = 0, different = 0;
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      if (lines1[i] === lines2[i]) {
        same++;
      } else {
        different++;
        const l1 = lines1[i] || '(empty)';
        const l2 = lines2[i] || '(empty)';
        console.log(chalk.yellow(`  Line ${i + 1}:`));
        console.log(chalk.red(`    - ${l1}`));
        console.log(chalk.green(`    + ${l2}`));
      }
    }
    
    console.log(chalk.cyan(`\n  Summary: ${chalk.green(same)} same, ${chalk.red(different)} different\n`));
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function info(path: string) {
  try {
    const s = await stat(path);
    console.log(chalk.cyan(`\n📋 Info: ${path}\n`));
    console.log(chalk.bold('  File Statistics:'));
    console.log(chalk.dim(`    Size: ${formatSize(s.size)}`));
    console.log(chalk.dim(`    Created: ${s.birthtime.toLocaleString()}`));
    console.log(chalk.dim(`    Modified: ${s.mtime.toLocaleString()}`));
    console.log(chalk.dim(`    Accessed: ${s.atime.toLocaleString()}`));
    console.log(chalk.dim(`    Mode: ${s.mode.toString(8)}`));
    console.log(chalk.dim(`    Is Directory: ${s.isDirectory()}`));
    console.log(chalk.dim(`    Is File: ${s.isFile()}`));
    console.log();
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function mime(path: string) {
  try {
    const ext = extname(path).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain', '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
      '.json': 'application/json', '.xml': 'application/xml', '.pdf': 'application/pdf',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.zip': 'application/zip',
      '.ts': 'text/typescript', '.tsx': 'text/tsx', '.py': 'text/python',
      '.go': 'text/x-go', '.rs': 'text/x-rust', '.java': 'text/x-java'
    };
    
    console.log(chalk.cyan(`\n🎯 MIME type for ${path}:`));
    console.log(chalk.green(`\n  ${mimeTypes[ext] || 'application/octet-stream'}\n`));
    console.log(chalk.dim(`  Extension: ${ext || 'none'}\n`));
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}

export async function wc(path: string) {
  try {
    const content = await readFile(path, 'utf-8');
    const lines = content.split('\n');
    const words = content.split(/\\s+/).filter(w => w.length > 0);
    const chars = content.length;
    
    console.log(chalk.cyan(`\n📊 Statistics for ${path}:`));
    console.log(chalk.green(`\n  Lines: ${chalk.bold(lines.length.toString())}`));
    console.log(chalk.green(`  Words: ${chalk.bold(words.length.toString())}`));
    console.log(chalk.green(`  Chars: ${chalk.bold(chars.toString())}\n`));
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${(err as Error).message}`));
  }
}