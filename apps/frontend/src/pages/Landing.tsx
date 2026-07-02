import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Sparkles, User } from "lucide-react"
import { usePreferences } from "@/app/preferences"
import {
  COMMUNES,
  CRITERIA,
  CRITERION_KEYS,
  formatEuro,
  type CriterionKey,
} from "@/data"
import { CRITERION_ICONS } from "@/components/shared/CriteriaPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const HOUSEHOLD_OPTIONS = [1, 2, 3, 4]

export function LandingPage() {
  const navigate = useNavigate()
  const {
    salaryRange,
    setSalaryRange,
    household,
    setHousehold,
    importance,
    selectedCriteria,
    addCriterion,
    removeCriterion,
    setBaseline,
  } = usePreferences()

  // La sélection d'Accueil devient la référence que "Réinitialiser" restaurera.
  useEffect(() => {
    setBaseline(importance)
  }, [importance, setBaseline])

  // Tout écrit directement dans le store → les choix sont conservés quelle que
  // soit la navigation (bouton CTA ou lien navbar).
  function toggleCriterion(key: CriterionKey) {
    if (importance[key] > 0) removeCriterion(key)
    else addCriterion(key)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Glow d'ambiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 40%, var(--primary), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 pt-20 pb-10 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          Data immobilière & qualité de vie · {COMMUNES.length} villes
        </span>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Trouvez votre{" "}
          <span className="text-primary">prochaine ville</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
          Dites-nous votre salaire et ce qui compte pour vous : HomePedia classe
          les villes de France selon votre pouvoir d'achat et vos critères —
          immobilier, sécurité, écoles, santé, cadre de vie.
        </p>
      </div>

      {/* Quiz */}
      <div className="mx-auto max-w-3xl px-4 pb-24">
        <Card className="border-border/70">
          <CardContent className="flex flex-col gap-8 pt-2">
            {/* Étape 1 — Salaire du foyer */}
            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StepBadge n={1} />
                  <h2 className="font-semibold">Votre salaire net mensuel</h2>
                </div>

                {/* Composition du foyer (nb d'actifs) */}
                <div className="flex items-center gap-1 rounded-lg border bg-secondary/40 p-1">
                  {HOUSEHOLD_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setHousehold(n)}
                      aria-label={`${n} actif${n > 1 ? "s" : ""} dans le foyer`}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors",
                        household === n
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <User className="size-3.5" />
                      {n}
                      {n === HOUSEHOLD_OPTIONS[HOUSEHOLD_OPTIONS.length - 1] &&
                        "+"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-secondary px-2.5 py-1 text-sm font-semibold tabular-nums">
                    {formatEuro(salaryRange[0])}
                  </span>
                  <span className="text-xs text-muted-foreground">par mois</span>
                  <span className="rounded-md bg-secondary px-2.5 py-1 text-sm font-semibold tabular-nums">
                    {formatEuro(salaryRange[1])}
                  </span>
                </div>
                <Slider
                  value={salaryRange}
                  min={1000}
                  max={8000}
                  step={100}
                  minStepsBetweenThumbs={1}
                  onValueChange={(v) => setSalaryRange([v[0], v[1]])}
                />
              </div>
            </section>

            {/* Étape 2 — Critères principaux */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <StepBadge n={2} />
                <div>
                  <h2 className="font-semibold">Qu'est-ce qui compte ?</h2>
                  <p className="text-sm text-muted-foreground">
                    Choisissez vos critères — vous les affinerez ensuite
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CRITERION_KEYS.map((key) => {
                  const def = CRITERIA[key]
                  const Icon = CRITERION_ICONS[key]
                  const active = importance[key] > 0
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleCriterion(key)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/40",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-md",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium">{def.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate("/resultats")}
              disabled={selectedCriteria.length === 0}
            >
              Trouver mes villes
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {n}
    </span>
  )
}
