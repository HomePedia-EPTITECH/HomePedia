-- Ce script est exécuté automatiquement au 1er démarrage (volume vide).
-- Il crée un schéma par défaut et la table de suivi des migrations.

CREATE SCHEMA IF NOT EXISTS bdd;

-- Table pour savoir quelles migrations ont déjà été appliquées (utilisée par run_migrations_postgres.py).
CREATE TABLE IF NOT EXISTS bdd.schema_migrations (
    name    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
);
