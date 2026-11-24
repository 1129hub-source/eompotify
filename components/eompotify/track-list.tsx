'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { LIKED_PLAYLIST_ID } from '@/lib/eompotify/constants'
import type { CurrentTrack, Playlist, Track } from '@/lib/eompotify/types'
import { getFallbackCover, normalizeArtworkUrl } from '@/lib/eompotify/utils'
import { FallbackImg } from './fallback-img'
import { MoreIcon, MusicNoteIcon, PencilIcon, TrashIcon } from './icons'

type Props = {
  playlist: Playlist
  currentTrack: CurrentTrack | null
  isPlaying: boolean
  openTrackMenuId: string | null
  setOpenTrackMenuId: (id: string | null) => void
  onPlay: (trackId: string) => void
  onEdit: (trackId: string) => void
  onDelete: (trackId: string) => void
  onReorder: (fromId: string, toId: string) => void
}

export function TrackList({
  playlist: pl,
  currentTrack,
  isPlaying,
  openTrackMenuId,
  setOpenTrackMenuId,
  onPlay,
  onEdit,
  onDelete,
  onReorder,
}: Props) {
  const draggedIdRef = useRef<string | null>(null)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [touchSourceId, setTouchSourceId] = useState<string | null>(null)
  const [touchOverId, setTouchOverId] = useState<string | null>(null)

  if (pl.tracks.length === 0) {
    const isLiked = pl.id === LIKED_PLAYLIST_ID
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800">
        <div className="w-12 h-12 rounded-2xl bg-neutral-800/90 flex items-center justify-center text-neutral-400 mb-3">
          <MusicNoteIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-neutral-300">
          {isLiked ? '좋아요한 곡이 아직 없습니다' : '아직 추가된 곡이 없습니다'}
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          {isLiked ? '곡 재생 중 우측 하트 버튼을 눌러 추가해 보세요.' : '우측 상단 + 버튼을 눌러 첫 곡을 추가해 보세요.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {pl.tracks.map((track, idx) => (
        <TrackRow
          key={track.id}
          track={track}
          index={idx}
          isCurrent={!!currentTrack && currentTrack.playlistId === pl.id && currentTrack.trackId === track.id}
          isPlaying={isPlaying}
          isMenuOpen={openTrackMenuId === track.id}
          isDragSource={dragSourceId === track.id}
          isDragOver={dragOverId === track.id}
          isTouchSource={touchSourceId === track.id}
          isTouchOver={touchOverId === track.id}
          onToggleMenu={() => setOpenTrackMenuId(openTrackMenuId === track.id ? null : track.id)}
          onEdit={() => {
            setOpenTrackMenuId(null)
            onEdit(track.id)
          }}
          onDelete={() => {
            setOpenTrackMenuId(null)
            onDelete(track.id)
          }}
          onRowClick={() => {
            if (openTrackMenuId) setOpenTrackMenuId(null)
            onPlay(track.id)
          }}
          drag={{
            start: () => {
              draggedIdRef.current = track.id
              if (openTrackMenuId) setOpenTrackMenuId(null)
              setTimeout(() => setDragSourceId(track.id), 0)
            },
            over: () => {
              if (!draggedIdRef.current || draggedIdRef.current === track.id) return false
              setDragOverId(track.id)
              return true
            },
            leave: () => setDragOverId((cur) => (cur === track.id ? null : cur)),
            drop: (fallbackId: string) => {
              setDragOverId(null)
              const fromId = draggedIdRef.current || fallbackId
              draggedIdRef.current = null
              if (fromId && fromId !== track.id) onReorder(fromId, track.id)
            },
            end: () => {
              draggedIdRef.current = null
              setDragSourceId(null)
              setDragOverId(null)
            },
          }}
          touch={{
            begin: () => {
              draggedIdRef.current = track.id
              if (openTrackMenuId) setOpenTrackMenuId(null)
              setTouchSourceId(track.id)
            },
            hover: (targetId: string | null) => {
              const valid = targetId && targetId !== draggedIdRef.current ? targetId : null
              setTouchOverId(valid)
              return valid
            },
            finish: (targetId: string | null) => {
              const fromId = draggedIdRef.current
              draggedIdRef.current = null
              setTouchSourceId(null)
              setTouchOverId(null)
              if (fromId && targetId && fromId !== targetId) onReorder(fromId, targetId)
            },
          }}
        />
      ))}
    </div>
  )
}

type RowProps = {
  track: Track
  index: number
  isCurrent: boolean
  isPlaying: boolean
  isMenuOpen: boolean
  isDragSource: boolean
  isDragOver: boolean
  isTouchSource: boolean
  isTouchOver: boolean
  onToggleMenu: () => void
  onEdit: () => void
  onDelete: () => void
  onRowClick: () => void
  drag: {
    start: () => void
    over: () => boolean
    leave: () => void
    drop: (fallbackId: string) => void
    end: () => void
  }
  touch: {
    begin: () => void
    hover: (targetId: string | null) => string | null
    finish: (targetId: string | null) => void
  }
}

