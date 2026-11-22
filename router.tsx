import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Wallets from './pages/Wallets'
import Operations from './pages/Operations'
import Transfers from './pages/Transfers'
import CalendarPage from './pages/CalendarPage'
import Analytics from './pages/Analytics'
import Statistics from './pages/Statistics'
import PocketOption from './pages/PocketOption'
import { ExportPage, HistoryPage, SettingsPage } from './pages/Tools'
import NotFound from './pages/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'wallets', element: <Wallets /> },
      { path: 'income', element: <Operations key="income" mode="income" /> },
      { path: 'expenses', element: <Operations key="expense" mode="expense" /> },
      { path: 'transfers', element: <Transfers /> },
      { path: 'operations', element: <Operations key="all" mode="all" /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'statistics', element: <Statistics /> },
      { path: 'pocket-option', element: <PocketOption /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'export', element: <ExportPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
