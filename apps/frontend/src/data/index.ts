import { apiGet, apiPost, apiRequest } from "./apiClient"
import { mapCommune, type RawCommune } from "./mapCommune"
import type {
  CityReviewItemsResponse,
  CityReviewsResponse,
  Commune,
  CommuneSearchResult,
  CommuneRankItem,
  CommuneRankMeta,
  CommuneRankRequest,
  CommuneRankResponse,
  GeoDepartement,
  GeoRegion,
  NationalStats,
  TailleCommune,
} from "./types"

export * from "./types"
// Le mock `communes.ts` n'est plus affiché : il ne sert QUE de jeu de
// Les données mockées restent un fallback pour certains écrans, mais le score
// de compatibilité vient désormais exclusivement du backend.
export { MOYENNES_NATIONALES } from "./communes"
export { scoreColor, scoreColorHex } from "./scoring"
export {
  CRITERIA,
  CRITERION_KEYS,
  LEVEL_WEIGHT,
  LEVEL_LABELS,
  DEFAULT_IMPORTANCE,
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
 * `apiClient`.
 */

type RankRequestSignature = string

const rankItemCache = new Map<RankRequestSignature, Map<string, CommuneRankItem>>()
const rankMetaCache = new Map<RankRequestSignature, CommuneRankMeta>()

function normalizeRankList(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr"))
  return normalized.length > 0 ? normalized : undefined
}

function normalizeRankSignature(
  request: Pick<CommuneRankRequest, "filters" | "importance" | "subFocus">,
): RankRequestSignature {
  const filters = request.filters ?? {}
  const subFocus = request.subFocus ?? {}
  return JSON.stringify({
    filters: {
      regionIds: normalizeRankList(filters.regionIds),
      departementIds: normalizeRankList(filters.departementIds),
      tailles: normalizeRankList(filters.tailles),
    },
    importance: request.importance,
    subFocus: Object.fromEntries(
      Object.entries(subFocus)
        .map(([key, values]) => [key, normalizeRankList(values)])
        .filter(([, values]) => Array.isArray(values) && values.length > 0)
        .sort(([a], [b]) => String(a).localeCompare(String(b), "fr")),
    ),
  })
}

function storeRankResponse(
  request: Pick<CommuneRankRequest, "filters" | "importance" | "subFocus">,
  response: CommuneRankResponse,
): void {
  const signature = normalizeRankSignature(request)
  const existing = rankItemCache.get(signature) ?? new Map<string, CommuneRankItem>()
  for (const item of response.data) {
    existing.set(item.commune.id, item)
  }
  rankItemCache.set(signature, existing)
  rankMetaCache.set(signature, response.meta)
}

export function getCachedRankItem(
  request: Pick<CommuneRankRequest, "filters" | "importance" | "subFocus">,
  id: string,
): CommuneRankItem | undefined {
  return rankItemCache.get(normalizeRankSignature(request))?.get(id)
}

export function getCachedRankItems(
  request: Pick<CommuneRankRequest, "filters" | "importance" | "subFocus">,
): CommuneRankItem[] {
  return Array.from(rankItemCache.get(normalizeRankSignature(request))?.values() ?? [])
}

export function getCachedRankMeta(
  request: Pick<CommuneRankRequest, "filters" | "importance" | "subFocus">,
): CommuneRankMeta | undefined {
  return rankMetaCache.get(normalizeRankSignature(request))
}

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
 * Classement serveur (`POST /communes/rank`).
 * Le back trie et pagine; le front ne fait plus de ranking local.
 */
export async function rankCommunes(
  request: CommuneRankRequest,
): Promise<CommuneRankResponse> {
  const response = await apiPost<CommuneRankResponse>("/communes/rank", request)
  storeRankResponse(request, response)
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
