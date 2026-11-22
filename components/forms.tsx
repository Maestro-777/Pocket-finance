import * as React from 'react'
import { ArrowRight } from 'lucide-react'
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PO_KINDS,
  WALLET_KINDS,
  convert,
  formatMoney,
  todayISO,
  useFinance,
  walletCurrency,
  type CurrencyCode,
  type PoEntry,
  type PoKind,
  type Transfer,
  type Tx,
  type TxKind,
  type Wallet,
  type WalletKind,
} from '@/lib/finance'
import { Button, Field, Modal, inputClass } from '@/components/ui'

const parseAmount = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.'))

/* ─────────────────────────  Кошелёк  ───────────────────────── */

export function WalletDialog({
  open,
  onClose,
  wallet,
}: {
  open: boolean
  onClose: () => void
  wallet?: Wallet | null
}) {
  const wallets = useFinance((s) => s.wallets)
  const addWallet = useFinance((s) => s.addWallet)
  const updateWallet = useFinance((s) => s.updateWallet)

  const [name, setName] = React.useState('')
  const [kind, setKind] = React.useState<WalletKind>('bank_card')
  const [currency, setCurrency] = React.useState<CurrencyCode>('RUB')
  const [balance, setBalance] = React.useState('0')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setName(wallet?.name ?? '')
    setKind(wallet?.kind ?? 'bank_card')
    setCurrency(wallet?.currency ?? 'RUB')
    setBalance(wallet ? String(wallet.balance) : '0')
    setError('')
  }, [open, wallet])

  const isPocketOption = kind === 'pocket_option'

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    const value = isPocketOption ? 0 : parseAmount(balance)
    if (!trimmed) {
      setError('Укажите название кошелька')
      return
    }
    if (!Number.isFinite(value) || value < 0) {
      setError('Баланс должен быть положительным числом')
      return
    }
    const payload = { name: trimmed, kind, currency, balance: value }
    if (wallet) updateWallet(wallet.id, payload)
    else addWallet(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={wallet ? 'Редактировать кошелёк' : 'Новый кошелёк'}
      description="Название, тип, валюта и текущий баланс"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Отмена
          </Button>
          <Button variant="primary" type="submit" form="wallet-form">
            {wallet ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <form id="wallet-form" onSubmit={submit} className="space-y-3">
        <Field label="Название">
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Карта •• 1234"
            autoFocus
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Тип кошелька">
            <select
              className={inputClass}
              value={kind}
              onChange={(event) => setKind(event.target.value as WalletKind)}
            >
              {WALLET_KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Валюта">
            <select
              className={inputClass}
              value={currency}
              onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
            >
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Текущий баланс"
          hint={
            isPocketOption
              ? 'Баланс Pocket Option формируется из записей раздела Pocket Option.'
              : 'Сумма в валюте кошелька'
          }
        >
          <input
            className={inputClass}
            value={isPocketOption ? '' : balance}
            onChange={(event) => setBalance(event.target.value)}
            inputMode="decimal"
            placeholder="0"
            disabled={isPocketOption}
          />
        </Field>
        {wallets.length === 0 && !wallet && (
          <p className="text-xs text-muted">Это будет первый кошелёк в системе.</p>
        )}
        {error && <p className="text-xs text-expense">{error}</p>}
      </form>
    </Modal>
  )
}

/* ─────────────────────────  Доход и расход  ───────────────────────── */

export function TxDialog({
  open,
  onClose,
  kind,
  tx,
}: {
  open: boolean
  onClose: () => void
  kind: TxKind
  tx?: Tx | null
}) {
  const wallets = useFinance((s) => s.wallets)
  const addTx = useFinance((s) => s.addTx)
  const updateTx = useFinance((s) => s.updateTx)

  const activeKind = tx?.kind ?? kind
  const categories = activeKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const [amount, setAmount] = React.useState('')
  const [walletId, setWalletId] = React.useState('')
  const [category, setCategory] = React.useState(categories[0])
  const [date, setDate] = React.useState(todayISO())
  const [comment, setComment] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    const list = tx?.kind === 'income' ? INCOME_CATEGORIES : tx?.kind === 'expense' ? EXPENSE_CATEGORIES : categories
    setAmount(tx ? String(tx.amount) : '')
    setWalletId(tx?.walletId ?? wallets[0]?.id ?? '')
    setCategory(tx?.category ?? list[0])
    setDate(tx?.date ?? todayISO())
    setComment(tx?.comment ?? '')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tx])

  const currency = walletId ? walletCurrency(wallets, walletId) : 'RUB'
  const value = parseAmount(amount)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!walletId) {
      setError('Выберите кошелёк')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введите сумму больше нуля')
      return
    }
    if (!date) {
      setError('Укажите дату операции')
      return
    }
    const payload = {
      kind: activeKind,
      amount: value,
      walletId,
      category,
      date,
      comment: comment.trim() || undefined,
      currency,
    }
    if (tx) updateTx(tx.id, payload)
    else addTx(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tx ? 'Редактировать запись' : activeKind === 'income' ? 'Новый доход' : 'Новый расход'}
      description="Сумма указывается в валюте выбранного кошелька"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form="tx-form">
            {tx ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-3">
        <Field label="Сумма" hint={walletId ? `Валюта: ${currency}` : undefined}>
          <input
            className={inputClass}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            autoFocus
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Кошелёк">
            <select
              className={inputClass}
              value={walletId}
              onChange={(event) => setWalletId(event.target.value)}
            >
              {wallets.length === 0 && <option value="">Нет кошельков</option>}
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({wallet.currency})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Категория">
            <select
              className={inputClass}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Дата">
          <input
            type="date"
            className={inputClass}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Комментарий" hint="Необязательно">
          <input
            className={inputClass}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например, продукты на неделю"
          />
        </Field>
        {error && <p className="text-xs text-expense">{error}</p>}
      </form>
    </Modal>
  )
}

