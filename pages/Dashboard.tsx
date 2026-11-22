import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, ArrowUpRight, Coins, TrendingDown, TrendingUp } from 'lucide-react'
import {
  formatDateShort,
  formatMoney,
  lastMonths,
  monthLabel,
  poStats,
  toBase,
  totalCapital,
  useFinance,
  walletBalance,
  walletName,
  type PoKind,
} from '@/lib/finance'
import {
  Amount,
  Badge,
  Button,
  Panel,
  PanelHeader,
  Progress,
  StatCard,
  WalletKindIcon,
  tdClass,
  thClass,
} from '@/components/ui'
import { AreaTrendChart, ChartCard, GroupedBarsChart, useChartPalette } from '@/components/charts'
import { TransferDialog, TxDialog } from '@/components/forms'

const PO_LABELS: Record<PoKind, string> = {
  deposit: 'Пополнение',
  withdraw: 'Вывод',
  profit: 'Торговая прибыль',
  loss: 'Торговый убыток',
}

export default function Dashboard() {
  const wallets = useFinance((s) => s.wallets)
  const transactions = useFinance((s) => s.transactions)
  const transfers = useFinance((s) => s.transfers)
  const poEntries = useFinance((s) => s.poEntries)
  const settings = useFinance((s) => s.settings)
  const palette = useChartPalette()

  const [dialog, setDialog] = React.useState<null | 'income' | 'expense' | 'transfer'>(null)

  const base = settings.baseCurrency
  const rates = settings.rates
  const capital = totalCapital({ wallets, poEntries, settings })
  const months = lastMonths(6)
  const current = months[months.length - 1]
  const previous = months[months.length - 2]

  const convert = (amount: number, currency: keyof typeof rates) =>
    toBase(amount, currency, base, rates)

  const monthSum = (kind: 'income' | 'expense', from: string, to: string) =>
    transactions
      .filter((tx) => tx.kind === kind && tx.date >= from && tx.date <= to)
      .reduce((sum, tx) => sum + convert(tx.amount, tx.currency), 0)

  const poResult = (from: string, to: string) =>
    poEntries
      .filter((entry) => entry.date >= from && entry.date <= to)
      .reduce((sum, entry) => {
        const sign = entry.kind === 'profit' ? 1 : entry.kind === 'loss' ? -1 : 0
        return sum + sign * convert(entry.amount, 'USD')
      }, 0)

  const flow = (from: string, to: string) =>
    monthSum('income', from, to) - monthSum('expense', from, to) + poResult(from, to)

  const income = monthSum('income', current.from, current.to)
  const expense = monthSum('expense', current.from, current.to)
  const prevIncome = previous ? monthSum('income', previous.from, previous.to) : 0
  const prevExpense = previous ? monthSum('expense', previous.from, previous.to) : 0

  const delta = (now: number, before: number) => {
    if (!before) return null
    return ((now - before) / before) * 100
  }

  const capitalSeries = months.map((month, index) => {
    const after = months
      .slice(index + 1)
      .reduce((sum, item) => sum + flow(item.from, item.to), 0)
    return { label: month.label, value: Math.round(capital - after) }
  })

  const barsData = months.map((month) => ({
    label: month.label,
    income: Math.round(monthSum('income', month.from, month.to)),
    expense: Math.round(monthSum('expense', month.from, month.to)),
  }))

  const walletRows = wallets
    .map((wallet) => ({
      wallet,
      balance: walletBalance(wallet, poEntries),
      inBase: convert(walletBalance(wallet, poEntries), wallet.currency),
    }))
    .sort((a, b) => b.inBase - a.inBase)

  const po = poStats(poEntries)

  type FeedRow = {
    id: string
    date: string
    title: string
    subtitle: string
    type: string
    amount: React.ReactNode
    tone: 'income' | 'expense' | 'brand' | 'warn'
  }

  const feed: FeedRow[] = [
    ...transactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      title: tx.category,
      subtitle: walletName(wallets, tx.walletId),
      type: tx.kind === 'income' ? 'Доход' : 'Расход',
      amount: <Amount value={tx.amount} currency={tx.currency} kind={tx.kind} />,
      tone: (tx.kind === 'income' ? 'income' : 'expense') as FeedRow['tone'],
    })),
    ...transfers.map((transfer) => ({
      id: transfer.id,
      date: transfer.date,
      title: 'Перевод',
      subtitle: `${walletName(wallets, transfer.fromWalletId)} → ${walletName(wallets, transfer.toWalletId)}`,
      type: 'Перевод',
      amount: <span className="num font-medium">{formatMoney(transfer.amountFrom, transfer.currencyFrom)}</span>,
      tone: 'brand' as FeedRow['tone'],
    })),
    ...poEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      title: PO_LABELS[entry.kind],
      subtitle: 'Pocket Option',
      type: 'Pocket Option',
      amount: (
        <Amount
          value={entry.amount}
          currency="USD"
          kind={entry.kind === 'profit' ? 'income' : entry.kind === 'loss' ? 'expense' : 'neutral'}
        />
      ),
      tone: (entry.kind === 'profit' ? 'income' : entry.kind === 'loss' ? 'expense' : 'brand') as FeedRow['tone'],
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 6)

  const incomeDelta = delta(income, prevIncome)
  const expenseDelta = delta(expense, prevExpense)

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">Главная панель</h1>
          <p className="mt-1 text-sm text-muted">
            Общий капитал, движение средств и последние операции
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="success" size="sm" onClick={() => setDialog('income')}>
            + Доход
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDialog('expense')}>
            + Расход
          </Button>
          <Button variant="outline" size="sm" icon={ArrowLeftRight} onClick={() => setDialog('transfer')}>
            Перевод
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Общий капитал"
          value={formatMoney(capital, base)}
          hint={`Все кошельки в ${base} по демо-курсам`}
          icon={Coins}
          tone="brand"
        />
        <StatCard
          label={`Доходы · ${monthLabel(current.key, true)}`}
          value={formatMoney(income, base)}
          hint={
            incomeDelta === null
              ? 'Нет данных за прошлый месяц'
              : `${incomeDelta >= 0 ? '+' : ''}${incomeDelta.toFixed(1)}% к прошлому месяцу`
          }
          icon={TrendingUp}
          tone="income"
        />
        <StatCard
          label={`Расходы · ${monthLabel(current.key, true)}`}
          value={formatMoney(expense, base)}
          hint={
            expenseDelta === null
              ? 'Нет данных за прошлый месяц'
              : `${expenseDelta >= 0 ? '+' : ''}${expenseDelta.toFixed(1)}% к прошлому месяцу`
          }
          icon={TrendingDown}
          tone="expense"
        />
        <StatCard
          label="Чистый поток за месяц"
          value={formatMoney(income - expense, base)}
          hint={`Переводы между кошельками не учитываются`}
          icon={ArrowLeftRight}
          tone={income - expense >= 0 ? 'income' : 'expense'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Динамика капитала"
          subtitle="Последние 6 месяцев, в основной валюте"
          action={
            <Badge tone="neutral">
              <ArrowUpRight size={12} /> {formatMoney(capital, base)}
            </Badge>
          }
        >
          <AreaTrendChart data={capitalSeries} dataKey="value" currency={base} height={252} name="Капитал" />
        </ChartCard>

        <Panel className="flex flex-col">
          <PanelHeader
            title="Pocket Option"
            subtitle="Ручной учёт торговли"
            action={
              <Link to="/pocket-option" className="text-xs font-medium text-brand hover:underline">
                Открыть
              </Link>
            }
          />
          <div className="flex flex-1 flex-col gap-4 px-5 py-4">
            <div>
              <p className="text-xs text-muted">Баланс платформы</p>
              <p className="num mt-1 text-2xl font-semibold">{formatMoney(po.balance, 'USD')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[11px] text-muted">Торговая прибыль</p>
                <p className="num mt-1 text-sm font-semibold text-income">{formatMoney(po.profit, 'USD')}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[11px] text-muted">Торговый убыток</p>
                <p className="num mt-1 text-sm font-semibold text-expense">{formatMoney(po.loss, 'USD')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Чистый торговый результат</span>
                <span className="num">{formatMoney(po.net, 'USD')}</span>
              </div>
              <div className="mt-2">
                <Progress value={po.winRate} tone="income" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Доля прибыльных сделок: {po.winRate.toFixed(0)}%
              </p>
            </div>
            <p className="mt-auto text-[11px] leading-relaxed text-muted">
              Все записи вводятся вручную. Автоматической синхронизации с платформой нет.
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Доходы и расходы" subtitle="По месяцам, в основной валюте">
          <GroupedBarsChart
            data={barsData}
            currency={base}
            height={252}
            series={[
              { key: 'income', name: 'Доходы', color: palette.income },
              { key: 'expense', name: 'Расходы', color: palette.expense },
            ]}
          />
        </ChartCard>

        <Panel>
          <PanelHeader
            title="Балансы кошельков"
            subtitle={`${wallets.length} кошельков · ${base}`}
            action={
              <Link to="/wallets" className="text-xs font-medium text-brand hover:underline">
                Все кошельки
              </Link>
            }
          />
          <div className="space-y-3 px-5 py-4">
            {walletRows.map(({ wallet, balance, inBase }) => (
              <div key={wallet.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <WalletKindIcon kind={wallet.kind} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{wallet.name}</p>
                    <p className="num shrink-0 text-sm font-medium">{formatMoney(balance, wallet.currency)}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={capital > 0 ? (inBase / capital) * 100 : 0} />
                    <span className="num shrink-0 text-[11px] text-muted">
                      {capital > 0 ? ((inBase / capital) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {walletRows.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">Пока нет ни одного кошелька</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader
          title="Последние операции"
          subtitle="Доходы, расходы, переводы и Pocket Option"
          action={
            <Link to="/operations" className="text-xs font-medium text-brand hover:underline">
              Все операции
            </Link>
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead className="border-y border-line bg-surface-2/60">
              <tr>
                <th className={thClass}>Дата</th>
                <th className={thClass}>Операция</th>
                <th className={thClass}>Кошелёк</th>
                <th className={thClass}>Тип</th>
                <th className={`${thClass} text-right`}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {feed.map((row) => (
                <tr key={row.id} className="border-b border-line/70 last:border-0">
                  <td className={`${tdClass} num text-muted`}>{formatDateShort(row.date)}</td>
                  <td className={tdClass}>{row.title}</td>
                  <td className={`${tdClass} text-muted`}>{row.subtitle}</td>
                  <td className={tdClass}>
                    <Badge tone={row.tone}>{row.type}</Badge>
                  </td>
                  <td className={`${tdClass} text-right`}>{row.amount}</td>
                </tr>
              ))}
              {feed.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted">
                    Операций пока нет — добавьте доход или расход
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <TxDialog open={dialog === 'income'} onClose={() => setDialog(null)} kind="income" />
      <TxDialog open={dialog === 'expense'} onClose={() => setDialog(null)} kind="expense" />
      <TransferDialog open={dialog === 'transfer'} onClose={() => setDialog(null)} />
    </>
  )
}
