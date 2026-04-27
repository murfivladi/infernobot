mod config;
mod manifest;
mod registry;
mod comandi;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "vpm", about = "Vladx Package Manager 📦", version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    comando: Comando,
}

#[derive(Subcommand)]
enum Comando {
    /// Inizializza un nuovo progetto vladx
    Init {
        /// Salta le domande con valori predefiniti
        #[arg(short = 'y', long)]
        yes: bool,
    },
    /// Installa un pacchetto
    Install {
        pacchetto: Option<String>,
    },
    /// Alias di install
    #[command(name = "i")]
    I {
        pacchetto: Option<String>,
    },
    /// Rimuove un pacchetto
    Uninstall {
        pacchetto: String,
    },
    /// Alias di uninstall
    #[command(name = "uni")]
    Uni {
        pacchetto: String,
    },
    /// Autenticazione nel registry
    Auth {
        #[command(subcommand)]
        azione: AuthAzione,
    },
    /// Pubblica il pacchetto nel registry
    Publish,
    /// Rimuove il pacchetto dal registry
    Unpublish {
        pacchetto: String,
    },
    /// Cerca pacchetti nel registry
    Search {
        query: String,
    },
    /// Esegue uno script da vladx.json
    Run {
        script: String,
    },
    /// Aggiorna pacchetti installati
    Update {
        pacchetto: Option<String>,
    },
    /// Configura vpm (registry, ecc.)
    Setup,
}

#[derive(Subcommand)]
enum AuthAzione {
    /// Accedi al registry
    Login,
    /// Registrati nel registry
    Register,
}

fn main() {
    let cli = Cli::try_parse().unwrap_or_else(|e| {
        use clap::error::ErrorKind;
        match e.kind() {
            ErrorKind::DisplayHelp | ErrorKind::DisplayHelpOnMissingArgumentOrSubcommand => {
                print!("{e}");
                std::process::exit(0);
            }
            ErrorKind::DisplayVersion => {
                print!("{e}");
                std::process::exit(0);
            }
            _ => {}
        }
        let originale = e.to_string();
        let msg = originale
            .replace("error:", "errore:")
            .replace("the following required arguments were not provided:", "i seguenti argomenti obbligatori non sono stati forniti:")
            .replace("Usage:", "Utilizzo:")
            .replace("For more information, try '--help'.", "Per maggiori informazioni prova '--aiuto'.");
        eprintln!("{msg}");
        std::process::exit(1);
    });
    match cli.comando {
        Comando::Init { yes } => comandi::init::esegui(yes),
        Comando::Install { pacchetto } | Comando::I { pacchetto } => {
            comandi::install::esegui(pacchetto)
        }
        Comando::Uninstall { pacchetto } | Comando::Uni { pacchetto } => {
            comandi::uninstall::esegui(&pacchetto)
        }
        Comando::Auth { azione } => match azione {
            AuthAzione::Login => comandi::auth::login(),
            AuthAzione::Register => comandi::auth::register(),
        },
        Comando::Publish => comandi::publish::esegui(),
        Comando::Unpublish { pacchetto } => comandi::unpublish::esegui(&pacchetto),
        Comando::Search { query } => comandi::search::esegui(&query),
        Comando::Run { script } => comandi::run::esegui(&script),
        Comando::Update { pacchetto } => comandi::update::esegui(pacchetto),
        Comando::Setup => comandi::setup::esegui(),
    }
}