/* ─────────────────────────  Перевод  ───────────────────────── */

export function TransferDialog({
  open,
  onClose,
  transfer,
}: {
  open: boolean
  onClose: () => void
  transfer?: Transfer | null
}) {
  const wallets = useFinance((s) => s.wallets)
  const rates = useFinance((s) => s.settings.rates)
  const addTransfer = useFinance((s) => s.addTransfer)
  const updateTransfer = useFinance((s) => s.updateTransfer)

  const [fromId, setFromId] = React.useState('')
  const [toId, setToId] = React.useState('')
  const [amountFrom, setAmountFrom] = React.useState('')
  const [amountTo, setAmountTo] = React.useState('')
  const [date, setDate] = React.useState(todayISO())
  const [comment, setComment] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setFromId(transfer?.fromWalletId ?? wallets[0]?.id ?? '')
    setToId(transfer?.toWalletId ?? wallets[1]?.id ?? '')
    setAmountFrom(transfer ? String(transfer.amountFrom) : '')
    setAmountTo(transfer ? String(transfer.amountTo) : '')
    setDate(transfer?.date ?? todayISO())
    setComment(transfer?.comment ?? '')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transfer])

  const fromCurrency: CurrencyCode = fromId ? walletCurrency(wallets, fromId) : 'RUB'
  const toCurrency: CurrencyCode = toId ? walletCurrency(wallets, toId) : 'RUB'
  const sameCurrency = fromCurrency === toCurrency
  const source = parseAmount(amountFrom)

  React.useEffect(() => {
    if (!open) return
    if (transfer) return
    if (!Number.isFinite(source) || source <= 0) return
    if (sameCurrency) {
      setAmountTo(String(source))
      return
    }
    setAmountTo(convert(source, fromCurrency, toCurrency, rates).toFixed(2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, fromCurrency, toCurrency, sameCurrency, open])

  const rateHint = sameCurrency
    ? 'Валюты совпадают, конвертация не нужна'
    : `Курс: 1 ${fromCurrency} = ${convert(1, fromCurrency, toCurrency, rates).toLocaleString('ru-RU', {
        maximumFractionDigits: 4,
      })} ${toCurrency}`

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!fromId || !toId) {
      setError('Выберите кошельки отправления и получения')
      return
    }
    if (fromId === toId) {
      setError('Кошельки должны различаться')
      return
    }
    if (!Number.isFinite(source) || source <= 0) {
      setError('Введите сумму больше нуля')
      return
    }
    const target = parseAmount(amountTo)
    if (!Number.isFinite(target) || target <= 0) {
      setError('Укажите сумму зачисления')
      return
    }
    const payload = {
      fromWalletId: fromId,
      toWalletId: toId,
      amountFrom: source,
      amountTo: target,
      currencyFrom: fromCurrency,
      currencyTo: toCurrency,
      date,
      comment: comment.trim() || undefined,
    }
    if (transfer) updateTransfer(transfer.id, payload)
    else addTransfer(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transfer ? 'Редактировать перевод' : 'Новый перевод'}
      description="Переводы между своими кошельками не меняют доходы и расходы"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form="transfer-form">
            {transfer ? 'Сохранить' : 'Перевести'}
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Откуда">
            <select
              className={inputClass}
              value={fromId}
              onChange={(event) => setFromId(event.target.value)}
            >
              {wallets.length === 0 && <option value="">Нет кошельков</option>}
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({wallet.currency})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Куда">
            <select
              className={inputClass}
              value={toId}
              onChange={(event) => setToId(event.target.value)}
            >
              {wallets.length === 0 && <option value="">Нет кошельков</option>}
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({wallet.currency})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Сумма списания" hint={`${fromCurrency}`}>
            <input
              className={inputClass}
              value={amountFrom}
              onChange={(event) => setAmountFrom(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
          <Field label="Сумма зачисления" hint={rateHint}>
            <input
              className={inputClass}
              value={amountTo}
              onChange={(event) => setAmountTo(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
        </div>
        <Field label="Дата">
          <input
            type="date"
            className={inputClass}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Комментарий" hint="Необязательно">
          <input
            className={inputClass}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например, пополнение резерва"
          />
        </Field>
        {error && <p className="text-xs text-expense">{error}</p>}
      </form>
    </Modal>
  )
}

/* ─────────────────────────  Pocket Option  ───────────────────────── */

export function PoEntryDialog({
  open,
  onClose,
  entry,
}: {
  open: boolean
  onClose: () => void
  entry?: PoEntry | null
}) {
  const addPo = useFinance((s) => s.addPo)
  const updatePo = useFinance((s) => s.updatePo)

  const [kind, setKind] = React.useState<PoKind>('deposit')
  const [amount, setAmount] = React.useState('')
  const [date, setDate] = React.useState(todayISO())
  const [comment, setComment] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setKind(entry?.kind ?? 'deposit')
    setAmount(entry ? String(entry.amount) : '')
    setDate(entry?.date ?? todayISO())
    setComment(entry?.comment ?? '')
    setError('')
  }, [open, entry])

  const value = parseAmount(amount)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введите сумму больше нуля')
      return
    }
    const payload = { kind, amount: value, date, comment: comment.trim() || undefined }
    if (entry) updatePo(entry.id, payload)
    else addPo(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Редактировать запись' : 'Новая запись Pocket Option'}
      description="Данные вводятся вручную, платформа не подключается"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form="po-form">
            {entry ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <form id="po-form" onSubmit={submit} className="space-y-3">
        <Field label="Тип операции">
          <select
            className={inputClass}
            value={kind}
            onChange={(event) => setKind(event.target.value as PoKind)}
          >
            {PO_KINDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Сумма" hint="Доллар США">
            <input
              className={inputClass}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
          <Field label="Дата">
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Комментарий" hint="Необязательно">
          <input
            className={inputClass}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например, пополнение с карты"
          />
        </Field>
        {error && <p className="text-xs text-expense">{error}</p>}
      </form>
    </Modal>
  )
}

/* ─────────────────────────  Быстрые действия  ───────────────────────── */

export function QuickActions({
  className,
  onIncome,
  onExpense,
  onTransfer,
}: {
  className?: string
  onIncome: () => void
  onExpense: () => void
  onTransfer: () => void
}) {
  return (
    <div className={className}>
      <Button variant="success" size="sm" onClick={onIncome}>
        + Доход
      </Button>
      <Button variant="danger" size="sm" onClick={onExpense}>
        + Расход
      </Button>
      <Button variant="outline" size="sm" icon={ArrowRight} onClick={onTransfer}>
        Перевод
      </Button>
    </div>
  )
}

export { formatMoney }
