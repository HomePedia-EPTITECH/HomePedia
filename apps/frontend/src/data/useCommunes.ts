import { useEffect, useState } from "react"
import { apiGet } from "./apiClient"
import { mapCommune, type RawCommune } from "./mapCommune"
import type { Commune } from "./types"

/**
 * Une commune est « complète » si elle a le minimum pour être notée ET affichée :
 * un prix (pour le pouvoir d'achat / le classement) et des coordonnées (carte).
 *
 * Tant que l'ETL complet n'a pas tourné, seules les ~8 villes seedées passent
 * ce filtre. C'est VOULU : classer/afficher des communes vides produirait des
 * scores trompeurs (un village sans prix ressort « le moins cher », donc 1er).
 * Le jour où la DB est remplie, le même filtre laisse passer les milliers de
 * communes réelles — aucun changement de code nécessaire.
 */
function isComplete(c: Commune): boolean {
  return (
    Number.isFinite(c.prixM2Appartement) &&
    Number.isFinite(c.lon) &&
    Number.isFinite(c.lat)
  )
}

// Cache singleton : `/communes` n'est chargé qu'UNE fois par session, partagé
// par tous les consommateurs (Classement, Carte, filtres géo, Accueil).
let cache: Commune[] | null = null
let inflight: Promise<Commune[]> | null = null

function loadCommunes(): Promise<Commune[]> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = apiGet<RawCommune[]>("/communes")
      .then((rows) => rows.map(mapCommune).filter(isComplete))
      .then((list) => {
        cache = list
        return list
      })
      .catch((err) => {
        inflight = null // autorise un nouvel essai au prochain montage
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
 * Charge la liste des communes complètes depuis le back (`GET /communes`).
 * Fetch unique et partagé (cache module) → pas de rechargement entre les pages.
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
