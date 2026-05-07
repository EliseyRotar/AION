# Piano di Implementazione — AION v2.0

## Overview

Le task sono ordinate per dipendenza: prima le fondamenta (DB + auth), poi le feature backend, poi il frontend.
Ogni task di implementazione è accompagnata da sub-task di test opzionali.

---

## Tasks

- [x] 1. Setup infrastruttura: Alembic, dipendenze e struttura test
  - Aggiungere `alembic`, `pytest`, `pytest-asyncio`, `httpx`, `hypothesis` a `requirements.txt`
  - Aggiungere `recharts`, `react-syntax-highlighter` a `frontend/package.json`
  - Inizializzare Alembic: `alembic init alembic` nella cartella `backend/`
  - Configurare `alembic/env.py` per usare `DATABASE_URL` da `settings` e i modelli SQLAlchemy
  - Creare cartella `backend/tests/` con `conftest.py` (client async di test, DB in-memory)
  - _Requirements: tutti_

- [x] 2. Modelli DB e migrazione iniziale v2.0
  - [x] 2.1 Aggiungere modelli `AuditLog`, `UsageStat`, `RefreshToken` in `backend/app/models.py`
    - Aggiungere campi `feedback`, `feedback_user_id`, `token_count` al modello `Message`
    - _Requirements: 1.1, 2.1, 5.5, 6.5, 9.5_
  - [x] 2.2 Creare migrazione Alembic `v2_new_tables`
    - Generare con `alembic revision --autogenerate -m "v2_new_tables"`
    - Verificare che la migrazione crei le 3 nuove tabelle e i 3 nuovi campi su `messages`
    - _Requirements: tutti_
  - [x] 2.3 Scrivere unit test per i nuovi modelli
    - Verificare che i modelli si creino e si salvino correttamente nel DB di test
    - _Requirements: 1.1, 2.1, 9.5_

- [x] 3. Autenticazione: Refresh Token e Cambio Password
  - [x] 3.1 Implementare `create_refresh_token()` e `verify_refresh_token()` in `backend/app/auth.py`
    - Generare token opaco con `secrets.token_hex(32)`, memorizzare SHA-256 hash nel DB
    - Scadenza 30 giorni, campo `revoked` per la rotation
    - _Requirements: 9.3, 9.4, 9.5, 9.6_
  - [x] 3.2 Aggiornare `POST /auth/login` per restituire anche `refresh_token` nel body
    - Creare record `RefreshToken` nel DB al login
    - _Requirements: 9.4_
  - [x] 3.3 Implementare `POST /auth/refresh` in `auth_routes.py`
    - Verificare hash, controllare scadenza e `revoked`, emettere nuovo access token + nuovo refresh token, revocare il vecchio
    - _Requirements: 9.3, 9.6_
  - [x] 3.4 Implementare `PUT /auth/me/password` in `auth_routes.py`
    - Verificare password corrente, validare nuova password (min 8 chars), aggiornare hash, revocare tutti i refresh token dell'utente
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 3.5 Scrivere property test per refresh token rotation (Property 17)
    - **Property 17: Refresh token rotation — single-use**
    - **Validates: Requirements 9.3, 9.4, 9.5, 9.6**
    - _Requirements: 9.3, 9.6_
  - [x] 3.6 Scrivere property test per cambio password (Property 9, 10, 11)
    - **Property 9: Cambio password round trip**
    - **Property 10: Password corta rifiutata**
    - **Property 11: Cambio password revoca refresh token**
    - **Validates: Requirements 5.1, 5.3, 5.4**
    - _Requirements: 5.1, 5.3, 5.4_

- [x] 4. Checkpoint — Verificare che tutti i test passino
  - Eseguire `pytest backend/tests/ -v`. Assicurarsi che tutti i test passino. Chiedere all'utente se ci sono domande.

- [ ] 5. Audit Log — Backend
  - [x] 5.1 Creare funzione helper `create_audit_log(db, actor_id, action, entity_type, entity_id, detail)` in `backend/app/audit.py`
    - La funzione deve essere chiamabile all'interno di una transazione esistente
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 5.2 Integrare `create_audit_log` in tutti gli endpoint CRUD di `admin_routes.py`
    - Coprire: create/update/delete utente, create/update/delete gruppo
    - _Requirements: 1.1, 1.4_
  - [x] 5.3 Integrare `create_audit_log` in tutti gli endpoint CRUD di `agent_routes.py`
    - Coprire: create/update/delete agente, upload/delete documento
    - _Requirements: 1.2, 1.3_
  - [x] 5.4 Implementare `GET /admin/audit-logs` con paginazione e filtri in `admin_routes.py`
    - Parametri: `page`, `page_size`, `actor_id`, `entity_type`, `action`
    - Risposta: `{ items, total, page, page_size, total_pages }`
    - _Requirements: 1.5, 1.6_
  - [-] 5.5 Scrivere property test per audit log (Property 1, 2)
    - **Property 1: Ogni azione admin genera un audit log**
    - **Property 2: Paginazione audit log corretta**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6**
    - _Requirements: 1.1, 1.6_

