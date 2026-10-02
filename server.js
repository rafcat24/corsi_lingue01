const express = require('express');
const { Pool } = require('pg');
const argon2 = require('argon2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname)); // Serve i file HTML/CSS/JS statici

// Connessione al database PostgreSQL
/* const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    password: 'postgres', // <--- Aggiunto qui
    database: 'corsi_lingue',
    port: 5432,
}); */

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'corsi_lingue',
        password: 'postgres',
        port: 5432,
      }
);

// Endpoint di Login con verifica Argon2
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM Clienti WHERE Username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Utente non trovato' });
        }
        const user = result.rows[0];
        const match = await argon2.verify(user.passwordhash, password);
        
        if (!match) {
            return res.status(401).json({ error: 'Password errata' });
        }
        
        res.json({ id: user.idcliente, username: user.username, ruolo: user.ruolo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// Endpoint 3: Attivazione Corso (Segreteria)
app.post('/api/corsi', async (req, res) => {
    const { nomeCorso, numeroOre, dataInizio, importo } = req.body;
    try {
        const query = 'INSERT INTO Corsi (NomeCorso, NumeroOre, DataInizio, Importo, Attivo) VALUES ($1, $2, $3, $4, TRUE) RETURNING *';
        const newCorso = await pool.query(query, [nomeCorso, numeroOre, dataInizio, importo]);
        res.status(201).json(newCorso.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Errore creazione corso' });
    }
});

// Endpoint per ottenere i corsi attivi
app.get('/api/corsi/attivi', async (req, res) => {
    try {
        const corsi = await pool.query('SELECT * FROM Corsi WHERE Attivo = TRUE');
        res.json(corsi.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore caricamento corsi' });
    }
});

// Endpoint 4: Disattivazione Corso (Segreteria)
app.put('/api/corsi/:id/disattiva', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE Corsi SET Attivo = FALSE WHERE IDCorso = $1', [id]);
        res.json({ message: 'Corso disattivato con successo' });
    } catch (err) {
        res.status(500).json({ error: 'Errore disattivazione corso' });
    }
});

// Endpoint 5: Iscrizione ad un corso (Cliente)
app.post('/api/iscrizioni', async (req, res) => {
    const { idCliente, idCorso } = req.body;
    try {
        // Controlla se esiste già l'iscrizione
        const check = await pool.query('SELECT * FROM Iscrizioni WHERE IDCliente = $1 AND IDCorso = $2', [idCliente, idCorso]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Sei già iscritto a questo corso' });
        }
        
        const query = 'INSERT INTO Iscrizioni (IDCliente, IDCorso, Pagato) VALUES ($1, $2, FALSE) RETURNING *';
        const newIscrizione = await pool.query(query, [idCliente, idCorso]);
        res.status(201).json(newIscrizione.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Errore durante iscrizione' });
    }
});

// Endpoint per vedere le iscrizioni non pagate (Segreteria)
app.get('/api/iscrizioni/non-pagate', async (req, res) => {
    try {
        const query = `
            SELECT i.IDIscrizione, c.Nome, c.Cognome, co.NomeCorso 
            FROM Iscrizioni i
            JOIN Clienti c ON i.IDCliente = c.IDCliente
            JOIN Corsi co ON i.IDCorso = co.IDCorso
            WHERE i.Pagato = FALSE
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore caricamento iscrizioni' });
    }
});

// Endpoint 6: Registrazione Pagamento (Segreteria)
app.put('/api/iscrizioni/:id/paga', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE Iscrizioni SET Pagato = TRUE WHERE IDIscrizione = $1', [id]);
        res.json({ message: 'Pagamento registrato con successo' });
    } catch (err) {
        res.status(500).json({ error: 'Errore registrazione pagamento' });
    }
});

/*
const PORT = 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
*/

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});