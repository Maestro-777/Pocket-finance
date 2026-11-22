import * as React from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import {
  daysInMonth,
  formatCompact,
  formatDate,
  formatMoney,
  monthLabel,
  poStats,
  todayISO,
  toBase,
  useFinance,
  walletName,
} from '@/lib/finance'
import { cn } from '@/lib/utils'
import { Amount, Badge, Button, EmptyState, PageHeader, Panel, PanelHeader, StatCard, tdClass, thClass } from '@/components/ui'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const PO_LABELS = {
  deposit: 'Пополнение',
  withdraw: 'Вывод',
  profit: 'Торговая прибыль',
  loss: 'Торговый убыток',
} as const

export default function CalendarPage() {
  const transactions = useFinance((s) => s.transactions)
  const transfers = useFinance((s) => s.transfers)
  const poEntries = useFinance((s) => s.poEntries)
  const wallets = useFinance((s) => s.wallets)
  const settings = useFinance((s) => s.settings)

  const today = todayISO()
  const now = new Date()
  const [cursor, setCursor] = React.useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = React.useState(today)

  const base = settings.baseCurrency
  const convert = (amount: number, currency: keyof typeof settings.rates) =>
    toBase(amount, currency, base, settings.rates)

  const monthFrom = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-01`
  const total = daysInMonth(cursor.year, cursor.month)
  const monthTo = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(total).padStart(2, '0')}`
  const monthKeyValue = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`

  const monthTransactions = transactions.filter((tx) => tx.date >= monthFrom && tx.date <= monthTo)
  const monthIncome = monthTransactions
    .filter((tx) => tx.kind === 'income')
    .reduce((sum, tx) => sum + convert(tx.amount, tx.currency), 0)
  const monthExpense = monthTransactions
    .filter((tx) => tx.kind === 'expense')
    .reduce((sum, tx) => sum + convert(tx.amount, tx.currency), 0)
  const monthOperations = monthTransactions.length + transfers.filter((t) => t.date >= monthFrom && t.date <= monthTo).length

  const dayTotals = React.useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    transactions.forEach((tx) => {
      if (tx.date < monthFrom || tx.date > monthTo) return
      const entry = map.get(tx.date) ?? { income: 0, expense: 0 }
      const value = convert(tx.amount, tx.currency)
      if (tx.kind === 'income') entry.income += value
      else entry.expense += value
      map.set(tx.date, entry)
    })
    return map
  }, [transactions, monthFrom, monthTo, base, settings.rates])

  const leading = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const isoFor = (day: number) =>
    `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const dayRows = [
    ...transactions
      .filter((tx) => tx.date === selected)
      .map((tx) => ({
        id: tx.id,
        title: tx.category,
        subtitle: `${tx.kind === 'income' ? 'Доход' : 'Расход'} · ${walletName(wallets, tx.walletId)}${tx.comment ? ` · ${tx.comment}` : ''}`,
        tone: tx.kind === 'income' ? ('income' as const) : ('expense' as const),
        amount: <Amount value={tx.amount} currency={tx.currency} kind={tx.kind} />,
      })),
    ...transfers
      .filter((transfer) => transfer.date === selected)
      .map((transfer) => ({
        id: transfer.id,
        title: 'Перевод между кошельками',
        subtitle: `${walletName(wallets, transfer.fromWalletId)} → ${walletName(wallets, transfer.toWalletId)}${transfer.comment ? ` · ${transfer.comment}` : ''}`,
        tone: 'brand' as const,
        amount: (
          <span className="num font-medium">{formatMoney(transfer.amountFrom, transfer.currencyFrom)}</span>
        ),
      })),
    ...poEntries
      .filter((entry) => entry.date === selected)
      .map((entry) => ({
        id: entry.id,
        title: `Pocket Option · ${PO_LABELS[entry.kind]}`,
        subtitle: entry.comment || 'Ручная запись',
        tone:
          entry.kind === 'profit'
            ? ('income' as const)
            : entry.kind === 'loss'
              ? ('expense' as const)
              : ('brand' as const),
        amount: (
          <Amount
            value={entry.amount}
            currency="USD"
            kind={entry.kind === 'profit' ? 'income' : entry.kind === 'loss' ? 'expense' : 'neutral'}
          />
        ),
      })),
  ]

  const po = poStats(poEntries)

  return (
    <>
      <PageHeader
        title="Календарь операций"
        subtitle="Все записи по дням: доходы, расходы, переводы и Pocket Option"
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setCursor({ year: now.getFullYear(), month: now.getMonth() })
              setSelected(today)
            }}
          >
            Текущий месяц
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={`Доходы · ${monthLabel(monthKeyValue, true)}`}
          value={formatMoney(monthIncome, base)}
          icon={TrendingUp}
          tone="income"
        />
        <StatCard
          label={`Расходы · ${monthLabel(monthKeyValue, true)}`}
          value={formatMoney(monthExpense, base)}
          icon={TrendingDown}
          tone="expense"
        />
        <StatCard
          label="Разница за месяц"
          value={formatMoney(monthIncome - monthExpense, base)}
          icon={TrendingUp}
          tone={monthIncome - monthExpense >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          label="Операций в месяце"
          value={String(monthOperations)}
          hint={`Pocket Option: ${formatMoney(po.net, 'USD')} результат`}
          icon={TrendingUp}
          tone="neutral"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold capitalize">{monthLabel(monthKeyValue)}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                onClick={() =>
                  setCursor(({ year, month }) =>
                    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Следующий месяц"
                onClick={() =>
                  setCursor(({ year, month }) =>
                    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1 text-center text-[10px] font-medium text-muted uppercase">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} className="min-h-[58px] sm:min-h-[84px]" />
                const iso = isoFor(day)
                const totals = dayTotals.get(iso)
                const isToday = iso === today
                const isSelected = iso === selected
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelected(iso)}
                    className={cn(
                      'flex min-h-[58px] flex-col items-start rounded-xl border p-1.5 text-left transition sm:min-h-[84px] sm:p-2',
                      isSelected
                        ? 'border-brand bg-brand-soft'
                        : 'border-line bg-surface-2/40 hover:border-brand/40',
                      isToday && !isSelected && 'border-brand/50',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-medium sm:text-xs',
                        isToday ? 'text-brand' : 'text-fg',
                      )}
                    >
                      {day}
                    </span>
                    {totals && (
                      <>
                        <span className="mt-auto hidden w-full flex-col gap-0.5 sm:flex">
                          {totals.income > 0 && (
                            <span className="num truncate text-[10px] text-income">
                              +{formatCompact(totals.income, base)}
                            </span>
                          )}
                          {totals.expense > 0 && (
                            <span className="num truncate text-[10px] text-expense">
                              −{formatCompact(totals.expense, base)}
                            </span>
                          )}
                        </span>
                        <span className="mt-auto flex gap-1 sm:hidden">
                          {totals.income > 0 && <span className="h-1.5 w-1.5 rounded-full bg-income" />}
                          {totals.expense > 0 && <span className="h-1.5 w-1.5 rounded-full bg-expense" />}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            title={`Операции · ${formatDate(selected)}`}
            subtitle={`${dayRows.length} записей за день`}
          />
          <div className="scroll-slim max-h-[520px] flex-1 overflow-y-auto px-4 py-3">
            {dayRows.length === 0 && (
              <EmptyState title="Записей нет" description="Выберите другой день или добавьте операцию." />
            )}
            <ul className="space-y-2">
              {dayRows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-line bg-surface-2/50 p-3 transition hover:border-brand/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{row.title}</p>
                    {row.amount}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge tone={row.tone}>{row.tone === 'income' ? 'Доход' : row.tone === 'expense' ? 'Расход' : 'Перевод'}</Badge>
                    <p className="truncate text-[11px] text-muted">{row.subtitle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line px-4 py-3">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>День</th>
                  <th className={`${thClass} text-right`}>Доходы</th>
                  <th className={`${thClass} text-right`}>Расходы</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(dayTotals.entries())
                  .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                  .slice(0, 3)
                  .map(([date, totals]) => (
                    <tr key={date}>
                      <td className={`${tdClass} num text-muted`}>{formatDate(date)}</td>
                      <td className={`${tdClass} num text-right text-income`}>
                        {totals.income ? formatCompact(totals.income, base) : '—'}
                      </td>
                      <td className={`${tdClass} num text-right text-expense`}>
                        {totals.expense ? formatCompact(totals.expense, base) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}
