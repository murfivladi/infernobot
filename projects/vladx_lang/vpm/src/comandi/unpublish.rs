use colored::*;
use std::io::{self, Write};
use crate::{config, manifest, registry::RegistryClient};

pub fn esegui(pacchetto: &str) {
    let cfg = config::carica();
    if cfg.token.is_none() {
        eprintln!("{} Devi fare login prima: {}", "✗".red(), "vpm auth login".cyan());
        return;
    }

    let (nome, versione) = if let Some((n, v)) = pacchetto.split_once('@') {
        (n.to_string(), v.to_string())
    } else {
        // usa versione dal manifest
        match manifest::carica() {
            Ok(m) if m.nome == pacchetto || pacchetto.is_empty() => (m.nome, m.versione),
            _ => {
                eprintln!("{} Specifica versione: vpm unpublish {}@versione", "✗".red(), pacchetto);
                return;
            }
        }
    };

    print!("Rimuovere {} v{} dal registry? [s/N]: ", nome.cyan(), versione.yellow());
    io::stdout().flush().ok();
    let mut input = String::new();
    io::stdin().read_line(&mut input).ok();
    if !matches!(input.trim().to_lowercase().as_str(), "s" | "si" | "sì" | "y" | "yes") {
        println!("{}", "Annullato.".dimmed());
        return;
    }

    let client = RegistryClient::nuovo(cfg.registry, cfg.token);
    match client.rimuovi_pubblicazione(&nome, &versione) {
        Ok(_) => println!("{} {} v{} rimosso dal registry", "✓".green().bold(), nome.cyan(), versione.yellow()),
        Err(e) => eprintln!("{} {}", "✗ Errore:".red().bold(), e),
    }
}
