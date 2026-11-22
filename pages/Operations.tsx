import * as React from 'react'
import { Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp, Wallet as WalletIcon } from 'lucide-react'
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatDate,
  formatMoney,
  inRange,
  presetRange,
  toBase,
  useFinance,
  walletName,
  type Tx,
  type TxKind,
} from '@/lib/finance'
import {
  Amount,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  Segmented,
  StatCard,
  inputClass,
  tdClass,
  thClass,
} from '@/components/ui'
import { TxDialog } from '@/components/forms'

type Mode = 'income' | 'expense' | 'all'

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  income: { title: 'Доходы', subtitle: 'Поступления по кошелькам, категориям и периодам' },
  expense: { title: 'Расходы', subtitle: 'Списания по кошелькам, категориям и периодам' },
  all: { title: 'Все операции', subtitle: 'Единый список доходов и расходов с поиском и фильтрами' },
}

const PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 месяца' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
] as const

export default function Operations({ mode }: { mode: Mode }) {
  const transactions = useFinance((s) => s.transactions)
  const wallets = useFinance((s) => s.wallets)
  const settings = useFinance((s) => s.settings)
  const deleteTx = useFinance((s) => s.deleteTx)

  const [preset, setPreset] = React.useState<(typeof PERIODS)[number]['value']>('month')
  const [walletFilter, setWalletFilter] = React.useState('all')
  const [currencyFilter, setCurrencyFilter] = React.useState('all')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')

  const [dialogKind, setDialogKind] = React.useState<TxKind | null>(null)
  const [editing, setEditing] = React.useState<Tx | null>(null)
  const [deleting, setDeleting] = React.useState<Tx | null>(null)

  const base = settings.baseCurrency
  const range = presetRange(preset)

  const categories =
    mode === 'income' ? INCOME_CATEGORIES : mode === 'expense' ? EXPENSE_CATEGORIES : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

  const filtered = transactions
    .filter((tx) => {
      if (mode !== 'all' && tx.kind !== mode) return false
      if (!inRange(tx.date, range.from, range.to)) return false
      if (walletFilter !== 'all' && tx.walletId !== walletFilter) return false
      if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return false
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false
      if (search) {
        const haystack = `${tx.category} ${tx.comment ?? ''}`.toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const total = filtered.reduce((sum, tx) => sum + toBase(tx.amount, tx.currency, base, settings.rates), 0)
  const average = filtered.length ? total / filtered.length : 0

  const byCategory = new Map<string, number>()
  filtered.forEach((tx) => {
    byCategory.set(
      tx.category,
      (byCategory.get(tx.category) ?? 0) + toBase(tx.amount, tx.currency, base, settings.rates),
    )
  })
  const topCategory = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])[0]

  const openCreate = (kind: TxKind) => {
    setEditing(null)
    setDialogKind(kind)
  }

  const openEdit = (tx: Tx) => {
    setEditing(tx)
    setDialogKind(tx.kind)
  }

  const closeDialog = () => {
    setDialogKind(null)
    setEditing(null)
  }

  const header = TITLES[mode]

  return (
    <>
      <PageHeader
        title={header.title}
        subtitle={header.subtitle}
        actions={
          <>
            {mode !== 'expense' && (
              <Button variant="success" icon={Plus} onClick={() => openCreate('income')}>
                Добавить доход
              </Button>
            )}
            {mode !== 'income' && (
              <Button variant="danger" icon={Plus} onClick={() => openCreate('expense')}>
                Добавить расход
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Сумма за период"
          value={formatMoney(total, base)}
          hint={`${formatDate(range.from)} — ${formatDate(range.to)}`}
          icon={mode === 'expense' ? TrendingDown : TrendingUp}
          tone={mode === 'expense' ? 'expense' : 'income'}
        />
        <StatCard label="Записей" value={String(filtered.length)} hint="С учётом фильтров" icon={WalletIcon} tone="neutral" />
        <StatCard
          label="Средняя сумма"
          value={formatMoney(average, base)}
          hint={`В пересчёте на ${base}`}
          icon={WalletIcon}
          tone="brand"
        />
        <StatCard
          label="Крупнейшая категория"
          value={topCategory ? topCategory[0] : '—'}
          hint={topCategory ? formatMoney(topCategory[1], base) : 'Нет данных за период'}
          icon={WalletIcon}
          tone="warn"
        />
      </div>

      <Panel className="mt-4">
        <div className="flex flex-col gap-2 border-b border-line p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Поиск по категории и комментарию"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Поиск операций"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-3">
            <select
              className={`${inputClass} lg:w-44`}
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
              className={`${inputClass} lg:w-40`}
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
            <select
              className={`${inputClass} lg:w-32`}
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
          </div>
          <Segmented
            value={preset}
            onChange={setPreset}
            options={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
            className="lg:ml-auto"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead className="bg-surface-2/60">
              <tr className="border-b border-line">
                <th className={thClass}>Дата</th>
                {mode === 'all' && <th className={thClass}>Тип</th>}
                <th className={thClass}>Категория</th>
                <th className={thClass}>Кошелёк</th>
                <th className={thClass}>Комментарий</th>
                <th className={`${thClass} text-right`}>Сумма</th>
                <th className={`${thClass} text-right`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-b border-line/70 transition hover:bg-surface-2/40 last:border-0">
                  <td className={`${tdClass} num text-muted`}>{formatDate(tx.date)}</td>
                  {mode === 'all' && (
                    <td className={tdClass}>
                      <Badge tone={tx.kind === 'income' ? 'income' : 'expense'}>
                        {tx.kind === 'income' ? 'Доход' : 'Расход'}
                      </Badge>
                    </td>
                  )}
                  <td className={tdClass}>{tx.category}</td>
                  <td className={`${tdClass} text-muted`}>{walletName(wallets, tx.walletId)}</td>
                  <td className={`${tdClass} max-w-[240px] truncate text-muted`}>{tx.comment || '—'}</td>
                  <td className={`${tdClass} text-right`}>
                    <Amount value={tx.amount} currency={tx.currency} kind={tx.kind} />
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-0.5">
                      <IconButton label="Редактировать запись" icon={Pencil} onClick={() => openEdit(tx)} />
                      <IconButton
                        label="Удалить запись"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setDeleting(tx)}
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
            title="Операций не найдено"
            description="Измените фильтры или добавьте новую запись — она сразу появится в списке и в статистике."
            action={
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => openCreate(mode === 'expense' ? 'expense' : 'income')}
              >
                {mode === 'expense' ? 'Добавить расход' : 'Добавить доход'}
              </Button>
            }
          />
        )}
      </Panel>

      <TxDialog
        open={dialogKind !== null}
        onClose={closeDialog}
        kind={dialogKind ?? 'income'}
        tx={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить запись?"
        description={
          deleting
            ? `${deleting.category} · ${formatMoney(deleting.amount, deleting.currency)} от ${formatDate(deleting.date)}`
            : undefined
        }
        onConfirm={() => deleting && deleteTx(deleting.id)}
      />
    </>
  )
}
