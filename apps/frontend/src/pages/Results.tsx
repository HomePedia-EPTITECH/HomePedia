import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  List,
  Map as MapIcon,
  Plus,
  Check,
} from "lucide-react"
import {
  COMMUNES,
  TAILLE_LABELS,
  formatEuro,
  purchasingPower,
  type Commune,
} from "@/data"
import { ALL_FILTER, usePreferences } from "@/app/preferences"
import { CriteriaPanel } from "@/components/shared/CriteriaPanel"
import { GeoFilterBar } from "@/components/shared/GeoFilterBar"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = ALL_FILTER
const PAGE_SIZE = 30

export function ResultsPage() {
  const navigate = useNavigate()
  const { scoreOf, breakdownOf, salary, filters, compareIds, toggleCompare } =
    usePreferences()
  const { region, departement, taille } = filters

  const rows = useMemo(() => {
    return COMMUNES.filter((c) => {
      if (region !== ALL && c.region !== region) return false
      if (departement !== ALL && c.departement !== departement) return false
      if (taille !== ALL && c.taille !== taille) return false
      return true
    })
      .map((c) => ({
        commune: c,
        score: scoreOf(c),
        breakdown: breakdownOf(c),
        pp: purchasingPower(c, salary),
      }))
      .sort((a, b) => b.score - a.score)
  }, [region, departement, taille, scoreOf, breakdownOf, salary])

  // Pagination : indispensable dès qu'on passe de 32 à 300 (et bien plus demain).
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  // Retour en page 1 quand le classement change (filtres, critères, salaire).
  useEffect(() => {
    setPage(1)
  }, [region, departement, taille, scoreOf, salary])

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Villes recommandées
          </h1>
          <p className="text-muted-foreground">
            {rows.length} villes classées par compatibilité · pouvoir d'achat
            estimé pour {formatEuro(salary)} net/mois
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
            <CriteriaPanel />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Filtres partagés avec la Carte */}
          <GeoFilterBar className="mb-4" />

          {/* Tableau */}
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-center">Compatibilité</TableHead>
                  <TableHead className="text-right">Prix m² appart.</TableHead>
                  <TableHead className="text-right">m² louables</TableHead>
                  <TableHead className="text-center">Sécurité</TableHead>
                  <TableHead className="text-center">Qualité vie</TableHead>
                  <TableHead className="w-28 text-right">Comparer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map(({ commune, score, breakdown, pp }, i) => (
                  <ResultRow
                    key={commune.id}
                    rank={(currentPage - 1) * PAGE_SIZE + i + 1}
                    commune={commune}
                    score={score}
                    surfaceLouable={pp.surfaceLouable}
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

          {/* Pagination */}
          {rows.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, rows.length)} sur{" "}
                {rows.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" /> Précédent
                </Button>
                <span className="px-1 text-sm tabular-nums text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ResultRowProps {
  rank: number
  commune: Commune
  score: number
  surfaceLouable: number
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
  surfaceLouable,
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
      <TableCell className="text-right tabular-nums font-medium text-primary">
        {surfaceLouable} m²
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

