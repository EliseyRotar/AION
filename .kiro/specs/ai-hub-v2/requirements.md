# Documento dei Requisiti — AION v2.0

## Introduzione

AION v2.0 è un aggiornamento maggiore della piattaforma enterprise AI esistente.
L'obiettivo è colmare le lacune operative identificate nella v1.0 aggiungendo audit log,
analytics di utilizzo, gestione avanzata dei documenti, miglioramenti agli agenti,
funzionalità self-service per gli utenti, export delle conversazioni, UX admin migliorata,
chat mobile-responsive, health check di sistema e gestione sicura dei token JWT.

---

## Glossario

- **System**: la piattaforma AION nel suo insieme (backend FastAPI + frontend React)
- **Admin**: utente con ruolo `admin`, ha accesso completo alla gestione della piattaforma
- **User**: utente con ruolo `user`, accede solo agli agenti e alle conversazioni assegnate
- **Agent**: assistente AI configurabile con system prompt, documenti RAG e parametri LLM
- **Document**: file (PDF, DOCX, TXT) caricato su un agente e indicizzato nel vector store FAISS
- **Conversation**: sequenza di messaggi tra un utente e un agente
- **Message**: singolo messaggio (ruolo `user` o `assistant`) all'interno di una conversazione
- **AuditLog**: record immutabile di un'azione amministrativa eseguita nel sistema
- **UsageStat**: aggregato di metriche di utilizzo (conteggio messaggi, token) per agente o utente
- **RefreshToken**: token opaco a lunga scadenza usato per ottenere nuovi access token JWT
- **AccessToken**: JWT a breve scadenza (60 min) usato per autenticare le richieste API
- **Feedback**: valutazione thumbs-up / thumbs-down lasciata da un utente su un messaggio assistant

---

## Requisiti

---

### Requisito 1 — Audit Log

**User Story:** Come amministratore, voglio che tutte le azioni critiche vengano registrate in un log immutabile, così da poter tracciare chi ha fatto cosa e quando.

#### Criteri di Accettazione

1. WHEN un admin crea, modifica o elimina un utente, THEN THE System SHALL creare un record AuditLog con campi: `actor_id`, `action`, `entity_type`, `entity_id`, `detail` (JSON), `created_at`
2. WHEN un admin crea, modifica o elimina un agente, THEN THE System SHALL creare un record AuditLog con gli stessi campi
3. WHEN un admin carica o elimina un documento da un agente, THEN THE System SHALL creare un record AuditLog
4. WHEN un admin crea, modifica o elimina un gruppo, THEN THE System SHALL creare un record AuditLog
5. THE System SHALL esporre un endpoint `GET /admin/audit-logs` che restituisce i log in ordine cronologico decrescente
6. WHEN viene richiesta la lista degli audit log, THE System SHALL supportare i parametri di query `page`, `page_size`, `actor_id`, `entity_type`, `action` per filtrare e paginare i risultati
7. THE AuditLog SHALL essere di sola lettura: nessun endpoint di modifica o cancellazione dei log è esposto
8. WHEN la pagina Audit Log viene visualizzata nell'interfaccia admin, THE System SHALL mostrare per ogni record: data/ora, nome dell'attore, azione, tipo entità, ID entità e dettaglio espandibile

---

### Requisito 2 — Analytics di Utilizzo

**User Story:** Come amministratore, voglio vedere statistiche di utilizzo reali per agente e per utente, così da capire quali risorse vengono usate di più e ottimizzare la piattaforma.

#### Criteri di Accettazione

1. WHEN un messaggio assistant viene salvato nel database, THE System SHALL incrementare il contatore `message_count` e aggiornare `token_count` nella tabella `usage_stats` per la coppia `(agent_id, user_id, date)`
2. THE System SHALL esporre `GET /admin/analytics` che restituisce: messaggi totali, token totali, messaggi per agente (top 10), messaggi per utente (top 10), trend giornaliero degli ultimi 30 giorni
3. WHEN la dashboard admin viene caricata, THE System SHALL mostrare grafici interattivi (usando Recharts) con: messaggi per agente (bar chart), trend giornaliero (line chart), top utenti (bar chart orizzontale)
4. THE System SHALL mostrare nella dashboard admin le statistiche reali al posto dei valori statici attuali
5. WHEN un admin visualizza il dettaglio di un agente, THE System SHALL mostrare il numero totale di messaggi e token usati per quell'agente
6. WHEN un admin visualizza il dettaglio di un utente, THE System SHALL mostrare il numero totale di messaggi inviati da quell'utente

---

### Requisito 3 — Gestione Documenti Avanzata

**User Story:** Come amministratore, voglio poter eliminare documenti dagli agenti, visualizzarne i dettagli e caricare più file contemporaneamente, così da gestire la knowledge base in modo efficiente.

#### Criteri di Accettazione

