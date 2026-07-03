import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from "react-map-gl/mapbox"
import {
  Box,
  ChevronDown,
  List,
  MapPinOff,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Square,
  Sun,
} from "lucide-react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { CRITERIA, formatEuro, scoreColorHex, type Commune } from "@/data"
import { useCommunes } from "@/data/useCommunes"
import { ALL_FILTER, usePreferences } from "@/app/preferences"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CRITERION_ICONS } from "@/components/shared/CriteriaPanel"
import { GeoFilterBar } from "@/components/shared/GeoFilterBar"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { MapSearch, type GeoResult, type PlaceType } from "@/components/layout/MapSearch"
import { cn } from "@/lib/utils"

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
// Style Standard par défaut (3D + terrain + light presets). Surchargable via .env.
const MAP_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || "mapbox://styles/mapbox/standard"
const ALL = ALL_FILTER

/** Ambiances lumineuses du style Standard : Clair = aube, Sombre = crépuscule. */
type LightPreset = "dawn" | "dusk"
const LIGHT_LABELS: Record<LightPreset, string> = {
  dawn: "Clair",
  dusk: "Sombre",
}
// Plafond de markers affichés : dans la zone visible, on garde les mieux notés.
// (À l'échelle nationale il faudra passer sur une source GeoJSON + clustering
// Mapbox natif ; ce plafond évite d'écrouler le rendu en attendant.)
const MAX_MARKERS = 100

interface Bounds {
  w: number
  s: number
  e: number
  n: number
}

function inBounds(lon: number, lat: number, b: Bounds): boolean {
  return lon >= b.w && lon <= b.e && lat >= b.s && lat <= b.n
}

/** Deux emprises quasi identiques (tolérance) → pas de nouvelle recherche à proposer. */
function boundsEqual(a: Bounds, b: Bounds, eps = 1e-4): boolean {
  return (
    Math.abs(a.w - b.w) < eps &&
    Math.abs(a.s - b.s) < eps &&
    Math.abs(a.e - b.e) < eps &&
    Math.abs(a.n - b.n) < eps
  )
}

/** Zoom cible par granularité quand aucune emprise (bbox) n'est fournie. */
const ZOOM_BY_TYPE: Record<PlaceType, number> = {
  country: 5,
  region: 7,
  district: 9,
  postcode: 12,
  place: 11,
  locality: 12,
  neighborhood: 13,
  street: 15,
  address: 16,
}

