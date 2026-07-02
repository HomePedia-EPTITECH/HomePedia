import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  accent?: string
  className?: string
}

/** Tuile KPI compacte. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "var(--primary)",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 flex flex-col gap-1",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span
            className="grid size-7 place-items-center rounded-md"
            style={{
              color: accent,
              background: `color-mix(in oklch, ${accent} 14%, transparent)`,
            }}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <span className="text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}
