'use client'

import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { LIKED_PLAYLIST_ID } from '@/lib/eompotify/constants'
import type { Playlist } from '@/lib/eompotify/types'
import { getFallbackCover } from '@/lib/eompotify/utils'
import { FallbackImg } from './fallback-img'
import {
  BrandLogo,
  CloseIcon,
  HeartFilledIcon,
  MusicNoteIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from './icons'

type Props = {
  open: boolean
  onClose: () => void
  brandSubtitle: string
  onSaveSubtitle: (text: string) => void
  playlists: Playlist[]
  activePlaylistId: string | null
  onSelectPlaylist: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
  onNewPlaylist: () => void
  onEditPlaylist: (id: string) => void
  onDeletePlaylist: (id: string) => void
}

export function Sidebar({
  open,
  onClose,
  brandSubtitle,
  onSaveSubtitle,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onReorder,
  onNewPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
}: Props) {
  const navRef = useRef<HTMLElement>(null)
  const sourceRef = useRef<string | null>(null)
  const touchingRef = useRef(false)
  const suppressClickUntil = useRef(0)
  const reorderRef = useRef(onReorder)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  useEffect(() => { reorderRef.current = onReorder }, [onReorder])

  function clearDrag() {
    sourceRef.current = null
    setSourceId(null)
    setOverId(null)
  }

  // 곡 목록처럼 모바일은 행을 잠시 길게 누른 후 드래그한다.
  // 평소 터치 스크롤과 수정/삭제 버튼은 그대로 사용할 수 있다.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let touchId: number | null = null
    let startX = 0
    let startY = 0
    let dragging = false
    let targetId: string | null = null
    let pendingSource: string | null = null

    const rowAt = (el: Element | null) => {
      const row = el?.closest<HTMLElement>('[data-playlist-id]')
      const id = row && nav.contains(row) ? row.dataset.playlistId ?? null : null
      return id === LIKED_PLAYLIST_ID ? null : id
    }
    const reset = (commit: boolean) => {
      clearTimeout(timer)
      if (dragging) {
        const from = sourceRef.current
        suppressClickUntil.current = Date.now() + 350
        clearDrag()
        if (commit && from && targetId && from !== targetId) reorderRef.current(from, targetId)
      }
      touchId = null
      touchingRef.current = false
      dragging = false
      targetId = null
      pendingSource = null
    }
    const start = (e: TouchEvent) => {
      if (touchId !== null || e.touches.length !== 1) { reset(false); return }
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest('button')) return
      const id = rowAt(el)
      if (!id) return
      const t = e.touches[0]
      touchId = t.identifier
      touchingRef.current = true
      pendingSource = id
      startX = t.clientX
      startY = t.clientY
      timer = setTimeout(() => {
        if (!pendingSource) return
        dragging = true
        sourceRef.current = pendingSource
        setSourceId(pendingSource)
        if (navigator.vibrate) { try { navigator.vibrate(25) } catch {} }
      }, 100)
    }
    const move = (e: TouchEvent) => {
      const t = Array.from(e.touches).find((touch) => touch.identifier === touchId)
      if (!t) return
      if (!dragging) {
        if (Math.hypot(t.clientX - startX, t.clientY - startY) > 10) reset(false)
        return
      }
      if (e.cancelable) e.preventDefault()
      const id = rowAt(document.elementFromPoint(t.clientX, t.clientY))
      targetId = id && id !== sourceRef.current ? id : null
      setOverId(targetId)
    }
    const end = (e: TouchEvent) => {
      const t = Array.from(e.changedTouches).find((touch) => touch.identifier === touchId)
      if (!t) return
      if (dragging) {
        if (e.cancelable) e.preventDefault()
        const id = rowAt(document.elementFromPoint(t.clientX, t.clientY))
        targetId = id && id !== sourceRef.current ? id : null
      }
      reset(true)
    }
    const cancel = () => reset(false)
    nav.addEventListener('touchstart', start, { passive: true })
    nav.addEventListener('touchmove', move, { passive: false })
    nav.addEventListener('touchend', end, { passive: false })
    nav.addEventListener('touchcancel', cancel)
    return () => {
      clearTimeout(timer)
      touchingRef.current = false
      sourceRef.current = null
      nav.removeEventListener('touchstart', start)
      nav.removeEventListener('touchmove', move)
      nav.removeEventListener('touchend', end)
      nav.removeEventListener('touchcancel', cancel)
    }
  }, [])

  function startDrag(e: DragEvent<HTMLDivElement>, id: string) {
    if (id === LIKED_PLAYLIST_ID || touchingRef.current || (e.target instanceof Element && e.target.closest('button'))) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    sourceRef.current = id
    setSourceId(id)
  }

  return (
    <aside
      className={`fixed lg:relative top-0 left-0 z-40 h-dvh lg:h-full min-h-0 w-72 bg-[#0a0a0a] border-r border-neutral-800/80 flex flex-col transform lg:translate-x-0 transition-transform duration-200 ease-out shrink-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-5 border-b border-neutral-800/70">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="w-9 h-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-extrabold tracking-tight text-white leading-none">EOMpotify</h1>
            <BrandSubtitle value={brandSubtitle} onSave={onSaveSubtitle} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={onNewPlaylist}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-sm font-semibold text-white transition-all"
        >
          <PlusIcon className="w-4 h-4 text-[#1DB954]" />
          <span>새 플레이리스트</span>
        </button>
      </div>

      <div className="px-5 pb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Playlist</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
          {playlists.length}
        </span>
      </div>

      <nav
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 space-y-1"
        aria-label="플레이리스트 목록"
        onClickCapture={(e) => {
          if (Date.now() < suppressClickUntil.current) {
            e.preventDefault()
            e.stopPropagation()
            suppressClickUntil.current = 0
          }
        }}
        onContextMenu={(e) => { if (touchingRef.current) e.preventDefault() }}
      >
        {playlists.map((pl) => (
          <PlaylistItem
            key={pl.id}
            playlist={pl}
            isActive={pl.id === activePlaylistId}
            isDragSource={sourceId === pl.id}
            isDragOver={overId === pl.id}
            onDragStart={(e) => startDrag(e, pl.id)}
            onDragOver={(e) => {
              if (pl.id === LIKED_PLAYLIST_ID) {
                setOverId(null)
                return
              }
              if (!sourceRef.current || sourceRef.current === LIKED_PLAYLIST_ID || sourceRef.current === pl.id) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setOverId(pl.id)
            }}
            onDragLeave={(e) => {
              if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
              setOverId((cur) => (cur === pl.id ? null : cur))
            }}
            onDrop={(e) => {
              if (!sourceRef.current) return
              e.preventDefault()
              const from = sourceRef.current
              clearDrag()
              if (from !== pl.id && from !== LIKED_PLAYLIST_ID && pl.id !== LIKED_PLAYLIST_ID) onReorder(from, pl.id)
            }}
            onDragEnd={clearDrag}
            onMove={(direction) => {
              const index = playlists.findIndex((p) => p.id === pl.id)
              const target = playlists[index + direction]
              if (target && pl.id !== LIKED_PLAYLIST_ID && target.id !== LIKED_PLAYLIST_ID) onReorder(pl.id, target.id)
            }}
            onSelect={() => onSelectPlaylist(pl.id)}
            onEdit={() => onEditPlaylist(pl.id)}
            onDelete={() => onDeletePlaylist(pl.id)}
          />
        ))}
      </nav>

    </aside>
  )
}

function BrandSubtitle({ value, onSave }: { value: string; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const editingRef = useRef(false)

  const start = () => {
    setDraft(value)
    editingRef.current = true
    setEditing(true)
  }

  const finish = (shouldSave: boolean) => {
    if (!editingRef.current) return
    editingRef.current = false
    if (shouldSave) onSave(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="text"
        maxLength={30}
        aria-label="부제목 수정"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') {
            e.preventDefault()
            finish(true)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            finish(false)
          }
        }}
        className="block mt-1 w-36 bg-neutral-900 text-white text-[11px] px-1.5 py-0.5 rounded border border-neutral-700 focus:border-[#1DB954] outline-none"
      />
    )
  }

  return (
    <p
      title="클릭하여 문구 수정"
      role="button"
      tabIndex={0}
      onClick={start}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          start()
        }
      }}
      className="text-[11px] text-neutral-400 hover:text-neutral-200 mt-1 cursor-pointer truncate transition-colors"
    >
      {value}
    </p>
  )
}

function PlaylistItem({
  playlist: pl,
  isActive,
  isDragSource,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMove,
  onSelect,
  onEdit,
  onDelete,
}: {
  playlist: Playlist
  isActive: boolean
  isDragSource: boolean
  isDragOver: boolean
  onDragStart: (e: DragEvent<HTMLDivElement>) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onMove: (direction: -1 | 1) => void
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isLiked = pl.id === LIKED_PLAYLIST_ID

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!isLiked}
      data-playlist-id={pl.id}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-keyshortcuts={isLiked ? undefined : "Alt+ArrowUp Alt+ArrowDown"}
      aria-current={isActive ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (!isLiked && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault()
          onMove(e.key === 'ArrowUp' ? -1 : 1)
          return
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer select-none [-webkit-touch-callout:none] transition-all ${
        isActive ? 'bg-neutral-800/90 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
      } ${isDragSource ? 'opacity-40' : ''} ${isDragOver ? 'ring-2 ring-[#1DB954]/70 bg-neutral-800/60' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {pl.cover ? (
          <FallbackImg
            src={pl.cover}
            fallbackSrc={getFallbackCover(pl.name)}
            alt=""
            draggable={false}
            className="w-9 h-9 aspect-square rounded-lg object-cover shrink-0 border border-neutral-800"
          />
        ) : isLiked ? (
          <div className="w-9 h-9 rounded-lg bg-linear-to-br from-rose-500 to-purple-600 flex items-center justify-center shrink-0">
            <HeartFilledIcon className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-400">
            <MusicNoteIcon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-[#1DB954]' : ''}`}>{pl.name}</p>
          <p className="text-[11px] text-neutral-500 truncate">{pl.tracks.length}곡</p>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          title="플레이리스트 수정"
          aria-label="플레이리스트 수정"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/80 transition-colors"
        >
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
        {!isLiked && (
          <button
            type="button"
            title="플레이리스트 삭제"
            aria-label="플레이리스트 삭제"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-700/80 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
