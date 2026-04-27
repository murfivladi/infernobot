use crate::bytecode::{Chunk, Istruzione};
use crate::parser::{Expr, Stmt, LambdaCorpo, SegmentoInterpolato};

pub struct Compilatore {
    pub chunk: Chunk,
}

impl Compilatore {
    pub fn nuovo(nome: &str) -> Self {
        Compilatore { chunk: Chunk::nuovo(nome) }
    }

    pub fn compila(&mut self, stmts: &[Stmt]) -> Result<(), String> {
        for stmt in stmts {
            self.compila_stmt(stmt)?;
        }
        Ok(())
    }

    fn compila_stmt(&mut self, stmt: &Stmt) -> Result<(), String> {
        match stmt {
            Stmt::Espressione(expr) => {
                self.compila_expr(expr)?;
                self.chunk.emetti(Istruzione::Pop);
            }
            Stmt::Variabile { nome, valore } => {
                self.compila_expr(valore)?;
                self.chunk.emetti(Istruzione::StoreVar(nome.clone()));
            }
            Stmt::Funzione { nome, parametri, corpo } => {
                // Compila il corpo in un chunk separato, poi emetti CaricaFunzione
                let inizio = self.chunk.posizione() + 1; // dopo l'istruzione CaricaFunzione
                // Emetti placeholder, poi corpo, poi Ritorna
                let idx_carica = self.chunk.emetti(Istruzione::Salta(0)); // salta il corpo
                let corpo_inizio = self.chunk.posizione();
                let mut sub = Compilatore::nuovo(nome);
                sub.compila(corpo)?;
                sub.chunk.emetti(Istruzione::CaricaNullo);
                sub.chunk.emetti(Istruzione::Ritorna);
                // Incorpora le istruzioni del sub nel chunk principale
                let offset = self.chunk.posizione();
                for istr in sub.chunk.istruzioni {
                    self.chunk.emetti(istr);
                }
                let fine = self.chunk.posizione();
                self.chunk.patcha_salto(idx_carica, fine);
                self.chunk.emetti(Istruzione::CaricaFunzione {
                    nome: nome.clone(),
                    parametri: parametri.clone(),
                    inizio: offset,
                    fine,
                });
                self.chunk.emetti(Istruzione::StoreVar(nome.clone()));
                let _ = (inizio, corpo_inizio);
            }
            Stmt::Se { condizione, allora, altrimenti } => {
                self.compila_expr(condizione)?;
                let idx_falso = self.chunk.emetti(Istruzione::SaltaSeFalso(0));
                self.compila(allora)?;
                if let Some(alt) = altrimenti {
                    let idx_fine = self.chunk.emetti(Istruzione::Salta(0));
                    let pos_alt = self.chunk.posizione();
                    self.chunk.patcha_salto(idx_falso, pos_alt);
                    self.compila(alt)?;
                    let pos_fine = self.chunk.posizione();
                    self.chunk.patcha_salto(idx_fine, pos_fine);
                } else {
                    let pos_fine = self.chunk.posizione();
                    self.chunk.patcha_salto(idx_falso, pos_fine);
                }
            }
            Stmt::Per { variabile, da, a, corpo } => {
                // variabile = da; while variabile <= a { corpo; variabile++ }
                self.compila_expr(da)?;
                self.chunk.emetti(Istruzione::StoreVar(variabile.clone()));
                let inizio_loop = self.chunk.posizione();
                self.chunk.emetti(Istruzione::CaricaVar(variabile.clone()));
                self.compila_expr(a)?;
                self.chunk.emetti(Istruzione::BinOp("<=".to_string()));
                let idx_fine = self.chunk.emetti(Istruzione::SaltaSeFalso(0));
                self.compila(corpo)?;
                // variabile++
                self.chunk.emetti(Istruzione::CaricaVar(variabile.clone()));
                self.chunk.emetti(Istruzione::CaricaNumero(1.0));
                self.chunk.emetti(Istruzione::BinOp("+".to_string()));
                self.chunk.emetti(Istruzione::StoreVar(variabile.clone()));
                self.chunk.emetti(Istruzione::Salta(inizio_loop));
                let pos_fine = self.chunk.posizione();
                self.chunk.patcha_salto(idx_fine, pos_fine);
            }
            Stmt::PerIn { variabile, iterabile, corpo } => {
                self.compila_expr(iterabile)?;
                self.chunk.emetti(Istruzione::IteraInizio);
                let inizio_loop = self.chunk.posizione();
                let idx_fine = self.chunk.emetti(Istruzione::IteraAvanti(0));
                self.chunk.emetti(Istruzione::StoreVar(variabile.clone()));
                self.compila(corpo)?;
                self.chunk.emetti(Istruzione::Salta(inizio_loop));
                let pos_fine = self.chunk.posizione();
                self.chunk.patcha_salto(idx_fine, pos_fine);
                self.chunk.emetti(Istruzione::IteraFine);
            }
            Stmt::Finche { condizione, corpo } => {
                let inizio_loop = self.chunk.posizione();
                self.compila_expr(condizione)?;
                let idx_fine = self.chunk.emetti(Istruzione::SaltaSeFalso(0));
                self.compila(corpo)?;
                self.chunk.emetti(Istruzione::Salta(inizio_loop));
                let pos_fine = self.chunk.posizione();
                self.chunk.patcha_salto(idx_fine, pos_fine);
            }
            Stmt::Ritorna(expr) => {
                match expr {
                    Some(e) => self.compila_expr(e)?,
                    None => { self.chunk.emetti(Istruzione::CaricaNullo); }
                }
                self.chunk.emetti(Istruzione::Ritorna);
            }
            Stmt::Lancia(expr) => {
                self.compila_expr(expr)?;
                self.chunk.emetti(Istruzione::Lancia);
            }
            Stmt::Prova { corpo, variabile_errore, cattura } => {
                // Implementazione semplificata: esegui corpo, se errore esegui cattura
                // Nella VM gestiamo con un frame di catch
                // Per ora emettiamo un marker speciale
                self.compila(corpo)?;
                // Il catch viene gestito dalla VM tramite stack di handler
                if !cattura.is_empty() {
                    if let Some(var) = variabile_errore {
                        self.chunk.emetti(Istruzione::StoreVar(var.clone()));
                    }
                    self.compila(cattura)?;
                }
            }
            Stmt::Interrompi => { self.chunk.emetti(Istruzione::Salta(usize::MAX)); } // VM gestisce
            Stmt::Continua => { self.chunk.emetti(Istruzione::Salta(usize::MAX - 1)); }
            Stmt::Importa { nome, .. } => {
                // Importa non è supportato nel bytecode (usa l'interprete)
                self.chunk.emetti(Istruzione::CaricaNullo);
                self.chunk.emetti(Istruzione::StoreVar(nome.clone()));
            }
        }
        Ok(())
    }

