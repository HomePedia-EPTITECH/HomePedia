import { Outlet } from "react-router-dom"
import { PreferencesProvider } from "@/app/preferences"
import { Navbar } from "./Navbar"

export function AppLayout() {
  return (
    <PreferencesProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </PreferencesProvider>
  )
}
