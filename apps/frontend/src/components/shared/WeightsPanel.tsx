import { RotateCcw } from "lucide-react"
import { WEIGHT_LABELS, type Weights } from "@/data"
import { usePreferences } from "@/app/preferences"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"

const ORDER: (keyof Weights)[] = [
  "prix",
  "securite",
  "qualiteVie",
  "ecoles",
  "sante",
  "revenus",
]

/** Curseurs de pondération (0–100 %) du score personnalisé. */
export function WeightsPanel() {
  const { weights, setWeight, resetWeights } = usePreferences()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Mon score personnalisé</h3>
          <p className="text-xs text-muted-foreground">
            Ajustez l'importance de chaque critère
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetWeights}
          title="Réinitialiser les pondérations"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {ORDER.map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{WEIGHT_LABELS[key]}</span>
              <span className="tabular-nums text-muted-foreground">
                {weights[key]}%
              </span>
            </div>
            <Slider
              value={[weights[key]]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => setWeight(key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
