-- Migration 02: table KPI simple pour le backend NestJS.

CREATE TABLE IF NOT EXISTS bdd.kpis (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50) NULL,
    source VARCHAR(120) NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpis_captured_at
    ON bdd.kpis (captured_at DESC);

CREATE OR REPLACE FUNCTION bdd.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kpis_updated_at ON bdd.kpis;
CREATE TRIGGER trg_kpis_updated_at
BEFORE UPDATE ON bdd.kpis
FOR EACH ROW
EXECUTE FUNCTION bdd.set_updated_at();

