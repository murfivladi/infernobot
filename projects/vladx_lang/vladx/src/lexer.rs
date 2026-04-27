/// Token types for vladx language
#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    // Literals
    Numero(f64),
    Testo(String),
    TestoInterpolato(Vec<SegmentoStringa>), // "Ciao {nome}!"
    Identificatore(String),
    Vero,
    Falso,
    Nullo,

    // Keywords
    Variabile,
    Funzione,
    Se,
    Altrimenti,
    Per,
    In,       // per x in array
    Da,
    A,
    Finche,
    Ritorna,
    Importa,
    Da2,      // "da" usato in import
    Prova,    // try
    Cattura,  // catch
    Lancia,   // throw
    Interrompi, // break
    Continua,   // continue
    Fn,       // lambda: fn(x) { ... }

    // Operators
    Uguale,           // =
    UgualeUguale,     // ==
    Diverso,          // !=
    Minore,           // <
    Maggiore,         // >
    MinoreUguale,     // <=
    MaggioreUguale,   // >=
    Più,              // +
    Meno,             // -
    Moltiplicazione,  // *
    Divisione,        // /
    Modulo,           // %
    E,                // &&
    O,                // ||
    Non,              // !
    PiùUguale,        // +=
    MenoUguale,       // -=
    MoltiplicazioneUguale, // *=
    DivisioneUguale,  // /=
    ModuloUguale,     // %=
    PiùPiù,           // ++
    MenoMeno,         // --

    // Punctuation
    ParentesiAperta,
    ParentesiChiusa,
    GraffeAperta,
    GraffeChiusa,
    QuadreAperta,
    QuadreChiusa,
    Virgola,
    PuntoVirgola,
    Punto,
    DuePunti,
    FrecciaDestra, // =>

    // Special
    EOF,
    Newline,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SegmentoStringa {
    Testo(String),
    Espressione(String), // sorgente grezzo da ri-parsare
}

#[derive(Debug, Clone)]
pub struct TokenConPosizione {
    pub token: Token,
    pub riga: usize,
    pub colonna: usize,
}

pub struct Lexer {
    input: Vec<char>,
    pos: usize,
    riga: usize,
    colonna: usize,
}

impl Lexer {
    pub fn new(input: &str) -> Self {
        Lexer {
            input: input.chars().collect(),
            pos: 0,
            riga: 1,
            colonna: 1,
        }
    }

    fn peek(&self) -> Option<char> {
        self.input.get(self.pos).copied()
    }

    fn peek_next(&self) -> Option<char> {
        self.input.get(self.pos + 1).copied()
    }

    fn avanza(&mut self) -> Option<char> {
        let c = self.input.get(self.pos).copied();
        if let Some(ch) = c {
            self.pos += 1;
            if ch == '\n' {
                self.riga += 1;
                self.colonna = 1;
            } else {
                self.colonna += 1;
            }
        }
        c
    }

    fn salta_spazi(&mut self) {
        while let Some(c) = self.peek() {
            if c == ' ' || c == '\t' || c == '\r' {
                self.avanza();
            } else {
                break;
            }
        }
    }

    fn leggi_numero(&mut self) -> Token {
        let mut s = String::new();
        while let Some(c) = self.peek() {
            if c.is_ascii_digit() || c == '.' {
                s.push(c);
                self.avanza();
            } else {
                break;
            }
        }
        Token::Numero(s.parse().unwrap_or(0.0))
    }

    fn leggi_stringa(&mut self) -> Token {
        self.avanza(); // skip opening quote
        let mut segmenti: Vec<SegmentoStringa> = Vec::new();
        let mut corrente = String::new();
        let mut ha_interpolazione = false;

        while let Some(c) = self.peek() {
            if c == '"' {
                self.avanza();
                break;
            }
            if c == '\\' {
                self.avanza();
                match self.avanza() {
                    Some('n') => corrente.push('\n'),
                    Some('t') => corrente.push('\t'),
                    Some('"') => corrente.push('"'),
                    Some('\\') => corrente.push('\\'),
                    Some('{') => corrente.push('{'),
                    _ => {}
                }
            } else if c == '{' {
                self.avanza();
                // interpolazione
                ha_interpolazione = true;
                if !corrente.is_empty() {
                    segmenti.push(SegmentoStringa::Testo(corrente.clone()));
                    corrente.clear();
                }
                let mut expr_src = String::new();
                let mut depth = 1;
                while let Some(ec) = self.peek() {
                    if ec == '{' { depth += 1; }
                    if ec == '}' {
                        depth -= 1;
                        if depth == 0 { self.avanza(); break; }
                    }
                    expr_src.push(ec);
                    self.avanza();
                }
                segmenti.push(SegmentoStringa::Espressione(expr_src));
            } else {
                corrente.push(c);
                self.avanza();
            }
        }

        if ha_interpolazione {
            if !corrente.is_empty() {
                segmenti.push(SegmentoStringa::Testo(corrente));
            }
            Token::TestoInterpolato(segmenti)
        } else {
            Token::Testo(corrente)
        }
    }