function TrackRow(props: RowProps) {
  const { track, index, isCurrent, isPlaying, isMenuOpen, isDragSource, isDragOver, isTouchSource, isTouchOver } = props
  const rowRef = useRef<HTMLDivElement>(null)
  const suppressClickRef = useRef(false)
  const propsRef = useRef(props)

  useEffect(() => {
    propsRef.current = props
  })

  // 모바일 터치 드래그 앤 드롭 (별도 핸들 없이 곡 행을 길게 눌러 드래그하면 순서 변경)
  useEffect(() => {
    const row = rowRef.current
    if (!row) return

    let startX = 0
    let startY = 0
    let isTouchDragging = false
    let touchTargetId: string | null = null
    let longPressTimer: ReturnType<typeof setTimeout> | undefined

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button[data-action]') || target.closest('[data-track-menu]')) return
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      isTouchDragging = false
      touchTargetId = null

      clearTimeout(longPressTimer)
      longPressTimer = setTimeout(() => {
        isTouchDragging = true
        propsRef.current.touch.begin()
        if (navigator.vibrate) {
          try {
            navigator.vibrate(25)
          } catch {}
        }
      }, 220)
    }

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      const dist = Math.hypot(t.clientX - startX, t.clientY - startY)
      if (!isTouchDragging) {
        if (dist > 10) clearTimeout(longPressTimer)
        return
      }
      e.preventDefault()
      const elAtPoint = document.elementFromPoint(t.clientX, t.clientY)
      const overRow = elAtPoint?.closest<HTMLElement>('.track-row')
      touchTargetId = propsRef.current.touch.hover(overRow?.dataset.trackId ?? null)
    }

    const finishTouchDrag = () => {
      clearTimeout(longPressTimer)
      if (!isTouchDragging) return
      suppressClickRef.current = true
      setTimeout(() => {
        suppressClickRef.current = false
      }, 300)
      isTouchDragging = false
      propsRef.current.touch.finish(touchTargetId)
      touchTargetId = null
    }

    row.addEventListener('touchstart', onTouchStart, { passive: true })
    row.addEventListener('touchmove', onTouchMove, { passive: false })
    row.addEventListener('touchend', finishTouchDrag)
    row.addEventListener('touchcancel', finishTouchDrag)
    return () => {
      clearTimeout(longPressTimer)
      row.removeEventListener('touchstart', onTouchStart)
      row.removeEventListener('touchmove', onTouchMove)
      row.removeEventListener('touchend', finishTouchDrag)
      row.removeEventListener('touchcancel', finishTouchDrag)
    }
  }, [])

  const coverUrl = normalizeArtworkUrl(track.albumArt) || getFallbackCover(track.title)

  return (
    <div
      ref={rowRef}
      draggable
      data-track-id={track.id}
      role="button"
      tabIndex={0}
      aria-label={`${track.title} - ${track.artist} 재생`}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          return
        }
        props.onRowClick()
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          props.onRowClick()
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', track.id)
        props.drag.start()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (props.drag.over()) e.dataTransfer.dropEffect = 'move'
      }}
      onDragLeave={props.drag.leave}
      onDrop={(e) => {
        e.preventDefault()
        props.drag.drop(e.dataTransfer.getData('text/plain'))
      }}
      onDragEnd={props.drag.end}
      className={cn(
        'track-row group relative flex items-center justify-between gap-3 px-2.5 sm:px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none',
        isCurrent ? 'bg-neutral-800/80 ring-1 ring-[#1DB954]/30' : 'hover:bg-neutral-900/90',
        isDragSource && 'opacity-40',
        isDragOver && 'ring-2 ring-[#1DB954]/70 bg-neutral-800/60',
        isTouchSource && 'opacity-60 scale-[0.99] bg-neutral-800',
        isTouchOver && 'ring-2 ring-[#1DB954]/70',
      )}
    >
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
        <div className="w-5 text-center shrink-0">
          {isCurrent && isPlaying ? (
            <div className="flex items-end justify-center gap-0.5 h-4" aria-label="재생 중">
              <span className="w-0.5 bg-[#1DB954] rounded-full eq-bar-1" />
              <span className="w-0.5 bg-[#1DB954] rounded-full eq-bar-2" />
              <span className="w-0.5 bg-[#1DB954] rounded-full eq-bar-3" />
            </div>
          ) : (
            <span
              className={`text-xs font-medium ${isCurrent ? 'text-[#1DB954]' : 'text-neutral-500 group-hover:text-white'}`}
            >
              {index + 1}
            </span>
          )}
        </div>
        <div className="w-12 h-12 min-w-[3rem] min-h-[3rem] aspect-square rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
          <FallbackImg
            src={coverUrl}
            fallbackSrc={getFallbackCover(track.title)}
            alt={track.title}
            referrerPolicy="no-referrer"
            draggable={false}
            className="block w-12 h-12 object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</p>
          <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
        </div>
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          data-action="toggle-track-menu"
          aria-label="곡 옵션"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={(e) => {
            e.stopPropagation()
            props.onToggleMenu()
          }}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <MoreIcon className="w-5 h-5" />
        </button>
        {isMenuOpen && (
          <div
            data-track-menu="true"
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full mt-1 z-30 w-40 rounded-xl bg-[#222222] border border-neutral-700/80 shadow-2xl py-1.5 backdrop-blur-md"
          >
            <button
              type="button"
              role="menuitem"
              data-action="edit-track"
              onClick={props.onEdit}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700/70 hover:text-white transition-colors"
            >
              <PencilIcon className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>곡 정보 수정</span>
            </button>
            <button
              type="button"
              role="menuitem"
              data-action="delete-track"
              onClick={props.onDelete}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-neutral-700/70 hover:text-rose-300 transition-colors"
            >
              <TrashIcon className="w-4 h-4 shrink-0" />
              <span>곡 삭제</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
