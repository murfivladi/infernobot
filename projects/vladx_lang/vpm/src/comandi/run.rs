use colored::*;
use std::process::Command;
use crate::manifest;

pub fn esegui(script: &str) {
    let m = match manifest::carica() {
        Ok(m) => m,
        Err(e) => { eprintln!("{} {}", "✗".red(), e); return; }
    };

    match m.script.get(script) {
        None => {
            eprintln!("{} Script '{}' non trovato in vladx.json", "✗".red(), script);
            if !m.script.is_empty() {
                println!("\n{}", "Script disponibili:".bold());
                for (nome, cmd) in &m.script {
                    println!("  {} {}", nome.cyan(), format!("→ {cmd}").dimmed());
                }
            }
        }
        Some(cmd) => {
            println!("{} {}\n", "▶".cyan().bold(), cmd.dimmed());
            let status = Command::new("sh")
                .arg("-c")
                .arg(cmd)
                .status();
            match status {
                Ok(s) if !s.success() => std::process::exit(s.code().unwrap_or(1)),
                Err(e) => eprintln!("{} {}", "✗".red(), e),
                _ => {}
            }
        }
    }
}
