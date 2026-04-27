import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function ping(host: string, options: { count?: string } = {}) {
  const count = options.count || '4';
  
  try {
    console.log(chalk.cyan(`\n📡 Pinging ${host}...\n`));
    
    const { stdout } = await execAsync(`ping -c ${count} ${host}`);
    
    const lines = stdout.split('\n');
    lines.forEach(line => {
      if (line.includes('time=')) {
        const timeMatch = line.match(/time=([\/\\.]+)/);
        if (timeMatch) {
          console.log(chalk.green(`  ✓ ${line.trim()}`));
        }
      } else if (line.includes('rtt') || line.includes('avg')) {
        console.log(chalk.yellow(`  ${line.trim()}`));
      }
    });
    
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Ping failed: ${(err as Error).message}\n`));
  }
}

export async function dns(domain: string, options: { type?: string } = {}) {
  const recordType = options.type || 'A';
  
  try {
    console.log(chalk.cyan(`\n🔍 DNS lookup for ${domain} (${recordType})\n`));
    
    const { stdout } = await execAsync(`dig +short ${domain} ${recordType}`);
    
    const records = stdout.trim().split('\n').filter(r => r.length > 0);
    
    if (records.length === 0) {
      console.log(chalk.yellow('  No records found'));
    } else {
      records.forEach(record => {
        console.log(chalk.green(`  ✓ ${record}`));
      });
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ DNS lookup failed: ${(err as Error).message}\n`));
  }
}

export async function http(url: string, options: { method?: string; headers?: string; data?: string } = {}) {
  const method = options.method || 'GET';
  
  try {
    console.log(chalk.cyan(`\n🌐 ${method} ${url}\n`));
    
    const curlCmd = `curl -s -X ${method} -w '\\n{status: %{http_code}, time: %{time_total}s}' '${url}'`;
    const { stdout } = await execAsync(curlCmd);
    
    const statusMatch = stdout.match(/status: (\d+)/);
    const timeMatch = stdout.match(/time: ([\d.]+)s/);
    if (statusMatch) {
      console.log(chalk.green(`  Status: ${statusMatch[1]}`));
    }
    if (timeMatch) {
      console.log(chalk.green(`  Time: ${timeMatch[1]}s`));
    }
    
    console.log(chalk.gray('  Response:'));
    console.log(chalk.white(stdout.slice(0, 500) + (stdout.length > 500 ? '...' : '')));
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ HTTP request failed: ${(err as Error).message}\n`));
  }
}

export async function port(portStr: string, options: { host?: string } = {}) {
  const host = options.host || 'localhost';
  
  try {
    console.log(chalk.cyan(`\n🔌 Checking port ${portStr} on ${host}...\n`));
    
    const { stdout } = await execAsync(`nc -zv ${host} ${portStr} 2>&1`);
    
    if (stdout.includes('succeeded') || stdout.includes('open')) {
      console.log(chalk.green(`  ✓ Port ${portStr} is OPEN`));
    } else {
      console.log(chalk.red(`  ✗ Port ${portStr} is CLOSED`));
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Port check failed\n`));
  }
}

export async function myip() {
  try {
    console.log(chalk.cyan('\n🌍 Your public IP address:\n'));
    
    const { stdout } = await execAsync('curl -s ifconfig.me');
    console.log(chalk.bold.green(`  ${stdout.trim()}\n`));
  } catch (err) {
    console.log(chalk.red(`\n❌ Could not determine IP: ${(err as Error).message}\n`));
  }
}

export async function headers(url: string) {
  try {
    console.log(chalk.cyan(`\n📋 HTTP Headers for ${url}:\n`));
    
    const { stdout } = await execAsync(`curl -sI '${url}'`);
    
    stdout.split('\n').forEach(line => {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        console.log(chalk.green(`  ${key.trim()}:`) + chalk.white(valueParts.join(':').trim()));
      } else if (line.trim()) {
        console.log(chalk.dim(`  ${line.trim()}`));
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Failed to get headers: ${(err as Error).message}\n`));
  }
}

export async function speed() {
  console.log(chalk.cyan('\n⚡ Testing internet speed...\n'));
  
  try {
    const start = Date.now();
    await execAsync('curl -s https://speed.cloudflare.com/__down?bytes=10000000 -o /dev/null');
    const end = Date.now();
    
    const duration = (end - start) / 1000;
    const speedMbps = (10 / duration * 8).toFixed(2);
    
    console.log(chalk.green(`  Download speed: ~${speedMbps} Mbps`));
    console.log(chalk.dim(`  Downloaded: 10 MB in ${duration.toFixed(2)}s\n`));
  } catch (err) {
    console.log(chalk.red(`\n❌ Speed test failed: ${(err as Error).message}\n`));
  }
}