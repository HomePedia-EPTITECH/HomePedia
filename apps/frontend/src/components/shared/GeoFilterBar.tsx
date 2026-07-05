import { useEffect, useMemo, useState } from "react"
import {
  getDepartements,
  getRegions,
  TAILLE_LABELS,
  type GeoDepartement,
  type GeoRegion,
  type TailleCommune,
} from "@/data"
import { useCommunes } from "@/data/useCommunes"
import { ALL_FILTER, usePreferences } from "@/app/preferences"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const ALL = ALL_FILTER

interface GeoFilterBarProps {
  /** "row" = ligne (Classement) Â· "stack" = colonne Ã©troite (Carte). */
  layout?: "row" | "stack"
  className?: string
}

/** Filtres RÃ©gion / DÃ©partement / Taille + RÃ©initialiser, branchÃ©s sur le store partagÃ©. */
export function GeoFilterBar({ layout = "row", className }: GeoFilterBarProps) {
  const { filters, setFilter, resetFilters } = usePreferences()
  const { region, departement, taille } = filters
  const { communes } = useCommunes()

  const [regionsData, setRegionsData] = useState<GeoRegion[] | null>(null)
  const [departementsData, setDepartementsData] = useState<GeoDepartement[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getRegions()
      .then((rows) => {
        if (!cancelled) setRegionsData(rows)
      })
      .catch(() => {
        if (!cancelled) setRegionsData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedRegionCode = useMemo(() => {
    if (region === ALL) return undefined
    return regionsData?.find((row) => labelOfRegion(row) === region)?.code
  }, [region, regionsData])

  useEffect(() => {
    let cancelled = false
    getDepartements(selectedRegionCode)
      .then((rows) => {
        if (!cancelled) setDepartementsData(rows)
      })
      .catch(() => {
        if (!cancelled) setDepartementsData(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedRegionCode])

  const fallbackRegions = useMemo(
    () => uniqueSorted(communes.map((c) => c.region).filter(Boolean)),
    [communes],
  )

  const fallbackDepartements = useMemo(() => {
    const source =
      region === ALL ? communes : communes.filter((c) => c.region === region)
    return uniqueSorted(source.map((c) => c.departement).filter(Boolean))
  }, [communes, region])

  const regions = regionsData?.length
    ? uniqueSorted(regionsData.map(labelOfRegion))
    : fallbackRegions

  const departements = departementsData?.length
    ? uniqueSorted(departementsData.map(labelOfDepartement))
    : fallbackDepartements

  const stack = layout === "stack"
  const hasFilter = region !== ALL || departement !== ALL || taille !== ALL

  return (
    <div
      className={cn(
        "flex gap-3",
        stack ? "flex-col" : "flex-wrap items-center",
        className,
      )}
    >
      <FilterSelect
        label="RÃ©gion"
        value={region}
        onChange={(v) => setFilter("region", v)}
        options={regions}
        fluid={stack}
      />
      <FilterSelect
        label="DÃ©partement"
        value={departement}
        onChange={(v) => setFilter("departement", v)}
        options={departements}
        fluid={stack}
      />
      <FilterSelect
        label="Taille"
        value={taille}
        onChange={(v) => setFilter("taille", v)}
        options={["village", "ville", "metropole"]}
        render={(v) => TAILLE_LABELS[v as TailleCommune]}
        fluid={stack}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={resetFilters}
        disabled={!hasFilter}
        className={stack ? "w-full" : undefined}
      >
        RÃ©initialiser
      </Button>
    </div>
  )
}

function labelOfRegion(region: GeoRegion): string {
  return region.name ?? region.code
}

function labelOfDepartement(departement: GeoDepartement): string {
  return departement.name ?? departement.code
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(
    (a, b) => a.localeCompare(b, "fr"),
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  render?: (v: string) => string
  fluid?: boolean
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  render,
  fluid,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          fluid ? "w-full" : "min-w-[150px]",
          value !== ALL && "border-primary/50",
        )}
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
