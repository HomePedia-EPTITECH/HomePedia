import { useEffect, useState } from "react"
import { apiGet } from "./apiClient"
import { mapCommune, type RawCommune } from "./mapCommune"
import type { Commune } from "./types"

/**
 * Keep the commune loader focused on fetching and caching.
 * The pages that consume it handle their own business filtering.
 *
 * Important: `/resultats` must still render even if some communes do not yet
 * have usable coordinates. The map can ignore those entries on its side.
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
