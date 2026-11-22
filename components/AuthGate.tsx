import * as React from 'react'
import type { User } from '@supabase/supabase-js'
import { LogOut, Wallet as WalletIcon, Cloud, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_RATES, useFinance, type CurrencyCode, type HistoryEntry, type PoEntry, type Settings, type Transfer, type Tx, type Wallet, type ThemeMode } from '@/lib/finance'

type AuthMode = 'signin' | 'signup' | 'forgot'
type Snapshot = {
  wallets: Wallet[]
  transactions: Tx[]
  transfers: Transfer[]
  poEntries: PoEntry[]
  history: HistoryEntry[]
  settings: Settings
}

const EMPTY_SNAPSHOT: Snapshot = {
  wallets: [],
  transactions: [],
  transfers: [],
  poEntries: [],
  history: [],
  settings: {
    baseCurrency: 'RUB' as CurrencyCode,
    theme: 'dark' as ThemeMode,
    rates: { ...DEFAULT_RATES },
  },
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [authReady, setAuthReady] = React.useState(false)
  const [dataReady, setDataReady] = React.useState(false)
  const [mode, setMode] = React.useState<AuthMode>('signin')
  const [recoveryMode, setRecoveryMode] = React.useState(false)
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')
  const [syncState, setSyncState] = React.useState<'saved' | 'saving' | 'error'>('saved')
  const loadSnapshot = useFinance((state) => state.loadSnapshot)

  React.useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setError(sessionError.message)
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (alive) {
        if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
        setUser(session?.user ?? null)
        setMessage('')
        setError('')
      }
    })
    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  React.useEffect(() => {
    if (!authReady) return
    if (!user) {
      setDataReady(false)
      loadSnapshot(EMPTY_SNAPSHOT)
      return
    }

    let active = true
    let unsubscribe: (() => void) | undefined
    let saveTimer: ReturnType<typeof setTimeout> | undefined

    const persistSnapshot = async () => {
      const state = useFinance.getState()
      const snapshot: Snapshot = {
        wallets: state.wallets,
        transactions: state.transactions,
        transfers: state.transfers,
        poEntries: state.poEntries,
        history: state.history,
        settings: state.settings,
      }
      setSyncState('saving')
      const { error: saveError } = await supabase
        .from('finance_state')
        .upsert({ user_id: user.id, state: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (!active) return
      setSyncState(saveError ? 'error' : 'saved')
      if (saveError) setError(`Не удалось сохранить данные: ${saveError.message}`)
    }

    const initialize = async () => {
      const { data, error: loadError } = await supabase
        .from('finance_state')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return
      if (loadError) {
        setError(`Не удалось загрузить данные: ${loadError.message}`)
        setDataReady(true)
        setSyncState('error')
        return
      }

      const saved = (data?.state ?? EMPTY_SNAPSHOT) as Partial<Snapshot>
      loadSnapshot({
        wallets: Array.isArray(saved.wallets) ? saved.wallets : [],
        transactions: Array.isArray(saved.transactions) ? saved.transactions : [],
        transfers: Array.isArray(saved.transfers) ? saved.transfers : [],
        poEntries: Array.isArray(saved.poEntries) ? saved.poEntries : [],
        history: Array.isArray(saved.history) ? saved.history : [],
        settings: saved.settings ?? EMPTY_SNAPSHOT.settings,
      })
      setDataReady(true)

      if (!data) {
        await persistSnapshot()
        if (!active) return
      }

      const stop = useFinance.subscribe(() => {
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => { void persistSnapshot() }, 450)
      })
      unsubscribe = stop
    }

    void initialize()
    return () => {
      active = false
      if (saveTimer) clearTimeout(saveTimer)
      unsubscribe?.()
    }
  }, [authReady, user?.id, loadSnapshot])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (recoveryMode) {
        if (password !== confirmPassword) throw new Error('Пароли не совпадают')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        await supabase.auth.signOut()
        setRecoveryMode(false)
        setMode('signin')
        setPassword('')
        setConfirmPassword('')
        setMessage('Пароль успешно изменён. Теперь войди с новым паролем.')
      } else if (mode === 'forgot') {
        const redirectTo = window.location.origin + window.location.pathname
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (resetError) throw resetError
        setMessage('Если аккаунт с таким адресом существует, мы отправили на него письмо со ссылкой для восстановления пароля.')
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setMessage('Аккаунт создан. Подтверди адрес электронной почты по ссылке из письма, затем войди.')
        } else {
          setMessage('Аккаунт создан. Загружаем твои данные…')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signInError) throw signInError
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось выполнить вход')
    } finally {
      setBusy(false)
    }
  }

  if (!authReady || (user && !dataReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">
        <div className="flex items-center gap-3 text-sm"><Loader2 className="animate-spin" size={18} /> Подключаем защищённое хранилище…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-strong text-white"><WalletIcon size={22} /></span>
            <div><h1 className="text-xl font-semibold tracking-tight">Pocket Finance</h1><p className="text-xs text-muted">Личный финансовый учёт</p></div>
          </div>
          <h2 className="text-lg font-semibold">{recoveryMode ? 'Новый пароль' : mode === 'forgot' ? 'Восстановление аккаунта' : mode === 'signin' ? 'Вход в аккаунт' : 'Создать аккаунт'}</h2>
          <p className="mt-1 text-sm text-muted">{recoveryMode ? 'Придумай новый пароль для своего аккаунта.' : mode === 'forgot' ? 'Укажи почту, привязанную к аккаунту. Мы отправим ссылку для смены пароля.' : 'Твои кошельки и операции будут синхронизироваться между устройствами.'}</p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {!recoveryMode && <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted">Электронная почта</span>
              <input className="field-text w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-fg outline-none focus:border-brand" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </label>}
            {mode !== 'forgot' && <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted">{recoveryMode ? 'Новый пароль' : 'Пароль'}</span>
              <input className="field-text w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-fg outline-none focus:border-brand" type="password" autoComplete={mode === 'signin' && !recoveryMode ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 8 символов" />
            </label>}
            {recoveryMode && <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted">Повтори новый пароль</span>
              <input className="field-text w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-fg outline-none focus:border-brand" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Повтори пароль" />
            </label>}
            {error && <p role="alert" className="rounded-lg border border-expense/30 bg-expense-soft px-3 py-2 text-xs text-expense">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-income/30 bg-income-soft px-3 py-2 text-xs text-income">{message}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-strong px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />}{recoveryMode ? 'Сохранить новый пароль' : mode === 'forgot' ? 'Отправить ссылку' : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
          {!recoveryMode && mode === 'signin' && <button type="button" className="mt-4 w-full text-center text-xs text-brand hover:underline" onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>
            Забыли пароль? Восстановить через почту
          </button>}
          {!recoveryMode && <button type="button" className="mt-3 w-full text-center text-xs text-brand hover:underline" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage('') }}>
            {mode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>}
          {mode === 'forgot' && <button type="button" className="mt-3 w-full text-center text-xs text-brand hover:underline" onClick={() => { setMode('signin'); setError(''); setMessage('') }}>
            Вернуться ко входу
          </button>}
          <div className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-[11px] leading-relaxed text-muted"><Cloud size={14} className="mt-0.5 shrink-0" /> Данные хранятся в Supabase и доступны только владельцу аккаунта. Новый аккаунт начинается с пустого пространства.</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-xl backdrop-blur">
        <Cloud size={14} className={syncState === 'error' ? 'text-expense' : 'text-income'} />
        <span className="max-w-36 truncate text-[11px] text-muted">{syncState === 'saving' ? 'Сохранение…' : syncState === 'error' ? 'Ошибка синхронизации' : user.email}</span>
        <button type="button" aria-label="Выйти из аккаунта" title="Выйти" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" onClick={() => { void supabase.auth.signOut() }}><LogOut size={14} /></button>
      </div>
    </>
  )
}
