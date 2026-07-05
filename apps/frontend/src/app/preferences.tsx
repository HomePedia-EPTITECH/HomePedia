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
  type CriterionKey,
  type Importance,
  type ImportanceLevel,
  type SubFocus,
} from "@/data"

/** Tranche de salaire net mensuel du foyer (€) par défaut. */
export const DEFAULT_SALARY_RANGE: [number, number] = [1800, 2800]
/** Nombre d'actifs dans le foyer par défaut. */
export const DEFAULT_HOUSEHOLD = 1

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
  /** Tranche de salaire net mensuel du foyer (€), [min, max]. */
  salaryRange: [number, number]
  setSalaryRange: (range: [number, number]) => void
  /** Nombre d'actifs dans le foyer (1, 2, …). */
  household: number
  setHousehold: (n: number) => void
  /** Salaire effectif retenu pour les calculs (milieu de la tranche). */
  salary: number

  /** Niveau d'importance de chaque grand critère (0 = non retenu). */
  importance: Importance
  /** Sous-critères "focus" par critère (vide = tous pris en compte). */
  subFocus: SubFocus
  /** Grands critères actuellement retenus (importance > 0), dans l'ordre canonique. */
  selectedCriteria: CriterionKey[]

  setImportance: (key: CriterionKey, level: ImportanceLevel) => void
  addCriterion: (key: CriterionKey) => void
  removeCriterion: (key: CriterionKey) => void
  /** Fixe la liste des sous-critères pris en compte ([] = tous). */
  setSubFocusFor: (key: CriterionKey, subKeys: string[]) => void
  /** Réinitialise les critères sur la sélection de référence (l'Accueil). */
  resetCriteria: () => void
  /** Fige la sélection de référence (appelée depuis l'Accueil). */
  setBaseline: (importance: Importance) => void

  /** Filtres géographiques (région / département / taille), partagés Classement ↔ Carte. */
  filters: GeoFilters
  setFilter: (key: keyof GeoFilters, value: string) => void
  resetFilters: () => void

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
  const [salaryRange, setSalaryRange] =
    useState<[number, number]>(DEFAULT_SALARY_RANGE)
  const [household, setHousehold] = useState<number>(DEFAULT_HOUSEHOLD)
  const [importance, setImportanceState] =
    useState<Importance>(DEFAULT_IMPORTANCE)
  // Sélection de référence (celle de l'Accueil) que "Réinitialiser" restaure.
  const [baseline, setBaseline] = useState<Importance>(DEFAULT_IMPORTANCE)
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

  const setSubFocusFor = useCallback((key: CriterionKey, subKeys: string[]) => {
    setSubFocus((prev) => ({ ...prev, [key]: subKeys }))
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
    const salary = Math.round((salaryRange[0] + salaryRange[1]) / 2)
    return {
      salaryRange,
      setSalaryRange,
      household,
      setHousehold,
      salary,
      importance,
      subFocus,
      selectedCriteria,
      setImportance,
      addCriterion,
      removeCriterion,
      setSubFocusFor,
      resetCriteria: () => {
        setImportanceState(baseline)
        setSubFocus({})
      },
      setBaseline,
      filters,
      setFilter,
      resetFilters: () => setFilters(DEFAULT_GEO_FILTERS),
      compareIds,
      toggleCompare,
      clearCompare: () => setCompareIds([]),
      isComparing: (id: string) => compareIds.includes(id),
    }
  }, [
    salaryRange,
    household,
    importance,
    baseline,
    subFocus,
    filters,
    setFilter,
    compareIds,
    setImportance,
    addCriterion,
    removeCriterion,
    setSubFocusFor,
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
