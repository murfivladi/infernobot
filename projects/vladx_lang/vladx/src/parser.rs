use crate::lexer::{Token, TokenConPosizione, SegmentoStringa};

/// Nodi dell'AST
#[derive(Debug, Clone)]
pub enum Expr {
    Numero(f64),
    Testo(String),
    TestoInterpolato(Vec<SegmentoInterpolato>),
    Booleano(bool),
    Nullo,
    Identificatore(String),
    Array(Vec<Expr>),
    Dizionario(Vec<(Expr, Expr)>), // [(chiave, valore)]

    BinOp {
        sinistra: Box<Expr>,
        op: String,
        destra: Box<Expr>,
    },
    UnOp {
        op: String,
        operando: Box<Expr>,
    },
    Assegnazione {
        target: Box<Expr>, // può essere Identificatore, Indice, Accesso
        valore: Box<Expr>,
    },
    AssegnazioneComposta {
        target: Box<Expr>,
        op: String, // +=, -=, *=, /=, %=
        valore: Box<Expr>,
    },
    Incremento {
        target: Box<Expr>,
        op: String, // ++ o --
    },
    Chiamata {
        funzione: Box<Expr>,
        argomenti: Vec<Expr>,
    },
    Accesso {
        oggetto: Box<Expr>,
        campo: String,
    },
    Indice {
        oggetto: Box<Expr>,
        indice: Box<Expr>,
    },
    Lambda {
        parametri: Vec<String>,
        corpo: LambdaCorpo,
    },
}

#[derive(Debug, Clone)]
pub enum LambdaCorpo {
    Blocco(Vec<Stmt>),
    Espressione(Box<Expr>),
}

#[derive(Debug, Clone)]
pub enum SegmentoInterpolato {
    Testo(String),
    Espressione(Box<Expr>),
}

#[derive(Debug, Clone)]
pub enum Stmt {
    Espressione(Expr),
    Variabile {
        nome: String,
        valore: Expr,
    },
    Funzione {
        nome: String,
        parametri: Vec<String>,
        corpo: Vec<Stmt>,
    },
    Se {
        condizione: Expr,
        allora: Vec<Stmt>,
        altrimenti: Option<Vec<Stmt>>,
    },
    Per {
        variabile: String,
        da: Expr,
        a: Expr,
        corpo: Vec<Stmt>,
    },
    PerIn {
        variabile: String,
        iterabile: Expr,
        corpo: Vec<Stmt>,
    },
    Finche {
        condizione: Expr,
        corpo: Vec<Stmt>,
    },
    Ritorna(Option<Expr>),
    Importa {
        nome: String,
        da: Option<String>,
    },
    Prova {
        corpo: Vec<Stmt>,
        variabile_errore: Option<String>,
        cattura: Vec<Stmt>,
    },
    Lancia(Expr),
    Interrompi,
    Continua,
}

pub struct Parser {
    tokens: Vec<TokenConPosizione>,
    pos: usize,
}

impl Parser {
    pub fn new(tokens: Vec<TokenConPosizione>) -> Self {
        Parser { tokens, pos: 0 }
    }

    fn peek(&self) -> &Token {
        self.tokens.get(self.pos).map(|t| &t.token).unwrap_or(&Token::EOF)
    }

    fn peek_riga(&self) -> usize {
        self.tokens.get(self.pos).map(|t| t.riga).unwrap_or(0)
    }

    fn avanza(&mut self) -> Token {
        let t = self.tokens[self.pos].token.clone();
        if self.pos < self.tokens.len() - 1 {
            self.pos += 1;
        }
        t
    }

    fn salta_newline(&mut self) {
        while self.peek() == &Token::Newline {
            self.avanza();
        }
    }

    fn consuma(&mut self, expected: &Token) -> Result<(), String> {
        if self.peek() == expected {
            self.avanza();
            Ok(())
        } else {
            Err(format!(
                "Riga {}: atteso {:?}, trovato {:?}",
                self.peek_riga(), expected, self.peek()
            ))
        }
    }

