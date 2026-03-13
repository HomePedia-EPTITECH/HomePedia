## Contrat de données – Vue simple (champs + types)

### 1. PostgreSQL – table `homepedia.communes`

#### 1.1 Identité

- `com`: `TEXT`
- `nccenr`: `TEXT`

#### 1.2 Démographie (bloc chiffres)

- `nb_habitant`: `TEXT`   (→ entier)
- `age_moyen`: `TEXT`   (→ entier, années)
- `pop_active`: `TEXT`   (→ %)
- `taux_chomage`: `TEXT`   (→ %)
- `pop_densite`: `TEXT`   (→ entier, hab/km²)
- `revenu_moyen`: `TEXT`   (→ entier, €/an)
- `superficie_km2`: `TEXT`   (→ nombre, km²)

#### 1.3 Démographie détaillée

- `estimation_pop_2026`: `TEXT`   (→ entier)
- `estimation_pop_2025`: `TEXT`   (→ entier)
- `part_0_14_ans`: `TEXT`   (→ %)
- `part_15_29_ans`: `TEXT`   (→ %)
- `part_30_44_ans`: `TEXT`   (→ %)
- `part_45_59_ans`: `TEXT`   (→ %)
- `part_60_74_ans`: `TEXT`   (→ %)
- `part_75_89_ans`: `TEXT`   (→ %)
- `part_90_plus`: `TEXT`   (→ %)
- `part_cadres`: `TEXT`   (→ %)
- `part_retraites`: `TEXT`   (→ %)
- `part_employes`: `TEXT`   (→ %)
- `part_ouvriers`: `TEXT`   (→ %)
- `part_sans_diplome`: `TEXT`   (→ %)
- `part_bac5_plus`: `TEXT`   (→ %)
- `part_couple_avec_enfant`: `TEXT`   (→ %)
- `part_personnes_seules`: `TEXT`   (→ %)

#### 1.4 Élections

- `participation_1er_tour`: `TEXT`   (→ %)
- `participation_2nd_tour`: `TEXT`   (→ %)
- `inscrits_election`: `TEXT`   (→ entier)

#### 1.5 Territoire / administratif

- `code_postal`: `TEXT`
- `nom_region`: `TEXT`
- `nom_departement`: `TEXT`
- `nom_metropole`: `TEXT`
- `nom_maire`: `TEXT`

#### 1.6 Sécurité / délinquance

- `agressions`: `TEXT`   (→ entier)
- `cambriolages`: `TEXT`   (→ entier)
- `vols_degradations`: `TEXT`   (→ entier)
- `stupefiants`: `TEXT`   (→ entier)

#### 1.7 Avis / qualité de vie

- `note_moyenne_globale`: `TEXT`   (→ nombre 0–5)
- `nb_avis`: `TEXT`   (→ entier)
- `score_securite`: `TEXT`   (→ nombre 0–5)
- `score_education`: `TEXT`   (→ nombre 0–5)
- `score_loisirs`: `TEXT`   (→ nombre 0–5)
- `score_environnement`: `TEXT`   (→ nombre 0–5)
- `score_vie_pratique`: `TEXT`   (→ nombre 0–5)

#### 1.8 Services – Commerce (tous → entiers)

- `nb_hypermarches`: `TEXT`
- `nb_supermarches`: `TEXT`
- `nb_superettes`: `TEXT`
- `nb_boulangeries`: `TEXT`
- `nb_boucheries`: `TEXT`
- `nb_restaurants`: `TEXT`
- `nb_garages`: `TEXT`
- `nb_stations_service`: `TEXT`
- `nb_banques`: `TEXT`
- `nb_bureaux_poste`: `TEXT`
- `nb_coiffeurs`: `TEXT`
- `nb_tabacs`: `TEXT`
- `nb_bars_discotheques`: `TEXT`
- `nb_bibliotheques`: `TEXT`
- `nb_cinemas`: `TEXT`
- `nb_veterinaires`: `TEXT`

#### 1.9 Services – Santé (tous → entiers)

