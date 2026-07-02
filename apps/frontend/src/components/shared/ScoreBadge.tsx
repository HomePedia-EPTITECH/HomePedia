import { scoreColor } from "@/data"
import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showSuffix?: boolean
  className?: string
}

const SIZES = {
  sm: "size-9 text-sm",
  md: "size-12 text-base",
  lg: "size-16 text-xl",
} as const

/** Pastille de score /100 colorée rouge → orange → vert. */
export function ScoreBadge({
  score,
  size = "md",
  showSuffix = false,
  className,
}: ScoreBadgeProps) {
  const color = scoreColor(score)
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold tabular-nums",
        SIZES[size],
        className,
      )}
      style={{
        color,
        background: `color-mix(in oklch, ${color} 16%, transparent)`,
        boxShadow: `inset 0 0 0 2px color-mix(in oklch, ${color} 45%, transparent)`,
      }}
    >
      {score}
      {showSuffix && <span className="text-[0.6em] opacity-70">/100</span>}
    </div>
  )
}
