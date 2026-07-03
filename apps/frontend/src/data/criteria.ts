import { COMMUNES } from "./communes"
import type { Commune } from "./types"

/**
 * Moteur de critères v2 — remplace les pondérations 0–100 % par un modèle
 * plus lisible pour l'utilisateur :
 *
 *   1. Il SÉLECTIONNE des grands critères (Accueil).
 *   2. Il DOSE chacun sur 3 niveaux : Un plus / Important / Essentiel (Classement).
 *   3. Il AFFINE avec des sous-critères "focus" propres à chaque critère.
 *
 * Le score de compatibilité = moyenne des scores de critères, pondérée par le
 * niveau d'importance. Chaque score de critère = moyenne de ses sous-critères
 * (ou seulement ceux sur lesquels l'utilisateur a mis le focus).
 *
 * Chaque catégorie possède 5–8 sous-critères. Tant que la data réelle n'est
 * pas branchée, le sous-score est DÉTERMINISTE : il part du niveau réel de la
 * catégorie (prix, délinquance, notes…) + une variation stable par sous-critère
 * → une ville forte en sécurité l'est sur ses sous-critères, avec du relief.
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

// ---- Normalisation sur l'ensemble du dataset ----

interface Range {
  min: number
  max: number
}

function rangeOf(values: number[]): Range {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

function norm(value: number, r: Range, invert = false): number {
  if (r.max === r.min) return 50
  const t = (value - r.min) / (r.max - r.min)
  return Math.round((invert ? 1 - t : t) * 100)
}

const clamp = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v))
const perMille = (count: number, pop: number) => count / (pop / 1000)

function delinquance(c: Commune): number {
  return (
    c.agressions * 1.4 +
    c.cambriolages * 1.1 +
    c.volsDegradations * 0.6 +
    c.stupefiants * 1.0
  )
}
function santeIdx(c: Commune): number {
  return perMille(
    (c.services.medecins + c.services.specialistes) * 1 +
      c.services.pharmacies * 0.8 +
      c.services.hopitaux * 4,
    c.population,
  )
}
function commerceIdx(c: Commune): number {
  return perMille(
    c.services.hypermarches +
      c.services.supermarches +
      c.services.boulangeries +
      c.services.restaurants * 0.5 +
      c.services.banques,
    c.population,
  )
}

const R = {
  prixMoyen: rangeOf(
    COMMUNES.map((c) => (c.prixM2Appartement + c.prixM2Maison) / 2),
  ),
  revenu: rangeOf(COMMUNES.map((c) => c.revenuMoyen)),
  chomage: rangeOf(COMMUNES.map((c) => c.tauxChomage)),
  delinquance: rangeOf(COMMUNES.map(delinquance)),
  sante: rangeOf(COMMUNES.map(santeIdx)),
  commerce: rangeOf(COMMUNES.map(commerceIdx)),
}

/** Niveau réel (0–100) d'une catégorie, ancré sur les données disponibles. */
function categoryBase(c: Commune, key: CriterionKey): number {
  switch (key) {
    case "pouvoirAchat":
      return norm((c.prixM2Appartement + c.prixM2Maison) / 2, R.prixMoyen, true)
    case "securite":
      return norm(delinquance(c), R.delinquance, true)
    case "qualiteVie":
      return Math.round(c.notes.qualiteVie * 10)
    case "ecoles":
      return Math.round(c.notes.enseignement * 10)
    case "sante":
      return norm(santeIdx(c), R.sante)
    case "emploi":
      return Math.round(
        (norm(c.revenuMoyen, R.revenu) + norm(c.tauxChomage, R.chomage, true)) /
          2,
      )
    case "commerces":
      return norm(commerceIdx(c), R.commerce)
    case "transports":
      return Math.round(c.notes.transports * 10)
    case "cultureLoisirs":
      return Math.round(((c.notes.culture + c.notes.sportsLoisirs) / 2) * 10)
  }
}

// Hash déterministe (FNV-1a) → variation stable par (ville, catégorie, sous-critère).
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const SUB_SPREAD = 16
function variation(id: string, key: string, sub: string): number {
  const r = (hash(`${id}:${key}:${sub}`) % 1000) / 1000 // [0,1)
  return (r * 2 - 1) * SUB_SPREAD
}

/** Sous-score (0–100) d'un sous-critère pour une ville. */
export function subScore(
  c: Commune,
  key: CriterionKey,
  subKey: string,
): number {
  return clamp(Math.round(categoryBase(c, key) + variation(c.id, key, subKey)))
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

// ---- Calcul du score ----

/** Score d'un critère (0–100) : moyenne des sous-critères ciblés (ou tous). */
export function criterionScore(
  c: Commune,
  key: CriterionKey,
  focus: string[] = [],
): number {
  const def = CRITERIA[key]
  const chosen = focus.length
    ? def.subs.filter((s) => focus.includes(s.key))
    : def.subs
  const subs = chosen.length ? chosen : def.subs
  const sum = subs.reduce((a, s) => a + subScore(c, key, s.key), 0)
  return Math.round(sum / subs.length)
}

/** Score de compatibilité global /100, pondéré par les niveaux d'importance. */
export function personalScore(
  c: Commune,
  importance: Importance,
  focus: SubFocus = {},
): number {
  let acc = 0
  let wsum = 0
  for (const key of CRITERION_KEYS) {
    const w = LEVEL_WEIGHT[importance[key]]
    if (!w) continue
    acc += w * criterionScore(c, key, focus[key] ?? [])
    wsum += w
  }
  return wsum ? Math.round(acc / wsum) : 0
}

/** Détail par critère (0–100) — pour les barres et le radar. */
export function scoreBreakdown(
  c: Commune,
  focus: SubFocus = {},
): Record<CriterionKey, number> {
  const out = {} as Record<CriterionKey, number>
  for (const key of CRITERION_KEYS)
    out[key] = criterionScore(c, key, focus[key] ?? [])
  return out
}
