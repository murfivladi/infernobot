mod lexer;
mod parser;
mod valore;
mod stdlib;
mod interprete;
mod lint;
mod bytecode;
mod compilatore;
mod vm;

use clap::{Parser, Subcommand};
use colored::*;
use rustyline::DefaultEditor;
use std::fs;
use std::path::PathBuf;

use crate::lexer::Lexer;
use crate::parser::Parser as VladxParser;
use crate::interprete::Interprete;
use crate::lint::Linter;

#[derive(Parser)]
#[command(name = "vladx", about = "Il linguaggio vladx 🇮🇹", version = "0.2.0")]
struct Cli {
    file: Option<PathBuf>,
    #[command(subcommand)]
    comando: Option<Comando>,
}

#[derive(Subcommand)]
enum Comando {
    /// Controlla la sintassi di un file
    Lint { file: PathBuf },
    /// Compila un file in eseguibile
    Build {
        file: PathBuf,
        #[arg(long)] target: Option<String>,
        #[arg(short, long)] output: Option<PathBuf>,
    },
    /// Esegui tramite VM bytecode (sperimentale)
    Vm { file: PathBuf },
}

fn main() {
    let cli = Cli::try_parse().unwrap_or_else(|e| {
        use clap::error::ErrorKind;
        match e.kind() {
            ErrorKind::DisplayHelp | ErrorKind::DisplayHelpOnMissingArgumentOrSubcommand
            | ErrorKind::DisplayVersion => { print!("{e}"); std::process::exit(0); }
            _ => {}
        }
        eprintln!("{}", e.to_string().replace("error:", "errore:"));
        std::process::exit(1);
    });

    match (cli.file, cli.comando) {
        (Some(file), None) => esegui_file(&file),
        (None, Some(Comando::Lint { file })) => esegui_lint(&file),
        (None, Some(Comando::Build { file, target, output })) => esegui_build(&file, target, output),
        (None, Some(Comando::Vm { file })) => esegui_vm(&file),
        _ => avvia_repl(),
    }
}

pub fn parse_sorgente(sorgente: &str) -> Result<Vec<crate::parser::Stmt>, String> {
    let mut lexer = Lexer::new(sorgente);
    let tokens = lexer.tokenizza()?;
    let mut parser = VladxParser::new(tokens);
    parser.parse()
}

fn esegui_file(path: &PathBuf) {
    let sorgente = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => { eprintln!("{} {}", "Errore:".red().bold(), e); std::process::exit(1); }
    };
    match parse_sorgente(&sorgente) {
        Ok(ast) => {
            let mut interp = Interprete::nuovo();
            interp.dir_base = path.parent().map(|p| p.to_path_buf());
            if let Err(e) = interp.esegui(&ast) {
                eprintln!("{} {}", "Errore runtime:".red().bold(), e);
                std::process::exit(1);
            }
        }
        Err(e) => { eprintln!("{} {}", "Errore sintassi:".red().bold(), e); std::process::exit(1); }
    }
}

fn esegui_lint(path: &PathBuf) {
    let sorgente = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => { eprintln!("{} {}", "Errore:".red().bold(), e); std::process::exit(1); }
    };
    match parse_sorgente(&sorgente) {
        Err(e) => { println!("{} {}", "✗ Errore sintassi:".red().bold(), e); std::process::exit(1); }
        Ok(ast) => {
            let mut linter = Linter::nuovo();
            linter.analizza(&ast);
            if linter.errori.is_empty() {
                println!("{}", "✓ Nessun problema trovato".green().bold());
            } else {
                println!("{} {} problema/i trovato/i\n", "✗".red().bold(), linter.errori.len());
                for (i, err) in linter.errori.iter().enumerate() {
                    println!("  {} {}", format!("[{}]", i + 1).yellow(), err.messaggio.red());
                    if let Some(sug) = &err.suggerimento {
                        println!("      {} {}", "→".cyan(), sug.dimmed());
                    }
                }
                std::process::exit(1);
            }
        }
    }
}

