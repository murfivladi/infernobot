use colored::*;
use flate2::write::GzEncoder;
use flate2::Compression;
use crate::{config, manifest, registry::RegistryClient};

pub fn esegui() {
    let cfg = config::carica();
    if cfg.token.is_none() {
        eprintln!("{} Devi fare login prima: {}", "✗".red(), "vpm auth login".cyan());
        return;
    }

    let m = match manifest::carica() {
        Ok(m) => m,
        Err(e) => { eprintln!("{} {}", "✗".red(), e); return; }
    };

    println!("{} Pubblicazione {} v{}...", "📤".cyan(), m.nome.bold(), m.versione.yellow());

    let manifest_json = serde_json::to_string(&m).unwrap();
    let archivio = match crea_archivio() {
        Ok(a) => a,
        Err(e) => { eprintln!("{} Errore creazione archivio: {}", "✗".red(), e); return; }
    };

    let client = RegistryClient::nuovo(cfg.registry, cfg.token);
    match client.pubblica(&manifest_json, archivio) {
        Ok(_) => println!("{} {} v{} pubblicato!", "✓".green().bold(), m.nome.cyan(), m.versione.yellow()),
        Err(e) => eprintln!("{} {}", "✗ Errore:".red().bold(), e),
    }
}

fn crea_archivio() -> Result<Vec<u8>, String> {
    let buf = Vec::new();
    let enc = GzEncoder::new(buf, Compression::default());
    let mut tar = tar::Builder::new(enc);

    tar.append_dir_all(".", ".")
        .map_err(|e| format!("Errore creazione tar: {e}"))?;

    let enc = tar.into_inner().map_err(|e| e.to_string())?;
    enc.finish().map_err(|e| e.to_string())
}
