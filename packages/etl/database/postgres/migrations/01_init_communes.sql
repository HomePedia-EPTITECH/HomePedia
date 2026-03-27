CREATE SCHEMA IF NOT EXISTS bdd;

CREATE TABLE IF NOT EXISTS bdd.v_commune_2026 (
    com VARCHAR(10) NOT NULL,
    nccenr TEXT NOT NULL,
    nb_habitant TEXT NULL,
    age_moyen TEXT NULL,
    pop_active TEXT NULL,
    score_securite TEXT NULL,
    score_environnement TEXT NULL,
    score_vie_pratique TEXT NULL,
    score_loisirs TEXT NULL,
    score_sante TEXT NULL,
    score_transports TEXT NULL,
    score_education TEXT NULL,
    CONSTRAINT pk_v_commune_2026 PRIMARY KEY (com, nccenr)
);

CREATE INDEX IF NOT EXISTS idx_v_commune_2026_nccenr
    ON bdd.v_commune_2026 (nccenr);

CREATE INDEX IF NOT EXISTS idx_v_commune_2026_score_securite
    ON bdd.v_commune_2026 (score_securite);

CREATE INDEX IF NOT EXISTS idx_v_commune_2026_score_environnement
    ON bdd.v_commune_2026 (score_environnement);
