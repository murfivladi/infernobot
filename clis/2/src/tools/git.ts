import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function log(countStr?: string) {
  const count = parseInt(countStr || '10');
  
  try {
    console.log(chalk.cyan(`\n📜 Recent ${count} commits:\n`));
    
    const { stdout } = await execAsync(`git log --oneline --graph --decorate -n ${count}`);
    
    stdout.split('\n').forEach(line => {
      if (line.includes('*')) {
        console.log(chalk.green(line));
      } else {
        console.log(chalk.gray(line));
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Not a git repository or error: ${(err as Error).message}\n`));
  }
}

export async function status() {
  try {
    console.log(chalk.cyan('\n📊 Git status:\n'));
    
    const { stdout } = await execAsync('git status --short');
    const lines = stdout.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
      console.log(chalk.green('  ✓ Working tree clean'));
    } else {
      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];
      
      lines.forEach(line => {
        const status = line.substring(0, 2).trim();
        const file = line.substring(3);
        
        if (status.includes('M') && !status.includes('?')) {
          modified.push(file);
        } else if (status.includes('?')) {
          untracked.push(file);
        } else {
          staged.push(file);
        }
      });
      
      if (staged.length > 0) {
        console.log(chalk.green(`  Staged (${staged.length}):`));
        staged.forEach(f => console.log(chalk.dim(`    + ${f}`)));
      }
      
      if (modified.length > 0) {
        console.log(chalk.yellow(`  Modified (${modified.length}):`));
        modified.forEach(f => console.log(chalk.dim(`    ~ ${f}`)));
      }
      
      if (untracked.length > 0) {
        console.log(chalk.gray(`  Untracked (${untracked.length}):`));
        untracked.forEach(f => console.log(chalk.dim(`    ? ${f}`)));
      }
    }
    
    // Branch info
    const branch = await execAsync('git branch --show-current').catch(() => ({ stdout: '' }));
    if (branch.stdout.trim()) {
      console.log(chalk.cyan(`\n  Current branch: ${chalk.bold(branch.stdout.trim())}`));
    }
    
    // Ahead/behind
    const tracking = await execAsync('git rev-list --left-right --count HEAD...@{upstream}').catch(() => ({ stdout: '' }));
    if (tracking.stdout.trim()) {
      const [ahead, behind] = tracking.stdout.trim().split('\t');
      if (ahead !== '0') console.log(chalk.green(`  ↑ ${ahead} ahead`));
      if (behind !== '0') console.log(chalk.red(`  ↓ ${behind} behind`));
    }
    
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Git error: ${(err as Error).message}\n`));
  }
}

export async function branches() {
  try {
    console.log(chalk.cyan('\n🌿 Git branches:\n'));
    
    const current = (await execAsync('git branch --show-current')).stdout.trim();
    const { stdout } = await execAsync('git for-each-ref --sort=-committerdate refs/heads/ --format=\"| %(refname:short) | %(committerdate:short) | %(subject) | %(commitauthorname) |\"| column -t -s \"|\"');
    
    console.log(chalk.yellow('  Branch              Date       Subject                        Author'));
    console.log(chalk.gray('  '.repeat(80)));
    
    stdout.split('\n').forEach(line => {
      const parts = line.trim().split(/\t+/);
      if (parts.length >= 4) {
        const isCurrent = parts[0].trim() === current;
        const branchName = isCurrent ? chalk.green('* ' + parts[0].trim()) : chalk.white('  ' + parts[0].trim());
        console.log(`  ${branchName.padEnd(20)} ${parts[1].padEnd(10)} ${parts[2].substring(0, 30).padEnd(30)} ${parts[3]}`);
      }
    });
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Git error: ${(err as Error).message}\n`));
  }
}

export async function stashList() {
  try {
    console.log(chalk.cyan('\n📦 Stashed changes:\n'));
    
    const { stdout } = await execAsync('git stash list');
    const lines = stdout.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
      console.log(chalk.yellow('  No stashed changes'));
    } else {
      lines.forEach(line => {
        const match = line.match(/stash@{(\/d+)}: (.+)/);
        if (match) {
          console.log(chalk.green(`  ${match[1]} ${match[2]}`));
        } else {
          console.log(chalk.green(`  ${line}`));
        }
      });
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Git error: ${(err as Error).message}\n`));
  }
}

export async function untracked() {
  try {
    console.log(chalk.cyan('\n❓ Untracked files:\n'));
    
    const { stdout } = await execAsync('git ls-files --others --exclude-standard');
    const lines = stdout.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
      console.log(chalk.green('  ✓ No untracked files'));
    } else {
      console.log(chalk.gray(`  Found ${lines.length} untracked file(s):\n`));
      lines.forEach(file => {
        const ext = file.split('.').pop() || '';
        const icon = ['ts', 'js', 'tsx', 'jsx'].includes(ext) ? '📄' :
                     ['json', 'yml', 'yaml'].includes(ext) ? '📋' :
                     ['md', 'txt'].includes(ext) ? '📝' : '📄';
        console.log(chalk.gray(`  ${icon} ${file}`));
      });
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\n❌ Git error: ${(err as Error).message}\n`));
  }
}

export async function conflicts() {
  try {
    console.log(chalk.cyan('\n⚠️ Files with conflicts:\n'));
    
    const { stdout } = await execAsync('git diff --name-only --diff-filter=U');
    const lines = stdout.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
      console.log(chalk.green('  ✓ No conflicts'));
    } else {
      lines.forEach(file => {
        console.log(chalk.red(`  ⚠ ${file}`));
      });
      console.log(chalk.yellow(`\n  ${lines.length} file(s) need resolution\n`));
    }
  } catch (err) {
    console.log(chalk.red(`\n❌ Git error: ${(err as Error).message}\n`));
  }
}