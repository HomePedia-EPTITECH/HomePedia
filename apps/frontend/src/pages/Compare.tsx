import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip as RTooltip,
} from "recharts"
import { Plus, Search, X } from "lucide-react"
import {
  MAX_COMPARE_CITIES,
  usePreferences,
} from "@/app/preferences"
import {
  formatEuro,
  formatNumber,
  formatPercent,
  getCommuneById,
  searchCommunes,
  type Commune,
} from "@/data"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)"]

type Direction = "high" | "low"

interface Metric {
  label: string
  get: (c: Commune) => number
  format: (v: number) => string
  best: Direction
}

const METRICS: Metric[] = [
  { label: "Prix m² appartement", get: (c) => c.prixM2Appartement, format: formatEuro, best: "low" },
  { label: "Prix m² maison", get: (c) => c.prixM2Maison, format: formatEuro, best: "low" },
  { label: "Qualité de vie", get: (c) => c.notes.qualiteVie, format: (v) => `${v.toFixed(1)}/10`, best: "high" },
  { label: "Sécurité (note)", get: (c) => c.notes.securite, format: (v) => `${v.toFixed(1)}/10`, best: "high" },
  { label: "Population", get: (c) => c.population, format: formatNumber, best: "high" },
  { label: "Revenu moyen", get: (c) => c.revenuMoyen, format: (v) => `${formatEuro(v)}/an`, best: "high" },
  { label: "Taux de chômage", get: (c) => c.tauxChomage, format: formatPercent, best: "low" },
]

const RADAR_DIMS: { key: keyof Commune["notes"]; label: string }[] = [
  { key: "environnement", label: "Environ." },
  { key: "transports", label: "Transports" },
  { key: "sante", label: "Santé" },
  { key: "securite", label: "Sécurité" },
  { key: "sportsLoisirs", label: "Loisirs" },
  { key: "culture", label: "Culture" },
  { key: "enseignement", label: "Écoles" },
  { key: "commerces", label: "Commerces" },
]

export function ComparePage() {
  const { compareIds, toggleCompare, scoreOf } = usePreferences()

  const cities = useMemo(
    () =>
      compareIds
        .map(getCommuneById)
        .filter((c): c is Commune => Boolean(c)),
    [compareIds],
  )

  const radarData = useMemo(
    () =>
      RADAR_DIMS.map((d) => {
        const row: Record<string, string | number> = { dim: d.label }
        cities.forEach((c) => (row[c.nom] = c.notes[d.key]))
        return row
      }),
    [cities],
  )

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Comparateur</h1>
        <p className="text-muted-foreground">
          Comparez jusqu'à {MAX_COMPARE_CITIES} villes côte à côte. La meilleure
          valeur par ligne est surlignée.
        </p>
      </header>

      {/* Sélecteurs de villes */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: MAX_COMPARE_CITIES }).map((_, i) => {
          const city = cities[i]
          return city ? (
            <CitySlot
              key={city.id}
              commune={city}
              color={SERIES_COLORS[i]}
              score={scoreOf(city)}
              onRemove={() => toggleCompare(city.id)}
            />
          ) : (
            <CityPicker key={`empty-${i}`} exclude={compareIds} onPick={toggleCompare} />
          )
        })}
      </div>

      {cities.length < 2 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Plus className="size-6" />
            </span>
            <p className="font-medium">Ajoutez au moins 2 villes</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Utilisez les sélecteurs ci-dessus, ou le bouton « Comparer » depuis
              les classements et les fiches ville.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/resultats">Parcourir les classements</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Tableau comparatif */}
          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left font-medium text-muted-foreground">
                      Critère
                    </th>
                    {cities.map((c, i) => (
                      <th key={c.id} className="p-3 text-right">
                        <span
                          className="inline-flex items-center gap-1.5"
                          style={{ color: SERIES_COLORS[i] }}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: SERIES_COLORS[i] }}
                          />
                          {c.nom}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-secondary/20">
                    <td className="p-3 font-medium">Compatibilité</td>
                    {cities.map((c) => {
                      const scores = cities.map((x) => scoreOf(x))
                      const s = scoreOf(c)
                      const isBest = s === Math.max(...scores)
                      return (
                        <td key={c.id} className="p-3 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-md px-2 py-1 font-semibold tabular-nums",
                              isBest && "bg-success/15 text-success",
                            )}
                          >
                            {s}/100
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                  {METRICS.map((m) => {
                    const values = cities.map((c) => m.get(c))
                    const bestVal =
                      m.best === "low" ? Math.min(...values) : Math.max(...values)
                    return (
                      <tr key={m.label} className="border-b last:border-0">
                        <td className="p-3 text-muted-foreground">{m.label}</td>
                        {cities.map((c, i) => {
                          const v = m.get(c)
                          const isBest = v === bestVal && cities.length > 1
                          return (
                            <td key={c.id} className="p-3 text-right tabular-nums">
                              <span
                                className={cn(
                                  "rounded-md px-2 py-1",
                                  isBest && "bg-success/15 font-medium text-success",
                                )}
                              >
                                {m.format(values[i])}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Radar superposé + CTA */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-2 text-sm font-semibold">
                  Profil qualité de vie
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="dim"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      />
                      {cities.map((c, i) => (
                        <Radar
                          key={c.id}
                          dataKey={c.nom}
                          stroke={SERIES_COLORS[i]}
                          fill={SERIES_COLORS[i]}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <RTooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-2">
              {cities.map((c) => (
                <Button key={c.id} variant="outline" asChild>
                  <Link to={`/ville/${c.id}`}>Voir la fiche de {c.nom}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CitySlot({
  commune,
  color,
  score,
  onRemove,
}: {
  commune: Commune
  color: string
  score: number
  onRemove: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border bg-card p-3"
      style={{ borderColor: `color-mix(in oklch, ${color} 40%, var(--border))` }}
    >
      <ScoreBadge score={score} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{commune.nom}</p>
        <p className="truncate text-xs text-muted-foreground">
          {commune.departement}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <X className="size-4" />
      </Button>
    </div>
  )
}

function CityPicker({
  exclude,
  onPick,
}: {
  exclude: string[]
  onPick: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const results = query
    ? searchCommunes(query).filter((c) => !exclude.includes(c.id))
    : []

  return (
    <div className="relative rounded-xl border border-dashed bg-card/50 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ajouter une ville…"
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      {results.length > 0 && (
        <ul className="absolute inset-x-3 z-20 mt-2 overflow-hidden rounded-md border bg-popover shadow-md">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(c.id)
                  setQuery("")
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{c.nom}</span>
                <span className="text-xs text-muted-foreground">
                  {c.departement}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
