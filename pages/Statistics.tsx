import * as React from 'react'
import { ArrowLeftRight, ArrowRight, Coins, TrendingDown, TrendingUp } from 'lucide-react'
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatDate,
  formatDateShort,
  formatMoney,
  inRange,
  isoDate,
  monthKey,
  monthLabel,
  poBalance,
  poStats,
  presetRange,
  todayISO,
  toBase,
  totalCapital,
  useFinance,
  walletName,
  type RangePreset,
} from '@/lib/finance'
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  Progress,
  Segmented,
  StatCard,
  tdClass,
  thClass,
} from '@/components/ui'
import { AreaTrendChart, CategoryPieChart, ChartCard, GroupedBarsChart, useChartPalette } from '@/components/charts'

type Preset = Exclude<RangePreset, never>
type Grouping = 'day' | 'month' | 'year'
type Tab = 'income' | 'expense' | 'transfers' | 'po'

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
  { value: 'custom', label: 'Период' },
]

const TABS: { value: Tab; label: string }[] = [
  { value: 'income', label: 'Доходы' },
  { value: 'expense', label: 'Расходы' },
  { value: 'transfers', label: 'Переводы' },
  { value: 'po', label: 'Pocket Option' },
]

const GROUPINGS: { value: Grouping; label: string }[] = [
  { value: 'day', label: 'По дням' },
  { value: 'month', label: 'По месяцам' },
  { value: 'year', label: 'По годам' },
]

type Bucket = { key: string; label: string; from: string; to: string }

function buildBuckets(from: string, to: string, grouping: Grouping): Bucket[] {
  const out: Bucket[] = []
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return out

  if (grouping === 'day') {
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    while (cursor <= end && out.length < 400) {
      const iso = isoDate(cursor)
      out.push({ key: iso, label: formatDateShort(iso), from: iso, to: iso })
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }

  if (grouping === 'month') {
    let year = start.getFullYear()
    let month = start.getMonth()
    while (new Date(year, month, 1) <= end && out.length < 200) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      out.push({
        key,
        label: monthLabel(key, true),
        from: isoDate(new Date(year, month, 1)),
        to: isoDate(new Date(year, month + 1, 0)),
      })
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    }
    return out
  }

  for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
    out.push({
      key: String(year),
      label: String(year),
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    })
  }
  return out
}

function previousOf(from: string, to: string) {
  const start = new Date(from)
  const end = new Date(to)
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  const prevTo = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1)
  const prevFrom = new Date(prevTo.getFullYear(), prevTo.getMonth(), prevTo.getDate() - (days - 1))
  return { from: isoDate(prevFrom), to: isoDate(prevTo) }
}

