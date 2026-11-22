import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ─────────────────────────  Типы  ───────────────────────── */

export type CurrencyCode = 'USD' | 'EUR' | 'RUB' | 'UZS' | 'KZT' | 'BTC' | 'ETH' | 'USDT'
export type WalletKind = 'pocket_option' | 'bank_card' | 'ewallet' | 'bank_account' | 'crypto'
export type TxKind = 'income' | 'expense'
export type PoKind = 'deposit' | 'withdraw' | 'profit' | 'loss'
export type ThemeMode = 'dark' | 'light'
export type RangePreset = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'
export type HistoryAction = 'create' | 'update' | 'delete' | 'settings' | 'reset'

export interface Wallet {
  id: string
  name: string
  kind: WalletKind
  currency: CurrencyCode
  balance: number
}

export interface Tx {
  id: string
  kind: TxKind
  date: string
  amount: number
  currency: CurrencyCode
  walletId: string
  category: string
  comment?: string
}

export interface Transfer {
  id: string
  date: string
  fromWalletId: string
  toWalletId: string
  amountFrom: number
  amountTo: number
  currencyFrom: CurrencyCode
  currencyTo: CurrencyCode
  comment?: string
}

export interface PoEntry {
  id: string
  date: string
  kind: PoKind
  amount: number
  comment?: string
}

export interface HistoryEntry {
  id: string
  at: string
  action: HistoryAction
  entity: string
  title: string
  details?: string
}

export interface Settings {
  baseCurrency: CurrencyCode
  theme: ThemeMode
  rates: Record<CurrencyCode, number>
}

/* ─────────────────────────  Справочники  ───────────────────────── */

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'Доллар США', symbol: '$' },
  { code: 'EUR', label: 'Евро', symbol: '€' },
  { code: 'RUB', label: 'Российский рубль', symbol: '₽' },
  { code: 'UZS', label: 'Узбекский сум', symbol: 'сум' },
  { code: 'KZT', label: 'Казахстанский тенге', symbol: '₸' },
  { code: 'BTC', label: 'Биткоин', symbol: 'BTC' },
  { code: 'ETH', label: 'Эфириум', symbol: 'ETH' },
  { code: 'USDT', label: 'Tether USDT', symbol: 'USDT' },
]

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code)

export const WALLET_KINDS: { value: WalletKind; label: string }[] = [
  { value: 'pocket_option', label: 'Pocket Option' },
  { value: 'bank_card', label: 'Банковская карта' },
  { value: 'ewallet', label: 'Электронный кошелёк' },
  { value: 'bank_account', label: 'Банковский счёт' },
  { value: 'crypto', label: 'Криптокошелёк' },
]

export const INCOME_CATEGORIES = [
  'Зарплата',
  'Фриланс',
  'Инвестиции',
  'Торговля',
  'Подарки',
  'Прочее',
]

export const EXPENSE_CATEGORIES = [
  'Жильё',
  'Продукты',
  'Транспорт',
  'Развлечения',
  'Здоровье',
  'Подписки',
  'Образование',
  'Прочее',
]

export const PO_KINDS: { value: PoKind; label: string }[] = [
  { value: 'deposit', label: 'Пополнение' },
  { value: 'withdraw', label: 'Вывод' },
  { value: 'profit', label: 'Торговая прибыль' },
  { value: 'loss', label: 'Торговый убыток' },
]

export const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 1.08,
  RUB: 0.0111,
  UZS: 0.000079,
  KZT: 0.00195,
  BTC: 96000,
  ETH: 3400,
  USDT: 1,
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_FULL = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

/* ─────────────────────────  Утилиты  ───────────────────────── */

export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = () => isoDate(new Date())

export function shiftDays(days: number): string {
  const now = new Date()
  return isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days))
}

