import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  List,
  Map as MapIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Check,
} from "lucide-react"
import {
  COMMUNES,
  CRITERIA,
  TAILLE_LABELS,
  formatEuro,
  purchasingPower,
  type Commune,
  type CriterionKey,
  type PurchasingPower,
} from "@/data"
import { ALL_FILTER, usePreferences } from "@/app/preferences"
import { CriteriaPanel, CRITERION_ICONS } from "@/components/shared/CriteriaPanel"
import { GeoFilterBar } from "@/components/shared/GeoFilterBar"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

type SortKey = "nom" | "score" | CriterionKey

interface Row {
  commune: Commune
  score: number
  breakdown: Record<CriterionKey, number>
  pp: PurchasingPower
}

/** Valeur de tri d'une ligne selon la colonne active. */
function sortValue(row: Row, key: SortKey): number | string {
  if (key === "nom") return row.commune.nom
  if (key === "score") return row.score
  if (key === "pouvoirAchat") return row.pp.surfaceLouable
  return row.breakdown[key]
}

export function ResultsPage() {
  const navigate = useNavigate()
  const {
    scoreOf,
    breakdownOf,
    salary,
    filters,
    selectedCriteria,
    compareIds,
    toggleCompare,
  } = usePreferences()
  const { region, departement, taille } = filters

  // Panneau de critères repliable (le tableau prend alors toute la largeur).
  const [filtersOpen, setFiltersOpen] = useState(true)

  // Tri du tableau : "score", "nom" ou une clé de critère.
  const [sortKey, setSortKey] = useState<SortKey>("score")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "nom" ? "asc" : "desc")
    }
  }

  const rows = useMemo(() => {
    const list: Row[] = COMMUNES.filter((c) => {
      if (region !== ALL && c.region !== region) return false
      if (departement !== ALL && c.departement !== departement) return false
      if (taille !== ALL && c.taille !== taille) return false
      return true
    }).map((c) => ({
      commune: c,
      score: scoreOf(c),
      breakdown: breakdownOf(c),
      pp: purchasingPower(c, salary),
    }))

    const dir = sortDir === "asc" ? 1 : -1
    list.sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      const cmp =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb, "fr")
          : (va as number) - (vb as number)
      // Départage stable par score décroissant.
      return cmp !== 0 ? cmp * dir : b.score - a.score
    })
    return list
  }, [
    region,
    departement,
    taille,
    scoreOf,
    breakdownOf,
    salary,
    sortKey,
    sortDir,
  ])

  // Pagination : indispensable dès qu'on passe de 32 à 300 (et bien plus demain).
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  // Retour en page 1 quand le classement change (filtres, critères, salaire, tri).
  useEffect(() => {
    setPage(1)
  }, [region, departement, taille, scoreOf, salary, sortKey, sortDir])

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col px-4 py-6 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:px-6">
      <header className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-4">
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

      <div
        className={cn(
          "grid gap-6 lg:min-h-0 lg:flex-1",
          filtersOpen ? "lg:grid-cols-[300px_1fr]" : "lg:grid-cols-1",
        )}
      >
        {/* Panneau critères repliable — scroll indépendant */}
        {filtersOpen && (
          <aside className="lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div className="relative rounded-xl border bg-card p-5">
              <button
                onClick={() => setFiltersOpen(false)}
                title="Réduire les filtres"
                className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                <PanelLeftClose className="size-4" />
              </button>
              <CriteriaPanel />
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-col lg:min-h-0">
          {/* Barre : rouvrir les filtres (si repliés) + filtres géo partagés */}
          <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
            {!filtersOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(true)}
              >
                <PanelLeftOpen className="size-4" /> Filtres
              </Button>
            )}
            <GeoFilterBar />
          </div>

          {/* Tableau — scroll indépendant, en-tête collant, colonnes = critères actifs */}
          <Table
            containerClassName="rounded-xl border bg-card lg:min-h-0 lg:flex-1"
            className="[&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border/40 [&_th:last-child]:border-r-0"
          >
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">#</TableHead>
                <SortHead
                  label="Ville"
                  columnKey="nom"
                  className="min-w-[11rem]"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortHead
                  label="Compatibilité"
                  columnKey="score"
                  className="w-32 text-center"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                {selectedCriteria.map((key) => {
                  const Icon = CRITERION_ICONS[key]
                  return (
                    <SortHead
                      key={key}
                      label={CRITERIA[key].label}
                      columnKey={key}
                      className="min-w-[8rem] text-center font-medium"
                      leadingIcon={<Icon className="size-3.5 text-primary" />}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  )
                })}
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
                    breakdown={breakdown}
                    pp={pp}
                    activeKeys={selectedCriteria}
                    comparing={compareIds.includes(commune.id)}
                    onOpen={() => navigate(`/ville/${commune.id}`)}
                    onToggleCompare={() => toggleCompare(commune.id)}
                  />
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4 + selectedCriteria.length}
                      className="py-12 text-center text-muted-foreground"
                    >
                      Aucune ville ne correspond à ces filtres.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

          {/* Pagination */}
          {rows.length > PAGE_SIZE && (
            <div className="mt-4 flex shrink-0 items-center justify-between">
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
  breakdown: Record<CriterionKey, number>
  pp: PurchasingPower
  activeKeys: CriterionKey[]
  comparing: boolean
  onOpen: () => void
  onToggleCompare: () => void
}

function ResultRow({
  rank,
  commune,
  score,
  breakdown,
  pp,
  activeKeys,
  comparing,
  onOpen,
  onToggleCompare,
}: ResultRowProps) {
  return (
    <TableRow className="cursor-pointer [&>td]:py-3" onClick={onOpen}>
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
      {activeKeys.map((key) => (
        <TableCell key={key} className="text-center">
          {key === "pouvoirAchat" ? (
            <span className="font-medium tabular-nums text-primary">
              {pp.surfaceLouable} m²
            </span>
          ) : (
            <MiniBar value={breakdown[key]} />
          )}
        </TableCell>
      ))}
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

interface SortHeadProps {
  label: string
  columnKey: SortKey
  className?: string
  leadingIcon?: ReactNode
  sortKey: SortKey
  sortDir: "asc" | "desc"
  onSort: (k: SortKey) => void
}

/** En-tête de colonne cliquable, avec indicateur de tri. */
function SortHead({
  label,
  columnKey,
  className,
  leadingIcon,
  sortKey,
  sortDir,
  onSort,
}: SortHeadProps) {
  const active = sortKey === columnKey
  const Indicator = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead
      onClick={() => onSort(columnKey)}
      className={cn(
        "cursor-pointer select-none transition-colors hover:text-foreground",
        active && "text-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {leadingIcon}
        {label}
        <Indicator
          className={cn("size-3", active ? "text-primary" : "opacity-40")}
        />
      </span>
    </TableHead>
  )
}

function MiniBar({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${value}%` }}
        />
      </span>
      <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
        {value}
      </span>
    </span>
  )
}