1. THE System SHALL esporre `DELETE /agents/{agent_id}/documents/{document_id}` che elimina il documento dal database, rimuove il file fisico dalla cartella `uploads/` e ricostruisce il vector store FAISS dell'agente
2. WHEN un documento viene eliminato, IF il vector store non può essere ricostruito, THEN THE System SHALL restituire HTTP 500 con messaggio di errore descrittivo e NON eliminare il record dal database
3. THE System SHALL accettare upload multipli tramite `POST /agents/{agent_id}/documents/batch` con campo `files` (lista di UploadFile)
4. WHEN viene richiesto il dettaglio di un documento tramite `GET /agents/{agent_id}/documents/{document_id}`, THE System SHALL restituire: `filename`, `file_type`, `file_size`, `chunk_count`, `status`, `uploaded_at`
5. WHEN l'interfaccia admin mostra i documenti di un agente, THE System SHALL permettere la selezione multipla e l'eliminazione in batch
6. WHEN un documento è in stato `processing`, THE System SHALL mostrare un indicatore di progresso animato nell'interfaccia
7. WHILE un documento è in stato `processing`, THE System SHALL aggiornare automaticamente lo stato ogni 3 secondi tramite polling

---

### Requisito 4 — Miglioramenti agli Agenti

**User Story:** Come amministratore, voglio poter modificare completamente un agente esistente, duplicarlo e testare il suo comportamento prima di renderlo disponibile agli utenti.

#### Criteri di Accettazione

1. THE System SHALL esporre un modal di modifica completa dell'agente che permette di aggiornare tutti i campi: nome, descrizione, system prompt, welcome message, modello, temperatura, emoji, colore, fallback
2. WHEN un admin clicca "Duplica Agente", THE System SHALL creare un nuovo agente con tutti i campi copiati dall'originale, nome prefissato con "Copia di ", e nessun documento né accesso copiato
3. THE System SHALL esporre `POST /agents/{agent_id}/test` che accetta `{"message": "..."}` e restituisce la risposta dell'agente senza salvare nulla nel database
4. WHEN l'interfaccia di test agente viene usata, THE System SHALL mostrare la risposta in streaming con indicazione della strategia RAG usata e del livello di confidenza
5. WHEN un admin modifica il system prompt di un agente, THE System SHALL mostrare un contatore di caratteri in tempo reale

---

### Requisito 5 — Self-Service Utente: Cambio Password

**User Story:** Come utente, voglio poter cambiare la mia password dalla pagina profilo senza dover contattare un amministratore.

#### Criteri di Accettazione

1. THE System SHALL esporre `PUT /auth/me/password` che accetta `{"current_password": "...", "new_password": "..."}` e aggiorna la password dell'utente autenticato
2. WHEN la password corrente fornita non corrisponde a quella memorizzata, THE System SHALL restituire HTTP 400 con messaggio "Password attuale non corretta"
3. WHEN la nuova password ha meno di 8 caratteri, THE System SHALL restituire HTTP 422 con messaggio di validazione
4. WHEN il cambio password ha successo, THE System SHALL restituire HTTP 200 e invalidare tutti i refresh token attivi dell'utente
5. THE System SHALL mostrare nella pagina Profilo un form con tre campi: password attuale, nuova password, conferma nuova password
6. WHEN le due password non coincidono nel form, THE System SHALL mostrare un errore di validazione lato client prima di inviare la richiesta

---

### Requisito 6 — Funzionalità Conversazioni

**User Story:** Come utente, voglio poter esportare le mie conversazioni, rinominare i titoli e lasciare feedback sui messaggi dell'AI, così da avere più controllo sulla mia esperienza di chat.

#### Criteri di Accettazione

1. THE System SHALL esporre `GET /chat/conversations/{conversation_id}/export?format=json` che restituisce la conversazione completa in formato JSON con tutti i messaggi, metadati e sorgenti
2. WHEN viene richiesto l'export JSON, THE System SHALL includere: `conversation_id`, `title`, `agent_name`, `created_at`, `exported_at`, lista di messaggi con `role`, `content`, `sources`, `created_at`
3. THE System SHALL esporre `PATCH /chat/conversations/{conversation_id}` che accetta `{"title": "..."}` e aggiorna il titolo della conversazione
4. WHEN il titolo aggiornato è vuoto o supera 255 caratteri, THE System SHALL restituire HTTP 422
5. THE System SHALL esporre `POST /chat/messages/{message_id}/feedback` che accetta `{"rating": "up" | "down"}` e salva il feedback sul messaggio
6. WHEN un feedback viene salvato, IF esiste già un feedback per quel messaggio da quell'utente, THEN THE System SHALL aggiornare il feedback esistente (upsert)
7. WHEN l'interfaccia chat mostra un messaggio assistant, THE System SHALL mostrare i pulsanti thumbs-up / thumbs-down con stato visivo che riflette il feedback già dato
8. WHEN l'utente clicca sul titolo di una conversazione nella sidebar, THE System SHALL permettere la modifica inline del titolo

---

### Requisito 7 — UX Admin: Ricerca, Filtri e Paginazione

**User Story:** Come amministratore, voglio poter cercare, filtrare e paginare le liste di utenti, gruppi e agenti, così da gestire piattaforme con molte entità in modo efficiente.

#### Criteri di Accettazione