    fn consuma_identificatore(&mut self) -> Result<String, String> {
        match self.peek().clone() {
            Token::Identificatore(s) => {
                self.avanza();
                Ok(s)
            }
            t => Err(format!("Riga {}: atteso identificatore, trovato {:?}", self.peek_riga(), t)),
        }
    }

    pub fn parse(&mut self) -> Result<Vec<Stmt>, String> {
        let mut stmts = Vec::new();
        self.salta_newline();
        while self.peek() != &Token::EOF {
            stmts.push(self.parse_stmt()?);
            while self.peek() == &Token::Newline || self.peek() == &Token::PuntoVirgola {
                self.avanza();
            }
        }
        Ok(stmts)
    }

    fn parse_stmt(&mut self) -> Result<Stmt, String> {
        self.salta_newline();
        match self.peek().clone() {
            Token::Variabile => self.parse_variabile(),
            Token::Funzione => self.parse_funzione(),
            Token::Se => self.parse_se(),
            Token::Per => self.parse_per(),
            Token::Finche => self.parse_finche(),
            Token::Ritorna => self.parse_ritorna(),
            Token::Importa => self.parse_importa(),
            Token::Prova => self.parse_prova(),
            Token::Lancia => {
                self.avanza();
                let e = self.parse_expr()?;
                Ok(Stmt::Lancia(e))
            }
            Token::Interrompi => { self.avanza(); Ok(Stmt::Interrompi) }
            Token::Continua => { self.avanza(); Ok(Stmt::Continua) }
            _ => Ok(Stmt::Espressione(self.parse_expr()?)),
        }
    }

    fn parse_variabile(&mut self) -> Result<Stmt, String> {
        self.avanza();
        let nome = self.consuma_identificatore()?;
        self.consuma(&Token::Uguale)?;
        let valore = self.parse_expr()?;
        Ok(Stmt::Variabile { nome, valore })
    }

    fn parse_funzione(&mut self) -> Result<Stmt, String> {
        self.avanza();
        let nome = self.consuma_identificatore()?;
        self.consuma(&Token::ParentesiAperta)?;
        let parametri = self.parse_parametri()?;
        self.consuma(&Token::ParentesiChiusa)?;
        let corpo = self.parse_blocco()?;
        Ok(Stmt::Funzione { nome, parametri, corpo })
    }

    fn parse_parametri(&mut self) -> Result<Vec<String>, String> {
        let mut parametri = Vec::new();
        while self.peek() != &Token::ParentesiChiusa && self.peek() != &Token::EOF {
            parametri.push(self.consuma_identificatore()?);
            if self.peek() == &Token::Virgola { self.avanza(); }
        }
        Ok(parametri)
    }

    fn parse_se(&mut self) -> Result<Stmt, String> {
        self.avanza();
        let condizione = self.parse_expr()?;
        let allora = self.parse_blocco()?;
        self.salta_newline();
        let altrimenti = if self.peek() == &Token::Altrimenti {
            self.avanza();
            self.salta_newline();
            if self.peek() == &Token::Se {
                Some(vec![self.parse_se()?])
            } else {
                Some(self.parse_blocco()?)
            }
        } else {
            None
        };
        Ok(Stmt::Se { condizione, allora, altrimenti })
    }

    fn parse_per(&mut self) -> Result<Stmt, String> {
        self.avanza();
        let variabile = self.consuma_identificatore()?;
        if self.peek() == &Token::In {
            self.avanza();
            let iterabile = self.parse_expr()?;
            let corpo = self.parse_blocco()?;
            return Ok(Stmt::PerIn { variabile, iterabile, corpo });
        }
        self.consuma(&Token::Da)?;
        let da = self.parse_expr()?;
        self.consuma(&Token::A)?;
        let a = self.parse_expr()?;
        let corpo = self.parse_blocco()?;
        Ok(Stmt::Per { variabile, da, a, corpo })
    }

