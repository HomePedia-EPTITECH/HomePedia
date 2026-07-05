import { useEffect, useMemo, useState } from "react"
import {
  getCachedRankItems,
  getCachedRankMeta,
  rankCommunes,
} from "./index"
import type { CommuneRankItem, CommuneRankRequest } from "./types"

const PAGE_SIZE = 100

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
}

export function useRankedCommunes(
  request: CommuneRankRequest,
  ids: string[],
): {
  items: CommuneRankItem[]
  loading: boolean
  error: Error | null
} {
  const wantedIds = useMemo(() => uniqueIds(ids), [ids.join("|")])
  const wantedKey = wantedIds.join("|")

  const [items, setItems] = useState<CommuneRankItem[]>([])
  const [loading, setLoading] = useState<boolean>(wantedIds.length > 0)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    if (wantedIds.length === 0) {
      setItems([])
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    const requestBase = {
      filters: request.filters,
      importance: request.importance,
      subFocus: request.subFocus,
    }
    const cached = new Map(
      getCachedRankItems(requestBase).map((item) => [item.commune.id, item]),
    )

    if (wantedIds.every((id) => cached.has(id))) {
      setItems(wantedIds.map((id) => cached.get(id)!).filter(Boolean))
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setError(null)

    const load = async () => {
      let page = 1
      let totalPages = getCachedRankMeta(requestBase)?.totalPages ?? Infinity

      while (!cancelled && wantedIds.some((id) => !cached.has(id))) {
        const response = await rankCommunes({
          ...request,
          page,
          limit: PAGE_SIZE,
        })

        response.data.forEach((item) => {
          cached.set(item.commune.id, item)
        })

        totalPages = response.meta.totalPages || totalPages
        if (response.meta.totalPages === 0 || page >= response.meta.totalPages) {
          break
        }

        page += 1
        if (page > totalPages) break
      }

      if (cancelled) return

      setItems(wantedIds.map((id) => cached.get(id)).filter(Boolean) as CommuneRankItem[])
      setLoading(false)
    }

    load().catch((err) => {
      if (cancelled) return
      setError(err instanceof Error ? err : new Error(String(err)))
      setItems([])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [wantedKey, request.filters, request.importance, request.subFocus, request])

  return { items, loading, error }
}
