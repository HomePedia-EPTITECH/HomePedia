import { useState } from "react"
import {
  Briefcase,
  ChevronDown,
  GraduationCap,
  Heart,
  Plus,
  Popcorn,
  RotateCcw,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Stethoscope,
  TramFront,
  Wallet,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  CRITERIA,
  CRITERION_KEYS,
  LEVEL_LABELS,
  type CriterionKey,
  type ImportanceLevel,
} from "@/data"
import { usePreferences } from "@/app/preferences"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const CRITERION_ICONS: Record<CriterionKey, LucideIcon> = {
  pouvoirAchat: Wallet,
  securite: Shield,
  qualiteVie: Heart,
  ecoles: GraduationCap,
  sante: Stethoscope,
  emploi: Briefcase,
  commerces: ShoppingBag,
  transports: TramFront,
  cultureLoisirs: Popcorn,
}

const LEVELS: Exclude<ImportanceLevel, 0>[] = [1, 2, 3]

/** Panneau "Vos critères" : dosage 3 niveaux + focus sous-critères + ajout. */
export function CriteriaPanel() {
  const {
    importance,
    subFocus,
    selectedCriteria,
    setImportance,
    addCriterion,
    removeCriterion,
    setSubFocusFor,
    resetCriteria,
  } = usePreferences()

  const [expanded, setExpanded] = useState<CriterionKey | null>(null)
  const [adding, setAdding] = useState(false)

  // Sous-critères tous cochés par défaut ([] = tous). Décocher retire du calcul.
  function toggleSubChecked(key: CriterionKey, subKey: string) {
    const allKeys = CRITERIA[key].subs.map((s) => s.key)
    const focus = subFocus[key] ?? []
    const included = focus.length ? focus : allKeys
    if (included.includes(subKey) && included.length === 1) return // garder au moins 1
    const next = included.includes(subKey)
      ? included.filter((k) => k !== subKey)
      : [...included, subKey]
    // Tout coché → on stocke [] (= tous), sinon le sous-ensemble.
    setSubFocusFor(key, next.length === allKeys.length ? [] : next)
  }

  const available = CRITERION_KEYS.filter((k) => importance[k] === 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Vos critères</h3>
            <p className="text-xs text-muted-foreground">
              Dosez et affinez votre recherche
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetCriteria}
          title="Réinitialiser"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {selectedCriteria.map((key) => {
          const def = CRITERIA[key]
          const Icon = CRITERION_ICONS[key]
          const focus = subFocus[key] ?? []
          const isOpen = expanded === key
          return (
            <div key={key} className="rounded-lg border bg-background/40 p-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{def.label}</span>
                <button
                  onClick={() => removeCriterion(key)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  title="Retirer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Dosage 3 niveaux */}
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setImportance(key, lvl)}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors",
                      importance[key] === lvl
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {LEVEL_LABELS[lvl]}
                  </button>
                ))}
              </div>

              {/* Affiner (sous-critères) */}
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="mt-2 flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
              >
                <span>
                  Affiner
                  {focus.length > 0 && focus.length < def.subs.length && (
                    <span className="ml-1 text-primary">
                      · {focus.length}/{def.subs.length}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    Tous comptent par défaut — décochez pour en retirer.
                  </p>
                  {def.subs.map((sub) => {
                    // [] = tous cochés ; sinon seul le sous-ensemble est coché.
                    const active =
                      focus.length === 0 || focus.includes(sub.key)
                    return (
                      <label
                        key={sub.key}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <span
                          className={cn(
                            "grid size-4 place-items-center rounded-[4px] border transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input",
                          )}
                        >
                          {active && <Check3 />}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={active}
                          onChange={() => toggleSubChecked(key, sub.key)}
                        />
                        <span className="text-muted-foreground">
                          {sub.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Ajouter un critère */}
      {available.length > 0 &&
        (adding ? (
          <div className="flex flex-col gap-1.5 rounded-lg border border-dashed p-2">
            {available.map((key) => {
              const Icon = CRITERION_ICONS[key]
              return (
                <button
                  key={key}
                  onClick={() => {
                    addCriterion(key)
                    setAdding(false)
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {CRITERIA[key].label}
                </button>
              )
            })}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" /> Ajouter un critère
          </Button>
        ))}

      {selectedCriteria.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Aucun critère retenu. Ajoutez-en pour obtenir un classement.
        </p>
      )}
    </div>
  )
}

function Check3() {
  return (
    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
