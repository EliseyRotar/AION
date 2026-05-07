# Design Tecnico — AION v2.0

## Overview

AION v2.0 estende la piattaforma esistente (FastAPI + SQLite/SQLAlchemy async + React 19 + Vite + Tailwind)
con dieci aree di miglioramento. L'architettura rimane monolitica (un backend, un frontend) per semplicità
operativa, ma introduce nuovi modelli DB, nuovi route file, e nuovi componenti React.

Nessuna migrazione a database esterno è prevista: SQLite rimane il database di produzione.
Le migrazioni di schema vengono gestite con Alembic (nuovo requisito di tooling).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React 19 + Vite + Tailwind CSS (Frontend)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Dashboard│ │  Agents  │ │   Chat   │ │ AuditLogs/    │  │
│  │ (charts) │ │ (edit+  │ │ (mobile+ │ │ Analytics     │  │
│  │          │ │  test)   │ │  syntax) │ │               │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  AuthContext (access_token + refresh_token rotation)        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / SSE
┌────────────────────────▼────────────────────────────────────┐
│  FastAPI Backend                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │auth_     │ │admin_    │ │agent_    │ │chat_routes   │  │
│  │routes    │ │routes    │ │routes    │ │              │  │
│  │(+refresh)│ │(+audit,  │ │(+delete  │ │(+feedback,   │  │
│  │          │ │ analytics│ │  doc,    │ │ export,      │  │
│  │          │ │ bulk)    │ │  test,   │ │ rename)      │  │
│  │          │ │          │ │  dup)    │ │              │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SQLAlchemy Async + SQLite (Alembic migrations)      │  │
│  │  + FAISS vector stores + Groq LLM + RAG Engine       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Decisioni Architetturali

1. **Alembic per le migrazioni**: invece di `create_all()` al boot, si usa Alembic per gestire le modifiche allo schema in modo incrementale e reversibile.
2. **Audit log sincroni**: i record AuditLog vengono scritti nella stessa transazione DB dell'azione che li genera, garantendo consistenza.
3. **UsageStat con upsert giornaliero**: una riga per `(agent_id, user_id, date)` aggiornata con `INSERT OR REPLACE` per efficienza.
4. **Refresh token con hashing**: il token viene memorizzato come SHA-256 hash, mai in chiaro.
5. **Recharts**: libreria scelta per i grafici (già compatibile con React 19, leggera, nessuna dipendenza da D3 diretta).
6. **react-syntax-highlighter**: libreria scelta per il syntax highlighting (supporta 100+ linguaggi, tema Prism).

---

## Components and Interfaces

### Backend — Nuovi Route File

#### `backend/app/routes/analytics_routes.py`
- `GET /admin/analytics` — dati aggregati per grafici dashboard

#### Modifiche a `admin_routes.py`
- `GET /admin/audit-logs` — lista paginata con filtri
- `POST /admin/users/bulk-action` — azioni bulk su utenti
- `GET /admin/users` — aggiornato con paginazione e ricerca
- `GET /admin/groups` — aggiornato con paginazione e ricerca

#### Modifiche a `agent_routes.py`
- `DELETE /agents/{agent_id}/documents/{document_id}` — elimina documento + ricostruisce FAISS
- `POST /agents/{agent_id}/documents/batch` — upload multiplo (lista di UploadFile)
- `GET /agents/{agent_id}/documents/{document_id}` — dettaglio documento (`filename`, `file_type`, `file_size`, `chunk_count`, `status`, `uploaded_at`)
- `POST /agents/{agent_id}/test` — test agente senza persistenza; risposta: `{ response, strategy, confidence, sources }`
- `POST /agents/{agent_id}/duplicate` — duplica agente
- `GET /agents/all` — aggiornato con paginazione e ricerca

#### Modifiche a `auth_routes.py`
- `POST /auth/refresh` — refresh token rotation
- `PUT /auth/me/password` — cambio password self-service

#### Modifiche a `chat_routes.py`
- `PATCH /chat/conversations/{conversation_id}` — rinomina titolo
- `GET /chat/conversations/{conversation_id}/export` — export JSON
- `POST /chat/messages/{message_id}/feedback` — feedback thumbs up/down

#### Nuovo `GET /health` in `main.py`

### Frontend — Nuovi Componenti