- [ ] 6. Analytics di Utilizzo — Backend
  - [~] 6.1 Creare funzione `update_usage_stats(db, agent_id, user_id, token_count)` in `backend/app/analytics.py`
    - Usare `INSERT OR REPLACE` (upsert) sulla tabella `usage_stats` per la data corrente
    - _Requirements: 2.1_
  - [~] 6.2 Integrare `update_usage_stats` nel salvataggio del messaggio assistant in `chat_routes.py`
    - Stimare `token_count` come `len(response_text.split()) * 1.3` se non disponibile dall'API Groq
    - _Requirements: 2.1_
  - [~] 6.3 Implementare `GET /admin/analytics` in `analytics_routes.py`
    - Restituire: totali, top 10 agenti, top 10 utenti, trend 30 giorni
    - Registrare il nuovo router in `main.py`
    - _Requirements: 2.2_
  - [~] 6.4 Scrivere property test per usage stats (Property 3)
    - **Property 3: Usage stats incrementate per ogni messaggio**
    - **Validates: Requirements 2.1**
    - _Requirements: 2.1_

- [ ] 7. Gestione Documenti Avanzata — Backend
  - [~] 7.1 Implementare `DELETE /agents/{agent_id}/documents/{document_id}` in `agent_routes.py`
    - Eliminare file fisico da `uploads/`, eliminare record DB, ricostruire FAISS con i documenti rimanenti
    - Se la ricostruzione FAISS fallisce: rollback eliminazione DB, restituire HTTP 500
    - _Requirements: 3.1, 3.2_
  - [~] 7.2 Implementare `POST /agents/{agent_id}/documents/batch` in `agent_routes.py`
    - Accettare `files: List[UploadFile]`, processare ciascuno in background task
    - _Requirements: 3.3_
  - [~] 7.3 Implementare `GET /agents/{agent_id}/documents/{document_id}` in `agent_routes.py`
    - Restituire tutti i campi del documento
    - _Requirements: 3.4_
  - [~] 7.4 Scrivere property test per documenti (Property 4, 5)
    - **Property 4: Eliminazione documento rimuove file e record DB**
    - **Property 5: Upload batch crea N record documento**
    - **Validates: Requirements 3.1, 3.3**
    - _Requirements: 3.1, 3.3_

- [ ] 8. Miglioramenti Agenti — Backend
  - [~] 8.1 Implementare `POST /agents/{agent_id}/duplicate` in `agent_routes.py`
    - Copiare tutti i campi scalari, prefissare nome con "Copia di ", non copiare documenti né relazioni
    - _Requirements: 4.2_
  - [~] 8.2 Implementare `POST /agents/{agent_id}/test` in `agent_routes.py`
    - Eseguire RAG + generazione LLM senza creare Conversation né Message nel DB
    - Restituire: `response`, `strategy`, `confidence`, `sources`
    - _Requirements: 4.3_
  - [~] 8.3 Aggiornare `GET /agents/all` con paginazione e ricerca
    - Parametri: `search`, `is_active`, `page`, `page_size`
    - _Requirements: 7.3_
  - [~] 8.4 Scrivere property test per agenti (Property 6, 7, 8)
    - **Property 6: Modifica agente persiste tutti i campi**
    - **Property 7: Duplicazione agente copia i campi corretti**
    - **Property 8: Test agente non persiste dati**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 9. Admin UX: Paginazione, Ricerca e Bulk Actions — Backend
  - [~] 9.1 Aggiornare `GET /admin/users` con paginazione e ricerca in `admin_routes.py`
    - Parametri: `search`, `role`, `is_active`, `page`, `page_size`
    - _Requirements: 7.1_
  - [~] 9.2 Aggiornare `GET /admin/groups` con paginazione e ricerca in `admin_routes.py`
    - Parametri: `search`, `page`, `page_size`
    - _Requirements: 7.2_
  - [~] 9.3 Implementare `POST /admin/users/bulk-action` in `admin_routes.py`
    - Azioni: `activate`, `deactivate`, `delete`
    - Restituire: `{ "modified": N, "errors": [...] }`
    - _Requirements: 7.5, 7.6_
  - [~] 9.4 Scrivere property test per paginazione e bulk action (Property 15, 16)
    - **Property 15: Paginazione liste admin corretta**
    - **Property 16: Bulk action modifica tutti gli utenti selezionati**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6**
    - _Requirements: 7.1, 7.5_

