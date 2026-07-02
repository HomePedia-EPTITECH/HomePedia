import { useMemo } from "react"
import {
  COMMUNES,
  REGIONS,
  TAILLE_LABELS,
  type TailleCommune,
} from "@/data"
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
  /** "row" = ligne (Classement) · "stack" = colonne étroite (Carte). */
  layout?: "row" | "stack"
  className?: string
}

/** Filtres Région / Département / Taille + Réinitialiser, branchés sur le store partagé. */
export function GeoFilterBar({ layout = "row", className }: GeoFilterBarProps) {
  const { filters, setFilter, resetFilters } = usePreferences()
  const { region, departement, taille } = filters

  const departements = useMemo(() => {
    const source =
      region === ALL ? COMMUNES : COMMUNES.filter((c) => c.region === region)
    return Array.from(new Set(source.map((c) => c.departement))).sort()
  }, [region])

  const stack = layout === "stack"
  const hasFilter =
    region !== ALL || departement !== ALL || taille !== ALL

  return (
    <div
      className={cn(
        "flex gap-3",
        stack ? "flex-col" : "flex-wrap items-center",
        className,
      )}
    >
      <FilterSelect
        label="Région"
        value={region}
        onChange={(v) => setFilter("region", v)}
        options={REGIONS}
        fluid={stack}
      />
      <FilterSelect
        label="Département"
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
        Réinitialiser
      </Button>
    </div>
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
