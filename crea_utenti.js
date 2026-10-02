const { Pool } = require('pg');
const argon2 = require('argon2');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    password: 'postgres', // <--- Aggiunto qui
    database: 'corsi_lingue',
    port: 5432,
});

async function main() {
    try {
        // Cifriamo la password 'segreto123' per la segreteria
        const hashSegreteria = await argon2.hash('segreto123');
        // Cifriamo la password 'cliente123' per un cliente di prova
        const hashCliente = await argon2.hash('cliente123');

        // Inseriamo la segreteria
        await pool.query(
            `INSERT INTO Clienti (Nome, Cognome, Telefono, Username, PasswordHash, Ruolo) 
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (Username) DO NOTHING`,
            ['Admin', 'Segreteria', '3331112233', 'segreteria', hashSegreteria, 'segreteria']
        );

        // Inseriamo un cliente
        await pool.query(
            `INSERT INTO Clienti (Nome, Cognome, Telefono, Username, PasswordHash, Ruolo) 
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (Username) DO NOTHING`,
            ['Mario', 'Rossi', '3334445566', 'mario', hashCliente, 'cliente']
        );

        console.log("Utenti di test creati con successo!");
        process.exit(0);
    } catch (err) {
        console.error("Errore:", err);
        process.exit(1);
    }
}

main();