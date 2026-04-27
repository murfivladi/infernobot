use colored::*;
use std::io::{self, Write};
use crate::manifest::{Manifest, salva};

pub fn esegui(yes: bool) {
    println!("{}", "\n📦 Inizializzazione progetto vladx\n".cyan().bold());

    let nome = if yes {
        std::env::current_dir()
            .ok()
            .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string()))
            .unwrap_or_else(|| "mio-progetto".to_string())
    } else {
        chiedi("Nome pacchetto", &std::env::current_dir()
            .ok()
            .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string()))
            .unwrap_or_else(|| "mio-progetto".to_string()))
    };

    let versione = if yes { "0.1.0".to_string() } else { chiedi("Versione", "0.1.0") };
    let descrizione = if yes { None } else {
        let d = chiedi("Descrizione", "");
        if d.is_empty() { None } else { Some(d) }
    };
    let autore = if yes { None } else {
        let a = chiedi("Autore", "");
        if a.is_empty() { None } else { Some(a) }
    };
    let licenza = if yes { Some("MIT".to_string()) } else {
        let l = chiedi("Licenza", "MIT");
        if l.is_empty() { None } else { Some(l) }
    };
    let principale = if yes { Some("principale.vlx".to_string()) } else {
        let p = chiedi("File principale", "principale.vlx");
        if p.is_empty() { None } else { Some(p) }
    };

    let manifest = Manifest {
        nome,
        versione,
        descrizione,
        autore,
        licenza,
        principale,
        ..Default::default()
    };

    match salva(&manifest) {
        Ok(_) => println!("\n{} vladx.json creato!", "✓".green().bold()),
        Err(e) => eprintln!("{} {}", "✗ Errore:".red().bold(), e),
    }
}

fn chiedi(domanda: &str, default: &str) -> String {
    if default.is_empty() {
        print!("{}: ", domanda.bold());
    } else {
        print!("{} {}: ", domanda.bold(), format!("({default})").dimmed());
    }
    io::stdout().flush().ok();
    let mut input = String::new();
    io::stdin().read_line(&mut input).ok();
    let input = input.trim().to_string();
    if input.is_empty() { default.to_string() } else { input }
}
