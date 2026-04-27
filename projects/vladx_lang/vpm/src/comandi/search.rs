use colored::*;
use crate::{config, registry::{RegistryClient, stampa_pacchetto}};

pub fn esegui(query: &str) {
    let cfg = config::carica();
    let client = RegistryClient::nuovo(cfg.registry, cfg.token);

    println!("{} Ricerca '{}' nel registry...\n", "🔍".cyan(), query.bold());

    match client.cerca(query) {
        Err(e) => eprintln!("{} {}", "✗".red(), e),
        Ok(risultati) => {
            if risultati.is_empty() {
                println!("{}", "Nessun pacchetto trovato.".dimmed());
            } else {
                println!("{} {} pacchetto/i trovato/i:\n", "✓".green(), risultati.len());
                for p in &risultati {
                    stampa_pacchetto(p);
                }
            }
        }
    }
}
