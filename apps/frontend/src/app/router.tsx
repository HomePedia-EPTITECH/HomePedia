import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { LandingPage } from "@/pages/Landing"
import { ResultsPage } from "@/pages/Results"
import { MapPage } from "@/pages/MapView"
import { CityDetailPage } from "@/pages/CityDetail"
import { ComparePage } from "@/pages/Compare"
import { NotFoundPage } from "@/pages/NotFound"

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/resultats", element: <ResultsPage /> },
      { path: "/carte", element: <MapPage /> },
      { path: "/ville/:id", element: <CityDetailPage /> },
      { path: "/comparer", element: <ComparePage /> },
      { path: "/comparateur", element: <ComparePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