| Componente | Percorso | Scopo |
|---|---|---|
| `AnalyticsCharts` | `components/ui/AnalyticsCharts.jsx` | Grafici Recharts riutilizzabili |
| `AuditLogs` | `pages/AuditLogs.jsx` | Pagina log admin |
| `CodeBlock` | `components/ui/CodeBlock.jsx` | Syntax highlighting + pulsante copia con feedback visivo 2s |
| `MobileSidebar` | `components/layout/MobileSidebar.jsx` | Sidebar overlay mobile con backdrop e chiusura automatica |
| `FeedbackButtons` | `components/ui/FeedbackButtons.jsx` | Thumbs up/down con stato visivo attivo per messaggi assistant |
| `AgentTestModal` | `components/ui/AgentTestModal.jsx` | Modal test agente con risposta streaming, strategia RAG e confidenza |

### Frontend — Comportamenti Chiave

- **Interceptor 401**: `api.js` intercetta ogni risposta HTTP 401 (eccetto `/auth/login` e `/auth/refresh`), chiama `refreshAccessToken()`, ripete la richiesta originale. Se il refresh fallisce, redirect a `/login` con messaggio "Sessione scaduta".
- **Polling dashboard**: `Dashboard.jsx` aggiorna le statistiche ogni 5 minuti tramite `setInterval` + cleanup su unmount.
- **Polling stato documento**: quando almeno un documento è in stato `processing`, `Agents.jsx` esegue polling ogni 3 secondi per aggiornare lo stato; il polling si ferma quando tutti i documenti sono `ready` o `error`.
- **Rinomina inline conversazione**: click sul titolo nella sidebar → `<input>` editabile in-place; Enter per salvare, Escape per annullare; chiama `chatAPI.renameConversation`.
- **Contatore caratteri system prompt**: il modal creazione/modifica agente mostra un contatore live `N / max` sotto il campo system prompt.
- **Selezione multipla documenti**: la lista documenti di un agente supporta checkbox per selezione multipla e un pulsante "Elimina selezionati" che chiama `agentsAPI.deleteDocument` in sequenza.

---

## Data Models

### Nuove Tabelle

#### `audit_logs`
```sql
CREATE TABLE audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(50) NOT NULL,   -- 'create', 'update', 'delete', 'upload', 'bulk_action'
    entity_type VARCHAR(50) NOT NULL,   -- 'user', 'agent', 'group', 'document'
    entity_id   INTEGER,
    detail      JSON,                   -- snapshot dei campi modificati
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

#### `usage_stats`
```sql
CREATE TABLE usage_stats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id      INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date          DATE NOT NULL,
    message_count INTEGER DEFAULT 0,
    token_count   INTEGER DEFAULT 0,
    UNIQUE(agent_id, user_id, date)
);
CREATE INDEX idx_usage_stats_date ON usage_stats(date);
CREATE INDEX idx_usage_stats_agent ON usage_stats(agent_id);
```

#### `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hex
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  DATETIME NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

### Modifiche a Tabelle Esistenti

#### `messages` — nuovi campi
```sql
ALTER TABLE messages ADD COLUMN feedback VARCHAR(4);  -- 'up', 'down', NULL
ALTER TABLE messages ADD COLUMN feedback_user_id INTEGER REFERENCES users(id);
ALTER TABLE messages ADD COLUMN token_count INTEGER DEFAULT 0;
```

### Modelli SQLAlchemy Aggiornati

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id          = Column(Integer, primary_key=True)
    actor_id    = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    action      = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id   = Column(Integer)
    detail      = Column(JSON)
    created_at  = Column(DateTime, default=datetime.utcnow)
    actor       = relationship("User", foreign_keys=[actor_id])

class UsageStat(Base):
    __tablename__ = "usage_stats"
    id            = Column(Integer, primary_key=True)
    agent_id      = Column(Integer, ForeignKey('agents.id', ondelete='CASCADE'))
    user_id       = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    date          = Column(Date, nullable=False)
    message_count = Column(Integer, default=0)
    token_count   = Column(Integer, default=0)
    __table_args__ = (UniqueConstraint('agent_id', 'user_id', 'date'),)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id         = Column(Integer, primary_key=True)
    token_hash = Column(String(64), unique=True, nullable=False)
    user_id    = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    expires_at = Column(DateTime, nullable=False)
    revoked    = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user       = relationship("User")
