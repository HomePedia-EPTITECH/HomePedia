# Structure finale Mongo (multi-sources)

## Principes de modélisation

- Jointure inter-collections via `com` (code INSEE).
- Distinction par source avec `source` (`bdmv`, `ville_ideale`).
- Pattern commun : collection riche (`communes_harvest*`) + collection aplatie Spark (`communes_direct*`) + `reviews_raw`.

## Collection `city_pages_queue`

- Rôle : file de pages à scraper, alimentée depuis les sitemaps.
- Note Ville-Idéale : en pratique on **n’utilise pas** le sitemap (non fiable). La queue `source=ville_ideale`
  est alimentée depuis les communes déjà connues via BDMV (`com_id` + `nom_commune`), en générant des URLs
  de forme `https://www.ville-ideale.fr/<slug>_<com_id>`.
- Pour Ville-Idéale, l’upsert queue se fait par couple (`source`, `com_id`) et l’URL peut être ajustée
  en fin de scraping (champ `resolved_url`).
- Champs :
  - `url`
  - `resolved_url` (optionnel)
  - `source`
  - `com_id`
  - `nom_commune_guess`
  - `is_processed`
  - `attempt_count`
  - `processed_at`
  - `last_error`
  - `created_at`
  - `updated_at`

## Collections BDMV

### `communes_harvest` (riche / nestée)

- `com`, `nom_commune`, `source`
- `admin_codes.code_dept`
- `links.city_page`, `links.avis_page`
- `admin_details.*` (`code_postal`, `nom_region`, `nom_departement`, `nom_metropole`, `nom_maire`)
- `demography.*` (population, tranches d'âge, élection, etc.)
- `security.*` (`agressions`, `cambriolages`, `vols_degradations`, `stupefiants`)
- `quality_of_life.*` (`note_moyenne_globale`, `nb_avis`, `score_*`)
- `services.*` (champs `nb_*`)
- `real_estate.*` (`prix_m2_*`, `part_*`)
- `reviews_summary`
- `reviews_refs.count`, `reviews_refs.last_collected_at`
- `updated_at`

### `communes_direct` (aplatie / Spark-ready)

- 1 document par commune avec colonnes racine.
- Clés usuelles :
  - `com`, `nom_commune`, `source`
  - `city_page`, `avis_page`
  - `code_dept`, `code_postal`, `nom_region`, `nom_departement`, `nom_metropole`, `nom_maire`
  - `reviews_refs_count`, `reviews_refs_last_collected_at`, `updated_at`
  - + indicateurs aplatis issus de `demography`, `security`, `quality_of_life`, `services`, `real_estate`

## Collections Ville-Idéale

### `communes_harvest_vi` (riche / nestée)

- `com`, `nom_commune`, `source` (toujours `ville_ideale`)
- `links.city_page`
- `notes.*` :
  - `note_environnement_10`
  - `note_transports_10`
  - `note_sante_10`
  - `note_securite_10`
  - `note_sports_loisirs_10`
  - `note_culture_10`
  - `note_enseignement_10`
  - `note_commerces_10`
  - `note_qualite_vie_10`
- `nb_avis`
- `reviews_refs.count`, `reviews_refs.pages`, `reviews_refs.last_collected_at`
- `updated_at`

### `communes_direct_vi` (aplatie / Spark-ready)

- 1 document par commune avec colonnes racine.
- Clés usuelles :
  - `com`, `nom_commune`, `source`
  - `city_page`
  - `nb_avis`
  - `reviews_refs_count`, `reviews_refs_last_collected_at`
  - `updated_at`
  - `note_environnement_10`
  - `note_transports_10`
  - `note_sante_10`
  - `note_securite_10`
  - `note_sports_loisirs_10`
  - `note_culture_10`
  - `note_enseignement_10`
  - `note_commerces_10`
  - `note_qualite_vie_10`

## Collection partagée `reviews_raw`

- Rôle : avis bruts normalisés pour NLP/IA, multi-sources.
- Champs :
  - `com`
  - `nom_commune`
  - `source`
  - `external_comment_id` (si disponible)
  - `text`
  - `text_hash` (déduplication)
  - `rating`
  - `date` (ISO si possible)
  - `collected_at`
  - `url_page`
  - `positive` (Ville-Idéale, optionnel)
  - `negative` (Ville-Idéale, optionnel)
  - `sentiment_score` (post-traitement, optionnel)
  - `sentiment_label` (post-traitement, optionnel)

## Collection `real_estate_history`

- Rôle : historiser les transactions DVF simplifiées (multi-runs, dédup par transaction).
- Clé technique :
  - `transaction_id` (hash stable, unique)
- Champs principaux :
  - `source` (valeur `dvf`)
  - `com` (pivot INSEE)
  - `id_mutation`, `id_parcelle` (export « full », optionnels — utiles pour dédoublonner les lots)
  - `code_postal`, `nom_commune` (export « full », jointures sans passer par `communes_direct`)
  - `longitude`, `latitude` (export « full », optionnels — cartes Mapbox)
  - `date_mutation` (ISO `YYYY-MM-DD`)
  - `nature_mutation` (ex: `Vente`)
  - `type_local` (`Maison`, `Appartement`, etc.)
  - `valeur_fonciere` (double)
  - `surface_reelle_bati` (double)
  - `prix_m2` (double)
  - `updated_at`

## Collection `salaires_pcs_history`

- Rôle : historiser le salaire net EQTP mensuel moyen par commune/catégorie socio-professionnelle/sexe/millésime (Insee, Base Tous Salariés).
- Clé technique (unique composite) :
  - `com`, `pcs_code`, `sex`, `time_period`
- Champs principaux :
  - `source` (valeur `insee_bts_pcs`)
  - `com` (pivot INSEE)
  - `pcs_code` (`1T3`=Cadres, `4`=Professions intermédiaires, `5`=Employés, `6`=Ouvriers, `_T`=Total)
  - `pcs_label`
  - `sex` (`F`, `M`, `_T`)
  - `time_period` (année)
  - `salaire_net_eqtp_mensuel_moyen` (double, `None` si secret statistique)
  - `conf_status` (`F`=libre, `C`=confidentiel)
  - `updated_at`
- Limite source : pas de diffusion Insee sous 2000 habitants ; à ce niveau géographique fin, certaines catégories à faible effectif peuvent avoir des moyennes extrêmes (outliers).

## `communes_direct` — indicateurs salaires (pivot `com`)

- Injectés dans `communes_direct` par `ingest_salaires_pcs.py`, sexe total (`_T`) uniquement, millésime le plus récent :
  - `salaire_net_mensuel_moyen_cadre`
  - `salaire_net_mensuel_moyen_prof_intermediaire`
  - `salaire_net_mensuel_moyen_employe`
  - `salaire_net_mensuel_moyen_ouvrier`
  - `salaire_net_mensuel_moyen_total`
  - `salaire_millesime`
  - `salaire_last_ingested_at`
  - `salaire_source`

## Index / migrations (état cible)

- `01_init_communes_harvest.js`
- `02_reviews_raw_and_indexes.js`
- `03_init_city_pages_queue.js`
- `04_init_communes_direct.js`
- `05_init_communes_harvest_vi.js`
- `06_init_communes_direct_vi.js`
- `07_add_source_indexes_vi_and_reviews_texthash.js`
- `08_backfill_city_pages_queue_source.js` (normalisation robuste du champ `source` : absent/null/vide + stats)
- `09_init_real_estate_history_dvf.js`
- `10_init_salaires_pcs.js`
