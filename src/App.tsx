import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AppLayout, type RouteHandle } from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import RouteError from './pages/RouteError'
import LoginPage from './pages/LoginPage'
import VehiclesPage from './pages/VehiclesPage'
import { useAuth } from './services/auth'
import { cssVariablesResolver, theme } from './theme/theme'

const handle = (title: string): RouteHandle => ({ title })

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage />, handle: handle('Dashboard') },
      { path: 'vehicles', element: <VehiclesPage />, handle: handle('Vehicles') },
      // Retired pages: keep old links working.
      { path: 'vehicle-status', element: <Navigate to="/vehicles" replace /> },
      { path: '*', element: <NotFoundPage />, handle: handle('Page not found') },
    ],
  },
])

export default function App() {
  const { isSignedIn } = useAuth()
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <Notifications position="top-right" limit={4} style={{ willChange: 'transform' }} />
      {isSignedIn ? <RouterProvider router={router} /> : <LoginPage />}
    </MantineProvider>
  )
}
 