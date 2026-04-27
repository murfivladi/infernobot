# 🔥 Inferno CLI

A powerful CLI with 100+ developer tools built with TypeScript, Commander.js, and Chalk.

## Features

### 📁 File Tools
- `ls` - List directory contents
- `find` - Find files by pattern
- `size` - Show file/directory sizes
- `tree` - Display directory tree
- `watch` - Watch file for changes
- `hash` - Calculate file hash (md5, sha1, sha256)
- `diff` - Compare two files
- `info` - Show file info
- `mime` - Show MIME type
- `wc` - Count lines, words, chars

### 📝 Text Tools
- `json` - Format/validate JSON
- `base64` - Encode/decode base64
- `url` - Encode/decode URL
- `uuid` - Generate UUIDs
- `hash` - Hash text
- `reverse` - Reverse text
- `sort` - Sort lines
- `count` - Count occurrences
- `template` - Process templates
- `slug` - Convert to URL slug
- `camel` - Convert to camelCase
- `snake` - Convert to snake_case
- `lint` - Lint JSON/YAML

### 🔐 Crypto Tools
- `gen-password` - Generate secure passwords
- `gen-key` - Generate random keys
- `encrypt` - Encrypt text (AES)
- `decrypt` - Decrypt text
- `hmac` - Calculate HMAC
- `otp` - Generate TOTP codes

### 🌐 Network Tools
- `ping` - Ping a host
- `dns` - DNS lookup
- `http` - HTTP requests
- `port` - Check if port is open
- `ip` - Show public IP
- `headers` - Show HTTP headers
- `speed` - Test internet speed

### 💻 System Tools
- `ps` - List processes
- `top` - Top processes by CPU
- `df` - Disk usage
- `du` - Directory space usage
- `free` - Memory usage
- `uptime` - System uptime
- `whoami` - Current user
- `env` - Environment variables
- `date` - Current date/time
- `kill` - Kill a process
- `services` - List services

### 📦 Git Tools
- `log` - Show recent commits
- `status` - Git status summary
- `branches` - List branches
- `stash-list` - List stashed changes
- `untracked` - Show untracked files
- `conflicts` - Show files with conflicts

### 🐳 Docker Tools
- `ps` - List containers
- `images` - List Docker images
- `logs` - Show container logs
- `stats` - Container stats
- `clean` - Clean up Docker

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Run with node
node dist/index.js <command>

# Or link globally
npm link
inferno <command>
```

## Examples

```bash
# JSON formatting
inferno text json '{\"hello\":\"world\"}'

# Generate password
inferno crypto gen-password -l 24 -s

# List files
inferno file ls ./src

# System info
inferno sys free
inferno sys date

# Git status
inferno git status

# Docker containers
inferno docker ps -a
```

## License

MIT