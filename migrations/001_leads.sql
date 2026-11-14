CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS leads (
 id uuid PRIMARY KEY, session_hash text NOT NULL UNIQUE, locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Za-z]{2})?$'),
 consent_version text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')), fields jsonb NOT NULL DEFAULT '{}', summary text,
 created_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, leased_until timestamptz, notification_requested_at timestamptz
);
CREATE TABLE IF NOT EXISTS chat_messages (
 id uuid PRIMARY KEY, lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('user','assistant','system')), content text NOT NULL,
 request_id uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (lead_id,request_id,role)
);
CREATE INDEX IF NOT EXISTS chat_messages_lead_created ON chat_messages(lead_id,created_at);
CREATE INDEX IF NOT EXISTS leads_inactive ON leads(status,last_activity_at);
CREATE TABLE IF NOT EXISTS chat_uploads (
 id uuid PRIMARY KEY, lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 object_key text NOT NULL UNIQUE, name text NOT NULL, mime text NOT NULL, size_bytes integer NOT NULL,
 kind text NOT NULL CHECK (kind IN ('file','audio')), transcription text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lead_outbox (
 id uuid PRIMARY KEY, lead_id uuid NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 leased_until timestamptz, sent_at timestamptz, error_code text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_outbox_due ON lead_outbox(state,next_attempt_at);
CREATE TABLE IF NOT EXISTS chat_rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS medium_posts (id text PRIMARY KEY, data jsonb NOT NULL, published_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
