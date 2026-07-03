import { apiGet } from "./apiClient"
import { mapCommune, type RawCommune } from "./mapCommune"
import type {
  Commune,
  CommuneSearchResult,
  NationalStats,
  TailleCommune,
} from "./types"

export * from "./types"
// Le mock `communes.ts` n'est plus affiché : il ne sert QUE de jeu de
// calibration pour la normalisation des scores (voir criteria.ts). Seule la
// moyenne nationale par défaut en est encore réexportée (fallback de fiche).
export { MOYENNES_NATIONALES } from "./communes"
export { scoreColor, scoreColorHex } from "./scoring"
export {
  CRITERIA,
  CRITERION_KEYS,
  LEVEL_WEIGHT,
  LEVEL_LABELS,
  DEFAULT_IMPORTANCE,
  criterionScore,
  subScore,
  personalScore,
  scoreBreakdown,
  type CriterionKey,
  type CriterionDef,
  type SubMetricDef,
  type ImportanceLevel,
  type Importance,
  type SubFocus,
} from "./criteria"
export { purchasingPower, type PurchasingPower } from "./purchasingPower"

/**
 * Façade d'accès aux données : ces fonctions appellent le back NestJS via
 * `apiClient`. La liste des communes, elle, passe par le hook `useCommunes`.
 */

/**
 * Récupère une commune complète depuis le back (`GET /communes/:id`).
 * Renvoie `undefined` si la commune est inconnue (404) ou si le back est
 * injoignable — l'appelant affiche alors un état « introuvable » sans crasher.
 */
export async function getCommuneById(id: string): Promise<Commune | undefined> {
  try {
    const raw = await apiGet<RawCommune>(`/communes/${id}`)
    return mapCommune(raw)
  } catch {
    return undefined
  }
}

/**
 * Recherche de communes via le back (`GET /communes/search?q=`).
 * Renvoie une liste allégée (`CommuneSearchResult`) — de quoi afficher des
 * suggestions. Sur requête vide ou erreur réseau : liste vide (pas de crash).
 */
export async function searchCommunes(
  query: string,
  limit = 8,
): Promise<CommuneSearchResult[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const results = await apiGet<CommuneSearchResult[]>(
      `/communes/search?q=${encodeURIComponent(q)}`,
    )
    return results.slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Moyennes nationales depuis le back (`GET /stats/national`).
 * Mappe les clés `*Moyen` du back vers la forme `NationalStats` de la fiche.
 * Ne capture pas l'erreur : l'appelant conserve son repère par défaut si ça échoue.
 */
export async function getNationalStats(): Promise<NationalStats> {
  const raw = await apiGet<{
    agressionsMoyen: number
    cambriolagesMoyen: number
    volsDegradationsMoyen: number
    stupefiantsMoyen: number
    prixM2AppartementMoyen: number
    tauxChomageMoyen: number
  }>("/stats/national")
  return {
    agressions: raw.agressionsMoyen,
    cambriolages: raw.cambriolagesMoyen,
    volsDegradations: raw.volsDegradationsMoyen,
    stupefiants: raw.stupefiantsMoyen,
    prixM2Appartement: raw.prixM2AppartementMoyen,
    tauxChomage: raw.tauxChomageMoyen,
  }
}

export const TAILLE_LABELS: Record<TailleCommune, string> = {
  village: "Village",
  ville: "Ville",
  metropole: "Métropole",
}

// ---- Helpers de formatage FR ----

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value)
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} %`
}
