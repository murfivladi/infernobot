use colored::*;
use std::io::{self, Write};
use crate::{config, registry::RegistryClient};

pub fn login() {
    println!("{}", "\n🔐 Accesso al registry vladx\n".cyan().bold());
    let utente = chiedi("Nome utente");
    let password = chiedi_password("Password");

    let cfg = config::carica();
    let client = RegistryClient::nuovo(cfg.registry.clone(), None);

    print!("Connessione a {}... ", cfg.registry.dimmed());
    io::stdout().flush().ok();

    match client.login(&utente, &password) {
        Ok(token) => {
            let mut cfg = cfg;
            cfg.token = Some(token);
            cfg.utente = Some(utente.clone());
            config::salva(&cfg);
            println!("{}", "✓".green());
            println!("{} Benvenuto, {}!", "✓".green().bold(), utente.cyan().bold());
        }
        Err(e) => {
            println!("{}", "✗".red());
            eprintln!("{} {}", "Errore:".red().bold(), e);
        }
    }
}

pub fn register() {
    println!("{}", "\n📝 Registrazione al registry vladx\n".cyan().bold());
    let utente = chiedi("Nome utente");
    let email = chiedi("Email");
    let password = chiedi_password("Password");
    let conferma = chiedi_password("Conferma password");

    if password != conferma {
        eprintln!("{}", "✗ Le password non coincidono".red().bold());
        return;
    }

    let cfg = config::carica();
    let client = RegistryClient::nuovo(cfg.registry.clone(), None);

    print!("Registrazione... ");
    io::stdout().flush().ok();

    match client.register(&utente, &email, &password) {
        Ok(token) => {
            let mut cfg = cfg;
            cfg.token = Some(token);
            cfg.utente = Some(utente.clone());
            config::salva(&cfg);
            println!("{}", "✓".green());
            println!("{} Account creato! Benvenuto, {}!", "✓".green().bold(), utente.cyan().bold());
        }
        Err(e) => {
            println!("{}", "✗".red());
            eprintln!("{} {}", "Errore:".red().bold(), e);
        }
    }
}

fn chiedi(domanda: &str) -> String {
    print!("{}: ", domanda.bold());
    io::stdout().flush().ok();
    let mut input = String::new();
    io::stdin().read_line(&mut input).ok();
    input.trim().to_string()
}

fn chiedi_password(domanda: &str) -> String {
    rpassword::prompt_password(format!("{}: ", domanda.bold()))
        .unwrap_or_default()
}