fn esegui_build(path: &PathBuf, target: Option<String>, output: Option<PathBuf>) {
    let sorgente = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => { eprintln!("{} {}", "Errore:".red().bold(), e); std::process::exit(1); }
    };
    let target_os = target.unwrap_or_else(|| {
        if cfg!(target_os = "windows") { "windows".to_string() }
        else if cfg!(target_os = "macos") { "macos".to_string() }
        else { "linux".to_string() }
    });
    println!("{} {} per {}...", "⚙".cyan(), "Compilazione".bold(), target_os.yellow().bold());
    match parse_sorgente(&sorgente) {
        Err(e) => { eprintln!("{} {}", "Errore sintassi:".red().bold(), e); std::process::exit(1); }
        Ok(ast) => {
            let stem = path.file_stem().unwrap_or_default().to_string_lossy();
            let out_name = output.unwrap_or_else(|| {
                let ext = if target_os == "windows" { ".exe" } else { "" };
                PathBuf::from(format!("{stem}{ext}"))
            });
            let escaped = sorgente.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', "\\n");
            let wrapper = if target_os == "windows" {
                format!("@echo off\nvladx --inline \"{escaped}\"\n")
            } else {
                format!("#!/bin/sh\nexec vladx --inline \"{escaped}\"\n")
            };
            fs::write(&out_name, wrapper).unwrap_or_else(|e| {
                eprintln!("{} {}", "Errore scrittura:".red().bold(), e); std::process::exit(1);
            });
            #[cfg(unix)] {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = fs::metadata(&out_name).unwrap().permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&out_name, perms).ok();
            }
            let _ = ast; // usato per validazione
            println!("{} Compilato in: {}", "✓".green().bold(), out_name.display().to_string().cyan());
        }
    }
}

fn esegui_vm(path: &PathBuf) {
    let sorgente = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => { eprintln!("{} {}", "Errore:".red().bold(), e); std::process::exit(1); }
    };
    match parse_sorgente(&sorgente) {
        Err(e) => { eprintln!("{} {}", "Errore sintassi:".red().bold(), e); std::process::exit(1); }
        Ok(ast) => {
            let mut comp = compilatore::Compilatore::nuovo("main");
            if let Err(e) = comp.compila(&ast) {
                eprintln!("{} {}", "Errore compilazione:".red().bold(), e);
                std::process::exit(1);
            }
            let mut macchina = vm::VM::nuova();
            if let Err(e) = macchina.esegui(&comp.chunk.istruzioni) {
                eprintln!("{} {}", "Errore VM:".red().bold(), e);
                std::process::exit(1);
            }
        }
    }
}

fn avvia_repl() {
    stampa_banner();
    let mut rl = DefaultEditor::new().expect("Impossibile inizializzare REPL");
    let mut interp = Interprete::nuovo();

    loop {
        let prompt = format!("{} ", "vladx ›".cyan().bold());
        match rl.readline(&prompt) {
            Ok(line) => {
                let line = line.trim().to_string();
                if line.is_empty() { continue; }
                rl.add_history_entry(&line).ok();
                match line.as_str() {
                    ".esci" | ".exit" | ".quit" => { println!("{}", "Arrivederci! 👋".cyan()); break; }
                    ".aiuto" | ".help" => stampa_aiuto(),
                    _ => {
                        match parse_sorgente(&line) {
                            Ok(ast) => match interp.esegui(&ast) {
                                Ok(crate::valore::Valore::Nullo) => {}
                                Ok(v) => println!("{}", format!("= {v}").green()),
                                Err(e) => println!("{} {}", "✗".red(), e.red()),
                            },
                            Err(e) => println!("{} {}", "✗".red(), e.red()),
                        }
                    }
                }
            }
            Err(rustyline::error::ReadlineError::Interrupted) => {
                println!("{}", "(Ctrl+C — usa .esci per uscire)".dimmed());
            }
            Err(rustyline::error::ReadlineError::Eof) => { println!("{}", "Arrivederci! 👋".cyan()); break; }
            Err(e) => { eprintln!("Errore: {e}"); break; }
        }
    }
}

fn stampa_banner() {
    println!();
    println!("{}", r"
  ██╗   ██╗██╗      █████╗ ██████╗ ██╗  ██╗
  ██║   ██║██║     ██╔══██╗██╔══██╗╚██╗██╔╝
  ██║   ██║██║     ███████║██║  ██║ ╚███╔╝ 
  ╚██╗ ██╔╝██║     ██╔══██║██║  ██║ ██╔██╗ 
   ╚████╔╝ ███████╗██║  ██║██████╔╝██╔╝ ██╗
    ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝".cyan().bold());
    println!();
    println!("  {} v0.2.0  —  Il linguaggio italiano 🇮🇹", "vladx".cyan().bold());
    println!("  {} per uscire, {} per aiuto", ".esci".yellow(), ".aiuto".yellow());
    println!();
}

fn stampa_aiuto() {
    println!();
    println!("{}", "  Comandi REPL:".bold());
    println!("  {}  —  esci", ".esci".yellow());
    println!("  {}  —  questo aiuto", ".aiuto".yellow());
    println!();
    println!("{}", "  Esempi:".bold());
    println!("  {}", "variabile x = 42".cyan());
    println!("  {}", r#"scrivi("Ciao {x}!")"#.cyan());
    println!("  {}", "variabile d = { nome: \"Mario\", eta: 30 }".cyan());
    println!("  {}", "per i in [1, 2, 3] { scrivi(i) }".cyan());
    println!("  {}", "variabile f = fn(x) => x * 2".cyan());
    println!("  {}", "prova { lancia \"ops\" } cattura(e) { scrivi(e) }".cyan());
    println!();
}