    fn leggi_identificatore(&mut self) -> Token {
        let mut s = String::new();
        while let Some(c) = self.peek() {
            if c.is_alphanumeric() || c == '_' {
                s.push(c);
                self.avanza();
            } else {
                break;
            }
        }
        match s.as_str() {
            "variabile" => Token::Variabile,
            "funzione" => Token::Funzione,
            "fn" => Token::Fn,
            "se" => Token::Se,
            "altrimenti" => Token::Altrimenti,
            "per" => Token::Per,
            "in" => Token::In,
            "da" => Token::Da,
            "a" => Token::A,
            "finché" | "finche" => Token::Finche,
            "ritorna" => Token::Ritorna,
            "vero" => Token::Vero,
            "falso" => Token::Falso,
            "nullo" => Token::Nullo,
            "importa" => Token::Importa,
            "e" => Token::E,
            "o" => Token::O,
            "non" => Token::Non,
            "prova" => Token::Prova,
            "cattura" => Token::Cattura,
            "lancia" => Token::Lancia,
            "interrompi" => Token::Interrompi,
            "continua" => Token::Continua,
            _ => Token::Identificatore(s),
        }
    }

    pub fn tokenizza(&mut self) -> Result<Vec<TokenConPosizione>, String> {
        let mut tokens = Vec::new();

        loop {
            self.salta_spazi();
            let riga = self.riga;
            let colonna = self.colonna;

            let c = match self.peek() {
                None => {
                    tokens.push(TokenConPosizione { token: Token::EOF, riga, colonna });
                    break;
                }
                Some(c) => c,
            };

            let token = match c {
                '\n' => {
                    self.avanza();
                    Token::Newline
                }
                '/' if self.peek_next() == Some('/') => {
                    while let Some(c) = self.peek() {
                        if c == '\n' { break; }
                        self.avanza();
                    }
                    continue;
                }
                '"' => self.leggi_stringa(),
                '0'..='9' => self.leggi_numero(),
                c if c.is_alphabetic() || c == '_' => self.leggi_identificatore(),
                '=' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::UgualeUguale }
                    else if self.peek() == Some('>') { self.avanza(); Token::FrecciaDestra }
                    else { Token::Uguale }
                }
                '!' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::Diverso }
                    else { Token::Non }
                }
                '<' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::MinoreUguale }
                    else { Token::Minore }
                }
                '>' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::MaggioreUguale }
                    else { Token::Maggiore }
                }
                '&' => {
                    self.avanza();
                    if self.peek() == Some('&') { self.avanza(); Token::E }
                    else { return Err(format!("Carattere inatteso '&' a riga {riga}")); }
                }
                '|' => {
                    self.avanza();
                    if self.peek() == Some('|') { self.avanza(); Token::O }
                    else { return Err(format!("Carattere inatteso '|' a riga {riga}")); }
                }
                '+' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::PiùUguale }
                    else if self.peek() == Some('+') { self.avanza(); Token::PiùPiù }
                    else { Token::Più }
                }
                '-' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::MenoUguale }
                    else if self.peek() == Some('-') { self.avanza(); Token::MenoMeno }
                    else { Token::Meno }
                }
                '*' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::MoltiplicazioneUguale }
                    else { Token::Moltiplicazione }
                }
                '/' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::DivisioneUguale }
                    else { Token::Divisione }
                }
                '%' => {
                    self.avanza();
                    if self.peek() == Some('=') { self.avanza(); Token::ModuloUguale }
                    else { Token::Modulo }
                }
                '(' => { self.avanza(); Token::ParentesiAperta }
                ')' => { self.avanza(); Token::ParentesiChiusa }
                '{' => { self.avanza(); Token::GraffeAperta }
                '}' => { self.avanza(); Token::GraffeChiusa }
                '[' => { self.avanza(); Token::QuadreAperta }
                ']' => { self.avanza(); Token::QuadreChiusa }
                ',' => { self.avanza(); Token::Virgola }
                ';' => { self.avanza(); Token::PuntoVirgola }
                '.' => { self.avanza(); Token::Punto }
                ':' => { self.avanza(); Token::DuePunti }
                c => {
                    self.avanza();
                    return Err(format!("Carattere sconosciuto '{c}' a riga {riga}, colonna {colonna}"));
                }
            };

            tokens.push(TokenConPosizione { token, riga, colonna });
        }

        Ok(tokens)
    }
}
