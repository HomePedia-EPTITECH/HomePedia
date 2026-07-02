import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { List, Map as MapIcon, Plus, Check } from "lucide-react"
import {
  COMMUNES,
  REGIONS,
  TAILLE_LABELS,
  formatEuro,
  personalScore,
  scoreBreakdown,
  type Commune,
  type TailleCommune,
} from "@/data"
import { usePreferences } from "@/app/preferences"
import { WeightsPanel } from "@/components/shared/WeightsPanel"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const ALL = "__all__"

export function ResultsPage() {
  const navigate = useNavigate()
  const { weights, compareIds, toggleCompare } = usePreferences()

  const [region, setRegion] = useState<string>(ALL)
  const [taille, setTaille] = useState<string>(ALL)

  const departements = useMemo(() => {
    const source =
      region === ALL ? COMMUNES : COMMUNES.filter((c) => c.region === region)
    return Array.from(new Set(source.map((c) => c.departement))).sort()
  }, [region])
  const [departement, setDepartement] = useState<string>(ALL)

  const rows = useMemo(() => {
    return COMMUNES.filter((c) => {
      if (region !== ALL && c.region !== region) return false
      if (departement !== ALL && c.departement !== departement) return false
      if (taille !== ALL && c.taille !== taille) return false
      return true
    })
      .map((c) => ({
        commune: c,
        score: personalScore(c, weights),
        breakdown: scoreBreakdown(c),
      }))
      .sort((a, b) => b.score - a.score)
  }, [region, departement, taille, weights])

  function resetFilters() {
    setRegion(ALL)
    setDepartement(ALL)
    setTaille(ALL)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Villes recommandées
          </h1>
          <p className="text-muted-foreground">
            {rows.length} villes classées selon votre score personnalisé
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
          <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium">
            <List className="size-4" /> Liste
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/carte">
              <MapIcon className="size-4" /> Carte
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar pondérations */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <WeightsPanel />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Filtres */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Région"
              value={region}
              onChange={(v) => {
                setRegion(v)
                setDepartement(ALL)
              }}
              options={REGIONS}
            />
            <FilterSelect
              label="Département"
              value={departement}
              onChange={setDepartement}
              options={departements}
            />
            <FilterSelect
              label="Taille"
              value={taille}
              onChange={setTaille}
              options={["village", "ville", "metropole"]}
              render={(v) => TAILLE_LABELS[v as TailleCommune]}
            />
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>

          {/* Tableau */}
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">Prix m² appart.</TableHead>
                  <TableHead className="text-right">Prix m² maison</TableHead>
                  <TableHead className="text-center">Sécurité</TableHead>
                  <TableHead className="text-center">Qualité vie</TableHead>
                  <TableHead className="w-28 text-right">Comparer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ commune, score, breakdown }, i) => (
                  <ResultRow
                    key={commune.id}
                    rank={i + 1}
                    commune={commune}
                    score={score}
                    securite={breakdown.securite}
                    qualiteVie={breakdown.qualiteVie}
                    comparing={compareIds.includes(commune.id)}
                    onOpen={() => navigate(`/ville/${commune.id}`)}
                    onToggleCompare={() => toggleCompare(commune.id)}
                  />
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      Aucune ville ne correspond à ces filtres.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ResultRowProps {
  rank: number
  commune: Commune
  score: number
  securite: number
  qualiteVie: number
  comparing: boolean
  onOpen: () => void
  onToggleCompare: () => void
}

function ResultRow({
  rank,
  commune,
  score,
  securite,
  qualiteVie,
  comparing,
  onOpen,
  onToggleCompare,
}: ResultRowProps) {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="text-center text-sm font-semibold text-muted-foreground tabular-nums">
        {rank}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{commune.nom}</span>
          <span className="text-xs text-muted-foreground">
            {commune.departement} · {TAILLE_LABELS[commune.taille]}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex justify-center">
          <ScoreBadge score={score} size="sm" />
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatEuro(commune.prixM2Appartement)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatEuro(commune.prixM2Maison)}
      </TableCell>
      <TableCell>
        <MiniBar value={securite} />
      </TableCell>
      <TableCell>
        <MiniBar value={qualiteVie} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant={comparing ? "default" : "outline"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCompare()
          }}
        >
          {comparing ? (
            <>
              <Check className="size-4" /> Ajouté
            </>
          ) : (
            <>
              <Plus className="size-4" /> Comparer
            </>
          )}
        </Button>
      </TableCell>
    </TableRow>
  )
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  render?: (v: string) => string
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  render,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn("min-w-[150px]", value !== ALL && "border-primary/50")}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label} : toutes</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {render ? render(o) : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
