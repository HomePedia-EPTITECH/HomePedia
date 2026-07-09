import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  Heart,
  Home,
  Plus,
  Popcorn,
  ShoppingBag,
  Shield,
  TramFront,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  MOYENNES_NATIONALES,
  formatEuro,
  formatNumber,
  formatPercent,
  getCommuneById,
  getNationalStats,
  type Commune,
  type CriterionKey,
  type NationalStats,
} from "@/data"
import { usePreferences } from "@/app/preferences"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { StatCard } from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotFoundPage } from "./NotFound"

export function CityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { scoreOf, toggleCompare, isComparing, selectedCriteria } =
    usePreferences()
  const has = (k: CriterionKey) => selectedCriteria.includes(k)

  const [commune, setCommune] = useState<Commune | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  // Repère de comparaison : par défaut le mock, remplacé par le back au montage.
  // Si /stats/national échoue, on garde le mock (pas de crash).
  const [national, setNational] = useState<NationalStats>(MOYENNES_NATIONALES)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (!id) {
      setCommune(undefined)
      setLoading(false)
      return
    }
    getCommuneById(id)
      .then((c) => {
        if (!cancelled) setCommune(c)
      })
      .catch(() => {
        if (!cancelled) setCommune(undefined)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    getNationalStats()
      .then((s) => {
        if (!cancelled) setNational(s)
      })
      .catch(() => {
        /* garde le repère par défaut (mock) */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (!commune) return <NotFoundPage />

  const score = scoreOf(commune)
  const comparing = isComparing(commune.id)

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/resultats" className="hover:text-foreground">
          Classements
        </Link>
        <span>/</span>
        <span>{commune.region}</span>
        <span>/</span>
        <span className="text-foreground">{commune.nom}</span>
      </nav>

      {/* Hero */}
      <Card className="mb-6 overflow-hidden">
        <div
          className="h-2 w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--primary), var(--chart-4))",
          }}
        />
        <CardContent className="flex flex-col gap-6 pt-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <ScoreBadge score={score} size="lg" showSuffix />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {commune.nom}
              </h1>
              <p className="text-muted-foreground">
                {commune.departement} · {commune.region}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{commune.codePostal}</Badge>
                {commune.metropole && (
                  <Badge variant="outline">{commune.metropole}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant={comparing ? "default" : "outline"}
              onClick={() => toggleCompare(commune.id)}
            >
              {comparing ? (
                <>
                  <Check className="size-4" /> Ajouté au comparateur
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Comparer
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" /> Retour
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <StatCard
          label="Prix m² appartement"
          value={formatEuro(commune.prixM2Appartement)}
          icon={Building2}
        />
        <StatCard
          label="Prix m² maison"
          value={formatEuro(commune.prixM2Maison)}
          icon={Home}
          accent="var(--chart-4)"
        />
        <StatCard
          label="Population"
          value={formatNumber(commune.population)}
          icon={Users}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Revenu moyen"
          value={`${formatEuro(commune.revenuMoyen)}/an`}
          icon={TrendingUp}
          accent="var(--chart-3)"
        />
        <StatCard
          label="Taux de chômage"
          value={formatPercent(commune.tauxChomage)}
          icon={Briefcase}
          accent="var(--chart-5)"
        />
      </div>

      {/* Sections affichées selon les critères filtrés (démographie & avis en contexte) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {has("pouvoirAchat") && <ImmobilierSection commune={commune} />}
        {has("qualiteVie") && <QualiteVieSection commune={commune} />}
        {has("securite") && <SecuriteSection commune={commune} />}
        {has("emploi") && (
          <EmploiSection commune={commune} national={national} />
        )}
        {has("transports") && <TransportsSection commune={commune} />}
        {has("cultureLoisirs") && <CultureLoisirsSection commune={commune} />}
        <DemographieSection commune={commune} />
      </div>

      {(has("sante") || has("ecoles") || has("commerces")) && (
        <ServicesSection commune={commune} />
      )}
      <AvisSection commune={commune} />
    </div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ImmobilierSection({ commune }: { commune: Commune }) {
  const data = commune.prixHistorique.map((p) => ({
    annee: String(p.annee),
    prix: p.prixM2,
  }))
  const first = commune.prixHistorique[0].prixM2
  const last = commune.prixHistorique[commune.prixHistorique.length - 1].prixM2
  const growth = Math.round(((last - first) / first) * 100)

  return (
    <SectionCard title="Pouvoir d'achat" icon={Building2}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <MiniStat
          label="% Propriétaires"
          value={formatPercent(commune.partProprietaires)}
        />
        <MiniStat
          label="% Locataires"
          value={formatPercent(commune.partLocataires)}
        />
        <MiniStat
          label="Rés. principales"
          value={formatPercent(commune.partResidencesPrincipales)}
        />
        <MiniStat
          label="Rés. vacantes"
          value={formatPercent(commune.partResidencesVacantes)}
        />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Évolution prix m² (DVF)</span>
        <Badge variant={growth >= 0 ? "success" : "destructive"}>
          {growth >= 0 ? "+" : ""}
          {growth}% sur 5 ans
        </Badge>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="annee" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={44} />
            <RTooltip content={<ChartTooltip suffix=" €/m²" />} />
            <Area type="monotone" dataKey="prix" stroke="var(--chart-1)" strokeWidth={2} fill="url(#priceGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}

const RADAR_DIMS: { key: keyof Commune["notes"]; label: string }[] = [
  { key: "environnement", label: "Environnement" },
  { key: "transports", label: "Transports" },
  { key: "sante", label: "Santé" },
  { key: "securite", label: "Sécurité" },
  { key: "sportsLoisirs", label: "Sports/Loisirs" },
  { key: "culture", label: "Culture" },
  { key: "enseignement", label: "Enseignement" },
  { key: "commerces", label: "Commerces" },
  { key: "qualiteVie", label: "Qualité vie" },
]

function QualiteVieSection({ commune }: { commune: Commune }) {
  const data = RADAR_DIMS.map((d) => ({
    dim: d.label,
    note: commune.notes[d.key],
  }))
  return (
    <SectionCard title="Qualité de vie" icon={Heart}>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-3xl font-bold tabular-nums">
          {commune.noteGlobale.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">
          / 5 · {formatNumber(commune.nbAvis)} avis
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="dim"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Radar
              dataKey="note"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.35}
            />
            <RTooltip content={<ChartTooltip suffix=" /10" />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}

function DemographieSection({ commune }: { commune: Commune }) {
  return (
    <SectionCard title="Démographie" icon={Users}>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <MiniStat label="Densité" value={`${formatNumber(commune.densite)} hab/km²`} />
        <MiniStat label="Superficie" value={`${commune.superficie} km²`} />
        <MiniStat label="Âge moyen" value={`${commune.ageMoyen} ans`} />
      </div>
      <span className="mb-2 block text-sm font-medium">
        Répartition par tranche d'âge
      </span>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={commune.ageDistribution} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <RTooltip content={<ChartTooltip suffix=" %" />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
            <Bar dataKey="part" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}

function SecuriteSection({ commune }: { commune: Commune }) {
  // Le back renvoie des faits BRUTS (comptes annuels) → on normalise par
  // habitant pour que le chiffre soit comparable d'une ville à l'autre.
  // Pas de comparaison nationale : le back n'expose pas de moyenne par
  // habitant (son agressionsMoyen est une moyenne brute, non comparable).
  const per1000 = (v: number) => v / (commune.population / 1000)
  const rows = [
    { label: "Agressions", value: per1000(commune.agressions) },
    { label: "Cambriolages", value: per1000(commune.cambriolages) },
    { label: "Vols / dégradations", value: per1000(commune.volsDegradations) },
    { label: "Stupéfiants", value: per1000(commune.stupefiants) },
  ]
  // Échelle des barres : relative au fait le plus fréquent de cette ville.
  const max = Math.max(...rows.map((r) => r.value)) * 1.15 || 1
  return (
    <SectionCard title="Sécurité" icon={Shield}>
      <p className="mb-4 text-xs text-muted-foreground">
        Faits constatés pour 1 000 habitants / an.
      </p>
      <div className="flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>{r.label}</span>
              <span className="font-medium tabular-nums">
                {r.value.toFixed(2)}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function EmploiSection({
  commune,
  national,
}: {
  commune: Commune
  national: NationalStats
}) {
  const chomageBetter = commune.tauxChomage <= national.tauxChomage
  return (
    <SectionCard title="Emploi & revenus" icon={Briefcase}>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          label="Revenu moyen"
          value={`${formatEuro(commune.revenuMoyen)}/an`}
        />
        <div className="rounded-lg border bg-secondary/30 p-2.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tabular-nums">
              {formatPercent(commune.tauxChomage)}
            </p>
            <Badge variant={chomageBetter ? "success" : "warning"}>
              {chomageBetter ? "↓" : "↑"} vs nat.
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Taux de chômage</p>
        </div>
      </div>
    </SectionCard>
  )
}

function TransportsSection({ commune }: { commune: Commune }) {
  return (
    <SectionCard title="Transports" icon={TramFront}>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold tabular-nums">
          {commune.notes.transports.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">
          / 10 · desserte globale
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Note globale de desserte. Le détail par mode (train, bus, vélo,
        route…) n'est pas encore disponible en base.
      </p>
    </SectionCard>
  )
}

function CultureLoisirsSection({ commune }: { commune: Commune }) {
  return (
    <SectionCard title="Culture & loisirs" icon={Popcorn}>
      <div className="flex items-center gap-8">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tabular-nums">
            {commune.notes.culture.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/ 10 culture</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tabular-nums">
            {commune.notes.sportsLoisirs.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/ 10 loisirs</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Notes globales culture et loisirs. Le détail (cinémas, musées, salles de
        spectacle…) n'est pas encore disponible en base.
      </p>
    </SectionCard>
  )
}

function ServicesSection({ commune }: { commune: Commune }) {
  const s = commune.services
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Services & équipements</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sante">
          <TabsList>
            <TabsTrigger value="sante">
              <Heart className="size-4" /> Santé
            </TabsTrigger>
            <TabsTrigger value="education">
              <GraduationCap className="size-4" /> Éducation
            </TabsTrigger>
            <TabsTrigger value="commerces">
              <ShoppingBag className="size-4" /> Commerces
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sante" className="mt-4">
            <ServiceGrid
              items={[
                ["Médecins", s.medecins],
                ["Spécialistes", s.specialistes],
                ["Pharmacies", s.pharmacies],
                ["Hôpitaux", s.hopitaux],
              ]}
            />
          </TabsContent>
          <TabsContent value="education" className="mt-4">
            <ServiceGrid
              items={[
                ["Crèches", s.creches],
                ["Maternelles", s.ecolesMaternelles],
                ["Primaires", s.ecolesPrimaires],
                ["Collèges", s.colleges],
                ["Lycées", s.lycees],
              ]}
            />
          </TabsContent>
          <TabsContent value="commerces" className="mt-4">
            <ServiceGrid
              items={[
                ["Hypermarchés", s.hypermarches],
                ["Supermarchés", s.supermarches],
                ["Restaurants", s.restaurants],
                ["Banques", s.banques],
                ["Boulangeries", s.boulangeries],
              ]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ServiceGrid({ items }: { items: [string, number][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-secondary/30 p-3">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  )
}

function AvisSection({ commune }: { commune: Commune }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Avis des habitants</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {commune.avis.map((a, i) => (
          <div key={i} className="rounded-lg border bg-secondary/20 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{a.auteur}</span>
              <Badge variant={a.sentiment === "positif" ? "success" : "warning"}>
                {"★".repeat(a.note)}
                <span className="opacity-40">{"★".repeat(5 - a.note)}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{a.texte}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-secondary/30 p-2.5">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
  suffix?: string
}

function ChartTooltip({ active, payload, label, suffix = "" }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="tabular-nums">
          {formatNumber(p.value)}
          {suffix}
        </p>
      ))}
    </div>
  )
}
