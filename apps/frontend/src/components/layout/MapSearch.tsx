import { useEffect, useRef, useState } from "react"
import {
  Building2,
  Loader2,
  MapPin,
  Milestone,
  Search,
  Map as MapIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Granularités renvoyées par la Geocoding API Mapbox v6. */
export type PlaceType =
  | "country"
  | "region"
  | "district"
  | "postcode"
  | "place"
  | "locality"
  | "neighborhood"
  | "street"
  | "address"

export interface GeoResult {
  id: string
  type: PlaceType
  name: string
  context: string
  center: [number, number]
  /** [ouest, sud, est, nord] si disponible (régions, villes…). */
  bbox?: [number, number, number, number]
}

const TYPE_META: Record<PlaceType, { label: string; icon: LucideIcon }> = {
  country: { label: "Pays", icon: MapIcon },
  region: { label: "Région", icon: MapIcon },
  district: { label: "Département", icon: MapIcon },
  postcode: { label: "Code postal", icon: MapPin },
  place: { label: "Ville", icon: Building2 },
  locality: { label: "Localité", icon: Building2 },
  neighborhood: { label: "Quartier", icon: MapPin },
  street: { label: "Rue", icon: Milestone },
  address: { label: "Adresse", icon: Milestone },
}

const TYPES =
  "country,region,district,postcode,place,locality,neighborhood,street,address"

interface MapSearchProps {
  token: string
  onSelect: (result: GeoResult) => void
  className?: string
}

/** Barre de recherche géographique : régions, villes, quartiers, rues, adresses. */
export function MapSearch({ token, onSelect, className }: MapSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  // Recherche debouncée + annulable.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const url =
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}` +
          `&access_token=${token}&country=fr&language=fr&limit=6&types=${TYPES}`
        const res = await fetch(url, { signal: ctrl.signal })
        const json = await res.json()
        const mapped: GeoResult[] = (json.features ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => ({
            id: f.properties.mapbox_id,
            type: f.properties.feature_type as PlaceType,
            name: f.properties.name,
            context:
              f.properties.place_formatted ?? f.properties.full_address ?? "",
            center: [
              f.properties.coordinates.longitude,
              f.properties.coordinates.latitude,
            ],
            bbox: f.properties.bbox,
          }),
        )
        setResults(mapped)
        setActive(0)
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query, token])

  function select(r: GeoResult) {
    onSelect(r)
    setQuery(r.name)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      select(results[active])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Aller à une ville, région, rue…"
          className="h-10 w-full rounded-lg border border-input bg-card/95 pl-9 pr-9 text-sm shadow-lg outline-none backdrop-blur transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-popover shadow-xl">
          {results.map((r, i) => {
            const meta = TYPE_META[r.type] ?? TYPE_META.address
            const Icon = meta.icon
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(r)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                    i === active && "bg-accent",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.name}</span>
                    {r.context && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.context}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {meta.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
