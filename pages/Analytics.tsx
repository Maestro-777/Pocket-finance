import * as React from 'react'
import { ArrowUpRight, PieChart as PieIcon, TrendingDown, TrendingUp, Wallet as WalletIcon } from 'lucide-react'
import {
  formatDate,
  formatMoney,
  inRange,
  isoDate,
  lastMonths,
  poStats,
  presetRange,
  toBase,
  totalCapital,
  useFinance,
} from '@/lib/finance'
import {
  Badge,
  Button,
  PageHeader,
  Panel,
  PanelHeader,
  Progress,
  Segmented,
  StatCard,
} from '@/components/ui'
import { AreaTrendChart, CategoryPieChart, ChartCard, GroupedBarsChart, useChartPalette } from '@/components/charts'

type Preset = 'month' | 'quarter' | 'year'

const PERIODS: { value: Preset; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 месяца' },
  { value: 'year', label: 'Год' },
]

function previousRange(preset: Preset) {
  const now = new Date()
  if (preset === 'month') {
    return {
      from: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: isoDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    }
  }
  if (preset === 'quarter') {
    return {
      from: isoDate(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
      to: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 0)),
    }
  }
  return {
    from: isoDate(new Date(now.getFullYear() - 1, 0, 1)),
    to: isoDate(new Date(now.getFullYear() - 1, 11, 31)),
  }
}

