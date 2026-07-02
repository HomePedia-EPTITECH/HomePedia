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
 * niveau d'importance. Chaque score de critère = moyenne de ses sous-métriques
 * (ou seulement celles sur lesquelles l'utilisateur a mis le focus).
 */

export type CriterionKey =
  | "pouvoirAchat"
  | "securite"
  | "qualiteVie"
  | "ecoles"
  | "sante"
  | "emploi"

export const CRITERION_KEYS: CriterionKey[] = [
  "pouvoirAchat",
  "securite",
  "qualiteVie",
  "ecoles",
  "sante",
  "emploi",
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

export const DEFAULT_IMPORTANCE: Importance = {
  pouvoirAchat: 2,
  securite: 2,
  qualiteVie: 1,
  ecoles: 0,
  sante: 0,
  emploi: 1,
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

const perMille = (count: number, pop: number) => count / (pop / 1000)

const R = {
  prixAppart: rangeOf(COMMUNES.map((c) => c.prixM2Appartement)),
  prixMoyen: rangeOf(
    COMMUNES.map((c) => (c.prixM2Appartement + c.prixM2Maison) / 2),
  ),
  revenu: rangeOf(COMMUNES.map((c) => c.revenuMoyen)),
  chomage: rangeOf(COMMUNES.map((c) => c.tauxChomage)),
  agr: rangeOf(COMMUNES.map((c) => c.agressions)),
  camb: rangeOf(COMMUNES.map((c) => c.cambriolages)),
  vols: rangeOf(COMMUNES.map((c) => c.volsDegradations)),
  stup: rangeOf(COMMUNES.map((c) => c.stupefiants)),
  maternelle: rangeOf(
    COMMUNES.map((c) => perMille(c.services.ecolesMaternelles, c.population)),
  ),
  primaire: rangeOf(
    COMMUNES.map((c) => perMille(c.services.ecolesPrimaires, c.population)),
  ),
  college: rangeOf(
    COMMUNES.map((c) => perMille(c.services.colleges, c.population)),
  ),
  lycee: rangeOf(COMMUNES.map((c) => perMille(c.services.lycees, c.population))),
  medecins: rangeOf(
    COMMUNES.map((c) => perMille(c.services.medecins, c.population)),
  ),
  specialistes: rangeOf(
    COMMUNES.map((c) => perMille(c.services.specialistes, c.population)),
  ),
  hopitaux: rangeOf(
    COMMUNES.map((c) => perMille(c.services.hopitaux, c.population)),
  ),
}

// ---- Définition des critères et sous-critères ----

export interface SubMetricDef {
  key: string
  label: string
  /** Score normalisé 0–100 ("plus c'est haut, mieux c'est"). */
  score: (c: Commune) => number
}

export interface CriterionDef {
  key: CriterionKey
  label: string
  /** Texte d'aide court affiché sous le libellé. */
  hint: string
  subs: SubMetricDef[]
}

export const CRITERIA: Record<CriterionKey, CriterionDef> = {
  pouvoirAchat: {
    key: "pouvoirAchat",
    label: "Pouvoir d'achat",
    hint: "Ce que votre salaire vous permet ici",
    subs: [
      {
        key: "louer",
        label: "Se loger en location",
        score: (c) => norm(c.prixM2Appartement, R.prixAppart, true),
      },
      {
        key: "acheter",
        label: "Devenir propriétaire",
        score: (c) =>
          norm((c.prixM2Appartement + c.prixM2Maison) / 2, R.prixMoyen, true),
      },
    ],
  },
  securite: {
    key: "securite",
    label: "Sécurité",
    hint: "Délinquance rapportée à la population",
    subs: [
      { key: "agressions", label: "Agressions", score: (c) => norm(c.agressions, R.agr, true) },
      { key: "cambriolages", label: "Cambriolages", score: (c) => norm(c.cambriolages, R.camb, true) },
      { key: "vols", label: "Vols & dégradations", score: (c) => norm(c.volsDegradations, R.vols, true) },
      { key: "stupefiants", label: "Stupéfiants", score: (c) => norm(c.stupefiants, R.stup, true) },
    ],
  },
  qualiteVie: {
    key: "qualiteVie",
    label: "Qualité de vie",
    hint: "Cadre, culture, mobilité, loisirs",
    subs: [
      { key: "environnement", label: "Environnement & nature", score: (c) => Math.round(c.notes.environnement * 10) },
      { key: "transports", label: "Transports", score: (c) => Math.round(c.notes.transports * 10) },
      { key: "culture", label: "Culture", score: (c) => Math.round(c.notes.culture * 10) },
      { key: "sportsLoisirs", label: "Sports & loisirs", score: (c) => Math.round(c.notes.sportsLoisirs * 10) },
    ],
  },
  ecoles: {
    key: "ecoles",
    label: "Écoles",
    hint: "Offre scolaire par habitant",
    subs: [
      { key: "maternelle", label: "Maternelles", score: (c) => norm(perMille(c.services.ecolesMaternelles, c.population), R.maternelle) },
      { key: "primaire", label: "Primaires", score: (c) => norm(perMille(c.services.ecolesPrimaires, c.population), R.primaire) },
      { key: "college", label: "Collèges", score: (c) => norm(perMille(c.services.colleges, c.population), R.college) },
      { key: "lycee", label: "Lycées", score: (c) => norm(perMille(c.services.lycees, c.population), R.lycee) },
    ],
  },
  sante: {
    key: "sante",
    label: "Santé",
    hint: "Accès aux soins par habitant",
    subs: [
      { key: "medecins", label: "Médecins généralistes", score: (c) => norm(perMille(c.services.medecins, c.population), R.medecins) },
      { key: "specialistes", label: "Spécialistes", score: (c) => norm(perMille(c.services.specialistes, c.population), R.specialistes) },
      { key: "hopitaux", label: "Hôpitaux", score: (c) => norm(perMille(c.services.hopitaux, c.population), R.hopitaux) },
    ],
  },
  emploi: {
    key: "emploi",
    label: "Emploi & revenus",
    hint: "Dynamisme économique local",
    subs: [
      { key: "revenus", label: "Revenus médians", score: (c) => norm(c.revenuMoyen, R.revenu) },
      { key: "emploi", label: "Faible chômage", score: (c) => norm(c.tauxChomage, R.chomage, true) },
    ],
  },
}

// ---- Calcul du score ----

/** Score d'un critère (0–100) : moyenne des sous-métriques ciblées (ou toutes). */
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
  const sum = subs.reduce((a, s) => a + s.score(c), 0)
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
  for (const key of CRITERION_KEYS) out[key] = criterionScore(c, key, focus[key] ?? [])
  return out
}
