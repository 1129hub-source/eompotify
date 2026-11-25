'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACCESS_COOKIE, ACCESS_MAX_AGE, isAccessConfigured, matchesAccessPassword, issueAccessToken } from '@/lib/eompotify/access'

export async function unlockEompotify(_previousState: string, formData: FormData): Promise<string> {
  if (!isAccessConfigured()) return '접속 설정이 완료되지 않았습니다. 관리자에게 문의하세요.'
  const password = formData.get('password')
  if (typeof password !== 'string' || !matchesAccessPassword(password)) {
    return '비밀번호가 올바르지 않습니다.'
  }
  const cookieStore = await cookies()
  cookieStore.set(ACCESS_COOKIE, issueAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  })
  redirect('/')
}
