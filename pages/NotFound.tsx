import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-xs font-medium tracking-widest text-muted uppercase">Ошибка 404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Страница не найдена</h1>
      <p className="max-w-sm text-sm text-muted">
        Такой страницы в Pocket Finance нет. Вернитесь на главную панель или откройте кошельки.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-strong px-4 text-sm font-medium text-white transition hover:opacity-90"
      >
        <ArrowLeft size={16} /> На главную панель
      </Link>
    </div>
  )
}
