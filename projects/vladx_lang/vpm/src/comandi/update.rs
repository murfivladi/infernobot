use colored::*;
use crate::{config, manifest, registry::RegistryClient};
use super::install;

pub fn esegui(pacchetto: Option<String>) {
    let cfg = config::carica();
    let client = RegistryClient::nuovo(cfg.registry.clone(), cfg.token.clone());

    let mut m = match manifest::carica() {
        Ok(m) => m,
        Err(e) => { eprintln!("{} {}", "✗".red(), e); return; }
    };

    let da_aggiornare: Vec<String> = match pacchetto {
        Some(p) => vec![p],
        None => m.dipendenze.keys().cloned().collect(),
    };

    if da_aggiornare.is_empty() {
        println!("{}", "Nessuna dipendenza da aggiornare.".dimmed());
        return;
    }

    println!("{} Aggiornamento pacchetti...\n", "🔄".cyan());
    let mut aggiornati = 0;

    for nome in &da_aggiornare {
        print!("  {} {}... ", "↑".cyan(), nome.bold());
        std::io::Write::flush(&mut std::io::stdout()).ok();

        match client.info_pacchetto(nome, None) {
            Err(e) => println!("{} {}", "✗".red(), e),
            Ok(info) => {
                let vecchia = m.dipendenze.get(nome).cloned().unwrap_or_default();
                if vecchia == info.versione {
                    println!("{} già aggiornato (v{})", "✓".green(), info.versione.yellow());
                } else {
                    m.dipendenze.insert(nome.clone(), info.versione.clone());
                    println!("{} {} → {}", "✓".green(), vecchia.dimmed(), info.versione.yellow());
                    aggiornati += 1;
                }
            }
        }
    }

    if aggiornati > 0 {
        manifest::salva(&m).ok();
        println!("\n{} {} pacchetto/i aggiornato/i nel manifest, reinstallazione...", "✓".green().bold(), aggiornati);
        // reinstalla i pacchetti aggiornati
        for nome in &da_aggiornare {
            if let Some(ver) = m.dipendenze.get(nome) {
                install::installa_singolo(&client, nome, Some(ver.as_str()));
            }
        }
    } else {
        println!("\n{}", "Tutto già aggiornato.".dimmed());
    }
}