- [ ] 10. Funzionalità Conversazioni — Backend
  - [~] 10.1 Implementare `PATCH /chat/conversations/{conversation_id}` in `chat_routes.py`
    - Accettare `{ "title": "..." }`, validare lunghezza (1–255 chars)
    - _Requirements: 6.3, 6.4_
  - [~] 10.2 Implementare `GET /chat/conversations/{conversation_id}/export` in `chat_routes.py`
    - Restituire JSON con tutti i messaggi, metadati e sorgenti
    - _Requirements: 6.1, 6.2_
  - [~] 10.3 Implementare `POST /chat/messages/{message_id}/feedback` in `chat_routes.py`
    - Upsert su `messages.feedback` e `messages.feedback_user_id`
    - _Requirements: 6.5, 6.6_
  - [~] 10.4 Scrivere property test per conversazioni (Property 12, 13, 14)
    - **Property 12: Export conversazione round trip**
    - **Property 13: Rinomina titolo persiste**
    - **Property 14: Feedback upsert idempotente**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
    - _Requirements: 6.1, 6.3, 6.5_

- [ ] 11. Health Check — Backend
  - [~] 11.1 Implementare `GET /health` in `backend/app/main.py`
    - Verificare connessione DB con query `SELECT 1`, controllare `GROQ_API_KEY`, contare vector stores
    - Restituire sempre HTTP 200 anche in stato degradato
    - _Requirements: 9.1, 9.2_
  - [~] 11.2 Scrivere unit test per health check
    - Test con DB ok, test con DB non raggiungibile (mock)
    - _Requirements: 9.1, 9.2_

- [~] 12. Checkpoint — Verificare che tutti i test backend passino
  - Eseguire `pytest backend/tests/ -v --tb=short`. Assicurarsi che tutti i test passino. Chiedere all'utente se ci sono domande.

- [ ] 13. Frontend: Aggiornamento AuthContext e API service
  - [~] 13.1 Aggiornare `AuthContext.jsx` per gestire `refresh_token`
    - Salvare `refresh_token` in `localStorage` al login
    - Aggiungere funzione `refreshAccessToken()` che chiama `POST /auth/refresh`
    - _Requirements: 9.7, 9.8_
  - [~] 13.2 Aggiornare `api.js` per intercettare HTTP 401 e tentare il refresh automatico
    - Nell'interceptor response: se 401 e non è una richiesta di login/refresh, chiamare `refreshAccessToken()` e ripetere la richiesta originale
    - Se il refresh fallisce, redirect a `/login`
    - _Requirements: 9.7, 9.8_
  - [~] 13.3 Aggiungere tutti i nuovi endpoint in `api.js`
    - `authAPI.changePassword`, `authAPI.refresh`
    - `adminAPI.getAuditLogs`, `adminAPI.getAnalytics`, `adminAPI.bulkAction`
    - `agentsAPI.deleteDocument`, `agentsAPI.uploadDocuments`, `agentsAPI.testAgent`, `agentsAPI.duplicateAgent`
    - `chatAPI.renameConversation`, `chatAPI.exportConversation`, `chatAPI.sendFeedback`
    - _Requirements: tutti_

- [ ] 14. Frontend: Cambio Password nel Profilo
  - [~] 14.1 Aggiornare `Profile.jsx` con form cambio password
    - Tre campi: password attuale, nuova password, conferma nuova password
    - Validazione client-side: nuova password ≥ 8 chars, le due password coincidono
    - Chiamare `authAPI.changePassword` e mostrare toast di successo/errore
    - _Requirements: 5.5, 5.6_

- [ ] 15. Frontend: Gestione Documenti Avanzata nella pagina Agenti
  - [~] 15.1 Aggiornare `Agents.jsx` per supportare eliminazione documenti
    - Aggiungere pulsante elimina accanto a ogni documento con conferma
    - Chiamare `agentsAPI.deleteDocument` e aggiornare la lista
    - _Requirements: 3.1, 3.5_
  - [~] 15.2 Aggiornare il modal upload per supportare multi-file
    - Usare `input[type=file][multiple]` e chiamare `agentsAPI.uploadDocuments`
    - _Requirements: 3.3_
  - [~] 15.3 Aggiungere modal test agente (`AgentTestModal.jsx`)
    - Input messaggio, pulsante invia, risposta in streaming con strategia e confidenza
    - Chiamare `agentsAPI.testAgent`
    - _Requirements: 4.3, 4.4_
  - [~] 15.4 Aggiungere pulsante "Duplica" su ogni agente in `Agents.jsx`
    - Chiamare `agentsAPI.duplicateAgent` e ricaricare la lista
    - _Requirements: 4.2_
  - [~] 15.5 Aggiornare il modal creazione/modifica agente per mostrare contatore caratteri sul system prompt
    - _Requirements: 4.5_

