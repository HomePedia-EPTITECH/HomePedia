import { useEffect, useState } from "react"
import { apiGet } from "./apiClient"
import { mapCommune, type RawCommune } from "./mapCommune"
import type { Commune } from "./types"

/**
 * Une commune est « exploitable » si elle a au moins un prix : signal minimal
 * pour être notée et classée sans produire de score trompeur (un village sans
 * prix ressortirait « le moins cher », donc 1er). On n'exige PAS les
 * coordonnées : le Classement n'en a pas besoin, seule la Carte les requiert
 * (elle ignore les communes sans lon/lat de son côté).
 */
function isRenderable(c: Commune): boolean {
  return Number.isFinite(c.prixM2Appartement)
}

// Singleton cache: `/communes` is loaded once per session and shared by all
// consumers (classment, map, geo filters, landing).
let cache: Commune[] | null = null
let inflight: Promise<Commune[]> | null = null

function loadCommunes(): Promise<Commune[]> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = apiGet<RawCommune[]>("/communes")
      .then((rows) => rows.map(mapCommune).filter(isRenderable))
      .then((list) => {
        cache = list
        return list
      })
      .catch((err) => {
        inflight = null
        throw err
      })
  }
  return inflight
}

export interface UseCommunes {
  communes: Commune[]
  loading: boolean
  error: Error | null
}

/**
 * Load communes from the backend (`GET /communes`).
 * The result is cached at module level to avoid repeated fetches.
 */
export function useCommunes(): UseCommunes {
  const [communes, setCommunes] = useState<Commune[]>(cache ?? [])
  const [loading, setLoading] = useState<boolean>(!cache)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (cache) return
    let cancelled = false
    loadCommunes()
      .then((list) => {
        if (!cancelled) {
          setCommunes(list)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { communes, loading, error }
}
