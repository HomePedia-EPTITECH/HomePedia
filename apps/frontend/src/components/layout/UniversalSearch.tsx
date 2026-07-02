import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, Search } from "lucide-react"
import { searchCommunes, TAILLE_LABELS } from "@/data"
import { cn } from "@/lib/utils"

interface UniversalSearchProps {
  className?: string
  placeholder?: string
}

/** Recherche universelle avec autocomplete villes / départements / régions. */
export function UniversalSearch({
  className,
  placeholder = "Rechercher une ville, un département…",
}: UniversalSearchProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const results = query ? searchCommunes(query) : []

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function select(id: string) {
    navigate(`/ville/${id}`)
    setQuery("")
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
      select(results[active].id)
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
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-input bg-secondary/40 pl-9 pr-3 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => select(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                  i === active && "bg-accent",
                )}
              >
                <MapPin className="size-4 shrink-0 text-primary" />
                <span className="flex-1">
                  <span className="font-medium">{c.nom}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.departement} · {c.region}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {TAILLE_LABELS[c.taille]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