- `nb_pharmacies`: `TEXT`
- `nb_hopitaux`: `TEXT`
- `nb_laboratoires_analyses`: `TEXT`
- `nb_etablissements_handicapes`: `TEXT`
- `nb_ehpa`: `TEXT`
- `nb_medecins`: `TEXT`
- `nb_dentistes`: `TEXT`
- `nb_chirurgiens`: `TEXT`
- `nb_dermatologues`: `TEXT`
- `nb_anesthesistes`: `TEXT`
- `nb_gastroenterologues`: `TEXT`
- `nb_gynecologues`: `TEXT`
- `nb_cancerologues`: `TEXT`
- `nb_neurologues`: `TEXT`
- `nb_ophtalmologues`: `TEXT`
- `nb_orl`: `TEXT`
- `nb_cardiologues`: `TEXT`
- `nb_pediatres`: `TEXT`
- `nb_pneumologues`: `TEXT`
- `nb_psychologues`: `TEXT`
- `nb_radiologues`: `TEXT`
- `nb_rhumatologues`: `TEXT`
- `nb_sages_femmes`: `TEXT`

#### 1.10 Services – Éducation (tous → entiers)

- `nb_creches`: `TEXT`
- `nb_ecoles_maternelles_publiques`: `TEXT`
- `nb_ecoles_maternelles_privees`: `TEXT`
- `nb_ecoles_primaires_publiques`: `TEXT`
- `nb_ecoles_primaires_privees`: `TEXT`
- `nb_colleges_publics`: `TEXT`
- `nb_colleges_prives`: `TEXT`
- `nb_lycees_publics`: `TEXT`
- `nb_lycees_prives`: `TEXT`

#### 1.11 Immobilier

- `prix_m2_maison`: `TEXT`   (→ entier, €/m²)
- `prix_m2_appartement`: `TEXT`   (→ entier, €/m²)
- `part_residences_principales`: `TEXT`   (→ %)
- `part_residences_secondaires`: `TEXT`   (→ %)
- `part_taux_proprietaires`: `TEXT`   (→ %)
- `part_taux_locataires`: `TEXT`   (→ %)

---

### 2. MongoDB – collection `communes_harvest`

#### 2.1 Racine du document

- `com`: `string`
- `metrics`: `object`  *(toutes les clés Postgres ci‑dessus, valeurs `string`)*
- `presentation`: `object`
- `security_services`: `object`
- `real_estate`: `object`
- `reviews_summary`: `object`
- `reviews_full`: `array<object>`
- `sentiment_analysis_source`: `object`
- `url_source`: `string`
- `url_avis`: `string`
- `harvested_at`: `number`

#### 2.2 `presentation`

- `intro_text`: `string | null`
- `images`: `string[]`

#### 2.3 `security_services`

- `services_population`: `string[]`
- `services_population_counts`: `Record<string, string>`
- `services_population_counts_by_category`: `object`
  - `commerce`: `Record<string, string>` (optionnel)
  - `sante`: `Record<string, string>` (optionnel)
  - `education`: `Record<string, string>` (optionnel)

#### 2.4 `real_estate`

- `prix_m2_maison`: `string | null`
- `prix_m2_appartement`: `string | null`
- `part_residences_principales`: `string | null`
- `part_residences_secondaires`: `string | null`
- `part_taux_proprietaires`: `string | null`
- `part_taux_locataires`: `string | null`

#### 2.5 `reviews_summary`

- `note_moyenne_globale`: `string | null`
- `nb_avis`: `string | null`
- `score_securite`: `string | null`
- `score_education`: `string | null`
- `score_loisirs`: `string | null`
- `score_environnement`: `string | null`
- `score_vie_pratique`: `string | null`

#### 2.6 `reviews_full[]`

- `text`: `string`
- `rating`: `string | null`
- `date`: `string | null`

#### 2.7 `sentiment_analysis_source`

- `positive`: `string[]`
- `negative`: `string[]`
- `all`: `string[]`

