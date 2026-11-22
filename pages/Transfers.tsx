import * as React from 'react'
import { ArrowLeftRight, ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  formatDate,
  formatMoney,
  inRange,
  presetRange,
  toBase,
  useFinance,
  walletName,
  type Transfer,
} from '@/lib/finance'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  Segmented,
  StatCard,
  tdClass,
  thClass,
} from '@/components/ui'
import { TransferDialog } from '@/components/forms'

const PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 месяца' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
] as const

export default function Transfers() {
  const transfers = useFinance((s) => s.transfers)
  const wallets = useFinance((s) => s.wallets)
  const settings = useFinance((s) => s.settings)
  const deleteTransfer = useFinance((s) => s.deleteTransfer)

  const [preset, setPreset] = React.useState<(typeof PERIODS)[number]['value']>('quarter')
  const [walletFilter, setWalletFilter] = React.useState('all')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Transfer | null>(null)
  const [deleting, setDeleting] = React.useState<Transfer | null>(null)

  const base = settings.baseCurrency
  const range = presetRange(preset)

  const filtered = transfers
    .filter((transfer) => {
      if (!inRange(transfer.date, range.from, range.to)) return false
      if (
        walletFilter !== 'all' &&
        transfer.fromWalletId !== walletFilter &&
        transfer.toWalletId !== walletFilter
      )
        return false
      return true
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const total = filtered.reduce(
    (sum, transfer) => sum + toBase(transfer.amountFrom, transfer.currencyFrom, base, settings.rates),
    0,
  )
  const crossCurrency = filtered.filter((transfer) => transfer.currencyFrom !== transfer.currencyTo).length

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (transfer: Transfer) => {
    setEditing(transfer)
    setDialogOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Переводы"
        subtitle="Перемещение средств между собственными кошельками, включая конвертацию"
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate} disabled={wallets.length < 2}>
            Новый перевод
          </Button>
        }
      />

      {wallets.length < 2 && (
        <Panel className="mb-4 p-4 text-sm text-muted">
          Для перевода нужно минимум два кошелька. Добавьте их в разделе «Мои кошельки».
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Переводов за период"
          value={String(filtered.length)}
          hint={`${formatDate(range.from)} — ${formatDate(range.to)}`}
          icon={ArrowLeftRight}
          tone="brand"
        />
        <StatCard
          label="Общая сумма"
          value={formatMoney(total, base)}
          hint={`В пересчёте на ${base}`}
          icon={ArrowRight}
          tone="neutral"
        />
        <StatCard
          label="Средний перевод"
          value={formatMoney(filtered.length ? total / filtered.length : 0, base)}
          hint="Без учёта доходов и расходов"
          icon={ArrowRight}
          tone="warn"
        />
        <StatCard
          label="С конвертацией"
          value={String(crossCurrency)}
          hint="Переводы между разными валютами"
          icon={ArrowLeftRight}
          tone="income"
        />
      </div>

      <Panel className="mt-4">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <select
            className="field-text h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25 sm:w-56"
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
          <Segmented
            value={preset}
            onChange={setPreset}
            options={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
            className="sm:ml-auto"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-surface-2/60">
              <tr className="border-b border-line">
                <th className={thClass}>Дата</th>
                <th className={thClass}>Откуда</th>
                <th className={thClass}>Куда</th>
                <th className={`${thClass} text-right`}>Списано</th>
                <th className={`${thClass} text-right`}>Зачислено</th>
                <th className={thClass}>Комментарий</th>
                <th className={`${thClass} text-right`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((transfer) => (
                <tr key={transfer.id} className="border-b border-line/70 transition hover:bg-surface-2/40 last:border-0">
                  <td className={`${tdClass} num text-muted`}>{formatDate(transfer.date)}</td>
                  <td className={tdClass}>{walletName(wallets, transfer.fromWalletId)}</td>
                  <td className={tdClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowRight size={13} className="text-muted" />
                      {walletName(wallets, transfer.toWalletId)}
                    </span>
                  </td>
                  <td className={`${tdClass} num text-right`}>
                    {formatMoney(transfer.amountFrom, transfer.currencyFrom)}
                  </td>
                  <td className={`${tdClass} num text-right`}>
                    <span className="inline-flex items-center justify-end gap-2">
                      {transfer.currencyFrom !== transfer.currencyTo && <Badge tone="brand">конвертация</Badge>}
                      {formatMoney(transfer.amountTo, transfer.currencyTo)}
                    </span>
                  </td>
                  <td className={`${tdClass} max-w-[220px] truncate text-muted`}>{transfer.comment || '—'}</td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-0.5">
                      <IconButton label="Редактировать перевод" icon={Pencil} onClick={() => openEdit(transfer)} />
                      <IconButton
                        label="Удалить перевод"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setDeleting(transfer)}
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
            title="Переводов нет"
            description="Переводы не меняют доходы и расходы: они только перемещают средства между кошельками."
            action={
              wallets.length >= 2 ? (
                <Button variant="primary" icon={Plus} onClick={openCreate}>
                  Создать перевод
                </Button>
              ) : undefined
            }
          />
        )}

        <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-muted">
          Переводы между собственными кошельками не учитываются как доходы или расходы. При переводе
          между разными валютами сумма зачисления рассчитывается по демо-курсам из настроек и может
          быть скорректирована вручную.
        </p>
      </Panel>

      <TransferDialog open={dialogOpen} onClose={() => setDialogOpen(false)} transfer={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить перевод?"
        description={
          deleting
            ? `${walletName(wallets, deleting.fromWalletId)} → ${walletName(wallets, deleting.toWalletId)} · ${formatMoney(
                deleting.amountFrom,
                deleting.currencyFrom,
              )}`
            : undefined
        }
        onConfirm={() => deleting && deleteTransfer(deleting.id)}
      />
    </>
  )
}