- [ ] 16. Frontend: Admin UX — Ricerca, Paginazione e Bulk Actions
  - [~] 16.1 Aggiornare `Users.jsx` con barra di ricerca, filtri e paginazione
    - Barra di ricerca (debounce 300ms), filtro ruolo, filtro stato attivo
    - Controlli paginazione (prev/next, numero pagina, totale)
    - Checkbox per selezione multipla e pulsante bulk action
    - _Requirements: 7.1, 7.7_
  - [~] 16.2 Aggiornare `Groups.jsx` con barra di ricerca e paginazione
    - _Requirements: 7.2_
  - [~] 16.3 Aggiornare `Agents.jsx` con barra di ricerca e paginazione
    - _Requirements: 7.3, 7.8_

- [ ] 17. Frontend: Pagina Audit Log
  - [~] 17.1 Creare `pages/AuditLogs.jsx`
    - Tabella con colonne: data/ora, attore, azione, tipo entità, ID entità, dettaglio (espandibile)
    - Filtri: tipo entità, azione, attore
    - Paginazione
    - _Requirements: 1.5, 1.8_
  - [~] 17.2 Aggiungere link "Audit Log" nella sidebar admin in `Sidebar.jsx`
    - Aggiungere route `/audit-logs` in `App.jsx`
    - _Requirements: 1.8_

- [ ] 18. Frontend: Dashboard con Grafici Reali
  - [~] 18.1 Creare componente `AnalyticsCharts.jsx` con Recharts
    - `BarChart` messaggi per agente (ultimi 7 giorni)
    - `LineChart` trend giornaliero messaggi (ultimi 30 giorni)
    - Skeleton loader durante il caricamento
    - _Requirements: 10.2, 10.3, 10.5_
  - [~] 18.2 Aggiornare `Dashboard.jsx` per usare dati reali da `GET /admin/analytics`
    - Sostituire statistiche statiche con dati dall'API
    - Aggiungere feed "Attività Recente" con ultimi 10 audit log
    - Polling ogni 5 minuti con `setInterval`
    - _Requirements: 10.1, 10.4, 10.6_

- [ ] 19. Frontend: Chat UX — Mobile e Syntax Highlighting
  - [~] 19.1 Creare componente `CodeBlock.jsx` con `react-syntax-highlighter`
    - Rilevamento automatico del linguaggio, tema Prism
    - Pulsante "Copia" con feedback visivo 2 secondi
    - _Requirements: 8.3, 8.4, 8.5_
  - [~] 19.2 Aggiornare `Chat.jsx` per usare `CodeBlock` nel rendering dei messaggi
    - Passare `components={{ code: CodeBlock }}` a `ReactMarkdown`
    - _Requirements: 8.3_
  - [~] 19.3 Rendere la sidebar di `Chat.jsx` mobile-responsive
    - Su viewport < 768px: nascondere sidebar, mostrare pulsante hamburger
    - Sidebar come overlay con backdrop, chiusura automatica alla selezione
    - _Requirements: 8.1, 8.2_
  - [~] 19.4 Aggiungere componente `FeedbackButtons.jsx` ai messaggi assistant
    - Thumbs up / thumbs down con stato visivo (colore attivo)
    - Chiamare `chatAPI.sendFeedback` al click
    - _Requirements: 6.7_
  - [~] 19.5 Aggiungere rinomina inline del titolo conversazione nella sidebar
    - Click sul titolo → input editabile, Enter per salvare, Escape per annullare
    - Chiamare `chatAPI.renameConversation`
    - _Requirements: 6.8_
  - [~] 19.6 Aggiungere pulsante "Esporta JSON" nel header della conversazione
    - Chiamare `chatAPI.exportConversation` e scaricare il file con `URL.createObjectURL`
    - _Requirements: 6.1_

- [~] 20. Checkpoint Finale — Verificare integrazione completa
  - Eseguire `pytest backend/tests/ -v`. Assicurarsi che tutti i test passino.
  - Verificare manualmente i flussi principali: login con refresh, cambio password, audit log, grafici dashboard, chat mobile, syntax highlighting.
  - Chiedere all'utente se ci sono domande o aggiustamenti.

---

## Note

- I task contrassegnati con `*` sono opzionali e possono essere saltati per un MVP più rapido
- Ogni task fa riferimento ai requisiti specifici per la tracciabilità
- I checkpoint garantiscono la validazione incrementale
- I property test usano `hypothesis` con `@settings(max_examples=100)` e il tag `# Feature: ai-hub-v2, Property N: <testo>`
