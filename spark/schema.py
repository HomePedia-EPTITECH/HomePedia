# Source unique de vérité pour les types de toutes les colonnes.
#
# Format : "colonne": ("type", "transform")
#   type      : "int" | "float" | "string"
#   transform : "digits"  → strip tout sauf [0-9], cast int   (ex: "40 ans", "24 480 €/an", "30 h/km²")
#               "percent" → strip tout sauf [0-9.], cast float (ex: "48.1%", "21%")
#               "strip"   → trim whitespace, garde string      (ex: codes INSEE, noms)
#               "round"   → arrondit un float et cast int      (ex: 3340.046568 → 3340)

COLUMN_SCHEMA = {
    # --- Identifiants ---
    "com":                          ("string", "strip"),   # code INSEE complet, zéros initiaux conservés
    "nom_commune":                  ("string", "strip"),
    "code_postal":                  ("string", "strip"),   # code postal conservé en texte
    "nom_region":                   ("string", "strip"),
    "nom_departement":              ("string", "strip"),
    "nom_metropole":                ("string", "strip"),
    "nom_maire":                    ("string", "strip"),

    # --- Démographie ---
    "nb_habitant":                  ("int",    "digits"),
    "age_moyen":                    ("int",    "digits"),   # "40 ans" → 40
    "pop_active":                   ("float",  "percent"),  # "48.1%" → 48.1
    "taux_chomage":                 ("float",  "percent"),  # "1.2%" → 1.2
    "pop_densite":                  ("int",    "digits"),   # "30 h/km²" → 30
    "revenu_moyen":                 ("int",    "digits"),   # "24 480 €/an" → 24480
    "superficie_km2":               ("int",    "digits"),
    "estimation_pop_2026":          ("int",    "digits"),   # "15 967" → 15967
    "estimation_pop_2025":          ("int",    "digits"),

    # Répartition par âge
    "part_0_14_ans":                ("float",  "percent"),
    "part_15_29_ans":               ("float",  "percent"),
    "part_30_44_ans":               ("float",  "percent"),
    "part_45_59_ans":               ("float",  "percent"),
    "part_60_74_ans":               ("float",  "percent"),
    "part_75_89_ans":               ("float",  "percent"),
    "part_90_plus":                 ("float",  "percent"),

    # Catégories socio-professionnelles
    "part_cadres":                  ("float",  "percent"),
    "part_retraites":               ("float",  "percent"),
    "part_employes":                ("float",  "percent"),
    "part_ouvriers":                ("float",  "percent"),
    "part_sans_diplome":            ("float",  "percent"),
    "part_bac5_plus":               ("float",  "percent"),
    "part_couple_avec_enfant":      ("float",  "percent"),
    "part_personnes_seules":        ("float",  "percent"),

    # --- Élections ---
    "participation_1er_tour":       ("float",  "percent"),
    "participation_2nd_tour":       ("float",  "percent"),
    "inscrits_election":            ("int",    "digits"),   # "8 765" → 8765

    # --- Sécurité ---
    "agressions":                   ("int",    "digits"),
    "cambriolages":                 ("int",    "digits"),
    "vols_degradations":            ("int",    "digits"),
    "stupefiants":                  ("int",    "digits"),

    # --- Notes et scores ---
    "note_moyenne_globale":         ("float",  "percent"),
    "nb_avis":                      ("int",    "digits"),
    "score_securite":               ("float",  "percent"),
    "score_education":              ("float",  "percent"),
    "score_loisirs":                ("float",  "percent"),
    "score_environnement":          ("float",  "percent"),
    "score_vie_pratique":           ("float",  "percent"),

    # --- Commerces et services ---
    "nb_hypermarches":              ("int",    "digits"),
    "nb_supermarches":              ("int",    "digits"),
    "nb_superettes":                ("int",    "digits"),
    "nb_boulangeries":              ("int",    "digits"),
    "nb_boucheries":                ("int",    "digits"),
    "nb_restaurants":               ("int",    "digits"),
    "nb_garages":                   ("int",    "digits"),
    "nb_stations_service":          ("int",    "digits"),
    "nb_banques":                   ("int",    "digits"),
    "nb_bureaux_poste":             ("int",    "digits"),
    "nb_coiffeurs":                 ("int",    "digits"),
    "nb_tabacs":                    ("int",    "digits"),
    "nb_bars_discotheques":         ("int",    "digits"),
    "nb_bibliotheques":             ("int",    "digits"),
    "nb_cinemas":                   ("int",    "digits"),

    # --- Santé ---
    "nb_veterinaires":              ("int",    "digits"),
    "nb_pharmacies":                ("int",    "digits"),
    "nb_hopitaux":                  ("int",    "digits"),
    "nb_laboratoires_analyses":     ("int",    "digits"),
    "nb_etablissements_handicapes": ("int",    "digits"),
    "nb_ehpa":                      ("int",    "digits"),
    "nb_medecins":                  ("int",    "digits"),
    "nb_dentistes":                 ("int",    "digits"),
    "nb_chirurgiens":               ("int",    "digits"),
    "nb_dermatologues":             ("int",    "digits"),
    "nb_anesthesistes":             ("int",    "digits"),
    "nb_gastroenterologues":        ("int",    "digits"),
    "nb_gynecologues":              ("int",    "digits"),
    "nb_cancerologues":             ("int",    "digits"),
    "nb_neurologues":               ("int",    "digits"),
    "nb_ophtalmologues":            ("int",    "digits"),
    "nb_orl":                       ("int",    "digits"),
    "nb_cardiologues":              ("int",    "digits"),
    "nb_pediatres":                 ("int",    "digits"),
    "nb_pneumologues":              ("int",    "digits"),
    "nb_psychologues":              ("int",    "digits"),
    "nb_radiologues":               ("int",    "digits"),
    "nb_rhumatologues":             ("int",    "digits"),
    "nb_sages_femmes":              ("int",    "digits"),

    # --- Éducation ---
    "nb_creches":                       ("int", "digits"),
    "nb_ecoles_maternelles_publiques":  ("int", "digits"),
    "nb_ecoles_maternelles_privees":    ("int", "digits"),
    "nb_ecoles_primaires_publiques":    ("int", "digits"),
    "nb_ecoles_primaires_privees":      ("int", "digits"),
    "nb_colleges_publics":              ("int", "digits"),
    "nb_colleges_prives":               ("int", "digits"),
    "nb_lycees_publics":                ("int", "digits"),
    "nb_lycees_prives":                 ("int", "digits"),

    # --- Immobilier ---
    "prix_m2_maison":               ("int",   "digits"),   # "2 000 €" → 2000
    "prix_m2_appartement":          ("int",   "digits"),   # "588 €" → 588
    "part_residences_principales":  ("float", "percent"),
    "part_residences_secondaires":  ("float", "percent"),
    "part_taux_proprietaires":      ("float", "percent"),
    "part_taux_locataires":         ("float", "percent"),

    # --- Salaires ---
    "salaire_net_mensuel_moyen_cadre":              ("int", "round"),
    "salaire_net_mensuel_moyen_prof_intermediaire": ("int", "round"),
    "salaire_net_mensuel_moyen_employe":            ("int", "round"),
    "salaire_net_mensuel_moyen_ouvrier":            ("int", "round"),
    "salaire_net_mensuel_moyen_total":              ("int", "round"),
}
