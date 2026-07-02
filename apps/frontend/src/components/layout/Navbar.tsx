import { NavLink } from "react-router-dom"
import { GitCompareArrows, LayoutGrid, Map, Trophy } from "lucide-react"
import { Logo } from "@/components/shared/Logo"
import { usePreferences } from "@/app/preferences"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const LINKS = [
  { to: "/", label: "Accueil", icon: LayoutGrid, end: true },
  { to: "/resultats", label: "Classements", icon: Trophy, end: false },
  { to: "/carte", label: "Carte", icon: Map, end: false },
  { to: "/comparer", label: "Comparer", icon: GitCompareArrows, end: false },
]

export function Navbar() {
  const { compareIds } = usePreferences()

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 lg:px-6">
        <Logo />

        <nav className="ml-2 flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "bg-secondary text-foreground",
                )
              }
            >
              <Icon className="size-4" />
              {label}
              {to === "/comparer" && compareIds.length > 0 && (
                <Badge className="ml-1 size-5 rounded-full p-0 tabular-nums">
                  {compareIds.length}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
