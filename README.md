# Pocket Finance

Личный финансовый учёт на React + Vite + Supabase.

## Backend

- Supabase project: `zmaqsrhbhprdrfmsfbzb` (Europe North).
- Browser client: `lib/supabase.ts`. Здесь используются только публичные URL и publishable key; секретные ключи в клиенте отсутствуют.
- Пользовательские кошельки, операции, переводы, записи Pocket Option, история и настройки сохраняются в `public.finance_state`.
- Row Level Security включён. Каждая строка доступна только владельцу (`auth.uid() = user_id`).
- Локальное хранилище Zustand отключено. Новые аккаунты начинаются пустыми; демо-набор загружается только вручную в Настройках.

## Обязательная настройка Supabase Auth

В Supabase Dashboard открой **Authentication → URL Configuration** и установи:

- **Site URL:** `https://maestro-777.github.io/Pocket-finance/`
- **Redirect URLs:** `https://maestro-777.github.io/Pocket-finance/` и `http://localhost:5173/`

Это нужно для возврата пользователя после подтверждения email.

## GitHub Pages

В GitHub открой **Settings → Pages** и выбери **Build and deployment → Source: GitHub Actions**. Workflow `.github/workflows/deploy.yml` собирает проект и публикует `dist` при push в `main`.

## Локальный запуск

```bash
pnpm install
pnpm dev
```

Проверка production-сборки:

```bash
pnpm build
pnpm preview
```
