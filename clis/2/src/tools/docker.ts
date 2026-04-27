import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function ps(options: { all?: boolean } = {}) {
  try {
    console.log(chalk.cyan('\n🐳 Docker containers:\n'));
    
    const flags = options.all ? '-a' : '';
    const { stdout } = await execAsync(`docker ps ${flags} --format \"table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}\\t{{.Names}}\"`);
    
    const lines = stdout.split('\n');
    console.log(chalk.yellow('  ID           Image          Status          Ports          Names'));
    console.log(chalk.gray('  '.repeat(85)));
    
    lines.slice(1).forEach(line => {
      const cols = line.split('\t');
      if (cols.length >= 5) {
        const id = chalk.green(cols[0]?.substring(0, 12) || '');
        const image = chalk.cyan(cols[1] || '');
        const status = cols[2]?.includes('Up') ? chalk.green(cols[2]) : chalk.yellow(cols[2] || '');
        const ports = chalk.dim(cols[3] || '-');
        const name = chalk.white(cols[4] || '');
        
        console.log(`  ${id.padEnd(12)} ${image.padEnd(15)} ${status.padEnd(15)} ${ports.padEnd(13)} ${name}`);
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Docker error: ${(err as Error).message}\n`));
  }
}

export async function images() {
  try {
    console.log(chalk.cyan('\n📦 Docker images:\n'));
    
    const { stdout } = await execAsync('docker images --format \"table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}\"');
    
    const lines = stdout.split('\n');
    console.log(chalk.yellow('  Repository        Tag          Size      Created'));
    console.log(chalk.gray('  '.repeat(70)));
    
    lines.slice(1).forEach(line => {
      const cols = line.split('\t');
      if (cols.length >= 4) {
        const repo = chalk.cyan(cols[0] || '');
        const tag = cols[1] === '<none>' ? chalk.gray(cols[1]) : chalk.green(cols[1] || '');
        const size = chalk.yellow(cols[2] || '');
        const created = chalk.dim(cols[3]?.substring(0, 20) || '');
        
        console.log(`  ${repo.padEnd(18)} ${tag.padEnd(12)} ${size.padEnd(10)} ${created}`);
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Docker error: ${(err as Error).message}\n`));
  }
}

export async function logs(id: string, options: { follow?: boolean; lines?: string } = {}) {
  try {
    console.log(chalk.cyan(`\n📜 Container logs: ${id}\n`));
    
    const follow = options.follow ? '-f' : '';
    const num = options.lines || '50';
    
    const { stdout, stderr } = await execAsync(`docker logs ${follow} --tail ${num} ${id} 2>&1`);
    
    const output = stdout || stderr;
    output.split('\n').slice(-parseInt(num)).forEach(line => {
      if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
        console.log(chalk.red(`  ${line}`));
      } else if (line.includes('warn') || line.includes('Warn')) {
        console.log(chalk.yellow(`  ${line}`));
      } else {
        console.log(chalk.white(`  ${line}`));
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Docker error: ${(err as Error).message}\n`));
  }
}

export async function stats() {
  try {
    console.log(chalk.cyan('\n📊 Container stats:\n'));
    
    const { stdout } = await execAsync('docker stats --no-stream --format \"table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.BlockIO}}\"');
    
    const lines = stdout.split('\n');
    console.log(chalk.yellow('  Name          CPU%     MEM Usage     NET IO      Block IO'));
    console.log(chalk.gray('  '.repeat(80)));
    
    lines.slice(1).forEach(line => {
      const cols = line.split('\t');
      if (cols.length >= 5) {
        const name = chalk.cyan(cols[0] || '');
        const cpu = parseFloat(cols[1]) > 80 ? chalk.red(cols[1]) : chalk.white(cols[1] || '');
        const mem = chalk.white(cols[2] || '');
        const net = chalk.dim(cols[3] || '');
        const block = chalk.dim(cols[4] || '');
        
        console.log(`  ${name.padEnd(14)} ${cpu.padEnd(10)} ${mem.padEnd(15)} ${net.padEnd(12)} ${block}`);
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Docker error: ${(err as Error).message}\n`));
  }
}

export async function clean(options: { all?: boolean } = {}) {
  const all = options.all || false;
  
  try {
    console.log(chalk.cyan('\n🧹 Cleaning Docker...\n'));
    
    // Stop containers
    const { stdout: psOut } = await execAsync('docker ps -q').catch(() => ({ stdout: '' }));
    if (psOut.trim()) {
      console.log(chalk.yellow('  Stopping containers...'));
      await execAsync('docker stop $(docker ps -q)').catch(() => {});
    }
    
    // Prune containers
    console.log(chalk.dim('  Removing stopped containers...'));
    await execAsync('docker container prune -f').catch(() => {});
    
    // Prune images
    console.log(chalk.dim('  Removing dangling images...'));
    await execAsync('docker image prune -f').catch(() => {});
    
    if (all) {
      // Remove all unused images
      console.log(chalk.dim('  Removing unused images...'));
      await execAsync('docker image prune -a -f').catch(() => {});
      
      // Prune volumes
      console.log(chalk.dim('  Removing unused volumes...'));
      await execAsync('docker volume prune -f').catch(() => {});
      
      // Prune networks
      console.log(chalk.dim('  Removing unused networks...'));
      await execAsync('docker network prune -f').catch(() => {});
    }
    
    console.log(chalk.green('\n  ✓ Docker cleaned successfully\n'));
  } catch (err) {
    console.log(chalk.red(`\n❌ Docker error: ${(err as Error).message}\n`));
  }
}