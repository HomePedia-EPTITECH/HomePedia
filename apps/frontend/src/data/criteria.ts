/**
 * Métadonnées des critères HomePedia.
 *
 * Ce module ne calcule plus de score local. Le classement et les breakdowns
 * viennent désormais du backend.
 */

export type CriterionKey =
  | "pouvoirAchat"
  | "securite"
  | "qualiteVie"
  | "ecoles"
  | "sante"
  | "emploi"
  | "commerces"
  | "transports"
  | "cultureLoisirs"

export const CRITERION_KEYS: CriterionKey[] = [
  "pouvoirAchat",
  "securite",
  "qualiteVie",
  "ecoles",
  "sante",
  "emploi",
  "commerces",
  "transports",
  "cultureLoisirs",
]

/** 0 = non retenu · 1 = un plus · 2 = important · 3 = essentiel. */
export type ImportanceLevel = 0 | 1 | 2 | 3

export const LEVEL_WEIGHT: Record<ImportanceLevel, number> = {
  0: 0,
  1: 25,
  2: 60,
  3: 100,
}

export const LEVEL_LABELS: Record<Exclude<ImportanceLevel, 0>, string> = {
  1: "Un plus",
  2: "Important",
  3: "Essentiel",
}

export type Importance = Record<CriterionKey, ImportanceLevel>
export type SubFocus = Partial<Record<CriterionKey, string[]>>

// Critères cochés par défaut sur l'Accueil (accès direct au Classement inclus).
export const DEFAULT_IMPORTANCE: Importance = {
  pouvoirAchat: 2,
  securite: 2,
  qualiteVie: 0,
  ecoles: 0,
  sante: 0,
  emploi: 0,
  commerces: 0,
  transports: 0,
  cultureLoisirs: 0,
}

// ---- Définition des critères et sous-critères ----

export interface SubMetricDef {
  key: string
  label: string
}

export interface CriterionDef {
  key: CriterionKey
  label: string
  hint: string
  subs: SubMetricDef[]
}

function sub(key: string, label: string): SubMetricDef {
  return { key, label }
}

export const CRITERIA: Record<CriterionKey, CriterionDef> = {
  pouvoirAchat: {
    key: "pouvoirAchat",
    label: "Pouvoir d'achat",
    hint: "Ce que votre salaire vous permet ici",
    subs: [
      sub("location", "Loyer accessible"),
      sub("achat", "Achat accessible"),
      sub("maison", "Prix des maisons"),
      sub("appartement", "Prix des appartements"),
      sub("surface", "Surface pour votre budget"),
      sub("charges", "Charges & taxes"),
      sub("primoAccession", "Accès à la propriété"),
    ],
  },
  securite: {
    key: "securite",
    label: "Sécurité",
    hint: "Délinquance rapportée à la population",
    subs: [
      sub("agressions", "Agressions"),
      sub("cambriolages", "Cambriolages"),
      sub("vols", "Vols & dégradations"),
      sub("stupefiants", "Stupéfiants"),
      sub("tranquillite", "Tranquillité nocturne"),
      sub("incivilites", "Incivilités"),
      sub("presencePolice", "Présence policière"),
      sub("routiere", "Sécurité routière"),
    ],
  },
  qualiteVie: {
    key: "qualiteVie",
    label: "Qualité de vie",
    hint: "Cadre, environnement, ambiance",
    subs: [
      sub("environnement", "Environnement"),
      sub("espacesVerts", "Espaces verts"),
      sub("proprete", "Propreté"),
      sub("calme", "Calme / bruit"),
      sub("air", "Qualité de l'air"),
      sub("cadre", "Cadre de vie"),
      sub("convivialite", "Convivialité"),
    ],
  },
  ecoles: {
    key: "ecoles",
    label: "Écoles",
    hint: "Offre et qualité scolaire",
    subs: [
      sub("maternelle", "Maternelles"),
      sub("primaire", "Primaires"),
      sub("college", "Collèges"),
      sub("lycee", "Lycées"),
      sub("superieur", "Enseignement supérieur"),
      sub("reussite", "Taux de réussite"),
      sub("effectifs", "Effectifs par classe"),
    ],
  },
  sante: {
    key: "sante",
    label: "Santé",
    hint: "Accès aux soins",
    subs: [
      sub("medecins", "Médecins généralistes"),
      sub("specialistes", "Spécialistes"),
      sub("hopitaux", "Hôpitaux"),
      sub("urgences", "Urgences"),
      sub("pharmacies", "Pharmacies"),
      sub("dentistes", "Dentistes"),
      sub("delais", "Délais de rendez-vous"),
      sub("maternite", "Maternité"),
    ],
  },
  emploi: {
    key: "emploi",
    label: "Emploi & revenus",
    hint: "Dynamisme économique local",
    subs: [
      sub("revenus", "Revenus médians"),
      sub("chomage", "Faible chômage"),
      sub("dynamisme", "Dynamisme économique"),
      sub("offres", "Offres d'emploi"),
      sub("teletravail", "Connectivité / télétravail"),
      sub("entrepreneuriat", "Création d'entreprises"),
      sub("salaires", "Niveau des salaires"),
    ],
  },
  commerces: {
    key: "commerces",
    label: "Commerces",
    hint: "Vie pratique & achats du quotidien",
    subs: [
      sub("grandesSurfaces", "Grandes surfaces"),
      sub("boulangeries", "Boulangeries"),
      sub("restaurants", "Restaurants"),
      sub("banques", "Banques"),
      sub("marches", "Marchés"),
      sub("proximite", "Commerces de proximité"),
      sub("services", "Services (coiffeurs…)"),
      sub("presseTabac", "Presse / tabac"),
    ],
  },
  transports: {
    key: "transports",
    label: "Transports",
    hint: "Mobilité & desserte",
    subs: [
      sub("desserte", "Desserte globale"),
      sub("gare", "Gare / TER"),
      sub("busTram", "Bus / tram"),
      sub("pistes", "Pistes cyclables"),
      sub("routes", "Accès routier"),
      sub("aeroport", "Aéroport à proximité"),
      sub("stationnement", "Stationnement"),
    ],
  },
  cultureLoisirs: {
    key: "cultureLoisirs",
    label: "Culture & loisirs",
    hint: "Sorties, sports et vie culturelle",
    subs: [
      sub("culture", "Offre culturelle"),
      sub("sports", "Sports & loisirs"),
      sub("cinemas", "Cinémas"),
      sub("musees", "Musées"),
      sub("spectacles", "Théâtres / concerts"),
      sub("bibliotheques", "Bibliothèques"),
      sub("nature", "Sorties nature"),
      sub("vieNocturne", "Vie nocturne"),
    ],
  },
}
