use colored::*;
use std::io::{self, Write};
use crate::config::{Config, config_path, salva};

pub fn esegui() {
    println!("{}", "\n⚙  Configurazione vpm\n".cyan().bold());

    let attuale = crate::config::carica();

    let registry = chiedi(
        "URL registry",
        &attuale.registry,
    );

    let cfg = Config {
        registry,
        token: attuale.token,
        utente: attuale.utente,
    };

    salva(&cfg);

    println!("\n{} Configurazione salvata in {}", "✓".green().bold(), config_path().display().to_string().dimmed());
    println!("  {} {}", "registry:".dimmed(), cfg.registry.cyan());
}

fn chiedi(domanda: &str, default: &str) -> String {
    print!("{} {}: ", domanda.bold(), format!("({default})").dimmed());
    io::stdout().flush().ok();
    let mut input = String::new();
    io::stdin().read_line(&mut input).ok();
    let input = input.trim().to_string();
    if input.is_empty() { default.to_string() } else { input }
}