export function formatMoney(
  value: number,
  currency: CurrencyCode,
  opts: { sign?: boolean; decimals?: number } = {},
): string {
  const meta = CURRENCIES.find((c) => c.code === currency)
  const negative = value < 0
  const abs = Math.abs(value)
  const decimals =
    opts.decimals ?? (currency === 'BTC' || currency === 'ETH' ? 4 : 2)
  const body = abs.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const prefix = opts.sign ? (negative ? '−' : '+') : negative ? '−' : ''
  return `${prefix}${body} ${meta ? meta.symbol : currency}`
}

export function formatCompact(value: number, currency: CurrencyCode): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency
  if (abs >= 1_000_000)
    return `${sign}${(abs / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ${symbol}`
  if (abs >= 10_000)
    return `${sign}${Math.round(abs / 1000).toLocaleString('ru-RU')} тыс. ${symbol}`
  return `${sign}${Math.round(abs).toLocaleString('ru-RU')} ${symbol}`
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const monthKey = (iso: string) => iso.slice(0, 7)

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split('-').map(Number)
  const name = short ? MONTHS_SHORT[m - 1] : MONTHS_FULL[m - 1]
  return short ? `${name} ${String(y).slice(2)}` : `${name} ${y}`
}

export function yearLabel(key: string): string {
  return key.slice(0, 4)
}

export function toBase(
  amount: number,
  currency: CurrencyCode,
  base: CurrencyCode,
  rates: Record<CurrencyCode, number>,
): number {
  const from = rates[currency] ?? 1
  const to = rates[base] ?? 1
  if (!from || !to) return amount
  return (amount * from) / to
}

export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<CurrencyCode, number>,
): number {
  return toBase(amount, from, to, rates)
}

export function poBalance(entries: PoEntry[]): number {
  return entries.reduce((sum, e) => {
    if (e.kind === 'deposit' || e.kind === 'profit') return sum + e.amount
    return sum - e.amount
  }, 0)
}

export function walletBalance(wallet: Wallet, entries: PoEntry[]): number {
  return wallet.kind === 'pocket_option' ? poBalance(entries) : wallet.balance
}

export function totalCapital(state: {
  wallets: Wallet[]
  poEntries: PoEntry[]
  settings: Settings
}): number {
  const { baseCurrency, rates } = state.settings
  return state.wallets.reduce(
    (sum, w) => sum + toBase(walletBalance(w, state.poEntries), w.currency, baseCurrency, rates),
    0,
  )
}

export function presetRange(preset: Exclude<RangePreset, 'custom'>): { from: string; to: string } {
  const now = new Date()
  const today = isoDate(now)
  switch (preset) {
    case 'day':
      return { from: today, to: today }
    case 'week': {
      const shift = (now.getDay() + 6) % 7
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - shift)), to: today }
    }
    case 'month':
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
    case 'quarter':
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: today }
    case 'year':
      return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: today }
    default:
      return { from: '2000-01-01', to: today }
  }
}

export const inRange = (date: string, from: string, to: string) => date >= from && date <= to

export function lastMonths(count: number): { key: string; label: string; from: string; to: string }[] {
  const now = new Date()
  const out: { key: string; label: string; from: string; to: string }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    out.push({
      key: monthKeyOf(start),
      label: MONTHS_SHORT[start.getMonth()],
      from: isoDate(start),
      to: isoDate(end),
    })
  }
  return out
}

export function lastDays(count: number): { key: string; label: string; from: string; to: string }[] {
  const now = new Date()
  const out: { key: string; label: string; from: string; to: string }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const iso = isoDate(day)
    out.push({ key: iso, label: `${day.getDate()} ${MONTHS_SHORT[day.getMonth()]}`, from: iso, to: iso })
  }
  return out
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function walletName(wallets: Wallet[], id: string): string {
  return wallets.find((w) => w.id === id)?.name ?? 'Кошелёк удалён'
}

export function walletCurrency(wallets: Wallet[], id: string): CurrencyCode {
  return wallets.find((w) => w.id === id)?.currency ?? 'RUB'
}

