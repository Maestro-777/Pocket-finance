import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  History as HistoryIcon,
  Info,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import {
  CURRENCIES,
  DEFAULT_RATES,
  WALLET_KINDS,
  formatDate,
  formatDateTime,
  formatMoney,
  inRange,
  poStats,
  presetRange,
  todayISO,
  toBase,
  totalCapital,
  useFinance,
  walletBalance,
  walletName,
  type CurrencyCode,
  type HistoryAction,
  type ThemeMode,
} from '@/lib/finance'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  Segmented,
  inputClass,
  tdClass,
  thClass,
} from '@/components/ui'

/* ─────────────────────────  История изменений  ───────────────────────── */

const ACTION_LABEL: Record<HistoryAction, string> = {
  create: 'Добавление',
  update: 'Изменение',
  delete: 'Удаление',
  settings: 'Настройки',
  reset: 'Сброс',
}

const ACTION_TONE = {
  create: 'income',
  update: 'brand',
  delete: 'expense',
  settings: 'neutral',
  reset: 'warn',
} as const

export function HistoryPage() {
  const history = useFinance((s) => s.history)
  const [action, setAction] = React.useState<'all' | HistoryAction>('all')
  const [search, setSearch] = React.useState('')

  const rows = history.filter((entry) => {
    if (action !== 'all' && entry.action !== action) return false
    if (search) {
      const haystack = `${entry.title} ${entry.entity} ${entry.details ?? ''}`.toLowerCase()
      if (!haystack.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <>
      <PageHeader
        title="История изменений"
        subtitle="Журнал действий с кошельками, операциями, переводами и настройками"
      />

      <Panel>
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Поиск по журналу"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Поиск по истории"
            />
          </div>
          <Segmented
            value={action}
            onChange={setAction}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'create', label: 'Добавления' },
              { value: 'update', label: 'Изменения' },
              { value: 'delete', label: 'Удаления' },
              { value: 'settings', label: 'Настройки' },
              { value: 'reset', label: 'Сброс' },
            ]}
            className="sm:ml-auto"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-surface-2/60">
              <tr className="border-b border-line">
                <th className={thClass}>Дата и время</th>
                <th className={thClass}>Действие</th>
                <th className={thClass}>Раздел</th>
                <th className={thClass}>Описание</th>
                <th className={thClass}>Детали</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id} className="border-b border-line/70 last:border-0">
                  <td className={`${tdClass} num text-muted`}>{formatDateTime(entry.at)}</td>
                  <td className={tdClass}>
                    <Badge tone={ACTION_TONE[entry.action]}>{ACTION_LABEL[entry.action]}</Badge>
                  </td>
                  <td className={`${tdClass} text-muted`}>{entry.entity}</td>
                  <td className={tdClass}>{entry.title}</td>
                  <td className={`${tdClass} text-muted`}>{entry.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <EmptyState
            title="Записей нет"
            description="Журнал заполняется автоматически при добавлении, изменении и удалении записей."
          />
        )}

        <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-[11px] leading-relaxed text-muted">
          <Info size={13} className="mt-0.5 shrink-0" />
          В демонстрационной версии журнал хранится только в этом браузере и содержит последние
          действия, выполненные в интерфейсе.
        </p>
      </Panel>
    </>
  )
}

/* ─────────────────────────  Экспорт данных  ───────────────────────── */

type Dataset = 'transactions' | 'wallets' | 'transfers' | 'po'
type Format = 'csv' | 'xls'

const DATASETS: { value: Dataset; label: string }[] = [
  { value: 'transactions', label: 'Доходы и расходы' },
  { value: 'wallets', label: 'Кошельки' },
  { value: 'transfers', label: 'Переводы' },
  { value: 'po', label: 'Pocket Option' },
]

const PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 месяца' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
] as const

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

