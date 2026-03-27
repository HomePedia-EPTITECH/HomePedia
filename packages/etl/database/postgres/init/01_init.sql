CREATE SCHEMA IF NOT EXISTS bdd;

CREATE TABLE IF NOT EXISTS bdd.schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
);
