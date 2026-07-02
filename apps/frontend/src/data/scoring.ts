import { COMMUNES } from "./communes"
import type { Commune, ScoreBreakdown, Weights } from "./types"

/**
 * Moteur de scoring mock.
 * Chaque sous-score est normalisé sur 0–100 par rapport au dataset,
 * dans le sens "plus c'est haut, mieux c'est".
 */

interface Range {
  min: number
  max: number
}

function rangeOf(values: number[]): Range {
  return { min: Math.min(...values), max: Math.max(...values) }
}

/** Normalise dans [0,100]. `invert` pour les critères "moins = mieux" (prix, chômage…). */
function norm(value: number, range: Range, invert = false): number {
  if (range.max === range.min) return 50
  const t = (value - range.min) / (range.max - range.min)
  const s = invert ? 1 - t : t
  return Math.round(s * 100)
}

// Bornes précalculées une fois sur l'ensemble du dataset.
const RANGES = {
  prixAppart: rangeOf(COMMUNES.map((c) => c.prixM2Appartement)),
  revenu: rangeOf(COMMUNES.map((c) => c.revenuMoyen)),
}

/** Indice de délinquance agrégé (pondère les 4 faits). */
function delinquance(c: Commune): number {
  return (
    c.agressions * 1.4 +
    c.cambriolages * 1.1 +
    c.volsDegradations * 0.6 +
    c.stupefiants * 1.0
  )
}
const RANGE_DELINQUANCE = rangeOf(COMMUNES.map(delinquance))

/** Score des services de santé (accessibilité par habitant). */
function santeIndice(c: Commune): number {
  const parMille =
    ((c.services.medecins + c.services.specialistes) * 1.0 +
      c.services.pharmacies * 0.8 +
      c.services.hopitaux * 4) /
    (c.population / 1000)
  return parMille
}
const RANGE_SANTE = rangeOf(COMMUNES.map(santeIndice))

/** Renvoie les 6 sous-scores normalisés d'une commune (0–100). */
export function scoreBreakdown(c: Commune): ScoreBreakdown {
  return {
    prix: norm(c.prixM2Appartement, RANGES.prixAppart, true),
    securite: norm(delinquance(c), RANGE_DELINQUANCE, true),
    qualiteVie: Math.round(c.notes.qualiteVie * 10),
    ecoles: Math.round(c.notes.enseignement * 10),
    sante: norm(santeIndice(c), RANGE_SANTE),
    revenus: norm(c.revenuMoyen, RANGES.revenu),
  }
}

/** Score personnalisé /100 pondéré par les curseurs utilisateur. */
export function personalScore(c: Commune, weights: Weights): number {
  const b = scoreBreakdown(c)
  const totalWeight =
    weights.prix +
    weights.securite +
    weights.qualiteVie +
    weights.ecoles +
    weights.sante +
    weights.revenus
  if (totalWeight === 0) return 0
  const weighted =
    b.prix * weights.prix +
    b.securite * weights.securite +
    b.qualiteVie * weights.qualiteVie +
    b.ecoles * weights.ecoles +
    b.sante * weights.sante +
    b.revenus * weights.revenus
  return Math.round(weighted / totalWeight)
}

/** Couleur (token chart) selon le score, pour pins & badges : rouge → orange → vert. */
export function scoreColor(score: number): string {
  if (score >= 75) return "var(--success)"
  if (score >= 55) return "var(--warning)"
  if (score >= 40) return "oklch(0.72 0.17 55)"
  return "var(--destructive)"
}

export function scoreColorHex(score: number): string {
  if (score >= 75) return "#22c55e"
  if (score >= 55) return "#eab308"
  if (score >= 40) return "#f97316"
  return "#ef4444"
}
