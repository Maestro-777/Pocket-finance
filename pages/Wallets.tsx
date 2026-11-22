import * as React from 'react'
import { History, Pencil, Plus, Search, Trash2, Wallet as WalletIcon } from 'lucide-react'
import {
  CURRENCIES,
  WALLET_KINDS,
  formatDate,
  formatMoney,
  poBalance,
  toBase,
  totalCapital,
  useFinance,
  walletBalance,
  type CurrencyCode,
  type Wallet,
  type WalletKind,
} from '@/lib/finance'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  Panel,
  PageHeader,
  Progress,
  StatCard,
  inputClass,
  tdClass,
  thClass,
  WalletKindIcon,
} from '@/components/ui'
import { WalletDialog } from '@/components/forms'

const kindLabel = (kind: WalletKind) =>
  WALLET_KINDS.find((item) => item.value === kind)?.label ?? 'Кошелёк'

export default function Wallets() {
  const wallets = useFinance((s) => s.wallets)
  const transactions = useFinance((s) => s.transactions)
  const transfers = useFinance((s) => s.transfers)
  const poEntries = useFinance((s) => s.poEntries)
  const settings = useFinance((s) => s.settings)
  const deleteWallet = useFinance((s) => s.deleteWallet)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Wallet | null>(null)
  const [deleting, setDeleting] = React.useState<Wallet | null>(null)
  const [historyFor, setHistoryFor] = React.useState<Wallet | null>(null)
  const [search, setSearch] = React.useState('')
  const [kindFilter, setKindFilter] = React.useState<'all' | WalletKind>('all')
  const [currencyFilter, setCurrencyFilter] = React.useState<'all' | CurrencyCode>('all')

  const base = settings.baseCurrency
  const capital = totalCapital({ wallets, poEntries, settings })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (wallet: Wallet) => {
    setEditing(wallet)
    setDialogOpen(true)
  }

  const rows = wallets
    .map((wallet) => ({
      wallet,
      balance: walletBalance(wallet, poEntries),
      inBase: toBase(walletBalance(wallet, poEntries), wallet.currency, base, settings.rates),
    }))
    .filter(({ wallet }) => {
      if (kindFilter !== 'all' && wallet.kind !== kindFilter) return false
      if (currencyFilter !== 'all' && wallet.currency !== currencyFilter) return false
      if (search && !wallet.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => b.inBase - a.inBase)

  const usedCurrencies = new Set(wallets.map((wallet) => wallet.currency))

  const historyRows = React.useMemo(() => {
    if (!historyFor) return []
    const wallet = historyFor
    const rows: { id: string; date: string; title: string; subtitle: string; amount: React.ReactNode }[] = []

    transactions
      .filter((tx) => tx.walletId === wallet.id)
      .forEach((tx) => {
        rows.push({
          id: tx.id,
          date: tx.date,
          title: tx.category,
          subtitle: tx.comment || (tx.kind === 'income' ? 'Доход' : 'Расход'),
          amount: (
            <span className={tx.kind === 'income' ? 'num text-income' : 'num text-expense'}>
              {formatMoney(tx.amount, tx.currency, { sign: true })}
            </span>
          ),
        })
      })

    transfers.forEach((transfer) => {
      if (transfer.fromWalletId === wallet.id) {
        rows.push({
          id: `${transfer.id}-out`,
          date: transfer.date,
          title: 'Перевод · списание',
          subtitle: transfer.comment || 'Исходящий перевод',
          amount: <span className="num text-muted">{formatMoney(transfer.amountFrom, transfer.currencyFrom, { sign: true })}</span>,
        })
      }
      if (transfer.toWalletId === wallet.id) {
        rows.push({
          id: `${transfer.id}-in`,
          date: transfer.date,
          title: 'Перевод · зачисление',
          subtitle: transfer.comment || 'Входящий перевод',
          amount: <span className="num text-income">{formatMoney(transfer.amountTo, transfer.currencyTo, { sign: true })}</span>,
        })
      }
    })

    if (wallet.kind === 'pocket_option') {
      poEntries.forEach((entry) => {
        rows.push({
          id: entry.id,
          date: entry.date,
          title: `Pocket Option · ${entry.kind === 'profit' ? 'прибыль' : entry.kind === 'loss' ? 'убыток' : entry.kind === 'deposit' ? 'пополнение' : 'вывод'}`,
          subtitle: entry.comment || 'Ручная запись',
          amount: (
            <span
              className={
                entry.kind === 'profit'
                  ? 'num text-income'
                  : entry.kind === 'loss'
                    ? 'num text-expense'
                    : 'num text-muted'
              }
            >
              {formatMoney(entry.amount, 'USD', { sign: entry.kind === 'profit' || entry.kind === 'loss' })}
            </span>
          ),
        })
      })
    }

    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [historyFor, transactions, transfers, poEntries])

  const deleteRelated = deleting
    ? transactions.filter((tx) => tx.walletId === deleting.id).length +
      transfers.filter((t) => t.fromWalletId === deleting.id || t.toWalletId === deleting.id).length
    : 0

  return (
    <>
      <PageHeader
        title="Мои кошельки"
        subtitle="Карты, счета, электронные и криптокошельки, Pocket Option"
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Добавить кошелёк
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Общий капитал"
          value={formatMoney(capital, base)}
          hint={`Пересчёт в ${base}`}
          icon={WalletIcon}
          tone="brand"
        />
        <StatCard
          label="Кошельков"
          value={String(wallets.length)}
          hint={`Типов: ${new Set(wallets.map((w) => w.kind)).size}`}
          icon={WalletIcon}
          tone="neutral"
        />
        <StatCard
          label="Валют в использовании"
          value={String(usedCurrencies.size)}
          hint={Array.from(usedCurrencies).join(', ') || 'Нет данных'}
          icon={WalletIcon}
          tone="warn"
        />
        <StatCard
          label="Pocket Option"
          value={formatMoney(poBalance(poEntries), 'USD')}
          hint="Ручной учёт платформы"
          icon={WalletIcon}
          tone="income"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Поиск по названию"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className={`${inputClass} sm:w-52`}
          value={kindFilter}
          onChange={(event) => setKindFilter(event.target.value as 'all' | WalletKind)}
          aria-label="Фильтр по типу кошелька"
        >
          <option value="all">Все типы</option>
          {WALLET_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} sm:w-40`}
          value={currencyFilter}
          onChange={(event) => setCurrencyFilter(event.target.value as 'all' | CurrencyCode)}
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ wallet, balance, inBase }) => (
          <Panel key={wallet.id} className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <WalletKindIcon kind={wallet.kind} size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{wallet.name}</p>
                  <p className="truncate text-[11px] text-muted">{kindLabel(wallet.kind)}</p>
                </div>
              </div>
              <Badge tone="neutral">{wallet.currency}</Badge>
            </div>

            <p className="num mt-4 text-xl font-semibold tracking-tight">
              {formatMoney(balance, wallet.currency)}
            </p>
            <p className="num text-[11px] text-muted">≈ {formatMoney(inBase, base)}</p>

            <div className="mt-3 flex items-center gap-2">
              <Progress value={capital > 0 ? (inBase / capital) * 100 : 0} />
              <span className="num shrink-0 text-[11px] text-muted">
                {capital > 0 ? ((inBase / capital) * 100).toFixed(0) : 0}%
              </span>
            </div>

            <div className="mt-4 flex items-center gap-1 border-t border-line pt-2">
              <Button variant="ghost" size="sm" icon={History} onClick={() => setHistoryFor(wallet)}>
                История
              </Button>
              <div className="ml-auto flex items-center gap-0.5">
                <IconButton label="Редактировать кошелёк" icon={Pencil} onClick={() => openEdit(wallet)} />
                <IconButton
                  label="Удалить кошелёк"
                  icon={Trash2}
                  tone="danger"
                  onClick={() => setDeleting(wallet)}
                />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {rows.length === 0 && (
        <Panel className="mt-4">
          <EmptyState
            title="Кошельки не найдены"
            description={
              wallets.length === 0
                ? 'Добавьте первый кошелёк, чтобы начать учёт доходов, расходов и переводов.'
                : 'Измените условия поиска или фильтры.'
            }
            action={
              wallets.length === 0 ? (
                <Button variant="primary" icon={Plus} onClick={openCreate}>
                  Добавить кошелёк
                </Button>
              ) : undefined
            }
          />
        </Panel>
      )}

      <WalletDialog open={dialogOpen} onClose={() => setDialogOpen(false)} wallet={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить кошелёк?"
        description={
          deleting
            ? `Кошелёк «${deleting.name}» и связанные записи (${deleteRelated}) будут удалены из демо-данных.`
            : undefined
        }
        onConfirm={() => deleting && deleteWallet(deleting.id)}
      />

      <Modal
        open={Boolean(historyFor)}
        onClose={() => setHistoryFor(null)}
        title={historyFor ? `История · ${historyFor.name}` : 'История'}
        description="Операции, переводы и записи Pocket Option"
        size="lg"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-line">
                <th className={thClass}>Дата</th>
                <th className={thClass}>Запись</th>
                <th className={`${thClass} text-right`}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.id} className="border-b border-line/60 last:border-0">
                  <td className={`${tdClass} num text-muted`}>{formatDate(row.date)}</td>
                  <td className={tdClass}>
                    <p className="text-sm">{row.title}</p>
                    <p className="text-[11px] text-muted">{row.subtitle}</p>
                  </td>
                  <td className={`${tdClass} text-right`}>{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historyRows.length === 0 && (
            <p className="py-8 text-center text-xs text-muted">По этому кошельку пока нет операций</p>
          )}
        </div>
      </Modal>
    </>
  )
}
