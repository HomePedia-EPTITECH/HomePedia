import { COMMUNES } from "./communes"
import type { Commune, TailleCommune } from "./types"

export * from "./types"
export { COMMUNES, MOYENNES_NATIONALES } from "./communes"
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
 * Façade "API" mock. Le jour où le back NestJS existe, on remplace
 * l'implémentation de ces fonctions par des appels HTTP — l'UI ne bouge pas.
 */

export function getCommuneById(id: string): Commune | undefined {
  return COMMUNES.find((c) => c.id === id)
}

export function getCommunes(): Commune[] {
  return COMMUNES
}

export interface CommuneFilters {
  region?: string
  departement?: string
  taille?: TailleCommune
  prixMax?: number
}

export function filterCommunes(filters: CommuneFilters): Commune[] {
  return COMMUNES.filter((c) => {
    if (filters.region && c.region !== filters.region) return false
    if (filters.departement && c.departement !== filters.departement)
      return false
    if (filters.taille && c.taille !== filters.taille) return false
    if (filters.prixMax && c.prixM2Appartement > filters.prixMax) return false
    return true
  })
}

export function searchCommunes(query: string, limit = 8): Commune[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return COMMUNES.filter(
    (c) =>
      c.nom.toLowerCase().includes(q) ||
      c.departement.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.codePostal.startsWith(q),
  ).slice(0, limit)
}

export const REGIONS: string[] = Array.from(
  new Set(COMMUNES.map((c) => c.region)),
).sort()

export const DEPARTEMENTS: string[] = Array.from(
  new Set(COMMUNES.map((c) => c.departement)),
).sort()

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
