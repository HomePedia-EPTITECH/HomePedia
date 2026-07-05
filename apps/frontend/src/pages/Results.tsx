import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, List, Map as MapIcon, PanelLeftClose, PanelLeftOpen, Plus, Check } from "lucide-react"
import {
  formatEuro,
  getDepartements,
  getRegions,
  purchasingPower,
  rankCommunes,
  TAILLE_LABELS,
  type Commune,
  type CriterionKey,
  type GeoDepartement,
  type GeoRegion,
} from "@/data"
import { usePreferences, ALL_FILTER } from "@/app/preferences"
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

interface Row {
  commune: Commune
  score: number
  breakdown: Record<CriterionKey, number>
}

export function ResultsPage() {
  const navigate = useNavigate()
  const {
    salary,
    filters,
    selectedCriteria,
    importance,
    subFocus,
    compareIds,
    toggleCompare,
  } = usePreferences()
  const { region, departement, taille } = filters

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Row[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regions, setRegions] = useState<GeoRegion[] | null>(null)
  const [departements, setDepartements] = useState<GeoDepartement[] | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getRegions(), getDepartements()])
      .then(([regionsData, departementsData]) => {
        if (cancelled) return
        setRegions(regionsData)
        setDepartements(departementsData)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setRegions([])
        setDepartements([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const regionCode = useMemo(() => {
    if (region === ALL) return undefined
    return regions?.find((item) => item.name === region)?.code
  }, [region, regions])

  const departementCode = useMemo(() => {
    if (departement === ALL) return undefined
    return departements?.find((item) => item.name === departement)?.code
  }, [departement, departements])

  const rankRequest = useMemo(
    () => ({
      filters: {
        regionIds: regionCode ? [regionCode] : undefined,
        departementIds: departementCode ? [departementCode] : undefined,
        tailles: taille === ALL ? undefined : [taille as "village" | "ville" | "metropole"],
      },
      importance,
      subFocus,
      page,
      limit: PAGE_SIZE,
    }),
    [regionCode, departementCode, taille, importance, subFocus, page],
  )

  useEffect(() => {
    setPage(1)
  }, [region, departement, taille, importance, subFocus])

  useEffect(() => {
    if (regions === null || departements === null) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    if (region !== ALL && !regionCode) {
      setLoading(false)
      setError(`Région introuvable dans le référentiel backend: ${region}`)
      return () => {
        cancelled = true
      }
    }

    if (departement !== ALL && !departementCode) {
      setLoading(false)
      setError(`Département introuvable dans le référentiel backend: ${departement}`)
      return () => {
        cancelled = true
      }
    }

    rankCommunes(rankRequest)
      .then((response) => {
        if (cancelled) return
        const mapped: Row[] = response.data.map((item) => ({
          commune: item.commune,
          score: item.score,
          breakdown: item.breakdown,
        }))
        setRows(mapped)
        setTotalPages(response.meta.totalPages || 1)
        setTotal(response.meta.total)
        setPage(response.meta.page)
      })
      .catch((err) => {
        if (cancelled) return
        setRows([])
        setTotalPages(1)
        setTotal(0)
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [rankRequest, regions, departements])

  const pageLabel = total === 0 ? "0" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}`

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col px-4 py-6 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:px-6">
      <header className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Villes recommandées
          </h1>
          <p className="text-muted-foreground">
            {loading ? "Chargement du classement serveur…" : `${total} villes classées par compatibilité · pouvoir d'achat estimé pour ${formatEuro(salary)} net/mois`}
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

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Le classement serveur est indisponible: {error}
        </div>
      )}

      <div
        className={cn(
          "grid gap-6 lg:min-h-0 lg:flex-1",
          filtersOpen ? "lg:grid-cols-[300px_1fr]" : "lg:grid-cols-1",
        )}
      >
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

          <Table
            containerClassName="rounded-xl border bg-card lg:min-h-0 lg:flex-1"
            className="[&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border/40 [&_th:last-child]:border-r-0"
          >
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[11rem]">Ville</TableHead>
                <TableHead className="w-32 text-center">Compatibilité</TableHead>
                {selectedCriteria.map((key) => {
                  const Icon = CRITERION_ICONS[key]
                  return (
                    <TableHead
                      key={key}
                      className="min-w-[8rem] text-center font-medium"
                    >
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Icon className="size-3.5 text-primary" />
                        {key === "pouvoirAchat"
                          ? "Pouvoir d'achat"
                          : key === "securite"
                            ? "Sécurité"
                            : key === "qualiteVie"
                              ? "Qualité de vie"
                              : key === "ecoles"
                                ? "Écoles"
                                : key === "sante"
                                  ? "Santé"
                                  : key === "emploi"
                                    ? "Emploi"
                                    : key === "commerces"
                                      ? "Commerces"
                                      : key === "transports"
                                        ? "Transports"
                                        : "Culture & loisirs"}
                      </span>
                    </TableHead>
                  )
                })}
                <TableHead className="w-28 text-right">Comparer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ commune, score, breakdown }, i) => (
                <ResultRow
                  key={commune.id}
                  rank={(page - 1) * PAGE_SIZE + i + 1}
                  commune={commune}
                  score={score}
                  breakdown={breakdown}
                  pp={purchasingPower(commune, salary)}
                  activeKeys={selectedCriteria}
                  comparing={compareIds.includes(commune.id)}
                  onOpen={() => navigate(`/ville/${commune.id}`)}
                  onToggleCompare={() => toggleCompare(commune.id)}
                />
              ))}
              {!loading && rows.length === 0 && (
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

          {total > PAGE_SIZE && (
            <div className="mt-4 flex shrink-0 items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pageLabel} sur {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" /> Précédent
                </Button>
                <span className="px-1 text-sm tabular-nums text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
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
  pp: ReturnType<typeof purchasingPower>
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