    fn parse_finche(&mut self) -> Result<Stmt, String> {
        self.avanza();
        let condizione = self.parse_expr()?;
        let corpo = self.parse_blocco()?;
        Ok(Stmt::Finche { condizione, corpo })
    }

    fn parse_ritorna(&mut self) -> Result<Stmt, String> {
        self.avanza();
        if self.peek() == &Token::Newline || self.peek() == &Token::PuntoVirgola || self.peek() == &Token::EOF {
            Ok(Stmt::Ritorna(None))
        } else {
            Ok(Stmt::Ritorna(Some(self.parse_expr()?)))
        }
    }

    fn parse_importa(&mut self) -> Result<Stmt, String> {
        self.avanza();
        let nome = self.consuma_identificatore()?;
        let da = if self.peek() == &Token::Da {
            self.avanza();
            match self.peek().clone() {
                Token::Testo(s) => { self.avanza(); Some(s) }
                _ => return Err("Atteso percorso modulo dopo 'da'".to_string()),
            }
        } else {
            None
        };
        Ok(Stmt::Importa { nome, da })
    }

    fn parse_prova(&mut self) -> Result<Stmt, String> {
        self.avanza();
        let corpo = self.parse_blocco()?;
        self.salta_newline();
        let (variabile_errore, cattura) = if self.peek() == &Token::Cattura {
            self.avanza();
            let var = if self.peek() == &Token::ParentesiAperta {
                self.avanza();
                // accetta sia identificatori che keyword come nome variabile errore
                let v = match self.peek().clone() {
                    Token::Identificatore(s) => { self.avanza(); s }
                    Token::E => { self.avanza(); "e".to_string() }
                    Token::O => { self.avanza(); "o".to_string() }
                    t => return Err(format!("Atteso nome variabile in cattura, trovato {:?}", t)),
                };
                self.consuma(&Token::ParentesiChiusa)?;
                Some(v)
            } else { None };
            let c = self.parse_blocco()?;
            (var, c)
        } else {
            (None, Vec::new())
        };
        Ok(Stmt::Prova { corpo, variabile_errore, cattura })
    }

    fn parse_blocco(&mut self) -> Result<Vec<Stmt>, String> {
        self.salta_newline();
        self.consuma(&Token::GraffeAperta)?;
        self.salta_newline();
        let mut stmts = Vec::new();
        while self.peek() != &Token::GraffeChiusa && self.peek() != &Token::EOF {
            stmts.push(self.parse_stmt()?);
            while self.peek() == &Token::Newline || self.peek() == &Token::PuntoVirgola {
                self.avanza();
            }
        }
        self.consuma(&Token::GraffeChiusa)?;
        Ok(stmts)
    }

    // --- Espressioni con precedenza ---

    fn parse_expr(&mut self) -> Result<Expr, String> {
        self.parse_assegnazione()
    }

    fn parse_assegnazione(&mut self) -> Result<Expr, String> {
        let expr = self.parse_or()?;
        match self.peek().clone() {
            Token::Uguale => {
                self.avanza();
                let valore = self.parse_assegnazione()?;
                Ok(Expr::Assegnazione { target: Box::new(expr), valore: Box::new(valore) })
            }
            Token::PiùUguale | Token::MenoUguale | Token::MoltiplicazioneUguale
            | Token::DivisioneUguale | Token::ModuloUguale => {
                let op = match self.avanza() {
                    Token::PiùUguale => "+=",
                    Token::MenoUguale => "-=",
                    Token::MoltiplicazioneUguale => "*=",
                    Token::DivisioneUguale => "/=",
                    Token::ModuloUguale => "%=",
                    _ => unreachable!(),
                }.to_string();
                let valore = self.parse_assegnazione()?;
                Ok(Expr::AssegnazioneComposta { target: Box::new(expr), op, valore: Box::new(valore) })
            }
            _ => Ok(expr),
        }
    }

