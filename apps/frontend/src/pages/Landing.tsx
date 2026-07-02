import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  Home,
  Shield,
  Sparkles,
  Train,
  Trees,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { usePreferences } from "@/app/preferences"
import { DEFAULT_WEIGHTS, formatEuro, type Weights } from "@/data"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { UniversalSearch } from "@/components/layout/UniversalSearch"
import { cn } from "@/lib/utils"

interface Priority {
  key: keyof Weights
  label: string
  icon: LucideIcon
}

const PRIORITIES: Priority[] = [
  { key: "securite", label: "Sécurité", icon: Shield },
  { key: "prix", label: "Prix immobilier", icon: Home },
  { key: "ecoles", label: "Écoles", icon: GraduationCap },
  { key: "sante", label: "Santé", icon: Train },
  { key: "qualiteVie", label: "Nature & cadre", icon: Trees },
  { key: "revenus", label: "Emploi / Revenus", icon: Briefcase },
]

const BUDGET_TRANCHES = [
  { label: "< 1 000 €", value: 1000, hint: "Petit budget" },
  { label: "1 000 – 1 500 €", value: 1500, hint: "Intermédiaire" },
  { label: "> 1 500 €", value: 2500, hint: "Confortable" },
]

export function LandingPage() {
  const navigate = useNavigate()
  const { setWeights } = usePreferences()

  const [budget, setBudget] = useState(1500)
  const [tranche, setTranche] = useState(1)
  const [selected, setSelected] = useState<Set<keyof Weights>>(
    new Set(["prix", "securite"]),
  )

  function togglePriority(key: keyof Weights) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function submit() {
    // Traduit le quiz en pondérations : critères choisis = 85 %, autres = 30 %.
    const weights = { ...DEFAULT_WEIGHTS }
    ;(Object.keys(weights) as (keyof Weights)[]).forEach((k) => {
      weights[k] = selected.has(k) ? 85 : 30
    })
    // Le budget renforce toujours un peu le critère prix.
    weights.prix = Math.max(weights.prix, budget <= 1000 ? 95 : 60)
    setWeights(weights)
    navigate("/resultats")
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
          Data immobilière & qualité de vie · 32 villes
        </span>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Trouvez votre{" "}
          <span className="text-primary">prochaine ville</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
          Comparez prix au m², sécurité, écoles et qualité de vie. Un score
          personnalisé selon vos priorités, recalculé en temps réel.
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <UniversalSearch placeholder="Essayez « Lyon », « Bretagne »…" />
        </div>
      </div>

      {/* Quiz */}
      <div className="mx-auto max-w-3xl px-4 pb-24">
        <Card className="border-border/70">
          <CardContent className="flex flex-col gap-8 pt-2">
            {/* Étape 1 — Budget */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <StepBadge n={1} />
                <div>
                  <h2 className="font-semibold">Votre budget logement</h2>
                  <p className="text-sm text-muted-foreground">
                    Loyer / mensualité indicative
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {BUDGET_TRANCHES.map((t, i) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      setTranche(i)
                      setBudget(t.value)
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-4 text-center transition-colors",
                      tranche === i
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/40",
                    )}
                  >
                    <Wallet
                      className={cn(
                        "size-5",
                        tranche === i
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.hint}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Budget max ajustable
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(budget)} / mois
                  </span>
                </div>
                <Slider
                  value={[budget]}
                  min={500}
                  max={3000}
                  step={50}
                  onValueChange={([v]) => setBudget(v)}
                />
              </div>
            </section>

            {/* Étape 2 — Priorités */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <StepBadge n={2} />
                <div>
                  <h2 className="font-semibold">Vos priorités</h2>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez ce qui compte le plus pour vous
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PRIORITIES.map(({ key, label, icon: Icon }) => {
                  const active = selected.has(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePriority(key)}
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
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <Button
              size="lg"
              className="w-full"
              onClick={submit}
              disabled={selected.size === 0}
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
