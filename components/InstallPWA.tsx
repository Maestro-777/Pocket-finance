import * as React from 'react'
import { createPortal } from 'react-dom'
import { Download, Share, X, Smartphone, ShieldCheck, Wifi } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPWA() {
  const [installEvent, setInstallEvent] = React.useState<InstallPromptEvent | null>(null)
  const [showHelp, setShowHelp] = React.useState(false)
  const [installed, setInstalled] = React.useState(
    window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  )

  React.useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
      setShowHelp(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  React.useEffect(() => {
    if (!showHelp) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowHelp(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showHelp])

  const install = async () => {
    if (!installEvent) {
      setShowHelp(true)
      return
    }
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallEvent(null)
  }

  if (installed) return null

  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-2.5 text-xs font-semibold text-brand transition hover:brightness-110"
        aria-label="Установить Pocket Finance"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Установить</span>
      </button>

      {showHelp && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-md"
          style={{ minHeight: '100dvh' }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowHelp(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-help-title"
            className="relative my-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_24px_90px_rgba(0,0,0,0.5)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-brand/15 to-transparent" />
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              aria-label="Закрыть"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80 text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <X size={18} />
            </button>

            <div className="relative flex flex-col items-center px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-9">
              <div className="mb-5 rounded-[24px] p-1 shadow-[0_12px_35px_rgba(0,0,0,0.28)] ring-1 ring-white/10">
                <img
                  src={`${import.meta.env.BASE_URL}icon-192.png`}
                  alt="Pocket Finance"
                  className="h-[88px] w-[88px] rounded-[20px]"
                />
              </div>

              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-brand">Pocket Finance</p>
              <h2 id="pwa-help-title" className="text-[22px] font-bold tracking-tight text-fg sm:text-2xl">
                Установить приложение
              </h2>
              <p className="mt-2 max-w-[310px] text-sm leading-relaxed text-muted">
                Добавьте Pocket Finance на устройство — запускайте его отдельно от браузера, как обычное приложение.
              </p>

              <div className="mt-6 grid w-full grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl border border-line bg-surface-2/75 p-3.5">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Smartphone size={17} />
                  </div>
                  <p className="text-xs font-semibold text-fg">Всегда под рукой</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">Ярлык на рабочем столе или главном экране</p>
                </div>
                <div className="rounded-2xl border border-line bg-surface-2/75 p-3.5">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <ShieldCheck size={17} />
                  </div>
                  <p className="text-xs font-semibold text-fg">Отдельное окно</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">Без вкладок и адресной строки браузера</p>
                </div>
              </div>

              <div className="mt-4 w-full rounded-2xl border border-line bg-surface-2/60 p-4 text-left">
                {isAppleMobile ? (
                  <>
                    <p className="flex items-center justify-center gap-2 text-sm font-semibold text-fg">
                      <Share size={16} /> Как установить на iPhone
                    </p>
                    <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                      <li><span className="mr-2 font-semibold text-brand">1.</span>Откройте эту страницу в Safari.</li>
                      <li><span className="mr-2 font-semibold text-brand">2.</span>Нажмите «Поделиться» внизу экрана.</li>
                      <li><span className="mr-2 font-semibold text-brand">3.</span>Выберите «На экран Домой» → «Добавить».</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="flex items-center justify-center gap-2 text-sm font-semibold text-fg">
                      <Download size={16} /> Установка через браузер
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      Откройте меню браузера ⋮ и выберите «Установить приложение» или «Добавить на главный экран».
                    </p>
                  </>
                )}
              </div>

              <div className="mt-5 flex w-full items-center justify-center gap-2 text-[10px] text-muted">
                <Wifi size={13} />
                <span>Данные синхронизируются с вашим аккаунтом</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="mt-5 w-full rounded-2xl bg-brand-strong px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110 active:scale-[0.99]"
              >
                Понятно
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
