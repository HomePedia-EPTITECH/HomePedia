import { apiGet, apiPost, apiRequest } from "./apiClient"
import { mapCommune, type RawCommune } from "./mapCommune"
import type {
  CityReviewItemsResponse,
  CityReviewsResponse,
  Commune,
  CommuneSearchResult,
  CommuneRankRequest,
  CommuneRankResponse,
  GeoDepartement,
  GeoRegion,
  NationalStats,
  TailleCommune,
} from "./types"

export * from "./types"
// Le mock `communes.ts` n'est plus affichÃ© : il ne sert QUE de jeu de
// calibration pour la normalisation des scores (voir criteria.ts). Seule la
// moyenne nationale par dÃ©faut en est encore rÃ©exportÃ©e (fallback de fiche).
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
 * FaÃ§ade d'accÃ¨s aux donnÃ©es : ces fonctions appellent le back NestJS via
 * `apiClient`.
 */

/**
 * RÃ©cupÃ¨re une commune complÃ¨te depuis le back (`GET /communes/:id`).
 * Renvoie `undefined` si la commune est inconnue (404) ou si le back est
 * injoignable â€” l'appelant affiche alors un Ã©tat Â« introuvable Â» sans crasher.
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
 * Renvoie une liste allÃ©gÃ©e (`CommuneSearchResult`) â€” de quoi afficher des
 * suggestions. Sur requÃªte vide ou erreur rÃ©seau : liste vide (pas de crash).
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
 * Classement serveur (`POST /communes/rank`).
 * Le back trie et pagine; le front ne fait plus de ranking local.
 */
export async function rankCommunes(
  request: CommuneRankRequest,
): Promise<CommuneRankResponse> {
  const response = await apiPost<CommuneRankResponse>("/communes/rank", request)
  return {
    ...response,
    data: response.data.map((item) => ({
      ...item,
      commune: mapCommune(item.commune as RawCommune),
    })),
  }
}

/**
 * Référentiel géographique officiel.
 */
export async function getRegions(): Promise<GeoRegion[]> {
  return apiGet<GeoRegion[]>("/regions")
}

export async function getRegionByCode(code: string): Promise<GeoRegion> {
  return apiGet<GeoRegion>(`/regions/${encodeURIComponent(code)}`)
}

export async function getDepartements(region?: string): Promise<GeoDepartement[]> {
  const query = region ? `?region=${encodeURIComponent(region)}` : ""
  return apiGet<GeoDepartement[]>(`/departements${query}`)
}

export async function getDepartementByCode(code: string): Promise<GeoDepartement> {
  return apiGet<GeoDepartement>(`/departements/${encodeURIComponent(code)}`)
}

export async function getRegionDepartements(code: string): Promise<GeoDepartement[]> {
  return apiGet<GeoDepartement[]>(`/regions/${encodeURIComponent(code)}/departements`)
}

/**
 * Moyennes nationales depuis le back (`GET /stats/national`).
 * Mappe les clÃ©s `*Moyen` du back vers la forme `NationalStats` de la fiche.
 * Ne capture pas l'erreur : l'appelant conserve son repÃ¨re par dÃ©faut si Ã§a Ã©choue.
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

export async function getCityReviews(code: string): Promise<CityReviewsResponse> {
  return apiGet<CityReviewsResponse>(`/reviews/cities/${encodeURIComponent(code)}`)
}

export async function getCityReviewItems(
  code: string,
  limit = 100,
  cursor?: string,
): Promise<CityReviewItemsResponse> {
  const params = new URLSearchParams()
  if (limit !== undefined) params.set("limit", String(limit))
  if (cursor) params.set("cursor", cursor)
  const suffix = params.toString() ? `?${params.toString()}` : ""
  return apiRequest<CityReviewItemsResponse>(
    `/reviews/cities/${encodeURIComponent(code)}/items${suffix}`,
  )
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
