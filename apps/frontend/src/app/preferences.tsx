import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  CRITERION_KEYS,
  DEFAULT_IMPORTANCE,
  personalScore,
  scoreBreakdown,
  type Commune,
  type CriterionKey,
  type Importance,
  type ImportanceLevel,
  type SubFocus,
} from "@/data"

/** Salaire net mensuel par défaut (€), utilisé tant que rien n'est saisi. */
export const DEFAULT_SALARY = 2200

/** Valeur sentinelle "aucun filtre" (Radix Select interdit la valeur ""). */
export const ALL_FILTER = "__all__"

/** Filtres géographiques partagés entre Classement et Carte. */
export interface GeoFilters {
  region: string
  departement: string
  taille: string
}

const DEFAULT_GEO_FILTERS: GeoFilters = {
  region: ALL_FILTER,
  departement: ALL_FILTER,
  taille: ALL_FILTER,
}

interface PreferencesState {
  /** Salaire net mensuel de l'utilisateur (€). */
  salary: number
  setSalary: (value: number) => void

  /** Niveau d'importance de chaque grand critère (0 = non retenu). */
  importance: Importance
  /** Sous-critères "focus" par critère (vide = tous pris en compte). */
  subFocus: SubFocus
  /** Grands critères actuellement retenus (importance > 0), dans l'ordre canonique. */
  selectedCriteria: CriterionKey[]

  setImportance: (key: CriterionKey, level: ImportanceLevel) => void
  addCriterion: (key: CriterionKey) => void
  removeCriterion: (key: CriterionKey) => void
  toggleSub: (key: CriterionKey, subKey: string) => void
  resetCriteria: () => void

  /** Filtres géographiques (région / département / taille), partagés Classement ↔ Carte. */
  filters: GeoFilters
  setFilter: (key: keyof GeoFilters, value: string) => void
  resetFilters: () => void

  /** Score de compatibilité /100 d'une commune selon les préférences courantes. */
  scoreOf: (c: Commune) => number
  /** Détail par critère (0–100). */
  breakdownOf: (c: Commune) => Record<CriterionKey, number>

  /** Villes sélectionnées pour le comparateur (max 3), par id INSEE. */
  compareIds: string[]
  toggleCompare: (id: string) => void
  clearCompare: () => void
  isComparing: (id: string) => boolean
}

const PreferencesContext = createContext<PreferencesState | null>(null)

const MAX_COMPARE = 3
/** Niveau appliqué quand on ajoute / sélectionne un critère. */
const ADD_LEVEL: ImportanceLevel = 2

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY)
  const [importance, setImportanceState] =
    useState<Importance>(DEFAULT_IMPORTANCE)
  const [subFocus, setSubFocus] = useState<SubFocus>({})
  const [filters, setFilters] = useState<GeoFilters>(DEFAULT_GEO_FILTERS)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const setFilter = useCallback((key: keyof GeoFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      // Changer de région invalide le département sélectionné.
      if (key === "region") next.departement = ALL_FILTER
      return next
    })
  }, [])

  const setImportance = useCallback(
    (key: CriterionKey, level: ImportanceLevel) => {
      setImportanceState((prev) => ({ ...prev, [key]: level }))
    },
    [],
  )

  const addCriterion = useCallback((key: CriterionKey) => {
    setImportanceState((prev) => ({ ...prev, [key]: ADD_LEVEL }))
  }, [])

  const removeCriterion = useCallback((key: CriterionKey) => {
    setImportanceState((prev) => ({ ...prev, [key]: 0 }))
    setSubFocus((prev) => ({ ...prev, [key]: [] }))
  }, [])

  const toggleSub = useCallback((key: CriterionKey, subKey: string) => {
    setSubFocus((prev) => {
      const current = prev[key] ?? []
      const next = current.includes(subKey)
        ? current.filter((s) => s !== subKey)
        : [...current, subKey]
      return { ...prev, [key]: next }
    })
  }, [])

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }, [])

  const value = useMemo<PreferencesState>(() => {
    const selectedCriteria = CRITERION_KEYS.filter((k) => importance[k] > 0)
    return {
      salary,
      setSalary,
      importance,
      subFocus,
      selectedCriteria,
      setImportance,
      addCriterion,
      removeCriterion,
      toggleSub,
      resetCriteria: () => {
        setImportanceState(DEFAULT_IMPORTANCE)
        setSubFocus({})
      },
      filters,
      setFilter,
      resetFilters: () => setFilters(DEFAULT_GEO_FILTERS),
      scoreOf: (c: Commune) => personalScore(c, importance, subFocus),
      breakdownOf: (c: Commune) => scoreBreakdown(c, subFocus),
      compareIds,
      toggleCompare,
      clearCompare: () => setCompareIds([]),
      isComparing: (id: string) => compareIds.includes(id),
    }
  }, [
    salary,
    importance,
    subFocus,
    filters,
    setFilter,
    compareIds,
    setImportance,
    addCriterion,
    removeCriterion,
    toggleSub,
    toggleCompare,
  ])

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): PreferencesState {
  const ctx = useContext(PreferencesContext)
  if (!ctx)
    throw new Error("usePreferences must be used within PreferencesProvider")
  return ctx
}

export const MAX_COMPARE_CITIES = MAX_COMPARE
