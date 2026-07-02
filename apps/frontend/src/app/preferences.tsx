import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { DEFAULT_WEIGHTS, type Weights } from "@/data"

interface PreferencesState {
  weights: Weights
  setWeight: (key: keyof Weights, value: number) => void
  setWeights: (weights: Weights) => void
  resetWeights: () => void
  /** Villes sélectionnées pour le comparateur (max 3), par id INSEE. */
  compareIds: string[]
  toggleCompare: (id: string) => void
  clearCompare: () => void
  isComparing: (id: string) => boolean
}

const PreferencesContext = createContext<PreferencesState | null>(null)

const MAX_COMPARE = 3

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [weights, setWeightsState] = useState<Weights>(DEFAULT_WEIGHTS)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const setWeight = useCallback((key: keyof Weights, value: number) => {
    setWeightsState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }, [])

  const value = useMemo<PreferencesState>(
    () => ({
      weights,
      setWeight,
      setWeights: setWeightsState,
      resetWeights: () => setWeightsState(DEFAULT_WEIGHTS),
      compareIds,
      toggleCompare,
      clearCompare: () => setCompareIds([]),
      isComparing: (id: string) => compareIds.includes(id),
    }),
    [weights, compareIds, setWeight, toggleCompare],
  )

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