export default function Statistics() {
  const transactions = useFinance((s) => s.transactions)
  const transfers = useFinance((s) => s.transfers)
  const poEntries = useFinance((s) => s.poEntries)
  const wallets = useFinance((s) => s.wallets)
  const settings = useFinance((s) => s.settings)
  const palette = useChartPalette()

  const [preset, setPreset] = React.useState<Preset>('month')
  const [tab, setTab] = React.useState<Tab>('income')
  const [grouping, setGrouping] = React.useState<Grouping>('day')
  const [walletFilter, setWalletFilter] = React.useState('all')
  const [currencyFilter, setCurrencyFilter] = React.useState('all')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [customFrom, setCustomFrom] = React.useState(() => isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [customTo, setCustomTo] = React.useState(todayISO())

  const base = settings.baseCurrency
  const convert = (amount: number, currency: keyof typeof settings.rates) =>
    toBase(amount, currency, base, settings.rates)

  const earliest = React.useMemo(() => {
    const dates = [
      ...transactions.map((tx) => tx.date),
      ...transfers.map((item) => item.date),
      ...poEntries.map((entry) => entry.date),
    ].sort()
    return dates[0] ?? todayISO()
  }, [transactions, transfers, poEntries])

  const range = React.useMemo(() => {
    if (preset === 'custom') {
      const from = customFrom || earliest
      const to = customTo || todayISO()
      return from <= to ? { from, to } : { from: to, to: from }
    }
    if (preset === 'all') return { from: earliest, to: todayISO() }
    return presetRange(preset)
  }, [preset, customFrom, customTo, earliest])

  const prevRange = previousOf(range.from, range.to)

  React.useEffect(() => {
    if (preset === 'day' || preset === 'week') setGrouping('day')
    else if (preset === 'all') setGrouping('year')
    else setGrouping('month')
  }, [preset])

  const matchesWallet = (walletId: string) => walletFilter === 'all' || walletId === walletFilter
  const matchesCurrency = (currency: string) => currencyFilter === 'all' || currency === currencyFilter
  const matchesCategory = (category: string) => categoryFilter === 'all' || category === categoryFilter

  const inPeriod = (date: string) => inRange(date, range.from, range.to)

  const filtered = transactions.filter(
    (tx) =>
      inPeriod(tx.date) &&
      matchesWallet(tx.walletId) &&
      matchesCurrency(tx.currency) &&
      matchesCategory(tx.category),
  )

  const sumRows = (rows: typeof transactions, kind: 'income' | 'expense') =>
    rows
      .filter((tx) => tx.kind === kind)
      .reduce((acc, tx) => acc + convert(tx.amount, tx.currency), 0)

  const income = sumRows(filtered, 'income')
  const expense = sumRows(filtered, 'expense')

  const prevFiltered = transactions.filter(
    (tx) =>
      inRange(tx.date, prevRange.from, prevRange.to) &&
      matchesWallet(tx.walletId) &&
      matchesCurrency(tx.currency) &&
      matchesCategory(tx.category),
  )
  const prevIncome = sumRows(prevFiltered, 'income')
  const prevExpense = sumRows(prevFiltered, 'expense')

  const poWallet = wallets.find((wallet) => wallet.kind === 'pocket_option')
  const includePo = walletFilter === 'all' || (poWallet ? walletFilter === poWallet.id : false)

  const poPeriod = poEntries.filter((entry) => inPeriod(entry.date))
  const po = poStats(poEntries)
  const poInPeriod = poStats(poPeriod)
  const poResultPeriod = includePo ? poInPeriod.profit - poInPeriod.loss : 0
  const prevPo = poStats(poEntries.filter((entry) => inRange(entry.date, prevRange.from, prevRange.to)))

  const capitalChange = income - expense + poResultPeriod
  const capital = totalCapital({ wallets, poEntries, settings })

  const buckets = React.useMemo(
    () => buildBuckets(range.from, range.to, grouping),
    [range.from, range.to, grouping],
  )

  const chartData = buckets.map((bucket) => {
    const rows = filtered.filter((tx) => inRange(tx.date, bucket.from, bucket.to))
    return {
      label: bucket.label,
      income: Math.round(sumRows(rows, 'income')),
      expense: Math.round(sumRows(rows, 'expense')),
    }
  })

  const activeKind = tab === 'income' ? 'income' : 'expense'
  const activeRows = filtered.filter((tx) => tx.kind === activeKind)
  const activeTotal = activeKind === 'income' ? income : expense
  const activePrev = activeKind === 'income' ? prevIncome : prevExpense
  const activeDelta = activePrev ? ((activeTotal - activePrev) / activePrev) * 100 : null

  const categoryMap = new Map<string, number>()
  activeRows.forEach((tx) => {
    categoryMap.set(tx.category, (categoryMap.get(tx.category) ?? 0) + convert(tx.amount, tx.currency))
  })
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  const periodTable = buckets
    .map((bucket) => {
      const rows = filtered.filter(
        (tx) => tx.kind === activeKind && inRange(tx.date, bucket.from, bucket.to),
      )
      return {
        bucket,
        total: rows.reduce((acc, tx) => acc + convert(tx.amount, tx.currency), 0),
        count: rows.length,
      }
    })
    .filter((row) => row.count > 0)

  const periodTransfers = transfers
    .filter((transfer) => inPeriod(transfer.date))
    .filter(
      (transfer) =>
        walletFilter === 'all' ||
        transfer.fromWalletId === walletFilter ||
        transfer.toWalletId === walletFilter,
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const transferTotal = periodTransfers.reduce(
    (acc, transfer) => acc + convert(transfer.amountFrom, transfer.currencyFrom),
    0,
  )

  const pairMap = new Map<string, { count: number; total: number; from: string; to: string }>()
  periodTransfers.forEach((transfer) => {
    const key = `${transfer.fromWalletId}__${transfer.toWalletId}`
    const entry = pairMap.get(key) ?? {
      count: 0,
      total: 0,
      from: walletName(wallets, transfer.fromWalletId),
      to: walletName(wallets, transfer.toWalletId),
    }
    entry.count += 1
    entry.total += convert(transfer.amountFrom, transfer.currencyFrom)
    pairMap.set(key, entry)
  })
  const pairs = Array.from(pairMap.values()).sort((a, b) => b.total - a.total)

  const transferChart = buckets.map((bucket) => ({
    label: bucket.label,
    value: Math.round(
      periodTransfers
        .filter((transfer) => inRange(transfer.date, bucket.from, bucket.to))
        .reduce((acc, transfer) => acc + convert(transfer.amountFrom, transfer.currencyFrom), 0),
    ),
  }))

  const poChart = React.useMemo(() => {
    const sorted = [...poEntries].sort((a, b) => (a.date < b.date ? -1 : 1))
    let running = 0
    return sorted.map((entry) => {
      const sign = entry.kind === 'deposit' || entry.kind === 'profit' ? 1 : -1
      running += sign * entry.amount
      return { label: formatDateShort(entry.date), value: Math.round(running * 100) / 100 }
    })
  }, [poEntries])

  const poMonthly = React.useMemo(() => {
    const map = new Map<string, { profit: number; loss: number }>()
    poEntries.forEach((entry) => {
      const key = monthKey(entry.date)
      const item = map.get(key) ?? { profit: 0, loss: 0 }
      if (entry.kind === 'profit') item.profit += entry.amount
      if (entry.kind === 'loss') item.loss += entry.amount
      map.set(key, item)
    })
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, value]) => ({
        label: monthLabel(key, true),
        profit: Math.round(value.profit),
        loss: Math.round(value.loss),
      }))
  }, [poEntries])

  const categories = Array.from(
    new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...transactions.map((tx) => tx.category)]),
  )

  const presetLabel = `${formatDate(range.from)} — ${formatDate(range.to)}`

  return (
    <>
      <PageHeader
        title="Статистика"
        subtitle="Доходы, расходы, переводы и Pocket Option за выбранный период"
      />

      <div className="mb-4 space-y-3 rounded-2xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Segmented value={preset} onChange={setPreset} options={PRESETS} />
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="field-text num h-10 rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none focus:border-brand"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                aria-label="Начало периода"
              />
              <span className="text-xs text-muted">—</span>
              <input
                type="date"
                className="field-text num h-10 rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none focus:border-brand"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                aria-label="Конец периода"
              />
            </div>
          )}
          <p className="text-xs text-muted lg:ml-auto">{presetLabel}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className="field-text h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none focus:border-brand"
            value={walletFilter}
            onChange={(event) => setWalletFilter(event.target.value)}
            aria-label="Фильтр по кошельку"
          >
            <option value="all">Все кошельки</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
          <select
            className="field-text h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none focus:border-brand"
            value={currencyFilter}
            onChange={(event) => setCurrencyFilter(event.target.value)}
            aria-label="Фильтр по валюте"
          >
            <option value="all">Все валюты</option>
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
          <select
            className="field-text h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none focus:border-brand"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Фильтр по категории"
          >
            <option value="all">Все категории</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Segmented value={grouping} onChange={setGrouping} options={GROUPINGS} className="w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Общие доходы" value={formatMoney(income, base)} icon={TrendingUp} tone="income" />
        <StatCard label="Общие расходы" value={formatMoney(expense, base)} icon={TrendingDown} tone="expense" />
        <StatCard
          label="Разница"
          value={formatMoney(income - expense, base)}
          icon={Coins}
          tone={income - expense >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          label="Изменение капитала"
          value={formatMoney(capitalChange, base)}
          hint="С учётом результата Pocket Option"
          icon={ArrowRight}
          tone="brand"
        />
      </div>

      <div className="mt-4">
        <Segmented value={tab} onChange={setTab} options={TABS} className="w-full sm:w-auto" />
      </div>

      {(tab === 'income' || tab === 'expense') && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={tab === 'income' ? 'Сумма доходов' : 'Сумма расходов'}
              value={formatMoney(activeTotal, base)}
              hint={`${activeRows.length} записей`}
              icon={tab === 'income' ? TrendingUp : TrendingDown}
              tone={tab === 'income' ? 'income' : 'expense'}
            />
            <StatCard
              label="Средняя запись"
              value={formatMoney(activeRows.length ? activeTotal / activeRows.length : 0, base)}
              icon={Coins}
              tone="neutral"
            />
            <StatCard
              label="Категорий"
              value={String(categoryData.length)}
              hint={categoryData[0] ? `Больше всего: ${categoryData[0].name}` : 'Нет данных'}
              icon={Coins}
              tone="warn"
            />
            <StatCard
              label="Сравнение с периодом"
              value={activeDelta === null ? '—' : `${activeDelta >= 0 ? '+' : ''}${activeDelta.toFixed(1)}%`}
              hint={`Предыдущий: ${formatMoney(activePrev, base)}`}
              icon={ArrowRight}
              tone={activeDelta === null ? 'neutral' : activeDelta >= 0 ? 'income' : 'expense'}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title={tab === 'income' ? 'Доходы по периодам' : 'Расходы по периодам'}
              subtitle={presetLabel}
            >
              <GroupedBarsChart
                data={chartData}
                currency={base}
                height={280}
                series={[
                  {
                    key: activeKind,
                    name: tab === 'income' ? 'Доходы' : 'Расходы',
                    color: tab === 'income' ? palette.income : palette.expense,
                  },
                ]}
              />
            </ChartCard>

            <ChartCard title="По категориям" subtitle="Доля в сумме за период">
              {categoryData.length > 0 ? (
                <CategoryPieChart data={categoryData.slice(0, 7)} currency={base} height={280} />
              ) : (
                <p className="py-20 text-center text-xs text-muted">Нет данных за период</p>
              )}
            </ChartCard>
          </div>

          <Panel className="mt-4 overflow-hidden">
            <PanelHeader
              title={grouping === 'day' ? 'Разбивка по дням' : grouping === 'month' ? 'Разбивка по месяцам' : 'Разбивка по годам'}
              subtitle="Только периоды, в которых были записи"
            />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead className="border-y border-line bg-surface-2/60">
                  <tr>
                    <th className={thClass}>Период</th>
                    <th className={`${thClass} text-right`}>Записей</th>
                    <th className={`${thClass} text-right`}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {periodTable.map((row) => (
                    <tr key={row.bucket.key} className="border-b border-line/70 last:border-0">
                      <td className={tdClass}>{row.bucket.label}</td>
                      <td className={`${tdClass} num text-right text-muted`}>{row.count}</td>
                      <td className={`${tdClass} num text-right`}>{formatMoney(row.total, base)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {periodTable.length === 0 && (
              <EmptyState title="Нет записей" description="Измените период или фильтры." />
            )}
          </Panel>
        </>
      )}

      {tab === 'transfers' && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Количество переводов" value={String(periodTransfers.length)} icon={ArrowLeftRight} tone="brand" />
            <StatCard label="Общая сумма" value={formatMoney(transferTotal, base)} icon={Coins} tone="neutral" />
            <StatCard
              label="Средний перевод"
              value={formatMoney(periodTransfers.length ? transferTotal / periodTransfers.length : 0, base)}
              icon={ArrowRight}
              tone="warn"
            />
            <StatCard label="Пар кошельков" value={String(pairs.length)} icon={ArrowLeftRight} tone="income" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartCard title="Сумма переводов по периодам" subtitle="Переводы не учитываются как доходы и расходы">
              <GroupedBarsChart
                data={transferChart}
                currency={base}
                height={260}
                series={[{ key: 'value', name: 'Переводы', color: palette.brand }]}
              />
            </ChartCard>

            <Panel>
              <PanelHeader title="Переводы между кошельками" subtitle="Количество и сумма по направлениям" />
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead className="border-y border-line bg-surface-2/60">
                    <tr>
                      <th className={thClass}>Направление</th>
                      <th className={`${thClass} text-right`}>Переводов</th>
                      <th className={`${thClass} text-right`}>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((pair) => (
                      <tr key={`${pair.from}-${pair.to}`} className="border-b border-line/70 last:border-0">
                        <td className={tdClass}>
                          <span className="inline-flex items-center gap-1.5">
                            {pair.from}
                            <ArrowRight size={12} className="text-muted" />
                            {pair.to}
                          </span>
                        </td>
                        <td className={`${tdClass} num text-right text-muted`}>{pair.count}</td>
                        <td className={`${tdClass} num text-right`}>{formatMoney(pair.total, base)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pairs.length === 0 && <EmptyState title="Переводов нет" description="За выбранный период переводов не было." />}
            </Panel>
          </div>

          <Panel className="mt-4">
            <PanelHeader title="История переводов" subtitle={presetLabel} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="border-y border-line bg-surface-2/60">
                  <tr>
                    <th className={thClass}>Дата</th>
                    <th className={thClass}>Откуда</th>
                    <th className={thClass}>Куда</th>
                    <th className={`${thClass} text-right`}>Списано</th>
                    <th className={`${thClass} text-right`}>Зачислено</th>
                  </tr>
                </thead>
                <tbody>
                  {periodTransfers.map((transfer) => (
                    <tr key={transfer.id} className="border-b border-line/70 last:border-0">
                      <td className={`${tdClass} num text-muted`}>{formatDate(transfer.date)}</td>
                      <td className={tdClass}>{walletName(wallets, transfer.fromWalletId)}</td>
                      <td className={tdClass}>{walletName(wallets, transfer.toWalletId)}</td>
                      <td className={`${tdClass} num text-right`}>
                        {formatMoney(transfer.amountFrom, transfer.currencyFrom)}
                      </td>
                      <td className={`${tdClass} num text-right`}>
                        {formatMoney(transfer.amountTo, transfer.currencyTo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {periodTransfers.length === 0 && <EmptyState title="Переводов нет" />}
          </Panel>
        </>
      )}

      {tab === 'po' && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Баланс платформы" value={formatMoney(poBalance(poEntries), 'USD')} icon={Coins} tone="brand" />
            <StatCard label="Пополнения за период" value={formatMoney(poInPeriod.deposits, 'USD')} icon={TrendingUp} tone="income" />
            <StatCard label="Выводы за период" value={formatMoney(poInPeriod.withdrawals, 'USD')} icon={TrendingDown} tone="warn" />
            <StatCard
              label="Чистый результат за период"
              value={formatMoney(poInPeriod.net, 'USD')}
              hint={`Прибыль ${formatMoney(poInPeriod.profit, 'USD')} · убыток ${formatMoney(poInPeriod.loss, 'USD')}`}
              icon={ArrowRight}
              tone={poInPeriod.net >= 0 ? 'income' : 'expense'}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard className="xl:col-span-2" title="Изменение баланса" subtitle="Накопительный баланс Pocket Option">
              <AreaTrendChart data={poChart} dataKey="value" currency="USD" height={280} name="Баланс" />
            </ChartCard>

            <Panel>
              <PanelHeader title="Итоги торговли" subtitle="За всё время" />
              <div className="space-y-3 px-5 py-4">
                {[
                  { label: 'Пополнения', value: po.deposits, tone: 'text-income' },
                  { label: 'Выводы', value: po.withdrawals, tone: 'text-warn' },
                  { label: 'Торговая прибыль', value: po.profit, tone: 'text-income' },
                  { label: 'Торговые убытки', value: po.loss, tone: 'text-expense' },
                  { label: 'Чистый результат', value: po.net, tone: po.net >= 0 ? 'text-income' : 'text-expense' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2 border-b border-line/60 pb-2 last:border-0">
                    <span className="text-xs text-muted">{row.label}</span>
                    <span className={`num text-sm font-medium ${row.tone}`}>{formatMoney(row.value, 'USD')}</span>
                  </div>
                ))}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>Доля прибыльных сделок</span>
                    <span className="num">{po.winRate.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1.5">
                    <Progress value={po.winRate} tone="income" />
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-surface-2 p-3">
                  <p className="text-[11px] text-muted">Сравнение с предыдущим периодом</p>
                  <p className="num mt-1 text-sm font-medium">
                    {formatMoney(poInPeriod.net - prevPo.net, 'USD')}
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          <ChartCard
            className="mt-4"
            title="Прибыль и убытки по месяцам"
            subtitle="Торговый результат Pocket Option"
          >
            <GroupedBarsChart
              data={poMonthly}
              currency="USD"
              height={280}
              series={[
                { key: 'profit', name: 'Прибыль', color: palette.income },
                { key: 'loss', name: 'Убыток', color: palette.expense },
              ]}
            />
          </ChartCard>

          <Panel className="mt-4">
            <PanelHeader title="Записи за период" subtitle={presetLabel} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="border-y border-line bg-surface-2/60">
                  <tr>
                    <th className={thClass}>Дата</th>
                    <th className={thClass}>Тип</th>
                    <th className={thClass}>Комментарий</th>
                    <th className={`${thClass} text-right`}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {[...poPeriod]
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .map((entry) => (
                      <tr key={entry.id} className="border-b border-line/70 last:border-0">
                        <td className={`${tdClass} num text-muted`}>{formatDate(entry.date)}</td>
                        <td className={tdClass}>
                          <Badge
                            tone={
                              entry.kind === 'profit'
                                ? 'income'
                                : entry.kind === 'loss'
                                  ? 'expense'
                                  : entry.kind === 'deposit'
                                    ? 'brand'
                                    : 'warn'
                            }
                          >
                            {entry.kind === 'profit'
                              ? 'Прибыль'
                              : entry.kind === 'loss'
                                ? 'Убыток'
                                : entry.kind === 'deposit'
                                  ? 'Пополнение'
                                  : 'Вывод'}
                          </Badge>
                        </td>
                        <td className={`${tdClass} text-muted`}>{entry.comment || '—'}</td>
                        <td className={`${tdClass} num text-right`}>{formatMoney(entry.amount, 'USD')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {poPeriod.length === 0 && <EmptyState title="Записей нет" description="За выбранный период записей Pocket Option нет." />}
          </Panel>
        </>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Статистика формируется автоматически на основе введённых операций. Переводы между
        собственными кошельками не учитываются как доходы и расходы. Итоговый капитал: {formatMoney(capital, base)}.
      </p>
    </>
  )
}
