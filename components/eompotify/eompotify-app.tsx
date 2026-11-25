'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useYouTubePlayer } from '@/hooks/use-youtube-player'
import { findArtworkCandidates } from '@/lib/eompotify/artwork'
import {
  DEFAULT_BRAND_SUBTITLE,
  DEFAULT_PLAYLISTS,
  LIKED_PLAYLIST_ID,
  LIKED_PLAYLIST_NAME,
} from '@/lib/eompotify/constants'
import {
  type RemoteSnapshot,
  SETTING_DEFAULT_COVER,
  SETTING_SUBTITLE,
  fetchSnapshot,
  saveSetting,
  subscribeToChanges,
  syncPlaylists,
  uploadImageDataUrl,
} from '@/lib/eompotify/remote'
import type { CurrentTrack, NewTrackInput, Playlist, RepeatMode } from '@/lib/eompotify/types'
import { createId, cropImageFileToSquare, getFallbackCover } from '@/lib/eompotify/utils'
import { AddTrackModal } from './add-track-modal'
import { EditPlaylistModal } from './edit-playlist-modal'
import { EditTrackModal } from './edit-track-modal'
import { FallbackImg } from './fallback-img'
import { BrandLogo, MenuIcon, PlusIcon } from './icons'
import { NowPlaying } from './now-playing'
import { PlayerBar } from './player-bar'
import { Sidebar } from './sidebar'
import { ConfirmDeleteModal, NewPlaylistModal } from './simple-modals'
import { ToastContainer, useToasts } from './toaster'
import { TrackList } from './track-list'

type ModalState =
  | null
  | { type: 'add' }
  | { type: 'newPlaylist' }
  | { type: 'editTrack'; playlistId: string; trackId: string }
  | { type: 'editPlaylist'; playlistId: string }
  | { type: 'deletePlaylist'; playlistId: string }

function ensureLikedPlaylist(list: Playlist[]): Playlist[] {
  const idx = list.findIndex((p) => p.id === LIKED_PLAYLIST_ID)
  if (idx === -1) {
    return [{ id: LIKED_PLAYLIST_ID, name: LIKED_PLAYLIST_NAME, cover: '', isLiked: true, tracks: [] }, ...list]
  }
  const liked = { ...list[idx], name: LIKED_PLAYLIST_NAME, isLiked: true }
  return [liked, ...list.filter((_, i) => i !== idx)]
}

function firstNormalPlaylistId(list: Playlist[]) {
  const liked = list.find((p) => p.id === LIKED_PLAYLIST_ID)
  return liked ? liked.id : list[0]?.id ?? null
}