export function poStats(entries: PoEntry[]) {
  const deposits = entries.filter((e) => e.kind === 'deposit').reduce((s, e) => s + e.amount, 0)
  const withdrawals = entries.filter((e) => e.kind === 'withdraw').reduce((s, e) => s + e.amount, 0)
  const profit = entries.filter((e) => e.kind === 'profit').reduce((s, e) => s + e.amount, 0)
  const loss = entries.filter((e) => e.kind === 'loss').reduce((s, e) => s + e.amount, 0)
  return {
    deposits,
    withdrawals,
    profit,
    loss,
    net: profit - loss,
    balance: deposits - withdrawals + profit - loss,
    trades: entries.filter((e) => e.kind === 'profit' || e.kind === 'loss').length,
    winRate: profit + loss > 0 ? (profit / (profit + loss)) * 100 : 0,
  }
}

/* ─────────────────────────  Демонстрационные данные  ───────────────────────── */

type SeedRow = [number, TxKind, number, string, string, string]

function createSeed() {
  const wallets: Wallet[] = [
    { id: 'w_po', name: 'Pocket Option', kind: 'pocket_option', currency: 'USD', balance: 0 },
    { id: 'w_card_rub', name: 'Карта •• 4218', kind: 'bank_card', currency: 'RUB', balance: 184320.5 },
    { id: 'w_card_usd', name: 'Карта •• 8841', kind: 'bank_card', currency: 'USD', balance: 2480 },
    { id: 'w_account', name: 'Основной счёт', kind: 'bank_account', currency: 'RUB', balance: 96500 },
    { id: 'w_ewallet', name: 'Электронный кошелёк', kind: 'ewallet', currency: 'USD', balance: 640.25 },
    { id: 'w_usdt', name: 'Крипто-кошелёк USDT', kind: 'crypto', currency: 'USDT', balance: 1150 },
    { id: 'w_btc', name: 'Биткоин-кошелёк', kind: 'crypto', currency: 'BTC', balance: 0.0284 },
  ]

  const rows: SeedRow[] = [
    [5, 'income', 168000, 'w_card_rub', 'Зарплата', 'Зарплата за текущий месяц'],
    [35, 'income', 168000, 'w_card_rub', 'Зарплата', 'Зарплата за прошлый месяц'],
    [65, 'income', 162000, 'w_card_rub', 'Зарплата', 'Зарплата за позапрошлый месяц'],
    [12, 'income', 2400, 'w_card_usd', 'Фриланс', 'Проект по дизайну'],
    [22, 'income', 95000, 'w_account', 'Фриланс', 'Консультация для клиента'],
    [42, 'income', 1800, 'w_card_usd', 'Фриланс', 'Вёрстка лендинга'],
    [8, 'income', 320, 'w_ewallet', 'Инвестиции', 'Дивиденды по фонду'],
    [50, 'income', 120000, 'w_account', 'Инвестиции', 'Купонный доход'],
    [18, 'income', 450, 'w_usdt', 'Торговля', 'Результат по сделкам'],
    [1, 'expense', 3420, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [2, 'expense', 890, 'w_card_rub', 'Транспорт', 'Такси до офиса'],
    [3, 'expense', 1290, 'w_card_rub', 'Подписки', 'Музыка и кино'],
    [4, 'expense', 4600, 'w_card_rub', 'Продукты', 'Продукты и бытовая химия'],
    [6, 'expense', 7800, 'w_card_rub', 'Здоровье', 'Аптека и анализы'],
    [7, 'expense', 2150, 'w_card_rub', 'Развлечения', 'Кино с семьёй'],
    [9, 'expense', 15200, 'w_card_rub', 'Жильё', 'Коммунальные услуги'],
    [10, 'expense', 2980, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [11, 'expense', 1450, 'w_card_rub', 'Транспорт', 'Проездной'],
    [13, 'expense', 5400, 'w_card_rub', 'Образование', 'Онлайн-курс'],
    [14, 'expense', 3600, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [15, 'expense', 120, 'w_card_usd', 'Развлечения', 'Подписки в долларах'],
    [16, 'expense', 980, 'w_card_rub', 'Развлечения', 'Подписка на книги'],
    [17, 'expense', 42000, 'w_card_rub', 'Жильё', 'Аренда квартиры'],
    [19, 'expense', 2750, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [20, 'expense', 3100, 'w_card_rub', 'Здоровье', 'Витамины'],
    [21, 'expense', 1890, 'w_card_rub', 'Транспорт', 'Такси и метро'],
    [23, 'expense', 6400, 'w_card_rub', 'Продукты', 'Закупка на две недели'],
    [24, 'expense', 2300, 'w_card_rub', 'Развлечения', 'Концерт'],
    [26, 'expense', 1180, 'w_card_rub', 'Подписки', 'Облачное хранилище'],
    [27, 'expense', 8400, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [28, 'expense', 1650, 'w_card_rub', 'Транспорт', 'Проездной'],
    [29, 'expense', 3900, 'w_card_rub', 'Здоровье', 'Стоматология'],
    [31, 'expense', 15200, 'w_card_rub', 'Жильё', 'Коммунальные услуги'],
    [32, 'expense', 5200, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [33, 'expense', 240, 'w_card_usd', 'Образование', 'Курс на английском'],
    [34, 'expense', 2400, 'w_card_rub', 'Развлечения', 'Театр'],
    [36, 'expense', 6900, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [38, 'expense', 1480, 'w_card_rub', 'Транспорт', 'Такси'],
    [39, 'expense', 2600, 'w_card_rub', 'Подписки', 'Сервисы и приложения'],
    [41, 'expense', 9800, 'w_card_rub', 'Здоровье', 'Медицинская страховка'],
    [43, 'expense', 5800, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [45, 'expense', 3200, 'w_card_rub', 'Развлечения', 'Выходные'],
    [47, 'expense', 42000, 'w_card_rub', 'Жильё', 'Аренда квартиры'],
    [49, 'expense', 15200, 'w_card_rub', 'Жильё', 'Коммунальные услуги'],
    [51, 'expense', 6400, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [54, 'expense', 1800, 'w_card_rub', 'Транспорт', 'Проездной'],
    [55, 'expense', 90, 'w_ewallet', 'Подписки', 'Облачное хранилище'],
    [56, 'expense', 4900, 'w_card_rub', 'Здоровье', 'Аптека'],
    [58, 'expense', 7200, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [61, 'expense', 2100, 'w_card_rub', 'Развлечения', 'Кино'],
    [64, 'expense', 5300, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [68, 'expense', 14200, 'w_card_rub', 'Жильё', 'Коммунальные услуги'],
    [70, 'expense', 3600, 'w_card_rub', 'Образование', 'Книги и курсы'],
    [74, 'expense', 4800, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [77, 'expense', 42000, 'w_card_rub', 'Жильё', 'Аренда квартиры'],
    [80, 'expense', 2400, 'w_card_rub', 'Транспорт', 'Проездной'],
    [84, 'expense', 5600, 'w_card_rub', 'Продукты', 'Продукты на неделю'],
    [46, 'expense', 0.0008, 'w_btc', 'Прочее', 'Комиссия сети'],
  ]

  const transactions: Tx[] = rows.map(([days, kind, amount, walletId, category, comment], i) => ({
    id: `t_seed_${i}`,
    kind,
    date: shiftDays(days),
    amount,
    walletId,
    category,
    comment,
    currency: wallets.find((w) => w.id === walletId)!.currency,
  }))

  const transfers: Transfer[] = [
    {
      id: 'tr_1',
      date: shiftDays(25),
      fromWalletId: 'w_card_rub',
      toWalletId: 'w_account',
      amountFrom: 30000,
      amountTo: 30000,
      currencyFrom: 'RUB',
      currencyTo: 'RUB',
      comment: 'Пополнение резерва',
    },
    {
      id: 'tr_2',
      date: shiftDays(40),
      fromWalletId: 'w_account',
      toWalletId: 'w_card_rub',
      amountFrom: 15000,
      amountTo: 15000,
      currencyFrom: 'RUB',
      currencyTo: 'RUB',
      comment: 'Пополнение карты',
    },
    {
      id: 'tr_3',
      date: shiftDays(20),
      fromWalletId: 'w_card_rub',
      toWalletId: 'w_ewallet',
      amountFrom: 12000,
      amountTo: 128.5,
      currencyFrom: 'RUB',
      currencyTo: 'USD',
      comment: 'Перевод в доллары',
    },
    {
      id: 'tr_4',
      date: shiftDays(30),
      fromWalletId: 'w_usdt',
      toWalletId: 'w_card_usd',
      amountFrom: 200,
      amountTo: 198,
      currencyFrom: 'USDT',
      currencyTo: 'USD',
      comment: 'Вывод в долларах',
    },
  ]

  const poEntries: PoEntry[] = [
    { id: 'po_1', date: shiftDays(88), kind: 'deposit', amount: 500, comment: 'Стартовое пополнение' },
    { id: 'po_2', date: shiftDays(80), kind: 'profit', amount: 120.5, comment: 'Сессия по валютным парам' },
    { id: 'po_3', date: shiftDays(74), kind: 'loss', amount: 45, comment: 'Рискованная сделка' },
    { id: 'po_4', date: shiftDays(60), kind: 'profit', amount: 210.3, comment: 'Серия коротких сделок' },
    { id: 'po_5', date: shiftDays(52), kind: 'withdraw', amount: 300, comment: 'Вывод на карту' },
    { id: 'po_6', date: shiftDays(40), kind: 'loss', amount: 88.2, comment: 'Неудачный день' },
    { id: 'po_7', date: shiftDays(30), kind: 'profit', amount: 165.4, comment: 'Торговля по тренду' },
    { id: 'po_8', date: shiftDays(22), kind: 'deposit', amount: 400, comment: 'Дополнительное пополнение' },
    { id: 'po_9', date: shiftDays(15), kind: 'profit', amount: 96.75, comment: 'Спокойная сессия' },
    { id: 'po_10', date: shiftDays(9), kind: 'loss', amount: 120, comment: 'Серия убыточных сделок' },
    { id: 'po_11', date: shiftDays(4), kind: 'profit', amount: 140.2, comment: 'Удачная сессия' },
    { id: 'po_12', date: shiftDays(2), kind: 'loss', amount: 60.5, comment: 'Короткая сессия' },
  ]

  const at = (days: number, hours: number) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    d.setHours(hours, 12, 0, 0)
    return d.toISOString()
  }

  const history: HistoryEntry[] = [
    {
      id: 'h_1',
      at: at(0, 9),
      action: 'create',
      entity: 'Операция',
      title: 'Добавлен расход «Продукты на неделю»',
      details: 'Карта •• 4218 · 3 420 ₽',
    },
    {
      id: 'h_2',
      at: at(1, 19),
      action: 'update',
      entity: 'Кошелёк',
      title: 'Изменён баланс кошелька «Карта •• 4218»',
      details: 'Новый баланс: 184 320,50 ₽',
    },
    {
      id: 'h_3',
      at: at(2, 12),
      action: 'create',
      entity: 'Pocket Option',
      title: 'Добавлен торговый убыток',
      details: '60,50 $ · короткая сессия',
    },
    {
      id: 'h_4',
      at: at(4, 10),
      action: 'settings',
      entity: 'Настройки',
      title: 'Основная валюта — российский рубль',
    },
    {
      id: 'h_5',
      at: at(20, 15),
      action: 'create',
      entity: 'Перевод',
      title: 'Перевод между кошельками',
      details: 'Карта •• 4218 → Электронный кошелёк · 12 000 ₽',
    },
    {
      id: 'h_6',
      at: at(22, 11),
      action: 'create',
      entity: 'Кошелёк',
      title: 'Добавлен кошелёк «Крипто-кошелёк USDT»',
    },
  ]

  return {
    wallets,
    transactions,
    transfers,
    poEntries,
    history,
    settings: {
      baseCurrency: 'RUB' as CurrencyCode,
      theme: 'dark' as ThemeMode,
      rates: { ...DEFAULT_RATES },
    },
  }
}

/* ─────────────────────────  Хранилище  ───────────────────────── */

const historyEntry = (
  action: HistoryAction,
  entity: string,
  title: string,
  details?: string,
): HistoryEntry => ({
  id: uid('h'),
  at: new Date().toISOString(),
  action,
  entity,
  title,
  details,
})

interface FinanceState {
  wallets: Wallet[]
  transactions: Tx[]
  transfers: Transfer[]
  poEntries: PoEntry[]
  history: HistoryEntry[]
  settings: Settings
  addWallet: (input: Omit<Wallet, 'id'>) => void
  updateWallet: (id: string, patch: Partial<Omit<Wallet, 'id'>>) => void
  deleteWallet: (id: string) => void
  addTx: (input: Omit<Tx, 'id'>) => void
  updateTx: (id: string, patch: Partial<Omit<Tx, 'id'>>) => void
  deleteTx: (id: string) => void
  addTransfer: (input: Omit<Transfer, 'id'>) => void
  updateTransfer: (id: string, patch: Partial<Omit<Transfer, 'id'>>) => void
  deleteTransfer: (id: string) => void
  addPo: (input: Omit<PoEntry, 'id'>) => void
  updatePo: (id: string, patch: Partial<Omit<PoEntry, 'id'>>) => void
  deletePo: (id: string) => void
  setBaseCurrency: (currency: CurrencyCode) => void
  setTheme: (theme: ThemeMode) => void
  setRate: (currency: CurrencyCode, value: number) => void
  resetDemo: () => void
}

export const useFinance = create<FinanceState>()(
  persist(
    (set) => ({
      ...createSeed(),

      addWallet: (input) =>
        set((s) => ({
          wallets: [...s.wallets, { ...input, id: uid('w') }],
          history: [
            historyEntry('create', 'Кошелёк', `Добавлен кошелёк «${input.name}»`, input.currency),
            ...s.history,
          ],
        })),

      updateWallet: (id, patch) =>
        set((s) => {
          const wallet = s.wallets.find((w) => w.id === id)
          return {
            wallets: s.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
            history: [
              historyEntry(
                'update',
                'Кошелёк',
                `Изменён кошелёк «${patch.name ?? wallet?.name ?? ''}»`,
                patch.balance !== undefined
                  ? `Баланс: ${formatMoney(patch.balance, patch.currency ?? wallet?.currency ?? 'RUB')}`
                  : undefined,
              ),
              ...s.history,
            ],
          }
        }),

      deleteWallet: (id) =>
        set((s) => {
          const wallet = s.wallets.find((w) => w.id === id)
          return {
            wallets: s.wallets.filter((w) => w.id !== id),
            transactions: s.transactions.filter((t) => t.walletId !== id),
            transfers: s.transfers.filter((t) => t.fromWalletId !== id && t.toWalletId !== id),
            poEntries: wallet?.kind === 'pocket_option' ? [] : s.poEntries,
            history: [
              historyEntry(
                'delete',
                'Кошелёк',
                `Удалён кошелёк «${wallet?.name ?? ''}»`,
                wallet?.kind === 'pocket_option'
                  ? 'Связанные операции, переводы и записи Pocket Option удалены'
                  : 'Связанные операции и переводы удалены',
              ),
              ...s.history,
            ],
          }
        }),

      addTx: (input) =>
        set((s) => ({
          transactions: [{ ...input, id: uid('t') }, ...s.transactions],
          history: [
            historyEntry(
              'create',
              input.kind === 'income' ? 'Доход' : 'Расход',
              `Добавлен ${input.kind === 'income' ? 'доход' : 'расход'} «${input.category}»`,
              formatMoney(input.amount, input.currency),
            ),
            ...s.history,
          ],
        })),

      updateTx: (id, patch) =>
        set((s) => {
          const tx = s.transactions.find((t) => t.id === id)
          const next = tx ? { ...tx, ...patch } : undefined
          return {
            transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
            history: [
              historyEntry(
                'update',
                next?.kind === 'income' ? 'Доход' : 'Расход',
                `Изменена запись «${next?.category ?? ''}»`,
                next ? formatMoney(next.amount, next.currency) : undefined,
              ),
              ...s.history,
            ],
          }
        }),

      deleteTx: (id) =>
        set((s) => {
          const tx = s.transactions.find((t) => t.id === id)
          return {
            transactions: s.transactions.filter((t) => t.id !== id),
            history: [
              historyEntry(
                'delete',
                tx?.kind === 'income' ? 'Доход' : 'Расход',
                `Удалена запись «${tx?.category ?? ''}»`,
                tx ? formatMoney(tx.amount, tx.currency) : undefined,
              ),
              ...s.history,
            ],
          }
        }),

      addTransfer: (input) =>
        set((s) => ({
          transfers: [{ ...input, id: uid('tr') }, ...s.transfers],
          history: [
            historyEntry(
              'create',
              'Перевод',
              'Добавлен перевод между кошельками',
              `${formatMoney(input.amountFrom, input.currencyFrom)} → ${formatMoney(input.amountTo, input.currencyTo)}`,
            ),
            ...s.history,
          ],
        })),

      updateTransfer: (id, patch) =>
        set((s) => ({
          transfers: s.transfers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          history: [historyEntry('update', 'Перевод', 'Изменён перевод между кошельками'), ...s.history],
        })),

      deleteTransfer: (id) =>
        set((s) => ({
          transfers: s.transfers.filter((t) => t.id !== id),
          history: [historyEntry('delete', 'Перевод', 'Удалён перевод между кошельками'), ...s.history],
        })),

      addPo: (input) =>
        set((s) => ({
          poEntries: [{ ...input, id: uid('po') }, ...s.poEntries],
          history: [
            historyEntry(
              'create',
              'Pocket Option',
              `Добавлена запись «${PO_KINDS.find((k) => k.value === input.kind)?.label ?? ''}»`,
              formatMoney(input.amount, 'USD'),
            ),
            ...s.history,
          ],
        })),

      updatePo: (id, patch) =>
        set((s) => ({
          poEntries: s.poEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          history: [historyEntry('update', 'Pocket Option', 'Изменена запись Pocket Option'), ...s.history],
        })),

      deletePo: (id) =>
        set((s) => ({
          poEntries: s.poEntries.filter((e) => e.id !== id),
          history: [historyEntry('delete', 'Pocket Option', 'Удалена запись Pocket Option'), ...s.history],
        })),

      setBaseCurrency: (currency) =>
        set((s) => ({
          settings: { ...s.settings, baseCurrency: currency },
          history: [
            historyEntry(
              'settings',
              'Настройки',
              `Основная валюта — ${CURRENCIES.find((c) => c.code === currency)?.label ?? currency}`,
            ),
            ...s.history,
          ],
        })),

      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),

      setRate: (currency, value) =>
        set((s) => ({
          settings: { ...s.settings, rates: { ...s.settings.rates, [currency]: value } },
        })),

      resetDemo: () => set(() => ({ ...createSeed(), history: [historyEntry('reset', 'Данные', 'Демо-данные восстановлены'), ...createSeed().history] })),
    }),
    { name: 'pocket-finance-demo-v1', version: 1 },
  ),
)
