import * as React from 'react'
import { createPortal } from 'react-dom'
import { Download, Share, X, Smartphone, ShieldCheck, Wifi } from 'lucide-react'
import { getPwaInstallState, promptPwaInstall, subscribePwaInstall } from '@/lib/pwa-install'

export default function InstallPWA() {
  const { canPrompt, installed } = React.useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallState,
    getPwaInstallState,
  )
  const [showHelp, setShowHelp] = React.useState(false)

  React.useEffect(() => {
    if (!showHelp) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowHelp(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showHelp])

  const install = async () => {
    if (!canPrompt) {
      setShowHelp(true)
      return
    }
    try {
      const choice = await promptPwaInstall()
      if (!choice) setShowHelp(true)
    } catch (error) {
      console.error('PWA installation prompt failed:', error)
      setShowHelp(true)
    }
  }

  if (installed) return null

  const userAgent = navigator.userAgent
  const isAppleMobile =
    /iPhone|iPad|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/i.test(userAgent)

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
                      <Share size={16} /> Как установить на iPhone или iPad
                    </p>
                    <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                      <li><span className="mr-2 font-semibold text-brand">1.</span>Нажмите «Поделиться» в меню браузера.</li>
                      <li><span className="mr-2 font-semibold text-brand">2.</span>Выберите «На экран Домой».</li>
                      <li><span className="mr-2 font-semibold text-brand">3.</span>Включите «Открывать как веб-приложение», если такой переключатель показан, и нажмите «Добавить».</li>
                    </ol>
                    <p className="mt-3 text-[11px] leading-relaxed text-muted">Если пункта нет, откройте страницу в Safari и повторите шаги.</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center justify-center gap-2 text-sm font-semibold text-fg">
                      <Download size={16} /> {isAndroid ? 'Установка на Android' : 'Установка через браузер'}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      {isAndroid
                        ? 'Откройте меню браузера ⋮ и выберите «Установить приложение» или «Добавить на главный экран». В Chrome также может появиться значок установки в адресной строке.'
                        : 'Откройте меню браузера и выберите «Установить Pocket Finance» или «Установить приложение». В Chrome и Edge команда также может находиться в адресной строке.'}
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