export function EompotifyApp() {
  const { toasts, showToast } = useToasts()

  const [loaded, setLoaded] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [brandSubtitle, setBrandSubtitle] = useState(DEFAULT_BRAND_SUBTITLE)
  const [defaultCover, setDefaultCover] = useState('')
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [openTrackMenuId, setOpenTrackMenuId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const playlistsRef = useRef<Playlist[]>([])
  const currentTrackRef = useRef<CurrentTrack | null>(null)
  const activePlaylistIdRef = useRef<string | null>(null)
  const isShuffleRef = useRef(false)
  const repeatModeRef = useRef<RepeatMode>('off')
  const consecutiveErrorsRef = useRef(0)
  const hydratedRef = useRef(false)
  const showToastRef = useRef(showToast)
  showToastRef.current = showToast

  const writeChainRef = useRef<Promise<void>>(Promise.resolve())
  const writeVersionRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    isShuffleRef.current = isShuffle
    repeatModeRef.current = repeatMode
  }, [isShuffle, repeatMode])

  const enqueueWrite = useCallback((task: () => Promise<void>) => {
    writeVersionRef.current += 1
    writeChainRef.current = writeChainRef.current.then(task).catch((err) => {
      console.warn('공용 DB 저장 실패:', err)
      showToastRef.current('변경 사항을 저장하지 못했습니다. 네트워크를 확인해 주세요.', 'error')
    })
  }, [])

  const commitPlaylists = useCallback(
    (updater: (prev: Playlist[]) => Playlist[]) => {
      const prev = playlistsRef.current
      const next = updater(prev)
      playlistsRef.current = next
      setPlaylists(next)
      enqueueWrite(() => syncPlaylists(prev, next))
    },
    [enqueueWrite],
  )

  const commitCurrentTrack = useCallback((next: CurrentTrack | null) => {
    currentTrackRef.current = next
    setCurrentTrack(next)
  }, [])

  const commitActivePlaylistId = useCallback((id: string | null) => {
    activePlaylistIdRef.current = id
    setActivePlaylistId(id)
  }, [])

  const getActivePlaylist = () =>
    playlistsRef.current.find((p) => p.id === activePlaylistIdRef.current) || playlistsRef.current[0] || null

  /* ---------- YouTube 재생 제어 ---------- */
  const yt = useYouTubePlayer({
    onPlaying: () => {
      consecutiveErrorsRef.current = 0
      setIsPlaying(true)
    },
    onPaused: () => setIsPlaying(false),
    onEnded: () => playNextTrack(true),
    onProgress: (cur, dur) => {
      if (!currentTrackRef.current) return
      setCurrentTime(cur)
      setDuration(dur)
    },
    onError: (code) => {
      const cur = currentTrackRef.current
      const pl = cur && playlistsRef.current.find((p) => p.id === cur.playlistId)
      const totalTracks = pl ? pl.tracks.length : 0
      consecutiveErrorsRef.current += 1

      const isEmbedRestricted = code === 101 || code === 150
      if (totalTracks > 1 && consecutiveErrorsRef.current < totalTracks) {
        showToast(
          isEmbedRestricted
            ? '이 영상은 외부 재생이 제한되어 다음 곡으로 넘어갑니다.'
            : '영상을 재생할 수 없어 다음 곡으로 넘어갑니다.',
          'error',
        )
        playNextTrack(false, true)
      } else {
        setIsPlaying(false)
        consecutiveErrorsRef.current = 0
        showToast(
          isEmbedRestricted
            ? '현재 환경 또는 영상 설정으로 외부 재생이 제한됩니다. 실제 배포 환경에서 확인하거나 다른 링크를 사용해 주세요.'
            : '현재 영상을 재생할 수 없습니다.',
          'error',
        )
      }
    },
  })

  function playTrack(playlistId: string, trackId: string, fromError = false) {
    const pl = playlistsRef.current.find((p) => p.id === playlistId)
    if (!pl) return
    const track = pl.tracks.find((t) => t.id === trackId)
    if (!track) return

    if (!fromError) consecutiveErrorsRef.current = 0

    setCurrentTime(0)
    setDuration(0)
    commitCurrentTrack({
      playlistId: pl.id,
      trackId: track.id,
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      albumArt: track.albumArt || '',
    })
    setIsPlaying(true)
    yt.load(track.videoId)
  }

  function handleSeek(seconds: number) {
    if (!currentTrackRef.current || !Number.isFinite(seconds) || duration <= 0) return
    const target = Math.max(0, Math.min(seconds, duration))
    if (yt.seekTo(target)) setCurrentTime(target)
  }

  function togglePlayPause() {
    const cur = currentTrackRef.current
    if (!cur) {
      const pl = getActivePlaylist()
      if (pl && pl.tracks.length > 0) playTrack(pl.id, pl.tracks[0].id)
      else showToast('재생할 곡이 없습니다.', 'error')
      return
    }
    if (!yt.toggle()) yt.load(cur.videoId)
  }

  function playNextTrack(isAutoEnded = false, fromError = false) {
    const cur = currentTrackRef.current
    if (!cur) return
    const pl = playlistsRef.current.find((p) => p.id === cur.playlistId)
    if (!pl || pl.tracks.length === 0) return
    const repeat = repeatModeRef.current

    if (isAutoEnded && repeat === 'one') {
      setCurrentTime(0)
      if (!yt.restart()) yt.load(cur.videoId)
      return
    }

    const idx = pl.tracks.findIndex((t) => t.id === cur.trackId)

    if (isShuffleRef.current) {
      if (pl.tracks.length === 1) {
        if (isAutoEnded && repeat === 'off') {
          setIsPlaying(false)
          return
        }
        playTrack(pl.id, pl.tracks[0].id, fromError)
        return
      }
      let randIdx = idx
      while (randIdx === idx) randIdx = Math.floor(Math.random() * pl.tracks.length)
      playTrack(pl.id, pl.tracks[randIdx].id, fromError)
      return
    }

    if (isAutoEnded && repeat === 'off' && idx === pl.tracks.length - 1) {
      setIsPlaying(false)
      return
    }

    const nextIdx = idx === -1 ? 0 : (idx + 1) % pl.tracks.length
    playTrack(pl.id, pl.tracks[nextIdx].id, fromError)
  }

  function playPrevTrack() {
    const cur = currentTrackRef.current
    if (!cur) return
    const pl = playlistsRef.current.find((p) => p.id === cur.playlistId)
    if (!pl || pl.tracks.length === 0) return

    const idx = pl.tracks.findIndex((t) => t.id === cur.trackId)
    if (isShuffleRef.current && pl.tracks.length > 1) {
      let randIdx = idx
      while (randIdx === idx) randIdx = Math.floor(Math.random() * pl.tracks.length)
      playTrack(pl.id, pl.tracks[randIdx].id)
      return
    }
    const prevIdx = idx <= 0 ? pl.tracks.length - 1 : idx - 1
    playTrack(pl.id, pl.tracks[prevIdx].id)
  }

  function toggleShuffle() {
    const next = !isShuffle
    setIsShuffle(next)
    showToast(next ? '랜덤 재생을 켰습니다.' : '랜덤 재생을 껐습니다.')
  }

  function cycleRepeatMode() {
    const order: RepeatMode[] = ['off', 'all', 'one']
    const next = order[(order.indexOf(repeatMode) + 1) % order.length]
    setRepeatMode(next)
    showToast(
      next === 'all'
        ? '전체 반복 재생으로 설정했습니다.'
        : next === 'one'
          ? '한 곡 반복 재생으로 설정했습니다.'
          : '반복 재생을 껐습니다.',
    )
  }

  /* ---------- 공용 DB 스냅샷 반영 ---------- */
  const applySnapshot = useCallback(
    (snap: RemoteSnapshot) => {
      const next = ensureLikedPlaylist(snap.playlists)
      playlistsRef.current = next
      setPlaylists(next)
      if (!next.some((p) => p.id === activePlaylistIdRef.current)) {
        commitActivePlaylistId(firstNormalPlaylistId(next))
      }
      const subtitle = (snap.settings[SETTING_SUBTITLE] || '').trim()
      setBrandSubtitle(subtitle || DEFAULT_BRAND_SUBTITLE)
      setDefaultCover(snap.settings[SETTING_DEFAULT_COVER] || '')
      return next
    },
    [commitActivePlaylistId],
  )

  const refreshFromRemote = useCallback(async () => {
    await writeChainRef.current
    const version = writeVersionRef.current
    try {
      const snap = await fetchSnapshot()
      if (version !== writeVersionRef.current) return
      applySnapshot(snap)
    } catch (err) {
      console.warn('공용 DB 동기화 실패:', err)
    }
  }, [applySnapshot])

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        void refreshFromRemote()
      }, 300)
    })
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      unsubscribe()
    }
  }, [refreshFromRemote])

  /* ---------- 초기 로드 ---------- */
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    ;(async () => {
      let snap: RemoteSnapshot
      try {
        snap = await fetchSnapshot()
      } catch (err) {
        console.warn('공용 DB 로드 실패:', err)
        showToastRef.current('플레이리스트를 불러오지 못했습니다. 새로고침해 주세요.', 'error')
        return
      }

      const source = snap.playlists.some((p) => !p.isLiked)
        ? snap.playlists
        : [...snap.playlists, ...JSON.parse(JSON.stringify(DEFAULT_PLAYLISTS))]
      const initial = applySnapshot({ ...snap, playlists: source })
      commitActivePlaylistId(firstNormalPlaylistId(initial))
      // Restore the persisted position if an earlier version moved Liked songs.
      if (initial.length !== snap.playlists.length || initial.some((p, i) => p.id !== snap.playlists[i]?.id)) {
        enqueueWrite(() => syncPlaylists(snap.playlists, initial))
      }
      setLoaded(true)

      const found = new Map<string, { albumArt: string; title: string; artist: string; previousArt: string }>()
      for (const pl of initial) {
        for (const track of pl.tracks) {
          const needsLookup = !track.albumArt || track.albumArt.includes('i.ytimg.com') || track.needsArtworkLookup
          if (!needsLookup) continue
          try {
            const results = await findArtworkCandidates(track.title, track.artist, 5)
            if (results.length > 0 && results[0].albumArt) {
              found.set(track.id, { albumArt: results[0].albumArt, title: track.title, artist: track.artist, previousArt: track.albumArt })
            }
          } catch (err) {
            console.warn('기존 곡 앨범아트 검색 실패:', err)
          }
        }
      }
      if (found.size === 0) return
      commitPlaylists((prev) =>
        prev.map((pl) => ({
          ...pl,
          tracks: pl.tracks.map((t) => {
            const result = found.get(t.id)
            if (!result || t.title !== result.title || t.artist !== result.artist || t.albumArt !== result.previousArt) return t
            const { needsArtworkLookup: _omit, ...rest } = t
            return { ...rest, albumArt: result.albumArt }
          }),
        })),
      )
      const cur = currentTrackRef.current
      if (cur && found.has(cur.trackId)) {
        const updated = playlistsRef.current.find((pl) => pl.id === cur.playlistId)?.tracks.find((t) => t.id === cur.trackId)
        if (updated && updated.albumArt !== cur.albumArt) commitCurrentTrack({ ...cur, albumArt: updated.albumArt })
      }
    })()
  }, [applySnapshot, commitActivePlaylistId, commitCurrentTrack, commitPlaylists, enqueueWrite])

  /* ---------- 전역 이벤트 ---------- */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-track-menu]') || target.closest('button[data-action="toggle-track-menu"]')) return
      setOpenTrackMenuId(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenTrackMenuId(null)
      setModal(null)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  /* ---------- 데이터 조작 ---------- */
  const likedPlaylist = playlists.find((p) => p.id === LIKED_PLAYLIST_ID)
  const isCurrentLiked =
    !!currentTrack && !!likedPlaylist && likedPlaylist.tracks.some((t) => t.videoId === currentTrack.videoId)

  function toggleLikeCurrentTrack() {
    const cur = currentTrackRef.current
    if (!cur) return
    const liked = ensureLikedPlaylist(playlistsRef.current).find((p) => p.id === LIKED_PLAYLIST_ID)!
    const exists = liked.tracks.some((t) => t.videoId === cur.videoId)
    commitPlaylists((prev) => {
      const list = ensureLikedPlaylist(prev)
      const likedPl = list.find((p) => p.id === LIKED_PLAYLIST_ID)!
      const tracks = exists
        ? likedPl.tracks.filter((t) => t.videoId !== cur.videoId)
        : [
            ...likedPl.tracks,
            { id: createId('tr'), videoId: cur.videoId, title: cur.title, artist: cur.artist, albumArt: cur.albumArt || '' },
          ]
      return list.map((p) => (p.id === LIKED_PLAYLIST_ID ? { ...p, tracks } : p))
    })
    showToast(exists ? 'Liked songs에서 제거되었습니다.' : 'Liked songs에 추가되었습니다.')
  }

  function updateTracks(playlistId: string, fn: (tracks: Playlist['tracks']) => Playlist['tracks']) {
    commitPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, tracks: fn(p.tracks) } : p)))
  }

  function reorderPlaylists(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId || fromId === LIKED_PLAYLIST_ID || toId === LIKED_PLAYLIST_ID) return
    commitPlaylists((prev) => {
      const fromIdx = prev.findIndex((p) => p.id === fromId)
      const toIdx = prev.findIndex((p) => p.id === toId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }

  function reorderTracks(playlistId: string, fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return
    updateTracks(playlistId, (tracks) => {
      const fromIdx = tracks.findIndex((t) => t.id === fromId)
      const toIdx = tracks.findIndex((t) => t.id === toId)
      if (fromIdx === -1 || toIdx === -1) return tracks
      const next = [...tracks]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }

  function deleteTrack(playlistId: string, trackId: string) {
    const pl = playlistsRef.current.find((p) => p.id === playlistId)
    const removed = pl?.tracks.find((t) => t.id === trackId)
    if (!pl || !removed) return
    updateTracks(playlistId, (tracks) => tracks.filter((t) => t.id !== trackId))
    const cur = currentTrackRef.current
    if (cur && cur.playlistId === playlistId && cur.trackId === trackId) {
      commitCurrentTrack(null)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      yt.stop()
    }
    showToast(`'${removed.title}' 곡을 삭제했습니다.`)
  }

  function addTrack(input: NewTrackInput) {
    const pl = getActivePlaylist()
    if (!pl) return
    updateTracks(pl.id, (tracks) => [...tracks, { id: createId('tr'), ...input }])
    setModal(null)
    showToast(`'${input.title}' 곡이 추가되었습니다.`)
  }

  function createPlaylist(name: string) {
    const newPl: Playlist = { id: createId('pl'), name, cover: '', tracks: [] }
    commitPlaylists((prev) => [...prev, newPl])
    commitActivePlaylistId(newPl.id)
    setModal(null)
    setSidebarOpen(false)
    showToast(`'${name}' 플레이리스트를 만들었습니다.`)
  }

  function saveEditedTrack(playlistId: string, trackId: string, values: { title: string; artist: string; albumArt: string }) {
    updateTracks(playlistId, (tracks) => tracks.map((t) => (t.id === trackId ? { ...t, ...values } : t)))
    const cur = currentTrackRef.current
    if (cur && cur.playlistId === playlistId && cur.trackId === trackId) commitCurrentTrack({ ...cur, ...values })
    setModal(null)
    showToast('곡 정보가 수정되었습니다.')
  }

  async function saveEditedPlaylist(playlistId: string, values: { name: string; cover: string }) {
    const isLiked = playlistId === LIKED_PLAYLIST_ID
    setModal(null)
    let cover = values.cover || ''
    if (cover.startsWith('data:')) {
      try {
        cover = await uploadImageDataUrl(cover, 'playlist-covers')
      } catch (err) {
        console.warn('커버 업로드 실패, DB에 직접 저장합니다:', err)
      }
    }
    commitPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, name: isLiked ? p.name : values.name, cover } : p)),
    )
    showToast(isLiked ? 'Liked songs 커버가 변경되었습니다.' : '플레이리스트가 수정되었습니다.')
  }

  function confirmDeletePlaylist(id: string) {
    if (id === LIKED_PLAYLIST_ID) return
    const removed = playlistsRef.current.find((p) => p.id === id)
    if (!removed) return
    commitPlaylists((prev) => prev.filter((p) => p.id !== id))
    if (activePlaylistIdRef.current === id) {
      const remaining = playlistsRef.current
      const fallback = remaining.find((p) => p.id !== LIKED_PLAYLIST_ID) || remaining[0]
      commitActivePlaylistId(fallback ? fallback.id : null)
    }
    const cur = currentTrackRef.current
    if (cur && cur.playlistId === id) {
      commitCurrentTrack(null)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      yt.stop()
    }
    setModal(null)
    showToast(`'${removed.name}' 플레이리스트를 삭제했습니다.`)
  }

  function saveBrandSubtitle(text: string) {
    const next = (text || '').trim() || DEFAULT_BRAND_SUBTITLE
    setBrandSubtitle(next)
    enqueueWrite(() => saveSetting(SETTING_SUBTITLE, next))
  }

  async function handleDefaultCoverFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다.', 'error')
      return
    }
    try {
      const dataUrl = await cropImageFileToSquare(file, 400, 0.88)
      setDefaultCover(dataUrl)
      let stored = dataUrl
      try {
        stored = await uploadImageDataUrl(dataUrl, 'default-covers')
        setDefaultCover(stored)
      } catch (err) {
        console.warn('기본 커버 업로드 실패, DB에 직접 저장합니다:', err)
      }
      enqueueWrite(() => saveSetting(SETTING_DEFAULT_COVER, stored))
      showToast('기본 앨범아트가 변경되었습니다.')
    } catch (err) {
      console.warn('기본 커버 처리 실패:', err)
    }
  }

  /* ---------- 렌더링 ---------- */
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || playlists[0] || null

  const editTrackTarget =
    modal?.type === 'editTrack'
      ? playlists.find((p) => p.id === modal.playlistId)?.tracks.find((t) => t.id === modal.trackId)
      : undefined
  const editPlaylistTarget = modal?.type === 'editPlaylist' ? playlists.find((p) => p.id === modal.playlistId) : undefined
  const deletePlaylistTarget =
    modal?.type === 'deletePlaylist' ? playlists.find((p) => p.id === modal.playlistId) : undefined

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[35] bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            brandSubtitle={brandSubtitle}
            onSaveSubtitle={saveBrandSubtitle}
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            onSelectPlaylist={(id) => {
              commitActivePlaylistId(id)
              setOpenTrackMenuId(null)
              setSidebarOpen(false)
            }}
            onReorder={reorderPlaylists}
            onNewPlaylist={() => setModal({ type: 'newPlaylist' })}
            onEditPlaylist={(id) => setModal({ type: 'editPlaylist', playlistId: id })}
            onDeletePlaylist={(id) => {
              if (id !== LIKED_PLAYLIST_ID) setModal({ type: 'deletePlaylist', playlistId: id })
            }}
          />

          <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
            <header className="sticky top-0 z-20 lg:hidden flex items-center justify-between px-4 py-3 bg-[#121212]/90 backdrop-blur-md border-b border-neutral-800/80">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="재생목록 메뉴 열기"
                className="p-2 -ml-1 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <MenuIcon className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <BrandLogo className="w-6 h-6 shrink-0" />
                <span className="text-sm font-bold tracking-tight">EOMpotify</span>
              </div>
              <div className="w-9" />
            </header>

            <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6">
              <NowPlaying
                currentTrack={currentTrack}
                defaultCover={defaultCover}
                liked={isCurrentLiked}
                onToggleLike={toggleLikeCurrentTrack}
                onPickDefaultCover={handleDefaultCoverFile}
              />

              <section className="space-y-4">
                <div className="flex items-end justify-between gap-4 pb-4 border-b border-neutral-800/80">
                  <div className="flex items-center gap-4 min-w-0">
                    {activePlaylist?.cover && (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 shadow-lg">
                        <FallbackImg
                          key={activePlaylist.cover}
                          src={activePlaylist.cover}
                          fallbackSrc={getFallbackCover(activePlaylist.name)}
                          alt="재생목록 커버"
                          className="w-full h-full aspect-square object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#1DB954]">PLAYLIST</span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate mt-1">
                        {activePlaylist ? activePlaylist.name : '재생목록'}
                      </h2>
                      <p className="text-sm text-neutral-400 mt-1">총 {activePlaylist ? activePlaylist.tracks.length : 0}곡</p>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      title="곡 추가"
                      aria-label="곡 추가"
                      onClick={() => setModal({ type: 'add' })}
                      className="w-9 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 active:scale-95 text-neutral-950 flex items-center justify-center transition-all shadow-md shadow-[#1DB954]/25"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {loaded && activePlaylist && (
                  <TrackList
                    playlist={activePlaylist}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    openTrackMenuId={openTrackMenuId}
                    setOpenTrackMenuId={setOpenTrackMenuId}
                    onPlay={(trackId) => playTrack(activePlaylist.id, trackId)}
                    onEdit={(trackId) => setModal({ type: 'editTrack', playlistId: activePlaylist.id, trackId })}
                    onDelete={(trackId) => deleteTrack(activePlaylist.id, trackId)}
                    onReorder={(fromId, toId) => reorderTracks(activePlaylist.id, fromId, toId)}
                  />
                )}
              </section>
            </div>
          </main>
        </div>

        <PlayerBar
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onToggleShuffle={toggleShuffle}
          onPrev={playPrevTrack}
          onPlayPause={togglePlayPause}
          onNext={() => playNextTrack(false)}
          onCycleRepeat={cycleRepeatMode}
        />
      </div>

      {/* 기존 오디오 플레이어의 iframe 연결 지점 */}
      <div className="yt-player-host fixed left-0 bottom-0 w-[200px] h-[200px] opacity-0 pointer-events-none -z-10" aria-hidden="true" inert ref={yt.hostRef} />
      <ToastContainer toasts={toasts} />
      {modal?.type === 'add' && (
        <AddTrackModal onClose={() => setModal(null)} onSubmit={addTrack} showToast={showToast} />
      )}
      {modal?.type === 'newPlaylist' && (
        <NewPlaylistModal onClose={() => setModal(null)} onSubmit={createPlaylist} />
      )}
      {modal?.type === 'editTrack' && editTrackTarget && (
        <EditTrackModal
          track={editTrackTarget}
          onClose={() => setModal(null)}
          onSubmit={(values) => saveEditedTrack(modal.playlistId, modal.trackId, values)}
          showToast={showToast}
        />
      )}
      {modal?.type === 'editPlaylist' && editPlaylistTarget && (
        <EditPlaylistModal
          playlist={editPlaylistTarget}
          onClose={() => setModal(null)}
          onSubmit={(values) => saveEditedPlaylist(modal.playlistId, values)}
          showToast={showToast}
        />
      )}
      {modal?.type === 'deletePlaylist' && deletePlaylistTarget && (
        <ConfirmDeleteModal
          description={`'${deletePlaylistTarget.name}' 플레이리스트와 수록곡 ${deletePlaylistTarget.tracks.length}곡이 모두 삭제됩니다.`}
          onClose={() => setModal(null)}
          onConfirm={() => confirmDeletePlaylist(modal.playlistId)}
        />
      )}
    </>
  )
}