    fn parse_or(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_and()?;
        while self.peek() == &Token::O {
            self.avanza();
            let right = self.parse_and()?;
            left = Expr::BinOp { sinistra: Box::new(left), op: "||".to_string(), destra: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_and(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_uguaglianza()?;
        while self.peek() == &Token::E {
            self.avanza();
            let right = self.parse_uguaglianza()?;
            left = Expr::BinOp { sinistra: Box::new(left), op: "&&".to_string(), destra: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_uguaglianza(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_confronto()?;
        loop {
            let op = match self.peek() {
                Token::UgualeUguale => "==",
                Token::Diverso => "!=",
                _ => break,
            }.to_string();
            self.avanza();
            let right = self.parse_confronto()?;
            left = Expr::BinOp { sinistra: Box::new(left), op, destra: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_confronto(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_addizione()?;
        loop {
            let op = match self.peek() {
                Token::Minore => "<",
                Token::Maggiore => ">",
                Token::MinoreUguale => "<=",
                Token::MaggioreUguale => ">=",
                _ => break,
            }.to_string();
            self.avanza();
            let right = self.parse_addizione()?;
            left = Expr::BinOp { sinistra: Box::new(left), op, destra: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_addizione(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_moltiplicazione()?;
        loop {
            let op = match self.peek() {
                Token::Più => "+",
                Token::Meno => "-",
                _ => break,
            }.to_string();
            self.avanza();
            let right = self.parse_moltiplicazione()?;
            left = Expr::BinOp { sinistra: Box::new(left), op, destra: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_moltiplicazione(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_unario()?;
        loop {
            let op = match self.peek() {
                Token::Moltiplicazione => "*",
                Token::Divisione => "/",
                Token::Modulo => "%",
                _ => break,
            }.to_string();
            self.avanza();
            let right = self.parse_unario()?;
            left = Expr::BinOp { sinistra: Box::new(left), op, destra: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_unario(&mut self) -> Result<Expr, String> {
        match self.peek().clone() {
            Token::Non => {
                self.avanza();
                Ok(Expr::UnOp { op: "!".to_string(), operando: Box::new(self.parse_unario()?) })
            }
            Token::Meno => {
                self.avanza();
                Ok(Expr::UnOp { op: "-".to_string(), operando: Box::new(self.parse_unario()?) })
            }
            _ => self.parse_postfisso(),
        }
    }

    fn parse_postfisso(&mut self) -> Result<Expr, String> {
        let mut expr = self.parse_primario()?;
        loop {
            match self.peek().clone() {
                Token::ParentesiAperta => {
                    self.avanza();
                    let mut args = Vec::new();
                    while self.peek() != &Token::ParentesiChiusa && self.peek() != &Token::EOF {
                        args.push(self.parse_expr()?);
                        if self.peek() == &Token::Virgola { self.avanza(); }
                    }
                    self.consuma(&Token::ParentesiChiusa)?;
                    expr = Expr::Chiamata { funzione: Box::new(expr), argomenti: args };
                }
                Token::Punto => {
                    self.avanza();
                    let campo = self.consuma_identificatore()?;
                    expr = Expr::Accesso { oggetto: Box::new(expr), campo };
                }
                Token::QuadreAperta => {
                    self.avanza();
                    let indice = self.parse_expr()?;
                    self.consuma(&Token::QuadreChiusa)?;
                    expr = Expr::Indice { oggetto: Box::new(expr), indice: Box::new(indice) };
                }
                Token::PiùPiù => {
                    self.avanza();
                    expr = Expr::Incremento { target: Box::new(expr), op: "++".to_string() };
                }
                Token::MenoMeno => {
                    self.avanza();
                    expr = Expr::Incremento { target: Box::new(expr), op: "--".to_string() };
                }
                _ => break,
            }
        }
        Ok(expr)
    }

    fn parse_primario(&mut self) -> Result<Expr, String> {
        match self.peek().clone() {
            Token::Numero(n) => { self.avanza(); Ok(Expr::Numero(n)) }
            Token::Testo(s) => { self.avanza(); Ok(Expr::Testo(s)) }
            Token::TestoInterpolato(segmenti) => {
                self.avanza();
                let mut parti = Vec::new();
                for seg in segmenti {
                    match seg {
                        SegmentoStringa::Testo(t) => parti.push(SegmentoInterpolato::Testo(t)),
                        SegmentoStringa::Espressione(src) => {
                            let mut lex = crate::lexer::Lexer::new(&src);
                            let tokens = lex.tokenizza().map_err(|e| format!("Interpolazione: {e}"))?;
                            let mut p = Parser::new(tokens);
                            let expr = p.parse_expr()?;
                            parti.push(SegmentoInterpolato::Espressione(Box::new(expr)));
                        }
                    }
                }
                Ok(Expr::TestoInterpolato(parti))
            }
            Token::Vero => { self.avanza(); Ok(Expr::Booleano(true)) }
            Token::Falso => { self.avanza(); Ok(Expr::Booleano(false)) }
            Token::Nullo => { self.avanza(); Ok(Expr::Nullo) }
            Token::Identificatore(s) => { self.avanza(); Ok(Expr::Identificatore(s)) }
            Token::ParentesiAperta => {
                self.avanza();
                let expr = self.parse_expr()?;
                self.consuma(&Token::ParentesiChiusa)?;
                Ok(expr)
            }
            Token::QuadreAperta => {
                self.avanza();
                let mut elementi = Vec::new();
                self.salta_newline();
                while self.peek() != &Token::QuadreChiusa && self.peek() != &Token::EOF {
                    elementi.push(self.parse_expr()?);
                    if self.peek() == &Token::Virgola { self.avanza(); }
                    self.salta_newline();
                }
                self.consuma(&Token::QuadreChiusa)?;
                Ok(Expr::Array(elementi))
            }
            Token::GraffeAperta => {
                // dizionario { chiave: valore, ... }
                self.avanza();
                let mut coppie = Vec::new();
                self.salta_newline();
                while self.peek() != &Token::GraffeChiusa && self.peek() != &Token::EOF {
                    // chiave: identificatore o stringa
                    let chiave = match self.peek().clone() {
                        Token::Identificatore(s) => { self.avanza(); Expr::Testo(s) }
                        Token::Testo(s) => { self.avanza(); Expr::Testo(s) }
                        Token::Numero(n) => { self.avanza(); Expr::Numero(n) }
                        t => return Err(format!("Riga {}: chiave dizionario non valida: {:?}", self.peek_riga(), t)),
                    };
                    self.consuma(&Token::DuePunti)?;
                    let valore = self.parse_expr()?;
                    coppie.push((chiave, valore));
                    if self.peek() == &Token::Virgola { self.avanza(); }
                    self.salta_newline();
                }
                self.consuma(&Token::GraffeChiusa)?;
                Ok(Expr::Dizionario(coppie))
            }
            Token::Fn => {
                self.avanza();
                self.consuma(&Token::ParentesiAperta)?;
                let parametri = self.parse_parametri()?;
                self.consuma(&Token::ParentesiChiusa)?;
                // fn(x) => expr  oppure  fn(x) { ... }
                if self.peek() == &Token::FrecciaDestra {
                    self.avanza();
                    let expr = self.parse_expr()?;
                    Ok(Expr::Lambda { parametri, corpo: LambdaCorpo::Espressione(Box::new(expr)) })
                } else {
                    let corpo = self.parse_blocco()?;
                    Ok(Expr::Lambda { parametri, corpo: LambdaCorpo::Blocco(corpo) })
                }
            }
            t => Err(format!("Riga {}: espressione inattesa: {:?}", self.peek_riga(), t)),
        }
    }
}
