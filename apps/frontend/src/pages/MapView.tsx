import { useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from "react-map-gl/mapbox"
import { List, MapPinOff, SlidersHorizontal } from "lucide-react"
import {
  COMMUNES,
  REGIONS,
  formatEuro,
  personalScore,
  scoreColorHex,
  type Commune,
} from "@/data"
import { usePreferences } from "@/app/preferences"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const ALL = "__all__"

export function MapPage() {
  const navigate = useNavigate()
  const mapRef = useRef<MapRef>(null)
  const { weights } = usePreferences()

  const [prixMax, setPrixMax] = useState(11000)
  const [scoreMin, setScoreMin] = useState(0)
  const [region, setRegion] = useState(ALL)
  const [active, setActive] = useState<Commune | null>(null)

  const scored = useMemo(
    () =>
      COMMUNES.map((c) => ({ commune: c, score: personalScore(c, weights) })),
    [weights],
  )

  const visible = useMemo(
    () =>
      scored.filter(
        ({ commune, score }) =>
          commune.prixM2Appartement <= prixMax &&
          score >= scoreMin &&
          (region === ALL || commune.region === region),
      ),
    [scored, prixMax, scoreMin, region],
  )

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      {/* Sidebar filtres */}
      <div className="absolute left-4 top-4 z-10 w-72 max-w-[calc(100%-2rem)] rounded-xl border bg-card/95 p-5 shadow-lg backdrop-blur">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Filtres</h2>
          <Badge variant="secondary" className="ml-auto tabular-nums">
            {visible.length}
          </Badge>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget max m²</span>
              <span className="font-medium tabular-nums">
                {formatEuro(prixMax)}
              </span>
            </div>
            <Slider
              value={[prixMax]}
              min={1000}
              max={11000}
              step={100}
              onValueChange={([v]) => setPrixMax(v)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score minimum</span>
              <span className="font-medium tabular-nums">{scoreMin}/100</span>
            </div>
            <Slider
              value={[scoreMin]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => setScoreMin(v)}
            />
          </div>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Région" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les régions</SelectItem>
              {REGIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" className="mt-5 w-full" asChild>
          <Link to="/resultats">
            <List className="size-4" /> Vue liste
          </Link>
        </Button>
      </div>

      {/* Légende */}
      <div className="absolute bottom-6 right-4 z-10 rounded-lg border bg-card/95 p-3 text-xs shadow-lg backdrop-blur">
        <p className="mb-2 font-medium">Score personnalisé</p>
        <div className="flex items-center gap-2">
          <LegendDot color="#ef4444" label="< 40" />
          <LegendDot color="#f97316" label="40+" />
          <LegendDot color="#eab308" label="55+" />
          <LegendDot color="#22c55e" label="75+" />
        </div>
      </div>

      {TOKEN ? (
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          initialViewState={{ longitude: 2.5, latitude: 46.6, zoom: 5 }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="bottom-left" />
          {visible.map(({ commune, score }) => {
            const size = 14 + Math.min(28, Math.sqrt(commune.population) / 20)
            return (
              <Marker
                key={commune.id}
                longitude={commune.lon}
                latitude={commune.lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  setActive(commune)
                }}
              >
                <button
                  className="grid place-items-center rounded-full border-2 border-white/70 text-[10px] font-bold text-white shadow-md transition-transform hover:scale-110"
                  style={{
                    width: size,
                    height: size,
                    background: scoreColorHex(score),
                  }}
                  title={`${commune.nom} — ${score}/100`}
                >
                  {size > 26 ? score : ""}
                </button>
              </Marker>
            )
          })}

          {active && (
            <Popup
              longitude={active.lon}
              latitude={active.lat}
              anchor="bottom"
              offset={18}
              closeButton={false}
              onClose={() => setActive(null)}
              className="homepedia-popup"
            >
              <MapPopupCard
                commune={active}
                score={personalScore(active, weights)}
                onOpen={() => navigate(`/ville/${active.id}`)}
              />
            </Popup>
          )}
        </Map>
      ) : (
        <MapFallback
          items={visible}
          onOpen={(id) => navigate(`/ville/${id}`)}
        />
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="size-3 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  )
}

interface MapPopupCardProps {
  commune: Commune
  score: number
  onOpen: () => void
}

function MapPopupCard({ commune, score, onOpen }: MapPopupCardProps) {
  const { toggleCompare, isComparing } = usePreferences()
  return (
    <div className="flex w-56 flex-col gap-2 p-1">
      <div className="flex items-center gap-3">
        <ScoreBadge score={score} size="sm" />
        <div>
          <p className="font-semibold leading-tight">{commune.nom}</p>
          <p className="text-xs text-muted-foreground">{commune.departement}</p>
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Prix m² appart.</span>
        <span className="font-medium tabular-nums">
          {formatEuro(commune.prixM2Appartement)}
        </span>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1" onClick={onOpen}>
          Voir fiche
        </Button>
        <Button
          size="sm"
          variant={isComparing(commune.id) ? "secondary" : "outline"}
          onClick={() => toggleCompare(commune.id)}
        >
          +
        </Button>
      </div>
    </div>
  )
}

/** Fallback lisible quand aucun token Mapbox n'est configuré. */
function MapFallback({
  items,
  onOpen,
}: {
  items: { commune: Commune; score: number }[]
  onOpen: (id: string) => void
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:24px_24px] p-6">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          <MapPinOff className="size-6" />
        </span>
        <h2 className="text-lg font-semibold">Carte Mapbox non configurée</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez un token dans <code className="text-primary">.env</code> (
          <code>VITE_MAPBOX_TOKEN</code>) pour activer la carte interactive.
          Voici les {items.length} villes filtrées :
        </p>
      </div>
      <div className="grid max-h-[50%] w-full max-w-3xl grid-cols-2 gap-2 overflow-auto sm:grid-cols-3 md:grid-cols-4">
        {items
          .slice()
          .sort((a, b) => b.score - a.score)
          .map(({ commune, score }) => (
            <button
              key={commune.id}
              onClick={() => onOpen(commune.id)}
              className="flex items-center gap-2 rounded-lg border bg-card p-2 text-left hover:border-primary/50"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: scoreColorHex(score) }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {commune.nom}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {score}
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}
