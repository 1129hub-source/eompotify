import { cookies } from 'next/headers'
import { EompotifyApp } from '@/components/eompotify/eompotify-app'
import { AccessScreen } from '@/components/eompotify/access-screen'
import { ACCESS_COOKIE, hasValidAccess } from '@/lib/eompotify/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Page() {
  const cookieStore = await cookies()
  if (!hasValidAccess(cookieStore.get(ACCESS_COOKIE)?.value)) {
    return <AccessScreen />
  }
  return <EompotifyApp />
}