export function ExportPage() {
  const transactions = useFinance((s) => s.transactions)
  const wallets = useFinance((s) => s.wallets)
  const transfers = useFinance((s) => s.transfers)
  const poEntries = useFinance((s) => s.poEntries)
  const settings = useFinance((s) => s.settings)

  const [dataset, setDataset] = React.useState<Dataset>('transactions')
  const [preset, setPreset] = React.useState<(typeof PERIODS)[number]['value']>('quarter')
  const [format, setFormat] = React.useState<Format>('csv')
  const [done, setDone] = React.useState('')

  const base = settings.baseCurrency
  const range = presetRange(preset)
  const inPeriod = (date: string) => inRange(date, range.from, range.to)

  const table = React.useMemo(() => {
    if (dataset === 'transactions') {
      const rows = transactions
        .filter((tx) => inPeriod(tx.date))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((tx) => [
          formatDate(tx.date),
          tx.kind === 'income' ? 'Доход' : 'Расход',
          tx.category,
          walletName(wallets, tx.walletId),
          tx.currency,
          tx.amount,
          tx.comment ?? '',
        ])
      return {
        headers: ['Дата', 'Тип', 'Категория', 'Кошелёк', 'Валюта', 'Сумма', 'Комментарий'],
        rows,
      }
    }
    if (dataset === 'wallets') {
      const rows = wallets.map((wallet) => [
        wallet.name,
        WALLET_KINDS.find((kind) => kind.value === wallet.kind)?.label ?? '',
        wallet.currency,
        walletBalance(wallet, poEntries),
        toBase(walletBalance(wallet, poEntries), wallet.currency, base, settings.rates).toFixed(2),
      ])
      return { headers: ['Название', 'Тип', 'Валюта', 'Баланс', `Баланс в ${base}`], rows }
    }
    if (dataset === 'transfers') {
      const rows = transfers
        .filter((transfer) => inPeriod(transfer.date))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((transfer) => [
          formatDate(transfer.date),
          walletName(wallets, transfer.fromWalletId),
          walletName(wallets, transfer.toWalletId),
          transfer.currencyFrom,
          transfer.amountFrom,
          transfer.currencyTo,
          transfer.amountTo,
          transfer.comment ?? '',
        ])
      return {
        headers: [
          'Дата',
          'Откуда',
          'Куда',
          'Валюта списания',
          'Сумма списания',
          'Валюта зачисления',
          'Сумма зачисления',
          'Комментарий',
        ],
        rows,
      }
    }
    const rows = poEntries
      .filter((entry) => inPeriod(entry.date))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((entry) => [
        formatDate(entry.date),
        entry.kind === 'profit'
          ? 'Торговая прибыль'
          : entry.kind === 'loss'
            ? 'Торговый убыток'
            : entry.kind === 'deposit'
              ? 'Пополнение'
              : 'Вывод',
        entry.amount,
        entry.comment ?? '',
      ])
    return { headers: ['Дата', 'Тип', 'Сумма (USD)', 'Комментарий'], rows }
  }, [dataset, transactions, wallets, transfers, poEntries, settings.rates, base, preset])

  const po = poStats(poEntries)

  const handleDownload = () => {
    const stamp = todayISO()
    const filename = `pocket-finance-${dataset}-${stamp}.${format}`
    if (format === 'csv') {
      const content = [table.headers, ...table.rows]
        .map((row) => row.map(escapeCsv).join(';'))
        .join('\r\n')
      download(filename, `\uFEFF${content}`, 'text/csv;charset=utf-8')
    } else {
      const head = table.headers.map((header) => `<th>${header}</th>`).join('')
      const body = table.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${String(cell)}</td>`).join('')}</tr>`)
        .join('')
      const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
      download(filename, html, 'application/vnd.ms-excel;charset=utf-8')
    }
    setDone(filename)
  }

  return (
    <>
      <PageHeader
        title="Экспорт данных"
        subtitle="Выгрузка операций, кошельков, переводов и записей Pocket Option"
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-1">
          <PanelHeader title="Параметры выгрузки" subtitle="Выберите данные, период и формат" />
          <div className="space-y-3 px-5 py-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Данные</span>
              <select
                className={inputClass}
                value={dataset}
                onChange={(event) => setDataset(event.target.value as Dataset)}
              >
                {DATASETS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted">Период</span>
              <Segmented
                value={preset}
                onChange={setPreset}
                options={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
                className="w-full"
              />
              <p className="mt-2 text-[11px] text-muted">
                {formatDate(range.from)} — {formatDate(range.to)}
              </p>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted">Формат</span>
              <Segmented
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'xls', label: 'Excel (XLS)' },
                ]}
                className="w-full"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                CSV подходит для таблиц и импорта, XLS открывается в Excel. Суммы выгружаются в
                исходных валютах.
              </p>
            </div>

            <Button variant="primary" icon={Download} className="w-full" onClick={handleDownload}>
              Скачать файл
            </Button>
            {done && (
              <p className="flex items-center gap-1.5 text-[11px] text-income">
                <Check size={13} /> Файл {done} сформирован
              </p>
            )}
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Предпросмотр"
            subtitle={`${table.rows.length} строк · ${table.headers.length} столбцов`}
            action={
              <Badge tone={format === 'csv' ? 'brand' : 'income'}>
                {format === 'csv' ? <FileText size={12} /> : <FileSpreadsheet size={12} />}
                {format === 'csv' ? 'CSV' : 'Excel'}
              </Badge>
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-y border-line bg-surface-2/60">
                <tr>
                  {table.headers.map((header) => (
                    <th key={header} className={thClass}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.slice(0, 8).map((row, index) => (
                  <tr key={index} className="border-b border-line/70 last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className={`${tdClass} ${cellIndex === 0 ? 'num text-muted' : ''}`}>
                        {String(cell) || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.rows.length === 0 && (
            <EmptyState
              title="Нет данных за период"
              description="Измените период или добавьте записи, чтобы сформировать файл."
            />
          )}
          <p className="border-t border-line px-4 py-3 text-[11px] text-muted">
            Pocket Option: баланс {formatMoney(po.balance, 'USD')}, чистый результат{' '}
            {formatMoney(po.net, 'USD')}. Файл экспорта формируется локально в браузере.
          </p>
        </Panel>
      </div>
    </>
  )
}

/* ─────────────────────────  Настройки  ───────────────────────── */

export function SettingsPage() {
  const settings = useFinance((s) => s.settings)
  const wallets = useFinance((s) => s.wallets)
  const poEntries = useFinance((s) => s.poEntries)
  const transactions = useFinance((s) => s.transactions)
  const setBaseCurrency = useFinance((s) => s.setBaseCurrency)
  const setTheme = useFinance((s) => s.setTheme)
  const setRate = useFinance((s) => s.setRate)
  const resetDemo = useFinance((s) => s.resetDemo)

  const [draft, setDraft] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(CURRENCIES.map((currency) => [currency.code, String(settings.rates[currency.code])])),
  )
  const [resetOpen, setResetOpen] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    setDraft(
      Object.fromEntries(CURRENCIES.map((currency) => [currency.code, String(settings.rates[currency.code])])),
    )
  }, [settings.rates])

  const capital = totalCapital({ wallets, poEntries, settings })

  const saveRates = () => {
    CURRENCIES.forEach((currency) => {
      if (currency.code === 'USD') return
      const value = Number(draft[currency.code].replace(',', '.'))
      if (Number.isFinite(value) && value > 0) setRate(currency.code, value)
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>
      <PageHeader title="Настройки" subtitle="Основная валюта, тема, курсы пересчёта и управление данными" />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-1">
          <PanelHeader title="Интерфейс" subtitle="Основная валюта и оформление" />
          <div className="space-y-4 px-5 py-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Основная валюта</span>
              <select
                className={inputClass}
                value={settings.baseCurrency}
                onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-muted">
                В этой валюте считается общий капитал и итоги статистики.
              </span>
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted">Тема оформления</span>
              <Segmented
                value={settings.theme}
                onChange={(value) => setTheme(value as ThemeMode)}
                options={[
                  { value: 'dark', label: 'Тёмная' },
                  { value: 'light', label: 'Светлая' },
                ]}
                className="w-full"
              />
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-[11px] text-muted">Итоговый капитал</p>
              <p className="num mt-1 text-lg font-semibold">{formatMoney(capital, settings.baseCurrency)}</p>
              <p className="mt-1 text-[11px] text-muted">
                {wallets.length} кошельков · {transactions.length} операций
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Курсы пересчёта"
            subtitle="Демонстрационные курсы: 1 единица валюты в долларах США"
            action={
              <Button variant="primary" size="sm" icon={Check} onClick={saveRates}>
                Сохранить курсы
              </Button>
            }
          />
          <div className="px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {CURRENCIES.map((currency) => (
                <label key={currency.code} className="flex items-center gap-3">
                  <span className="w-24 shrink-0">
                    <span className="block text-xs font-medium">{currency.code}</span>
                    <span className="block text-[11px] text-muted">{currency.label}</span>
                  </span>
                  <input
                    className={inputClass}
                    value={draft[currency.code] ?? ''}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, [currency.code]: event.target.value }))
                    }
                    inputMode="decimal"
                    disabled={currency.code === 'USD'}
                    aria-label={`Курс ${currency.code}`}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setDraft(Object.fromEntries(CURRENCIES.map((c) => [c.code, String(DEFAULT_RATES[c.code])])))
                }}
              >
                Значения по умолчанию
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-[11px] text-income">
                  <Check size={13} /> Курсы обновлены
                </span>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Курсы не загружаются с биржи или банка — это демонстрационные значения для пересчёта
              капитала и переводов между разными валютами.
            </p>
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <PanelHeader title="Данные" subtitle="Облачное хранилище аккаунта" />
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm">Все изменения автоматически сохраняются в облаке</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Данные привязаны к аккаунту и синхронизируются через облако. Демо-набор можно загрузить вручную — он заменит текущие записи.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/export"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 text-xs font-medium transition hover:border-brand/60 hover:text-brand"
              >
                <Download size={14} /> Экспорт
              </Link>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setResetOpen(true)}>
                Загрузить демо-данные
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <div className="flex flex-col gap-2 px-5 py-4 text-[11px] leading-relaxed text-muted sm:flex-row sm:items-center">
            <HistoryIcon size={14} className="shrink-0" />
            <p>
              Журнал действий доступен в разделе{' '}
              <Link to="/history" className="text-brand hover:underline">
                История изменений
              </Link>
              . Pocket Option и финансовые сервисы не подключены — все данные вводятся вручную.
            </p>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Загрузить демо-данные?"
        description="Текущие кошельки, операции, переводы и записи Pocket Option будут заменены демонстрационным набором. Это действие синхронизируется с облаком."
        confirmLabel="Загрузить демо-данные"
        onConfirm={() => { resetDemo(); setResetOpen(false) }}
      />
    </>
  )
}
