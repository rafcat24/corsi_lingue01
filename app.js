let currentUser = null;

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) throw new Error('Credenziali non valide');
        
        currentUser = await response.json();
        initApp();
    } catch (err) {
        alert(err.message);
    }
}

function initApp() {
    document.getElementById('mask-login').classList.add('hidden');
    document.getElementById('menu-bar').classList.remove('hidden');
    
    document.getElementById('user-info').innerText = `Utente: ${currentUser.username} (${currentUser.ruolo})`;
    
    const menuLinks = document.getElementById('menu-links');
    menuLinks.innerHTML = '';

    if (currentUser.ruolo === 'segreteria') {
        menuLinks.innerHTML = `
            <button onclick="showMask('mask-attiva-corso')">Attiva Corso</button>
            <button onclick="showMask('mask-disattiva-corso'); loadCorsiAttivi();">Disattiva Corso</button>
            <button onclick="showMask('mask-pagamento'); loadIscrizioniNonPagate();">Registra Pagamento</button>
        `;
        showMask('mask-attiva-corso');
    } else if (currentUser.ruolo === 'cliente') {
        menuLinks.innerHTML = `
            <button onclick="showMask('mask-iscrizione'); loadCorsiDisponibili();">Iscriviti a un Corso</button>
        `;
        showMask('mask-iscrizione');
        loadCorsiDisponibili();
    }
}

function showMask(maskId) {
    document.querySelectorAll('.mask').forEach(m => m.classList.add('hidden'));
    document.getElementById(maskId).classList.remove('hidden');
}

function logout() {
    currentUser = null;
    document.getElementById('menu-bar').classList.add('hidden');
    document.querySelectorAll('.mask').forEach(m => m.classList.add('hidden'));
    document.getElementById('mask-login').classList.remove('hidden');
    document.getElementById('form-login').reset();
}

async function handleCreaCorso(event) {
    event.preventDefault();
    const corso = {
        nomeCorso: document.getElementById('nome-corso').value,
        numeroOre: document.getElementById('numero-ore').value,
        dataInizio: document.getElementById('data-inizio').value,
        importo: document.getElementById('importo').value
    };

    const res = await fetch('/api/corsi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corso)
    });

    if (res.ok) {
        alert('Corso attivato con successo!');
        document.getElementById('form-corso').reset();
    } else {
        alert('Errore durante la creazione del corso.');
    }
}

async function loadCorsiAttivi() {
    const res = await fetch('/api/corsi/attivi');
    const corsi = await res.json();
    
    let html = '<table><tr><th>Nome</th><th>Ore</th><th>Data Inizio</th><th>Azione</th></tr>';
    if (corsi.length === 0) {
        html += '<tr><td colspan="4">Nessun corso attivo trovato.</td></tr>';
    }
    corsi.forEach(c => {
        html += `<tr>
            <td>${c.nomecorso}</td>
            <td>${c.numeroore}</td>
            <td>${c.datainizio.split('T')[0]}</td>
            <td><button onclick="confermaDisattivazione(${c.idcorso})">Disattiva</button></td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('lista-corsi-attivi').innerHTML = html;
}

async function confermaDisattivazione(idCorso) {
    if (confirm("Sei sicuro di voler disattivare questo corso?")) {
        const res = await fetch(`/api/corsi/${idCorso}/disattiva`, { method: 'PUT' });
        if (res.ok) {
            alert('Corso disattivato.');
            loadCorsiAttivi();
        }
    }
}

async function loadCorsiDisponibili() {
    const res = await fetch('/api/corsi/attivi');
    const corsi = await res.json();
    
    let html = '<table><tr><th>Nome</th><th>Ore</th><th>Data Inizio</th><th>Importo</th><th>Azione</th></tr>';
    if (corsi.length === 0) {
        html += '<tr><td colspan="5">Nessun corso disponibile al momento.</td></tr>';
    }
    corsi.forEach(c => {
        html += `<tr>
            <td>${c.nomecorso}</td>
            <td>${c.numeroore}</td>
            <td>${c.datainizio.split('T')[0]}</td>
            <td>€ ${c.importo}</td>
            <td><button onclick="iscriviCliente(${c.idcorso})">Iscriviti</button></td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('lista-corsi-disponibili').innerHTML = html;
}

async function iscriviCliente(idCorso) {
    const res = await fetch('/api/iscrizioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCliente: currentUser.id, idCorso: idCorso })
    });
    
    if (res.ok) {
        alert('Iscrizione effettuata con successo! (Stato: Non pagato)');
    } else {
        const errorData = await res.json();
        alert('Errore: ' + (errorData.error || 'Impossibile completare iscrizione'));
    }
}

async function loadIscrizioniNonPagate() {
    const res = await fetch('/api/iscrizioni/non-pagate');
    const iscrizioni = await res.json();
    
    let html = '<table><tr><th>Cliente</th><th>Corso</th><th>Azione</th></tr>';
    if (iscrizioni.length === 0) {
        html += '<tr><td colspan="3">Nessuna iscrizione in attesa di pagamento.</td></tr>';
    }
    iscrizioni.forEach(i => {
        html += `<tr>
            <td>${i.nome} ${i.cognome}</td>
            <td>${i.nomecorso}</td>
            <td><button onclick="registraPagamento(${i.idiscrizione})">Segna come Pagato</button></td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('lista-iscrizioni-aperte').innerHTML = html;
}

async function registraPagamento(idIscrizione) {
    const res = await fetch(`/api/iscrizioni/${idIscrizione}/paga`, { method: 'PUT' });
    if (res.ok) {
        alert('Pagamento registrato correttamente.');
        loadIscrizioniNonPagate();
    }
}