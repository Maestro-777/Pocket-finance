import * as React from 'react'
import { Download, Share, Smartphone, X } from 'lucide-react'

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

      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowHelp(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="pwa-help-title" className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Smartphone size={22} />
              </div>
              <button type="button" onClick={() => setShowHelp(false)} aria-label="Закрыть" className="rounded-lg p-2 text-muted hover:bg-surface-2">
                <X size={18} />
              </button>
            </div>
            <h2 id="pwa-help-title" className="text-lg font-semibold">Установить Pocket Finance</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">Добавьте приложение на главный экран — оно будет открываться отдельно от браузера.</p>
            {/iPhone|iPad|iPod/.test(navigator.userAgent) ? (
              <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-fg"><Share size={16} /> Safari → Поделиться</p>
                <p className="mt-2 text-muted">Прокрутите меню вверх и выберите «На экран Домой», затем нажмите «Добавить».</p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
                <p className="font-medium text-fg">В меню браузера</p>
                <p className="mt-2 text-muted">Откройте меню ⋮ и выберите «Установить приложение» или «Добавить на главный экран».</p>
              </div>
            )}
            <button type="button" onClick={() => setShowHelp(false)} className="mt-4 w-full rounded-xl bg-brand-strong px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">Понятно</button>
          </section>
        </div>
      )}
    </>
  )
}