1. WHEN viene chiamato `GET /admin/users`, THE System SHALL supportare i parametri `search` (stringa su username/email/full_name), `role`, `is_active`, `page` (default 1), `page_size` (default 20, max 100)
2. WHEN viene chiamato `GET /admin/groups`, THE System SHALL supportare i parametri `search` (stringa su name/description), `page`, `page_size`
3. WHEN viene chiamato `GET /agents/all`, THE System SHALL supportare i parametri `search` (stringa su name/description), `is_active`, `page`, `page_size`
4. THE System SHALL restituire per ogni lista paginata un oggetto con: `items`, `total`, `page`, `page_size`, `total_pages`
5. THE System SHALL esporre `POST /admin/users/bulk-action` che accetta `{"user_ids": [...], "action": "activate" | "deactivate" | "delete"}` per operazioni in batch
6. WHEN viene eseguita un'azione bulk su utenti, THE System SHALL restituire il numero di record modificati e una lista di eventuali errori per ID
7. WHEN l'interfaccia admin mostra la lista utenti, THE System SHALL mostrare una barra di ricerca, filtri per ruolo e stato, e controlli di paginazione
8. WHEN l'interfaccia admin mostra la lista agenti, THE System SHALL mostrare una barra di ricerca e controlli di paginazione

---

### Requisito 8 — Chat UX: Mobile e Syntax Highlighting

**User Story:** Come utente, voglio usare la chat su dispositivi mobili con una sidebar funzionale e vedere il codice con syntax highlighting, così da avere un'esperienza professionale su tutti i dispositivi.

#### Criteri di Accettazione

1. WHEN la chat viene visualizzata su viewport < 768px, THE System SHALL nascondere la sidebar e mostrare un pulsante hamburger per aprirla come overlay
2. WHEN la sidebar è aperta come overlay su mobile, THE System SHALL chiuderla automaticamente quando l'utente seleziona un agente o una conversazione
3. WHEN un messaggio assistant contiene un blocco di codice markdown (` ``` `), THE System SHALL renderizzarlo con syntax highlighting usando `react-syntax-highlighter`
4. WHEN viene renderizzato un blocco di codice, THE System SHALL mostrare il linguaggio rilevato e un pulsante "Copia" che copia il contenuto negli appunti
5. WHEN l'utente clicca "Copia" su un blocco di codice, THE System SHALL mostrare un feedback visivo di conferma per 2 secondi

---

### Requisito 9 — Sistema: Health Check e Refresh Token

**User Story:** Come amministratore di sistema, voglio un endpoint di health check e una gestione sicura dei token JWT con refresh automatico, così da monitorare la piattaforma e migliorare la sicurezza.

#### Criteri di Accettazione

1. THE System SHALL esporre `GET /health` (senza autenticazione) che restituisce: `status`, `version`, `database` (ok/error), `groq_api` (configured/missing), `vector_stores` (count), `uptime_seconds`
2. WHEN il database non è raggiungibile, THE System SHALL restituire `{"status": "degraded", "database": "error"}` con HTTP 200 (non 500) per non bloccare i load balancer
3. THE System SHALL esporre `POST /auth/refresh` che accetta un refresh token valido e restituisce un nuovo access token e un nuovo refresh token (rotation)
4. WHEN viene chiamato `POST /auth/login`, THE System SHALL restituire sia `access_token` (scadenza 60 min) che `refresh_token` (scadenza 30 giorni) nel body della risposta
5. THE System SHALL memorizzare i refresh token nella tabella `refresh_tokens` con campi: `token_hash`, `user_id`, `expires_at`, `revoked`
6. WHEN un refresh token viene usato, THE System SHALL revocarlo e emettere un nuovo refresh token (single-use rotation)
7. WHEN il frontend riceve HTTP 401, THE System SHALL tentare automaticamente il refresh del token usando il refresh token memorizzato in localStorage, e ripetere la richiesta originale
8. WHEN il refresh token è scaduto o revocato, THE System SHALL reindirizzare l'utente alla pagina di login

---

### Requisito 10 — Dashboard: Grafici Reali e Activity Feed

**User Story:** Come amministratore, voglio vedere grafici interattivi con dati reali e un feed delle attività recenti nella dashboard, così da avere una visione immediata dello stato della piattaforma.

#### Criteri di Accettazione

1. WHEN la dashboard admin viene caricata, THE System SHALL mostrare le statistiche aggregate reali (utenti, gruppi, agenti, conversazioni, documenti) con variazione rispetto al giorno precedente
2. THE System SHALL mostrare un grafico a barre (Recharts BarChart) con il numero di messaggi per agente negli ultimi 7 giorni
3. THE System SHALL mostrare un grafico a linee (Recharts LineChart) con il trend giornaliero dei messaggi negli ultimi 30 giorni
4. THE System SHALL mostrare un feed "Attività Recente" con gli ultimi 10 eventi degli audit log, con icona, descrizione e timestamp relativo
5. WHEN i dati della dashboard vengono caricati, THE System SHALL mostrare skeleton loader durante il caricamento e gestire gli errori mostrando un messaggio all'utente
6. THE System SHALL aggiornare automaticamente le statistiche della dashboard ogni 5 minuti tramite polling

---
