-- Migration 02 : file des pages ville (queue des URLs Bien-dans-ma-ville)
-- Objectif : file de reprise pour le scraping des communes
--            à partir du sitemap XML (script_BDMV.py).

CREATE TABLE IF NOT EXISTS homepedia.city_pages_queue (
    url          TEXT      PRIMARY KEY,
    com_id       VARCHAR   NOT NULL,
    is_processed BOOLEAN   NOT NULL DEFAULT FALSE,
    last_update  TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_city_pages_queue_is_processed
    ON homepedia.city_pages_queue (is_processed);