export function MapPage() {
  const navigate = useNavigate()
  const mapRef = useRef<MapRef>(null)
  const { scoreOf, filters, selectedCriteria } = usePreferences()
  const { region, departement, taille } = filters
  const { communes } = useCommunes()

  const [scoreMin, setScoreMin] = useState(0)
  const [active, setActive] = useState<Commune | null>(null)
  const [criteriaOpen, setCriteriaOpen] = useState(true)
  const [lightPreset, setLightPreset] = useState<LightPreset>("dusk")
  const [is3D, setIs3D] = useState(false)
  // Zone géographique de recherche (emprise figée) + drapeau "carte déplacée".
  const [searchBounds, setSearchBounds] = useState<Bounds | null>(null)
  const [mapMoved, setMapMoved] = useState(false)

  function readBounds(): Bounds | null {
    const b = mapRef.current?.getBounds()
    if (!b) return null
    return { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() }
  }

  /** Fige la zone de recherche sur le cadre courant. */
  const searchThisArea = useCallback(() => {
    const b = readBounds()
    if (b) setSearchBounds(b)
    setMapMoved(false)
  }, [])

  /** Bascule la caméra entre vue 2D (à plat) et 3D (inclinée). */
  const setView3D = useCallback((enabled: boolean) => {
    setIs3D(enabled)
    mapRef.current?.easeTo({
      pitch: enabled ? 55 : 0,
      bearing: enabled ? -12 : 0,
      duration: 700,
    })
  }, [])

  /** Applique l'ambiance lumineuse au style Standard (import id "basemap"). */
  const applyLight = useCallback((preset: LightPreset) => {
    const map = mapRef.current?.getMap()
    // setConfigProperty n'existe que sur les styles Standard.
    const withConfig = map as unknown as {
      setConfigProperty?: (importId: string, key: string, value: string) => void
    }
    withConfig?.setConfigProperty?.("basemap", "lightPreset", preset)
  }, [])

  // Rejoue l'ambiance quand on change de mode.
  useEffect(() => {
    applyLight(lightPreset)
  }, [lightPreset, applyLight])

  const scored = useMemo(
    () => communes.map((c) => ({ commune: c, score: scoreOf(c) })),
    [communes, scoreOf],
  )

  // Villes passant les filtres (région / département / taille / score min).
  const filtered = useMemo(
    () =>
      scored.filter(
        ({ commune, score }) =>
          score >= scoreMin &&
          (region === ALL || commune.region === region) &&
          (departement === ALL || commune.departement === departement) &&
          (taille === ALL || commune.taille === taille),
      ),
    [scored, scoreMin, region, departement, taille],
  )

  // Restreint à la zone de recherche figée (position caméra).
  const inZone = useMemo(
    () =>
      searchBounds
        ? filtered.filter(({ commune }) =>
            inBounds(commune.lon, commune.lat, searchBounds),
          )
        : filtered,
    [filtered, searchBounds],
  )

  // Dans la zone, on garde les MAX_MARKERS mieux notées.
  const capped = inZone.length > MAX_MARKERS
  const markers = useMemo(
    () => [...inZone].sort((a, b) => b.score - a.score).slice(0, MAX_MARKERS),
    [inZone],
  )

  // Déplace la caméra : emprise (bbox) si dispo (région/ville), sinon zoom serré.
  const goTo = useCallback((r: GeoResult) => {
    const map = mapRef.current
    if (!map) return
    if (r.bbox) {
      map.fitBounds(
        [
          [r.bbox[0], r.bbox[1]],
          [r.bbox[2], r.bbox[3]],
        ],
        { padding: 64, duration: 1400, maxZoom: 15 },
      )
    } else {
      map.flyTo({
        center: r.center,
        zoom: ZOOM_BY_TYPE[r.type] ?? 13,
        duration: 1400,
      })
    }
  }, [])

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      {/* Recherche géographique centrée (déplace la caméra) */}
      {TOKEN && (
        <>
          <MapSearch
            token={TOKEN}
            onSelect={goTo}
            className="absolute left-1/2 top-4 z-20 w-[min(420px,calc(100%-2rem))] -translate-x-1/2"
          />

          {/* Contrôles carte (haut-gauche) : bascule 2D/3D + bascule Clair/Sombre */}
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            {/* Bascule vue 2D ⇄ 3D */}
            <button
              onClick={() => setView3D(!is3D)}
              title={is3D ? "Passer en 2D" : "Passer en 3D"}
              className="flex items-center gap-1.5 rounded-lg border bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur transition-colors hover:bg-accent"
            >
              {is3D ? (
                <Box className="size-3.5 text-primary" />
              ) : (
                <Square className="size-3.5 text-primary" />
              )}
              {is3D ? "3D" : "2D"}
            </button>

            {/* Bascule ambiance Clair (aube) ⇄ Sombre (crépuscule) */}
            <button
              onClick={() =>
                setLightPreset(lightPreset === "dawn" ? "dusk" : "dawn")
              }
              title={
                lightPreset === "dawn" ? "Passer en Sombre" : "Passer en Clair"
              }
              className="flex items-center gap-1.5 rounded-lg border bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur transition-colors hover:bg-accent"
            >
              {lightPreset === "dawn" ? (
                <Sun className="size-3.5 text-primary" />
              ) : (
                <Moon className="size-3.5 text-primary" />
              )}
              {LIGHT_LABELS[lightPreset]}
            </button>
          </div>

          {/* Bouton "rechercher dans cette zone" (sous la barre de recherche) */}
          {mapMoved && (
            <button
              onClick={searchThisArea}
              className="absolute left-1/2 top-[4.25rem] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xl transition-transform hover:scale-105"
            >
              <RefreshCw className="size-4" />
              Rechercher dans cette zone
            </button>
          )}
        </>
      )}

      {/* Sidebar filtres (sous les boutons de contrôle) — scroll interne si trop haute */}
      <div className="absolute left-4 top-[4.25rem] z-10 flex max-h-[calc(100dvh-9.5rem)] w-72 max-w-[calc(100%-2rem)] flex-col overflow-y-auto rounded-xl border bg-card/95 p-5 shadow-lg backdrop-blur">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Filtres</h2>
          <Badge variant="secondary" className="ml-auto tabular-nums">
            {markers.length}
          </Badge>
        </div>
        {capped && (
          <p className="mb-4 -mt-2 text-xs text-muted-foreground">
            {inZone.length} villes dans cette zone — {MAX_MARKERS} mieux notées
            affichées. Zoomez ou affinez les filtres.
          </p>
        )}

        <div className="flex flex-col gap-5">
          {/* Filtres géographiques partagés avec le Classement */}
          <GeoFilterBar layout="stack" />

          {/* Rappel repliable des critères qui définissent la compatibilité */}
          <div className="flex flex-col gap-2 rounded-lg border bg-secondary/20 p-3">
            <button
              onClick={() => setCriteriaOpen((o) => !o)}
              className="flex items-center justify-between"
            >
              <span className="text-sm font-medium">Compatibilité</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {selectedCriteria.length} critère
                {selectedCriteria.length > 1 ? "s" : ""}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    criteriaOpen && "rotate-180",
                  )}
                />
              </span>
            </button>
            {criteriaOpen &&
              (selectedCriteria.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCriteria.map((key) => {
                    const Icon = CRITERION_ICONS[key]
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 rounded-md border bg-card px-1.5 py-0.5 text-xs"
                      >
                        <Icon className="size-3 text-primary" />
                        {CRITERIA[key].label}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Aucun critère —{" "}
                  <Link
                    to="/resultats"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    en choisir
                  </Link>
                </p>
              ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score minimum</span>
              <span className="font-medium tabular-nums">{scoreMin}/100</span>
            </div>
            {/* La piste EST la légende : gradient rouge→vert, gauche (exclu) assombri */}
            <ScoreSlider value={scoreMin} onChange={setScoreMin} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Faible</span>
              <span>Élevé</span>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="mt-5 w-full" asChild>
          <Link to="/resultats">
            <List className="size-4" /> Vue liste
          </Link>
        </Button>
      </div>

      {TOKEN ? (
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          initialViewState={{
            longitude: 2.5,
            latitude: 46.6,
            zoom: 5,
            pitch: 0,
            bearing: 0,
          }}
          mapStyle={MAP_STYLE}
          onLoad={() => {
            applyLight(lightPreset)
            searchThisArea()
          }}
          onMoveEnd={() => {
            const b = readBounds()
            if (b && searchBounds) setMapMoved(!boundsEqual(b, searchBounds))
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="bottom-left" visualizePitch />
          {markers.map(({ commune, score }) => {
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
                score={scoreOf(active)}
                onOpen={() => navigate(`/ville/${active.id}`)}
              />
            </Popup>
          )}
        </Map>
      ) : (
        <MapFallback
          items={markers}
          onOpen={(id) => navigate(`/ville/${id}`)}
        />
      )}
    </div>
  )
}

/** Segments alignés sur scoreColorHex : rouge 0–40, orange 40–55, jaune 55–75, vert 75–100. */
const SCORE_GRADIENT =
  "linear-gradient(90deg, #ef4444 0 40%, #f97316 40% 55%, #eab308 55% 75%, #22c55e 75% 100%)"

/** Curseur de score dont la piste est le gradient (= légende) ; la zone exclue (à gauche) est assombrie. */
function ScoreSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      min={0}
      max={100}
      step={5}
      onValueChange={([v]) => onChange(v)}
      className="relative flex w-full touch-none items-center py-1 select-none"
    >
      <SliderPrimitive.Track
        className="relative h-2.5 w-full grow overflow-hidden rounded-full"
        style={{ background: SCORE_GRADIENT }}
      >
        {/* La plage remplie (0 → seuil) masque la partie exclue. */}
        <SliderPrimitive.Range className="absolute h-full bg-background/75" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 shrink-0 rounded-full border-2 border-white bg-background shadow-md ring-ring/50 transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden" />
    </SliderPrimitive.Root>
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
