import * as React from 'react'
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import {
  PO_KINDS,
  formatDate,
  formatDateShort,
  formatMoney,
  inRange,
  monthKey,
  monthLabel,
  poBalance,
  poStats,
  presetRange,
  useFinance,
  type PoEntry,
  type PoKind,
} from '@/lib/finance'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  PanelHeader,
  Progress,
  Segmented,
  StatCard,
  tdClass,
  thClass,
} from '@/components/ui'
import { AreaTrendChart, ChartCard, GroupedBarsChart, useChartPalette } from '@/components/charts'
import { PoEntryDialog } from '@/components/forms'

const PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 месяца' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
] as const

const KIND_TONE = {
  deposit: 'brand',
  withdraw: 'warn',
  profit: 'income',
  loss: 'expense',
} as const

const KIND_LABEL = {
  deposit: 'Пополнение',
  withdraw: 'Вывод',
  profit: 'Торговая прибыль',
  loss: 'Торговый убыток',
} as const

export default function PocketOption() {
  const poEntries = useFinance((s) => s.poEntries)
  const deletePo = useFinance((s) => s.deletePo)
  const palette = useChartPalette()

  const [preset, setPreset] = React.useState<(typeof PERIODS)[number]['value']>('quarter')
  const [kindFilter, setKindFilter] = React.useState<'all' | PoKind>('all')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PoEntry | null>(null)
  const [deleting, setDeleting] = React.useState<PoEntry | null>(null)

  const range = presetRange(preset)
  const stats = poStats(poEntries)
  const balance = poBalance(poEntries)

  const filtered = poEntries
    .filter((entry) => inRange(entry.date, range.from, range.to))
    .filter((entry) => kindFilter === 'all' || entry.kind === kindFilter)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const balanceSeries = React.useMemo(() => {
    const sorted = [...poEntries].sort((a, b) => (a.date < b.date ? -1 : 1))
    let running = 0
    return sorted.map((entry) => {
      const sign = entry.kind === 'deposit' || entry.kind === 'profit' ? 1 : -1
      running += sign * entry.amount
      return { label: formatDateShort(entry.date), value: Math.round(running * 100) / 100 }
    })
  }, [poEntries])

  const monthly = React.useMemo(() => {
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

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (entry: PoEntry) => {
    setEditing(entry)
    setDialogOpen(true)
  }

  const periodStats = poStats(poEntries.filter((entry) => inRange(entry.date, range.from, range.to)))

  return (
    <>
      <PageHeader
        title="Pocket Option"
        subtitle="Ручной учёт баланса, пополнений, выводов и торговых результатов"
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Добавить запись
          </Button>
        }
      />

      <Panel className="mb-4 flex flex-col gap-1 border-brand/30 bg-brand-soft/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-brand">Платформа не подключена</p>
        <p className="text-xs text-muted">
          Все суммы вводятся вручную. Автоматической синхронизации с Pocket Option нет.
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Баланс платформы" value={formatMoney(balance, 'USD')} hint="Пополнения − выводы ± результат" icon={TrendingUp} tone="brand" />
        <StatCard label="Пополнения" value={formatMoney(stats.deposits, 'USD')} hint="За всё время" icon={TrendingUp} tone="income" />
        <StatCard label="Выводы" value={formatMoney(stats.withdrawals, 'USD')} hint="За всё время" icon={TrendingDown} tone="warn" />
        <StatCard
          label="Чистый торговый результат"
          value={formatMoney(stats.net, 'USD')}
          hint={`${stats.trades} сделок`}
          icon={TrendingUp}
          tone={stats.net >= 0 ? 'income' : 'expense'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Изменение баланса"
          subtitle="Накопительный баланс по всем записям"
          action={<Badge tone="brand">{formatMoney(balance, 'USD')}</Badge>}
        >
          <AreaTrendChart data={balanceSeries} dataKey="value" currency="USD" height={260} name="Баланс" />
        </ChartCard>

        <Panel>
          <PanelHeader title="Результаты торговли" subtitle="Прибыль, убытки и доля успешных сделок" />
          <div className="space-y-3 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[11px] text-muted">Прибыль</p>
                <p className="num mt-1 text-sm font-semibold text-income">{formatMoney(stats.profit, 'USD')}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[11px] text-muted">Убытки</p>
                <p className="num mt-1 text-sm font-semibold text-expense">{formatMoney(stats.loss, 'USD')}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Доля прибыльных сделок</span>
                <span className="num">{stats.winRate.toFixed(0)}%</span>
              </div>
              <div className="mt-1.5">
                <Progress value={stats.winRate} tone="income" />
              </div>
            </div>
            <div className="space-y-2 border-t border-line pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Пополнения за период</span>
                <span className="num">{formatMoney(periodStats.deposits, 'USD')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Выводы за период</span>
                <span className="num">{formatMoney(periodStats.withdrawals, 'USD')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Результат за период</span>
                <span className={`num ${periodStats.net >= 0 ? 'text-income' : 'text-expense'}`}>
                  {formatMoney(periodStats.net, 'USD')}
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <ChartCard className="mt-4" title="Торговый результат по месяцам" subtitle="Прибыль и убытки отдельно">
        <GroupedBarsChart
          data={monthly}
          currency="USD"
          height={240}
          series={[
            { key: 'profit', name: 'Прибыль', color: palette.income },
            { key: 'loss', name: 'Убыток', color: palette.expense },
          ]}
        />
      </ChartCard>

      <Panel className="mt-4">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <select
            className="field-text h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none focus:border-brand sm:w-56"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as 'all' | PoKind)}
            aria-label="Фильтр по типу записи"
          >
            <option value="all">Все записи</option>
            {PO_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
          <Segmented
            value={preset}
            onChange={setPreset}
            options={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
            className="sm:ml-auto"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-surface-2/60">
              <tr className="border-b border-line">
                <th className={thClass}>Дата</th>
                <th className={thClass}>Тип</th>
                <th className={thClass}>Комментарий</th>
                <th className={`${thClass} text-right`}>Сумма</th>
                <th className={`${thClass} text-right`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-b border-line/70 transition hover:bg-surface-2/40 last:border-0">
                  <td className={`${tdClass} num text-muted`}>{formatDate(entry.date)}</td>
                  <td className={tdClass}>
                    <Badge tone={KIND_TONE[entry.kind]}>{KIND_LABEL[entry.kind]}</Badge>
                  </td>
                  <td className={`${tdClass} max-w-[260px] truncate text-muted`}>{entry.comment || '—'}</td>
                  <td className={`${tdClass} num text-right`}>{formatMoney(entry.amount, 'USD')}</td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-0.5">
                      <IconButton label="Редактировать запись" icon={Pencil} onClick={() => openEdit(entry)} />
                      <IconButton
                        label="Удалить запись"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setDeleting(entry)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyState
            title="Записей нет"
            description="Добавьте пополнение, вывод, торговую прибыль или убыток — они появятся в истории и графиках."
            action={
              <Button variant="primary" icon={Plus} onClick={openCreate}>
                Добавить запись
              </Button>
            }
          />
        )}
      </Panel>

      <PoEntryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} entry={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить запись?"
        description={
          deleting
            ? `${KIND_LABEL[deleting.kind]} · ${formatMoney(deleting.amount, 'USD')} от ${formatDate(deleting.date)}`
            : undefined
        }
        onConfirm={() => deleting && deletePo(deleting.id)}
      />
    </>
  )
}
