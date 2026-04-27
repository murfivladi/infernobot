import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
}

export async function ps(options: { cpu?: boolean; mem?: boolean } = {}) {
  try {
    console.log(chalk.cyan('\n📊 Running processes:\n'));
    
    const sort = options.cpu ? 'pcpu' : options.mem ? 'pmem' : 'pid';
    const { stdout } = await execAsync(`ps aux --sort=-${sort} | head -20`);
    
    const lines = stdout.split('\n');
    const header = lines[0].split(/\t+/).map(h => chalk.yellow(h)).join(chalk.dim(' | '));
    console.log(chalk.dim(header));
    
    for (let i = 1; i < Math.min(lines.length, 15); i++) {
      const cols = lines[i].trim().split(/\t+/);
      if (cols.length >= 11) {
        const pid = chalk.green(cols[1]);
        const cpu = chalk.cyan(cols[2] + '%');
        const mem = chalk.magenta(cols[3] + '%');
        const cmd = cols[10] ? cols[10].substring(0, 50) : cols[10];
        console.log(`  ${pid}  ${cpu}  ${mem}  ${chalk.white(cmd)}`);
      }
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}

export async function top(options: { count?: string } = {}) {
  const count = parseInt(options.count || '10');
  
  try {
    console.log(chalk.cyan(`\n🔥 Top ${count} processes by CPU:\n`));
    
    const { stdout } = await execAsync(`ps aux --sort=-pcpu | head -${count + 1}`);
    const lines = stdout.split('\n');
    
    lines.forEach((line, i) => {
      const cols = line.trim().split(/\t+/);
      if (cols.length >= 11) {
        const pid = chalk.green(cols[1]);
        const cpu = parseFloat(cols[2]) > 80 ? chalk.red(cols[2]) : chalk.cyan(cols[2]);
        const mem = chalk.magenta(cols[3] + '%');
        const cmd = cols[10]?.substring(0, 60) || '';
        console.log(`  ${chalk.bold(pid.padStart(6))}  CPU: ${cpu.padStart(7)}  MEM: ${mem}  ${chalk.white(cmd)}`);
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}

export async function df() {
  try {
    console.log(chalk.cyan('\n💾 Disk usage:\n'));
    
    const { stdout } = await execAsync('df -h | grep -E \"^/|^Filesystem\"');
    const lines = stdout.split('\n');
    
    console.log(chalk.yellow('  Filesystem      Size    Used   Avail  Use%  Mounted'));
    console.log(chalk.gray('  '.repeat(70)));
    
    lines.forEach(line => {
      const cols = line.trim().split(/\t+/);
      if (cols.length >= 6) {
        const fs = chalk.white(cols[0].substring(0, 15).padEnd(15));
        const size = chalk.cyan(cols[1].padEnd(7));
        const used = chalk.yellow(cols[2].padEnd(7));
        const avail = chalk.green(cols[3].padEnd(7));
        const use = parseInt(cols[4]) > 80 ? chalk.red(cols[4]) : chalk.white(cols[4]);
        const mount = chalk.dim(cols[5]);
        console.log(`  ${fs} ${size} ${used} ${avail} ${use} ${mount}`);
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}

export async function du(path = '.', options: { depth?: string } = {}) {
  const depth = options.depth || '1';
  
  try {
    console.log(chalk.cyan(`\n📁 Directory usage for ${path}:\n`));
    
    const { stdout } = await execAsync(`du -h --max-depth=${depth} ${path} | sort -rh | head -20`);
    
    const lines = stdout.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const match = line.match(/^([\/\/\/\/\/\/\/\/\/\/]+)\t(.+)$/);
      if (match) {
        const size = chalk.cyan(match[1].trim());
        const dir = chalk.white(match[2]);
        console.log(`  ${size.padStart(10)}  ${dir}`);
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Error: ${(err as Error).message}\n`));
  }
}

export async function free() {
  const mem = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem()
  };
  
  console.log(chalk.cyan('\n🧠 Memory usage:\n'));
  
  function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }
  
  const usedPct = ((mem.used / mem.total) * 100).toFixed(1);
  const barLen = 30;
  const filled = Math.round((mem.used / mem.total) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  
  console.log(chalk.white(`  RAM:`));
  console.log(chalk.gray(`  [${bar}]`));
  console.log(`  ${chalk.green(formatBytes(mem.free))} free  ${chalk.red(formatBytes(mem.used))} used  ${chalk.cyan(formatBytes(mem.total))} total`);
  console.log(chalk.dim(`  Usage: ${usedPct}%\n`));
  
  // Show top 5 processes by memory
  console.log(chalk.yellow('  Top memory consumers:'));
  try {
    const { stdout } = await execAsync('ps aux --sort=-pmem k %mem | head -6');
    stdout.split('\n').slice(1, 6).forEach(line => {
      const cols = line.trim().split(/\t+/);
      if (cols.length >= 6) {
        console.log(chalk.dim(`    ${cols[3]}% ${cols[10]?.substring(0, 50) || ''}`));
      }
    });
  } catch {}
  console.log();
}

export async function uptime() {
  const uptimeSeconds = os.uptime();
  const formatted = formatUptime(uptimeSeconds);
  
  console.log(chalk.cyan('\n⏰ System uptime:\n'));
  console.log(chalk.bold.green(`  ${formatted}`));
  
  const now = new Date();
  const bootTime = new Date(now.getTime() - uptimeSeconds * 1000);
  console.log(chalk.dim(`  Boot time: ${bootTime.toLocaleString()}\n`));
}

export function whoami() {
  console.log(chalk.cyan('\n👤 Current user:\n'));
  console.log(chalk.bold.green(`  ${os.userInfo().username}`));
  console.log(chalk.dim(`  UID: ${os.userInfo().uid}  GID: ${os.userInfo().gid}\n`));
}

export async function env() {
  const envVars = Object.entries(process.env)
    .filter(([k]) => !k.startsWith('_') && !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD'))
    .sort();
  
  console.log(chalk.cyan('\n🔧 Environment variables:\n'));
  
  const groups: Record<string, string[]> = {};
  envVars.forEach(([key, value]) => {
    const prefix = key.split('_')[0] || 'OTHER';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(`  ${chalk.green(key.padEnd(30))} ${chalk.dim(value || '')}`);
  });
  
  Object.entries(groups).slice(0, 15).forEach(([group, lines]) => {
    console.log(chalk.yellow(`  ${group}:`));
    lines.slice(0, 5).forEach(l => console.log(l));
    if (lines.length > 5) console.log(chalk.dim(`    ... and ${lines.length - 5} more`));
  });
  console.log();
}

export function date() {
  const now = new Date();
  
  console.log(chalk.cyan('\n📅 Current date/time:\n'));
  
  const formats = [
    ['ISO 8601', now.toISOString()],
    ['Local', now.toLocaleString()],
    ['UTC', now.toUTCString()],
    ['Unix (s)', Math.floor(now.getTime() / 1000).toString()],
    ['Unix (ms)', now.getTime().toString()]
  ];
  
  formats.forEach(([label, value]) => {
    console.log(`  ${chalk.yellow(label.padEnd(15))} ${chalk.green(value)}`);
  });
  
  console.log(chalk.dim(`\n  Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`));
}

export async function kill(pidStr: string) {
  const pid = parseInt(pidStr);
  
  try {
    console.log(chalk.cyan(`\n☠️ Killing process ${pid}...\n`));
    
    await execAsync(`kill ${pid}`);
    console.log(chalk.green(`  Process ${pid} terminated\n`));
  } catch (err) {
    console.log(chalk.red(`\n❌ Failed to kill process: ${(err as Error).message}\n`));
  }
}

export async function services() {
  try {
    console.log(chalk.cyan('\n🔧 Running services:\n'));
    
    const { stdout } = await execAsync('systemctl list-units --type=service --state=running 2>/dev/null || ps aux | grep -E \"[s]shd|[n]ginx|[a]pache|[d]ocker\"');
    
    const lines = stdout.split('\n').filter(l => l.trim());
    lines.slice(0, 20).forEach(line => {
      const service = line.split(/\t+/)[0] || line.split(' ')[0];
      if (service && !service.includes('grep')) {
        console.log(chalk.green(`  ✓ ${service}`));
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.yellow('\n  Service listing not available on this system\n'));
  }
}