use crate::parser::{Expr, Stmt};

#[derive(Debug)]
pub struct ErroreLint {
    pub messaggio: String,
    pub suggerimento: Option<String>,
}

pub struct Linter {
    pub errori: Vec<ErroreLint>,
    variabili_dichiarate: Vec<std::collections::HashSet<String>>,
}

impl Linter {
    pub fn nuovo() -> Self {
        let mut scope = std::collections::HashSet::new();
        for n in &[
            "scrivi","scrivil","leggi","lunghezza","tipo","numero","testo","intero",
            "leggi_file","scrivi_file","esiste_file","cancella_file",
            "json_leggi","json_scrivi","ora_adesso","data_adesso","timestamp",
        ] {
            scope.insert(n.to_string());
        }
        Linter { errori: Vec::new(), variabili_dichiarate: vec![scope] }
    }

    fn entra_scope(&mut self) {
        self.variabili_dichiarate.push(std::collections::HashSet::new());
    }

    fn esci_scope(&mut self) {
        self.variabili_dichiarate.pop();
    }

    fn dichiara(&mut self, nome: &str) {
        if let Some(scope) = self.variabili_dichiarate.last_mut() {
            scope.insert(nome.to_string());
        }
    }

    fn e_dichiarata(&self, nome: &str) -> bool {
        self.variabili_dichiarate.iter().rev().any(|s| s.contains(nome))
    }

    pub fn analizza(&mut self, stmts: &[Stmt]) {
        for stmt in stmts { self.analizza_stmt(stmt); }
    }

    fn analizza_stmt(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Variabile { nome, valore } => {
                self.analizza_expr(valore);
                self.dichiara(nome);
            }
            Stmt::Funzione { nome, parametri, corpo } => {
                self.dichiara(nome);
                self.entra_scope();
                for p in parametri { self.dichiara(p); }
                self.analizza(corpo);
                self.esci_scope();
            }
            Stmt::Se { condizione, allora, altrimenti } => {
                self.analizza_expr(condizione);
                self.entra_scope(); self.analizza(allora); self.esci_scope();
                if let Some(alt) = altrimenti {
                    self.entra_scope(); self.analizza(alt); self.esci_scope();
                }
            }
            Stmt::Per { variabile, da, a, corpo } => {
                self.analizza_expr(da); self.analizza_expr(a);
                self.entra_scope(); self.dichiara(variabile);
                self.analizza(corpo); self.esci_scope();
            }
            Stmt::PerIn { variabile, iterabile, corpo } => {
                self.analizza_expr(iterabile);
                self.entra_scope(); self.dichiara(variabile);
                self.analizza(corpo); self.esci_scope();
            }
            Stmt::Finche { condizione, corpo } => {
                self.analizza_expr(condizione);
                self.entra_scope(); self.analizza(corpo); self.esci_scope();
            }
            Stmt::Ritorna(expr) => { if let Some(e) = expr { self.analizza_expr(e); } }
            Stmt::Lancia(expr) => { self.analizza_expr(expr); }
            Stmt::Prova { corpo, variabile_errore, cattura } => {
                self.entra_scope(); self.analizza(corpo); self.esci_scope();
                self.entra_scope();
                if let Some(v) = variabile_errore { self.dichiara(v); }
                self.analizza(cattura); self.esci_scope();
            }
            Stmt::Espressione(expr) => self.analizza_expr(expr),
            Stmt::Importa { nome, .. } => { self.dichiara(nome); }
            Stmt::Interrompi | Stmt::Continua => {}
        }
    }

    fn analizza_expr(&mut self, expr: &Expr) {
        match expr {
            Expr::Identificatore(nome) => {
                if !self.e_dichiarata(nome) {
                    self.errori.push(ErroreLint {
                        messaggio: format!("Variabile '{nome}' usata prima di essere dichiarata"),
                        suggerimento: Some(format!("Aggiungi: variabile {nome} = ...")),
                    });
                }
            }
            Expr::Assegnazione { target, valore } => {
                if let Expr::Identificatore(nome) = target.as_ref() {
                    if !self.e_dichiarata(nome) {
                        self.errori.push(ErroreLint {
                            messaggio: format!("Assegnazione a '{nome}' non dichiarata"),
                            suggerimento: Some(format!("Usa 'variabile {nome} = ...' per dichiarare")),
                        });
                    }
                }
                self.analizza_expr(valore);
            }
            Expr::AssegnazioneComposta { target, valore, .. } => {
                self.analizza_expr(target);
                self.analizza_expr(valore);
            }
            Expr::Incremento { target, .. } => self.analizza_expr(target),
            Expr::BinOp { sinistra, destra, .. } => {
                self.analizza_expr(sinistra); self.analizza_expr(destra);
            }
            Expr::UnOp { operando, .. } => self.analizza_expr(operando),
            Expr::Chiamata { funzione, argomenti } => {
                self.analizza_expr(funzione);
                for a in argomenti { self.analizza_expr(a); }
            }
            Expr::Accesso { oggetto, .. } => self.analizza_expr(oggetto),
            Expr::Indice { oggetto, indice } => {
                self.analizza_expr(oggetto); self.analizza_expr(indice);
            }
            Expr::Array(elementi) => { for e in elementi { self.analizza_expr(e); } }
            Expr::Dizionario(coppie) => {
                for (k, v) in coppie { self.analizza_expr(k); self.analizza_expr(v); }
            }
            Expr::TestoInterpolato(segmenti) => {
                for seg in segmenti {
                    if let crate::parser::SegmentoInterpolato::Espressione(e) = seg {
                        self.analizza_expr(e);
                    }
                }
            }
            Expr::Lambda { parametri, corpo } => {
                self.entra_scope();
                for p in parametri { self.dichiara(p); }
                match corpo {
                    crate::parser::LambdaCorpo::Blocco(stmts) => self.analizza(stmts),
                    crate::parser::LambdaCorpo::Espressione(e) => self.analizza_expr(e),
                }
                self.esci_scope();
            }
            _ => {}
        }
    }
}
