import * as React from 'react'
import { createPortal } from 'react-dom'
import { Bitcoin, CreditCard, Landmark, LineChart, Smartphone, Wallet as WalletIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, type CurrencyCode } from '@/lib/finance'

/* ─────────────────────────  Контейнеры  ───────────────────────── */

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface', className)} {...rest}>
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/* ─────────────────────────  Кнопки  ───────────────────────── */

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-strong text-white hover:opacity-90 shadow-sm',
  outline: 'border border-line bg-surface-2 text-fg hover:border-brand/60 hover:text-brand',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-expense/35 bg-expense-soft text-expense hover:bg-expense/20',
  success: 'border border-income/35 bg-income-soft text-income hover:bg-income/20',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: React.ComponentType<{ size?: number | string; className?: string }>
  }
>(({ className, variant = 'outline', size = 'md', icon: Icon, children, ...rest }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
      buttonVariants[variant],
      buttonSizes[size],
      className,
    )}
    {...rest}
  >
    {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
    {children}
  </button>
))
Button.displayName = 'Button'

export function IconButton({
  label,
  className,
  icon: Icon,
  tone = 'ghost',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  tone?: 'ghost' | 'danger'
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition',
        tone === 'danger'
          ? 'text-muted hover:bg-expense-soft hover:text-expense'
          : 'text-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
      {...rest}
    >
      <Icon size={15} />
    </button>
  )
}

/* ─────────────────────────  Бейджи и суммы  ───────────────────────── */

export type Tone = 'brand' | 'income' | 'expense' | 'warn' | 'neutral'

const badgeTones: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand',
  income: 'bg-income-soft text-income',
  expense: 'bg-expense-soft text-expense',
  warn: 'bg-warn-soft text-warn',
  neutral: 'bg-surface-2 text-muted',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Amount({
  value,
  currency,
  kind = 'neutral',
  className,
}: {
  value: number
  currency: CurrencyCode
  kind?: 'income' | 'expense' | 'neutral'
  className?: string
}) {
  return (
    <span
      className={cn(
        'num font-medium',
        kind === 'income' && 'text-income',
        kind === 'expense' && 'text-expense',
        className,
      )}
    >
      {formatMoney(value, currency, { sign: kind !== 'neutral' })}
    </span>
  )
}

/* ─────────────────────────  Карточка показателя  ───────────────────────── */

const statTones: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand',
  income: 'bg-income-soft text-income',
  expense: 'bg-expense-soft text-expense',
  warn: 'bg-warn-soft text-warn',
  neutral: 'bg-surface-2 text-muted',
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  footer,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  tone?: Tone
  footer?: React.ReactNode
}) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', statTones[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <p className="num mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {footer}
    </Panel>
  )
}

export function Progress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'income' | 'expense' }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'income' && 'bg-income',
          tone === 'expense' && 'bg-expense',
          tone === 'brand' && 'bg-brand',
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

/* ─────────────────────────  Поля ввода  ───────────────────────── */

export const inputClass =
  'field-text num w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-fg outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/25'

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: NoInfer<T>
  onChange: (value: NoInfer<T>) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'scroll-slim inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition',
            value === option.value
              ? 'bg-brand-strong text-white shadow-sm'
              : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────  Модальные окна  ───────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'md' | 'lg'
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full border border-line bg-surface shadow-2xl',
          'rounded-t-2xl sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-xs text-muted">{description}</p>}
          </div>
          <IconButton label="Закрыть" icon={X} onClick={onClose} />
        </div>
        <div className="scroll-slim max-h-[68vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Удалить',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{description ?? 'Действие нельзя отменить.'}</p>
    </Modal>
  )
}

/* ─────────────────────────  Пустое состояние и таблицы  ───────────────────────── */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export const thClass = 'px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted uppercase whitespace-nowrap'
export const tdClass = 'px-4 py-3 text-sm whitespace-nowrap'

export const WALLET_ICONS = {
  pocket_option: LineChart,
  bank_card: CreditCard,
  ewallet: Smartphone,
  bank_account: Landmark,
  crypto: Bitcoin,
}

export function WalletKindIcon({
  kind,
  size = 16,
  className,
}: {
  kind: keyof typeof WALLET_ICONS
  size?: number
  className?: string
}) {
  const Icon = WALLET_ICONS[kind] ?? WalletIcon
  return <Icon size={size} className={className} />
}

