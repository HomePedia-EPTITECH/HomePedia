# Structure finale Mongo (Mongo-only)

## Collection `city_pages_queue`

- `url`
- `com_id`
- `nom_commune_guess`
- `is_processed`
- `attempt_count`
- `processed_at`
- `last_error`
- `created_at`
- `updated_at`

## Collection `communes_harvest`

- `com`
- `nom_commune`
- `source`
- `admin_codes`
  - `code_dept`
- `links`
  - `city_page`
  - `avis_page`
- `admin_details`
  - `code_postal`
  - `nom_region`
  - `nom_departement`
  - `nom_metropole`
  - `nom_maire`
- `demography`
  - tous les champs demographiques/elections (`nb_habitant`, `age_moyen`, `part_*`, `participation_*`, `inscrits_election`, etc.)
- `security`
  - `agressions`
  - `cambriolages`
  - `vols_degradations`
  - `stupefiants`
- `quality_of_life`
  - `note_moyenne_globale`
  - `nb_avis`
  - `score_securite`
  - `score_education`
  - `score_loisirs`
  - `score_environnement`
  - `score_vie_pratique`
- `services`
  - tous les champs `nb_*` de services
- `real_estate`
  - `prix_m2_maison`
  - `prix_m2_appartement`
  - `part_residences_principales`
  - `part_residences_secondaires`
  - `part_taux_proprietaires`
  - `part_taux_locataires`
- `reviews_summary`
- `reviews_refs`
  - `count`
  - `last_collected_at`
- `updated_at`

## Collection `communes_direct` (nouvelle)

- 1 document par commune (doc "table") avec les champs importants aplatis
- Clés principales :
  - `com`
  - `nom_commune`
  - `source`
  - `city_page`
  - `avis_page`
  - `code_dept`
  - `code_postal`
  - `nom_region`
  - `nom_departement`
  - `nom_metropole`
  - `nom_maire`
  - `reviews_refs_count`
  - `reviews_refs_last_collected_at`
  - `updated_at`
- Indicateurs "colonne" (aplatis depuis `demography`, `security`, `quality_of_life`, `services`, `real_estate`) :
  - `nb_habitant`, `age_moyen`, `part_*`, `participation_*`, `inscrits_election`, etc.
  - `agressions`, `cambriolages`, `vols_degradations`, `stupefiants`
  - `note_moyenne_globale`, `nb_avis`, `score_*`
  - tous les champs `nb_*` de services
  - `prix_m2_*`, `part_*`, etc. de `real_estate`

## Collection `reviews_raw` (conservee)

- `com`
- `nom_commune`
- `source`
- `external_comment_id`
- `text`
- `rating`
- `date`
- `collected_at`
- `url_page`
- `sentiment_score`
- `sentiment_label`

## Lien fort entre collections

- Clé de jointure principale: `com`
- Lien page source: `links.city_page` / `links.avis_page` dans `communes_harvest`, `url_page` dans `reviews_raw`
- Lien métier avis: `external_comment_id` (quand disponible)
