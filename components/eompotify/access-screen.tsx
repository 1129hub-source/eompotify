'use client'

import { useActionState } from 'react'
import { unlockEompotify } from '@/app/access-actions'

export function AccessScreen() {
  const [error, submit, pending] = useActionState(unlockEompotify, '')

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-[#121212] px-5 py-8 text-white">
      <section aria-labelledby="access-title" className="w-full max-w-[360px] rounded-2xl border border-[#303030] bg-[#1e1e1e] p-6 shadow-xl sm:p-8">
        <h1 id="access-title" className="text-center text-lg font-semibold tracking-tight">모르면 등신</h1>
        <form action={submit} className="mt-6 flex flex-col gap-4">
          <div className="relative">
            <label htmlFor="access-password" className="sr-only">비밀번호</label>
            <input
              id="access-password"
              name="password"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="비밀번호"
              maxLength={256}
              required
              disabled={pending}
              aria-invalid={!!error}
              aria-describedby={error ? 'access-error' : undefined}
              className="h-12 w-full rounded-lg border border-[#414141] bg-[#292929] px-4 pr-11 text-base text-white outline-none placeholder:text-[#909090] focus:border-[#1db954] disabled:opacity-60"
            />
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#909090]">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          {error && <p id="access-error" role="alert" className="text-sm text-[#ff9292]">{error}</p>}
          <button type="submit" disabled={pending} className="h-12 w-full rounded-full bg-[#1db954] text-sm font-semibold text-[#111111] transition-colors hover:bg-[#1ed760] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1db954] disabled:cursor-wait disabled:opacity-60">
            {pending ? '확인 중...' : '접속하기'}
          </button>
        </form>
      </section>
    </main>
  )
}
