export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PwaInstallState = { canPrompt: boolean; installed: boolean }
const listeners = new Set<() => void>()
let deferredPrompt: BeforeInstallPromptEvent | null = null
let state: PwaInstallState = {
  canPrompt: false,
  installed:
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
}

function notify() {
  listeners.forEach((listener) => listener())
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  state = { ...state, canPrompt: true }
  notify()
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  state = { canPrompt: false, installed: true }
  notify()
})

export function subscribePwaInstall(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPwaInstallState() {
  return state
}

export async function promptPwaInstall() {
  const promptEvent = deferredPrompt
  if (!promptEvent) return null
  deferredPrompt = null
  state = { ...state, canPrompt: false }
  notify()
  await promptEvent.prompt()
  return promptEvent.userChoice
}
