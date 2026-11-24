import { createClient } from '@/lib/supabase/client'
import type { Playlist, Track } from './types'
import { createId } from './utils'

const IMAGE_BUCKET = 'eompotify-images'

export const SETTING_SUBTITLE = 'brand_subtitle'
export const SETTING_DEFAULT_COVER = 'default_cover'

type PlaylistRow = {
  id: string
  name: string
  cover: string
  is_liked: boolean
  position: number
}

type TrackRow = {
  id: string
  playlist_id: string
  video_id: string
  title: string
  artist: string
  album_art: string
  needs_artwork_lookup: boolean
  position: number
}

export type RemoteSnapshot = {
  playlists: Playlist[]
  settings: Record<string, string>
}

function toPlaylistRows(list: Playlist[]): PlaylistRow[] {
  return list.map((p, i) => ({
    id: p.id,
    name: p.name,
    cover: p.cover || '',
    is_liked: !!p.isLiked,
    position: i,
  }))
}

function toTrackRows(list: Playlist[]): TrackRow[] {
  return list.flatMap((p) =>
    p.tracks.map((t, i) => ({
      id: t.id,
      playlist_id: p.id,
      video_id: t.videoId,
      title: t.title,
      artist: t.artist || '',
      album_art: t.albumArt || '',
      needs_artwork_lookup: !!t.needsArtworkLookup,
      position: i,
    })),
  )
}

function changedRows<T extends { id: string }>(prev: T[], next: T[]) {
  const prevById = new Map(prev.map((r) => [r.id, JSON.stringify(r)]))
  const nextIds = new Set(next.map((r) => r.id))
  return {
    upserts: next.filter((r) => prevById.get(r.id) !== JSON.stringify(r)),
    deletedIds: prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id),
  }
}

export async function fetchSnapshot(): Promise<RemoteSnapshot> {
  const supabase = createClient()
  const [plRes, trRes, stRes] = await Promise.all([
    supabase.from('playlists').select('id, name, cover, is_liked, position').order('position'),
    supabase
      .from('tracks')
      .select('id, playlist_id, video_id, title, artist, album_art, needs_artwork_lookup, position')
      .order('position'),
    supabase.from('app_settings').select('key, value'),
  ])
  if (plRes.error) throw plRes.error
  if (trRes.error) throw trRes.error
  if (stRes.error) throw stRes.error

  const tracksByPlaylist = new Map<string, Track[]>()
  for (const row of trRes.data as TrackRow[]) {
    const track: Track = {
      id: row.id,
      videoId: row.video_id,
      title: row.title,
      artist: row.artist,
      albumArt: row.album_art,
      ...(row.needs_artwork_lookup ? { needsArtworkLookup: true } : {}),
    }
    const list = tracksByPlaylist.get(row.playlist_id) ?? []
    list.push(track)
    tracksByPlaylist.set(row.playlist_id, list)
  }

  const playlists: Playlist[] = (plRes.data as PlaylistRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    cover: row.cover,
    ...(row.is_liked ? { isLiked: true } : {}),
    tracks: tracksByPlaylist.get(row.id) ?? [],
  }))

  const settings: Record<string, string> = {}
  for (const row of stRes.data as { key: string; value: string }[]) settings[row.key] = row.value

  return { playlists, settings }
}

/** Writes only the rows that differ between two playlist states. */
export async function syncPlaylists(prev: Playlist[], next: Playlist[]) {
  const supabase = createClient()
  const pl = changedRows(toPlaylistRows(prev), toPlaylistRows(next))
  const tr = changedRows(toTrackRows(prev), toTrackRows(next))
  const deletedPlaylistIds = new Set(pl.deletedIds)
  const prevTrackPlaylist = new Map(toTrackRows(prev).map((r) => [r.id, r.playlist_id]))
  // Tracks of deleted playlists are removed by the ON DELETE CASCADE foreign key.
  const trackDeletes = tr.deletedIds.filter((id) => !deletedPlaylistIds.has(prevTrackPlaylist.get(id) ?? ''))

  if (trackDeletes.length) {
    const { error } = await supabase.from('tracks').delete().in('id', trackDeletes)
    if (error) throw error
  }
  if (pl.deletedIds.length) {
    const { error } = await supabase.from('playlists').delete().in('id', pl.deletedIds)
    if (error) throw error
  }
  if (pl.upserts.length) {
    const rows = pl.upserts.map((r) => ({ ...r, updated_at: new Date().toISOString() }))
    const { error } = await supabase.from('playlists').upsert(rows)
    if (error) throw error
  }
  if (tr.upserts.length) {
    const rows = tr.upserts.map((r) => ({ ...r, updated_at: new Date().toISOString() }))
    const { error } = await supabase.from('tracks').upsert(rows)
    if (error) throw error
  }
}

export async function saveSetting(key: string, value: string) {
  const { error } = await createClient()
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Uploads a compressed square data URL to Supabase Storage and returns its public URL. */
export async function uploadImageDataUrl(dataUrl: string, folder: string) {
  if (!dataUrl.startsWith('data:')) return dataUrl
  const blob = await (await fetch(dataUrl)).blob()
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${folder}/${createId('img')}.${ext}`
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (error) throw error
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Calls onChange whenever any shared table changes (including this client's own writes). */
export function subscribeToChanges(onChange: () => void) {
  const supabase = createClient()
  const channel = supabase
    .channel('eompotify-shared')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