    fn compila_expr(&mut self, expr: &Expr) -> Result<(), String> {
        match expr {
            Expr::Numero(n) => { self.chunk.emetti(Istruzione::CaricaNumero(*n)); }
            Expr::Testo(s) => { self.chunk.emetti(Istruzione::CaricaTesto(s.clone())); }
            Expr::Booleano(b) => { self.chunk.emetti(Istruzione::CaricaBool(*b)); }
            Expr::Nullo => { self.chunk.emetti(Istruzione::CaricaNullo); }
            Expr::Identificatore(nome) => { self.chunk.emetti(Istruzione::CaricaVar(nome.clone())); }
            Expr::Array(elementi) => {
                for e in elementi { self.compila_expr(e)?; }
                self.chunk.emetti(Istruzione::CaricaArray(elementi.len()));
            }
            Expr::Dizionario(coppie) => {
                for (k, v) in coppie {
                    self.compila_expr(k)?;
                    self.compila_expr(v)?;
                }
                self.chunk.emetti(Istruzione::CaricaDizionario(coppie.len()));
            }
            Expr::TestoInterpolato(segmenti) => {
                // Concatena tutti i segmenti come stringhe
                let n = segmenti.len();
                for seg in segmenti {
                    match seg {
                        SegmentoInterpolato::Testo(t) => { self.chunk.emetti(Istruzione::CaricaTesto(t.clone())); }
                        SegmentoInterpolato::Espressione(e) => { self.compila_expr(e)?; }
                    }
                }
                // Concatena n elementi con BinOp "+"
                for _ in 1..n {
                    self.chunk.emetti(Istruzione::BinOp("+".to_string()));
                }
            }
            Expr::BinOp { sinistra, op, destra } => {
                self.compila_expr(sinistra)?;
                self.compila_expr(destra)?;
                self.chunk.emetti(Istruzione::BinOp(op.clone()));
            }
            Expr::UnOp { op, operando } => {
                self.compila_expr(operando)?;
                self.chunk.emetti(Istruzione::UnOp(op.clone()));
            }
            Expr::Assegnazione { target, valore } => {
                self.compila_expr(valore)?;
                self.compila_assegna_target(target)?;
            }
            Expr::AssegnazioneComposta { target, op, valore } => {
                self.compila_expr(target)?;
                self.compila_expr(valore)?;
                let base_op = &op[..op.len()-1];
                self.chunk.emetti(Istruzione::BinOp(base_op.to_string()));
                self.compila_assegna_target(target)?;
            }
            Expr::Incremento { target, op } => {
                self.compila_expr(target)?;
                self.chunk.emetti(Istruzione::CaricaNumero(1.0));
                let op_str = if op == "++" { "+" } else { "-" };
                self.chunk.emetti(Istruzione::BinOp(op_str.to_string()));
                self.compila_assegna_target(target)?;
            }
            Expr::Chiamata { funzione, argomenti } => {
                for a in argomenti { self.compila_expr(a)?; }
                self.compila_expr(funzione)?;
                self.chunk.emetti(Istruzione::Chiama(argomenti.len()));
            }
            Expr::Accesso { oggetto, campo } => {
                self.compila_expr(oggetto)?;
                self.chunk.emetti(Istruzione::GetCampo(campo.clone()));
            }
            Expr::Indice { oggetto, indice } => {
                self.compila_expr(oggetto)?;
                self.compila_expr(indice)?;
                self.chunk.emetti(Istruzione::GetIndice);
            }
            Expr::Lambda { parametri, corpo } => {
                let nome = "<lambda>";
                let idx_salta = self.chunk.emetti(Istruzione::Salta(0));
                let corpo_inizio = self.chunk.posizione();
                let mut sub = Compilatore::nuovo(nome);
                match corpo {
                    LambdaCorpo::Blocco(stmts) => sub.compila(stmts)?,
                    LambdaCorpo::Espressione(e) => {
                        sub.compila_expr(e)?;
                        sub.chunk.emetti(Istruzione::Ritorna);
                    }
                }
                sub.chunk.emetti(Istruzione::CaricaNullo);
                sub.chunk.emetti(Istruzione::Ritorna);
                let offset = self.chunk.posizione();
                for istr in sub.chunk.istruzioni {
                    self.chunk.emetti(istr);
                }
                let fine = self.chunk.posizione();
                self.chunk.patcha_salto(idx_salta, fine);
                self.chunk.emetti(Istruzione::CaricaFunzione {
                    nome: nome.to_string(),
                    parametri: parametri.clone(),
                    inizio: offset,
                    fine,
                });
                let _ = corpo_inizio;
            }
        }
        Ok(())
    }

    fn compila_assegna_target(&mut self, target: &Expr) -> Result<(), String> {
        match target {
            Expr::Identificatore(nome) => { self.chunk.emetti(Istruzione::StoreVar(nome.clone())); }
            Expr::Accesso { oggetto, campo } => {
                self.compila_expr(oggetto)?;
                self.chunk.emetti(Istruzione::SetCampo(campo.clone()));
            }
            Expr::Indice { oggetto, indice } => {
                self.compila_expr(oggetto)?;
                self.compila_expr(indice)?;
                self.chunk.emetti(Istruzione::SetIndice);
            }
            _ => return Err("Target assegnazione non valido per bytecode".to_string()),
        }
        Ok(())
    }
}