```

### Schema API — Nuovi Endpoint

#### `POST /auth/login` — Response aggiornata
```json
{
  "access_token": "eyJ...",
  "refresh_token": "opaque-random-64-chars",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### `POST /auth/refresh`
```json
// Request
{ "refresh_token": "opaque-random-64-chars" }
// Response
{ "access_token": "eyJ...", "refresh_token": "new-opaque-token", "token_type": "bearer" }
```

#### `GET /admin/audit-logs?page=1&page_size=20&entity_type=user&action=delete`
```json
{
  "items": [
    {
      "id": 42,
      "actor": { "id": 1, "username": "admin" },
      "action": "delete",
      "entity_type": "user",
      "entity_id": 7,
      "detail": { "username": "mario.rossi" },
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

#### `GET /admin/analytics`
```json
{
  "totals": {
    "messages": 1240,
    "tokens": 890000,
    "users": 42,
    "groups": 8,
    "agents": 5,
    "conversations": 310,
    "documents": 27,
    "messages_delta_pct": 12.5,
    "users_delta_pct": 0.0
  },
  "by_agent": [{ "agent_id": 1, "agent_name": "HR Bot", "message_count": 450 }],
  "by_user": [{ "user_id": 3, "username": "luca.b", "message_count": 120 }],
  "daily_trend": [{ "date": "2025-01-15", "message_count": 45, "token_count": 32000 }],
  "recent_activity": [
    {
      "id": 42,
      "actor": { "id": 1, "username": "admin" },
      "action": "delete",
      "entity_type": "user",
      "entity_id": 7,
      "detail": { "username": "mario.rossi" },
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

> `totals.*_delta_pct` rappresenta la variazione percentuale rispetto al giorno precedente per le metriche principali (messaggi, utenti). `recent_activity` contiene gli ultimi 10 record AuditLog, evitando una seconda chiamata separata dalla dashboard.

#### `GET /health`
```json
{
  "status": "ok",
  "version": "2.0.0",
  "database": "ok",
  "groq_api": "configured",
  "vector_stores": 3,
  "uptime_seconds": 3600
}
```

---

## Correctness Properties

*Una proprietà è una caratteristica o comportamento che deve essere vera per tutte le esecuzioni valide del sistema — essenzialmente, una dichiarazione formale su cosa il sistema deve fare. Le proprietà fungono da ponte tra le specifiche leggibili dall'uomo e le garanzie di correttezza verificabili automaticamente.*


### Proprietà di Correttezza

Le proprietà seguenti derivano dall'analisi dei criteri di accettazione. Ogni proprietà è universalmente quantificata e implementabile come property-based test con `hypothesis` (Python).

---

**Property 1: Ogni azione admin genera un audit log**
*Per qualsiasi* entità (utente, agente, gruppo, documento) e qualsiasi azione CRUD eseguita da un admin, dopo l'esecuzione dell'azione deve esistere nel database esattamente un record AuditLog con `entity_type`, `entity_id` e `action` corrispondenti.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

---

**Property 2: Paginazione audit log corretta**
*Per qualsiasi* numero N di audit log nel database e qualsiasi `page_size` K (1 ≤ K ≤ 100), la risposta di `GET /admin/audit-logs?page=P&page_size=K` deve contenere esattamente `min(K, max(0, N - (P-1)*K))` elementi, e `total` deve essere uguale a N.
**Validates: Requirements 1.6, 7.4**

---

**Property 3: Usage stats incrementate per ogni messaggio**
*Per qualsiasi* coppia (agent_id, user_id) e qualsiasi numero M di messaggi inviati in una data D, il valore di `usage_stats.message_count` per quella coppia e quella data deve essere uguale a M.
**Validates: Requirements 2.1**

---

**Property 4: Eliminazione documento rimuove file e record DB**
*Per qualsiasi* documento in stato `ready` associato a un agente, dopo la chiamata a `DELETE /agents/{agent_id}/documents/{document_id}`, il record non deve esistere nel database e il file fisico non deve esistere nel filesystem.
**Validates: Requirements 3.1**

---

**Property 5: Upload batch crea N record documento**
*Per qualsiasi* lista di N file validi (PDF, DOCX, TXT) caricati tramite `POST /agents/{agent_id}/documents/batch`, devono essere creati esattamente N record Document nel database con `agent_id` corretto.
**Validates: Requirements 3.3**

---

**Property 6: Modifica agente persiste tutti i campi**
*Per qualsiasi* agente esistente e qualsiasi combinazione valida di campi aggiornati tramite `PUT /agents/{agent_id}`, dopo la risposta HTTP 200, il recupero dell'agente tramite `GET /agents/all` deve restituire esattamente i valori inviati nell'update.
**Validates: Requirements 4.1**

---

**Property 7: Duplicazione agente copia i campi corretti**
*Per qualsiasi* agente sorgente, dopo la chiamata a `POST /agents/{agent_id}/duplicate`, il nuovo agente deve avere: stesso `system_prompt`, stesso `base_model`, stessa `temperature`, nome prefissato con "Copia di ", lista documenti vuota, lista gruppi vuota, lista utenti vuota.
**Validates: Requirements 4.2**

---

**Property 8: Test agente non persiste dati**
*Per qualsiasi* agente e qualsiasi messaggio di test, dopo la chiamata a `POST /agents/{agent_id}/test`, il numero di conversazioni e messaggi nel database deve essere identico a prima della chiamata.
**Validates: Requirements 4.3**

---

**Property 9: Cambio password — round trip di autenticazione**
*Per qualsiasi* utente e qualsiasi nuova password valida (≥ 8 caratteri), dopo una chiamata riuscita a `PUT /auth/me/password`, il login con la nuova password deve restituire HTTP 200, e il login con la vecchia password deve restituire HTTP 401.
**Validates: Requirements 5.1**

---

**Property 10: Password corta rifiutata**
*Per qualsiasi* stringa di lunghezza < 8 caratteri usata come `new_password`, la chiamata a `PUT /auth/me/password` deve restituire HTTP 422.
**Validates: Requirements 5.3**

---

**Property 11: Cambio password revoca tutti i refresh token**
*Per qualsiasi* utente con uno o più refresh token attivi, dopo una chiamata riuscita a `PUT /auth/me/password`, tutti i refresh token precedenti devono avere `revoked = TRUE` nel database.
**Validates: Requirements 5.4**

---

**Property 12: Export conversazione — round trip dei messaggi**
*Per qualsiasi* conversazione con N messaggi, il JSON restituito da `GET /chat/conversations/{id}/export?format=json` deve contenere esattamente N messaggi con `role`, `content` e `created_at` identici ai record nel database.
**Validates: Requirements 6.1, 6.2**

---

**Property 13: Rinomina titolo conversazione persiste**
*Per qualsiasi* conversazione e qualsiasi titolo valido (1–255 caratteri), dopo `PATCH /chat/conversations/{id}` con il nuovo titolo, il recupero della conversazione deve restituire esattamente quel titolo.
**Validates: Requirements 6.3, 6.4**

---

**Property 14: Feedback upsert idempotente**
*Per qualsiasi* messaggio assistant e qualsiasi sequenza di feedback (`up` o `down`) inviati dallo stesso utente, dopo l'ultima chiamata a `POST /chat/messages/{id}/feedback`, il campo `feedback` del messaggio deve essere uguale all'ultimo valore inviato, e deve esistere un solo record di feedback per quella coppia (message_id, user_id).
**Validates: Requirements 6.5, 6.6**

---

**Property 15: Paginazione liste admin corretta**
*Per qualsiasi* lista (utenti, gruppi, agenti) con N elementi totali e qualsiasi `page_size` K, la risposta deve contenere `min(K, N)` elementi nella prima pagina, `total` deve essere N, e `total_pages` deve essere `ceil(N / K)`.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

---

**Property 16: Bulk action modifica tutti gli utenti selezionati**
*Per qualsiasi* lista di M user_id validi e qualsiasi azione (`activate`, `deactivate`), dopo `POST /admin/users/bulk-action`, tutti gli M utenti devono avere `is_active` aggiornato al valore corrispondente all'azione.
**Validates: Requirements 7.5, 7.6**

---

**Property 17: Refresh token rotation — single-use**
*Per qualsiasi* refresh token valido RT1, dopo una chiamata riuscita a `POST /auth/refresh` che restituisce RT2, una seconda chiamata con RT1 deve restituire HTTP 401 (token revocato), e RT2 deve funzionare correttamente.
**Validates: Requirements 9.3, 9.4, 9.5, 9.6**

---

## Error Handling

### Backend

| Scenario | HTTP Status | Messaggio |
|---|---|---|
| Token JWT scaduto | 401 | "Token scaduto" |
| Refresh token revocato/scaduto | 401 | "Sessione scaduta, effettua il login" |
| Password corrente errata | 400 | "Password attuale non corretta" |
| Password troppo corta | 422 | "La password deve avere almeno 8 caratteri" |
| Documento non trovato | 404 | "Documento non trovato" |
| Ricostruzione FAISS fallita | 500 | "Errore ricostruzione knowledge base: {dettaglio}" |
| Titolo conversazione vuoto | 422 | "Il titolo non può essere vuoto" |
| Titolo > 255 caratteri | 422 | "Il titolo non può superare 255 caratteri" |
| Bulk action su ID inesistente | 200 (partial) | `{"modified": N, "errors": [{"id": X, "error": "..."}]}` |
| Upload file non supportato | 400 | "Formato non supportato. Usa PDF, DOCX o TXT" |

### Frontend

- Tutti gli errori API mostrano un toast con `react-hot-toast`
- Il refresh token automatico è trasparente all'utente
- Se il refresh fallisce, redirect a `/login` con messaggio "Sessione scaduta"
- I form mostrano errori inline prima di inviare la richiesta

---

## Testing Strategy

### Approccio Duale

La strategia di test combina **unit test** (esempi specifici, edge case, integrazioni) e **property-based test** (proprietà universali su input generati casualmente). I due approcci sono complementari.

### Property-Based Testing

**Libreria**: `hypothesis` (Python) — matura, ben documentata, integrata con pytest.

**Configurazione**: ogni property test deve eseguire almeno 100 iterazioni (`@settings(max_examples=100)`).

**Tag format**: ogni test deve avere un commento `# Feature: ai-hub-v2, Property N: <testo>`

**Mapping proprietà → test**:

| Property | Test file | Funzione |
|---|---|---|
| P1 — Audit log per azioni admin | `tests/test_audit.py` | `test_admin_action_creates_audit_log` |
| P2 — Paginazione audit log | `tests/test_audit.py` | `test_audit_log_pagination` |
| P3 — Usage stats per messaggio | `tests/test_analytics.py` | `test_usage_stats_increment` |
| P4 — Delete documento | `tests/test_documents.py` | `test_document_delete_removes_file_and_record` |
| P5 — Batch upload | `tests/test_documents.py` | `test_batch_upload_creates_n_records` |
| P6 — Update agente | `tests/test_agents.py` | `test_agent_update_persists_all_fields` |
| P7 — Duplicazione agente | `tests/test_agents.py` | `test_agent_duplicate_copies_fields` |
| P8 — Test agente no persist | `tests/test_agents.py` | `test_agent_test_no_persistence` |
| P9 — Password round trip | `tests/test_auth.py` | `test_password_change_round_trip` |
| P10 — Password corta | `tests/test_auth.py` | `test_short_password_rejected` |
| P11 — Revoca refresh token | `tests/test_auth.py` | `test_password_change_revokes_refresh_tokens` |
| P12 — Export conversazione | `tests/test_chat.py` | `test_conversation_export_round_trip` |
| P13 — Rinomina titolo | `tests/test_chat.py` | `test_conversation_rename_persists` |
| P14 — Feedback upsert | `tests/test_chat.py` | `test_feedback_upsert_idempotent` |
| P15 — Paginazione liste | `tests/test_admin.py` | `test_list_pagination_correct` |
| P16 — Bulk action | `tests/test_admin.py` | `test_bulk_action_modifies_all_users` |
| P17 — Refresh token rotation | `tests/test_auth.py` | `test_refresh_token_single_use` |

### Unit Testing

- **Autenticazione**: test login, logout, token scaduto, utente disattivato
- **Validazione**: test campi obbligatori, formati email, lunghezze massime
- **RAG Engine**: test ricerca documenti, fallback, strategia
- **Health check**: test risposta con DB ok e DB degradato

### Frontend Testing

- Nessun test automatico frontend è richiesto in questa versione (la copertura è garantita dai test backend)
- I componenti critici (CodeBlock, FeedbackButtons) possono essere testati manualmente

