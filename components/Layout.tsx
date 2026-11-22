import * as React from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  Download,
  History,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  Menu,
  Moon,
  PieChart,
  Settings as SettingsIcon,
  Sun,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CURRENCY_CODES, formatDate, todayISO, useFinance, type CurrencyCode } from '@/lib/finance'
import { IconButton } from '@/components/ui'
import InstallPWA from '@/components/InstallPWA'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  end?: boolean
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Обзор',
    items: [
      { to: '/', label: 'Главная панель', icon: LayoutDashboard, end: true },
      { to: '/analytics', label: 'Аналитика и графики', icon: PieChart },
      { to: '/statistics', label: 'Статистика', icon: BarChart3 },
    ],
  },
  {
    group: 'Деньги',
    items: [
      { to: '/wallets', label: 'Мои кошельки', icon: Wallet },
      { to: '/income', label: 'Доходы', icon: TrendingUp },
      { to: '/expenses', label: 'Расходы', icon: TrendingDown },
      { to: '/transfers', label: 'Переводы', icon: ArrowLeftRight },
      { to: '/operations', label: 'Все операции', icon: ListOrdered },
    ],
  },
  {
    group: 'Инструменты',
    items: [
      { to: '/calendar', label: 'Календарь операций', icon: CalendarDays },
      { to: '/pocket-option', label: 'Pocket Option', icon: LineChart },
    ],
  },
  {
    group: 'Система',
    items: [
      { to: '/history', label: 'История изменений', icon: History },
      { to: '/export', label: 'Экспорт данных', icon: Download },
      { to: '/settings', label: 'Настройки', icon: SettingsIcon },
    ],
  },
]

const ALL_ITEMS = NAV.flatMap((group) => group.items)

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <Link to="/" onClick={onNavigate} className="mb-5 flex items-center gap-2.5 px-1.5">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="h-9 w-9 rounded-xl shadow-sm" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight">Pocket Finance</span>
          <span className="block text-[11px] text-muted">Личный финансовый учёт</span>
        </span>
      </Link>

      <nav className="scroll-slim flex-1 overflow-y-auto pr-1">
        {NAV.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-wider text-muted uppercase">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition',
                        isActive
                          ? 'bg-brand-soft text-brand'
                          : 'text-muted hover:bg-surface-2 hover:text-fg',
                      )
                    }
                  >
                    <item.icon size={16} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <p className="text-[11px] font-semibold">Облачное хранилище</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Кошельки и операции синхронизируются с защищённым аккаунтом Supabase.
        </p>
      </div>
    </div>
  )
}

export default function Layout() {
  const theme = useFinance((state) => state.settings.theme)
  const setTheme = useFinance((state) => state.setTheme)
  const baseCurrency = useFinance((state) => state.settings.baseCurrency)
  const setBaseCurrency = useFinance((state) => state.setBaseCurrency)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const location = useLocation()

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  React.useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const current = ALL_ITEMS.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface/80 backdrop-blur lg:block">
        <SidebarContent />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-line bg-surface">
            <div className="absolute top-3 right-3 z-10">
              <IconButton label="Закрыть меню" icon={X} onClick={() => setDrawerOpen(false)} />
            </div>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Открыть меню"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {current ? current.label : 'Pocket Finance'}
              </p>
              <p className="hidden text-[11px] text-muted sm:block">
                Облачная синхронизация · {formatDate(todayISO())}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <InstallPWA />
              <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1.5">
                <span className="hidden text-[11px] text-muted sm:inline">Валюта</span>
                <select
                  aria-label="Основная валюта"
                  value={baseCurrency}
                  onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)}
                  className="field-text bg-transparent pr-1 font-medium text-fg outline-none"
                >
                  {CURRENCY_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>

              <IconButton
                label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                icon={theme === 'dark' ? Sun : Moon}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              />

              <Link
                to="/settings"
                aria-label="Настройки"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <SettingsIcon size={15} />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-[1400px] px-4 pb-6 text-[11px] text-muted sm:px-6">
          Pocket Finance · личный финансовый учёт с облачной синхронизацией
        </footer>
      </div>
    </div>
  )
}
