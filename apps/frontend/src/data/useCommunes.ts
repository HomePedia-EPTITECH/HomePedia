import { useEffect, useState } from "react"
import { apiGet } from "./apiClient"
import { mapCommune, type RawCommune } from "./mapCommune"
import type { Commune } from "./types"

/**
 * Une commune est « exploitable » si elle a au moins un prix : c'est le signal
 * minimal pour être notée et classée sans produire de score trompeur (un
 * village sans prix ressortirait « le moins cher », donc 1er).
 *
 * On n'exige PAS les coordonnées ici : le Classement n'en a pas besoin, seule
 * la Carte les requiert (elle filtre les communes sans lon/lat de son côté).
 * Ça permet d'afficher les communes issues de l'ETL même quand leurs coords
 * ne sont pas encore renseignées (couverture DVF partielle).
 */
function isComplete(c: Commune): boolean {
  return Number.isFinite(c.prixM2Appartement)
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
