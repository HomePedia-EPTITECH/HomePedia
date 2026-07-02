import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-32 text-center">
      <span className="text-6xl font-bold text-primary">404</span>
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-muted-foreground">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Button asChild>
        <Link to="/">Retour à l'accueil</Link>
      </Button>
    </div>
  )
}