export default function Analytics() {
  const transactions = useFinance((s) => s.transactions)
  const wallets = useFinance((s) => s.wallets)
  const poEntries = useFinance((s) => s.poEntries)
  const settings = useFinance((s) => s.settings)
  const palette = useChartPalette()

  const [preset, setPreset] = React.useState<Preset>('quarter')
  const [walletFilter, setWalletFilter] = React.useState('all')

  const base = settings.baseCurrency
  const range = presetRange(preset)
  const prev = previousRange(preset)

  const convert = (amount: number, currency: keyof typeof settings.rates) =>
    toBase(amount, currency, base, settings.rates)

  const matchesWallet = (walletId: string) => walletFilter === 'all' || walletId === walletFilter

  const poWallet = wallets.find((wallet) => wallet.kind === 'pocket_option')
  const includePo = walletFilter === 'all' || (poWallet ? walletFilter === poWallet.id : false)

  const collect = (from: string, to: string) =>
    transactions.filter((tx) => inRange(tx.date, from, to) && matchesWallet(tx.walletId))

  const current = collect(range.from, range.to)
  const previous = collect(prev.from, prev.to)

  const sum = (rows: typeof current, kind: 'income' | 'expense') =>
    rows
      .filter((tx) => tx.kind === kind)
      .reduce((acc, tx) => acc + convert(tx.amount, tx.currency), 0)

  const poResult = (from: string, to: string) =>
    includePo
      ? poEntries
          .filter((entry) => inRange(entry.date, from, to))
          .reduce((acc, entry) => {
            const sign = entry.kind === 'profit' ? 1 : entry.kind === 'loss' ? -1 : 0
            return acc + sign * convert(entry.amount, 'USD')
          }, 0)
      : 0

  const income = sum(current, 'income')
  const expense = sum(current, 'expense')
  const prevIncome = sum(previous, 'income')
  const prevExpense = sum(previous, 'expense')
  const capitalChange = income - expense + poResult(range.from, range.to)
  const capital = totalCapital({ wallets, poEntries, settings })

  const change = (now: number, before: number) => (before ? ((now - before) / before) * 100 : null)

  const months = lastMonths(6)
  const monthFlow = (from: string, to: string) => {
    const rows = transactions.filter(
      (tx) => inRange(tx.date, from, to) && matchesWallet(tx.walletId),
    )
    return (
      sum(rows, 'income') - sum(rows, 'expense') + poResult(from, to)
    )
  }

  const capitalSeries = months.map((month, index) => {
    const after = months.slice(index + 1).reduce((acc, item) => acc + monthFlow(item.from, item.to), 0)
    return { label: month.label, value: Math.round(capital - after) }
  })

  const barsData = months.map((month) => ({
    label: month.label,
    income: Math.round(sum(transactions.filter((tx) => inRange(tx.date, month.from, month.to) && matchesWallet(tx.walletId)), 'income')),
    expense: Math.round(sum(transactions.filter((tx) => inRange(tx.date, month.from, month.to) && matchesWallet(tx.walletId)), 'expense')),
  }))

  const comparisonData = [
    { label: 'Доходы', current: Math.round(income), previous: Math.round(prevIncome) },
    { label: 'Расходы', current: Math.round(expense), previous: Math.round(prevExpense) },
  ]

  const groupByCategory = (kind: 'income' | 'expense') => {
    const map = new Map<string, number>()
    current
      .filter((tx) => tx.kind === kind)
      .forEach((tx) => {
        map.set(tx.category, (map.get(tx.category) ?? 0) + convert(tx.amount, tx.currency))
      })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }

  const expenseCategories = groupByCategory('expense')
  const incomeCategories = groupByCategory('income')
  const maxCategory = expenseCategories[0]?.value ?? 0

  const po = poStats(poEntries)
  const incomeDelta = change(income, prevIncome)
  const expenseDelta = change(expense, prevExpense)

  return (
    <>
      <PageHeader
        title="Аналитика и графики"
        subtitle="Динамика капитала, структура доходов и расходов, сравнение периодов"
        actions={
          <Segmented value={preset} onChange={setPreset} options={PERIODS} />
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          className="field-text h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25 sm:w-64"
          value={walletFilter}
          onChange={(event) => setWalletFilter(event.target.value)}
          aria-label="Фильтр по кошельку"
        >
          <option value="all">Все кошельки</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name} ({wallet.currency})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Период: {formatDate(range.from)} — {formatDate(range.to)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Общие доходы"
          value={formatMoney(income, base)}
          hint={incomeDelta === null ? 'Нет сравнения' : `${incomeDelta >= 0 ? '+' : ''}${incomeDelta.toFixed(1)}% к прошлому периоду`}
          icon={TrendingUp}
          tone="income"
        />
        <StatCard
          label="Общие расходы"
          value={formatMoney(expense, base)}
          hint={expenseDelta === null ? 'Нет сравнения' : `${expenseDelta >= 0 ? '+' : ''}${expenseDelta.toFixed(1)}% к прошлому периоду`}
          icon={TrendingDown}
          tone="expense"
        />
        <StatCard
          label="Разница"
          value={formatMoney(income - expense, base)}
          hint="Доходы минус расходы"
          icon={PieIcon}
          tone={income - expense >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          label="Изменение капитала"
          value={formatMoney(capitalChange, base)}
          hint="С учётом результата Pocket Option"
          icon={ArrowUpRight}
          tone={capitalChange >= 0 ? 'brand' : 'warn'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Динамика капитала"
          subtitle="Последние 6 месяцев, в основной валюте"
          action={<Badge tone="brand">{formatMoney(capital, base)}</Badge>}
        >
          <AreaTrendChart data={capitalSeries} dataKey="value" currency={base} height={260} name="Капитал" />
        </ChartCard>

        <ChartCard title="Сравнение периодов" subtitle="Текущий и предыдущий период">
          <GroupedBarsChart
            data={comparisonData}
            currency={base}
            height={260}
            series={[
              { key: 'current', name: 'Текущий', color: palette.brand },
              { key: 'previous', name: 'Предыдущий', color: palette.muted },
            ]}
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Доходы и расходы по месяцам" subtitle="Последние 6 месяцев">
          <GroupedBarsChart
            data={barsData}
            currency={base}
            height={260}
            series={[
              { key: 'income', name: 'Доходы', color: palette.income },
              { key: 'expense', name: 'Расходы', color: palette.expense },
            ]}
          />
        </ChartCard>

        <ChartCard title="Структура расходов" subtitle="По категориям за выбранный период">
          {expenseCategories.length > 0 ? (
            <CategoryPieChart data={expenseCategories.slice(0, 7)} currency={base} height={260} />
          ) : (
            <p className="py-16 text-center text-xs text-muted">Нет расходов за выбранный период</p>
          )}
        </ChartCard>

        <ChartCard title="Структура доходов" subtitle="По категориям за выбранный период">
          {incomeCategories.length > 0 ? (
            <CategoryPieChart data={incomeCategories.slice(0, 7)} currency={base} height={260} />
          ) : (
            <p className="py-16 text-center text-xs text-muted">Нет доходов за выбранный период</p>
          )}
        </ChartCard>

        <Panel>
          <PanelHeader
            title="Крупнейшие статьи расходов"
            subtitle="Доля в расходах за период"
            action={
              <Badge tone="expense">
                <TrendingDown size={12} /> {formatMoney(expense, base)}
              </Badge>
            }
          />
          <div className="space-y-3 px-5 py-4">
            {expenseCategories.slice(0, 6).map((category) => (
              <div key={category.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm">{category.name}</p>
                  <p className="num text-sm font-medium">{formatMoney(category.value, base)}</p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress value={maxCategory ? (category.value / maxCategory) * 100 : 0} tone="expense" />
                  <span className="num shrink-0 text-[11px] text-muted">
                    {expense ? ((category.value / expense) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <p className="py-8 text-center text-xs text-muted">Нет данных за период</p>
            )}
          </div>
          <div className="border-t border-line px-5 py-3">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Результат Pocket Option за всё время</span>
              <span className="num">{formatMoney(po.net, 'USD')}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              В анализе участвуют {wallets.length} кошельков. Переводы между ними не считаются
              доходами или расходами.
            </p>
          </div>
        </Panel>
      </div>
    </>
  )
}
