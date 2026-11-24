'use client'

import { useRef, useState } from 'react'
import { LIKED_PLAYLIST_ID } from '@/lib/eompotify/constants'
import type { CurrentTrack, Playlist } from '@/lib/eompotify/types'
import { getFallbackCover, normalizeArtworkUrl } from '@/lib/eompotify/utils'
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
  onNewPlaylist: () => void
  onEditPlaylist: (id: string) => void
  onDeletePlaylist: (id: string) => void
  currentTrack: CurrentTrack | null
  defaultCover: string
  liked: boolean
  onToggleLike: () => void
  onPickDefaultCover: (file: File) => void
}

export function Sidebar({
  open,
  onClose,
  brandSubtitle,
  onSaveSubtitle,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onNewPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  currentTrack,
  defaultCover,
  liked,
  onToggleLike,
  onPickDefaultCover,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverSrc = currentTrack
    ? normalizeArtworkUrl(currentTrack.albumArt) || getFallbackCover(currentTrack.title)
    : defaultCover

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen lg:h-[calc(100vh-5.5rem)] w-72 bg-[#0a0a0a] border-r border-neutral-800/80 flex flex-col transform lg:translate-x-0 transition-transform duration-200 ease-out shrink-0 ${
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

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1" aria-label="플레이리스트 목록">
        {playlists.map((pl) => (
          <PlaylistItem
            key={pl.id}
            playlist={pl}
            isActive={pl.id === activePlaylistId}
            onSelect={() => onSelectPlaylist(pl.id)}
            onEdit={() => onEditPlaylist(pl.id)}
            onDelete={() => onDeletePlaylist(pl.id)}
          />
        ))}
      </nav>

      {/* PC 화면 전용: 플레이리스트 목록 하단에 '재생 중인 곡' 고정 표시 */}
      <div className="hidden lg:block p-3.5 border-t border-neutral-800/80 bg-[#0d0d0d]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1DB954] mb-2.5 px-0.5">NOW PLAYING</p>
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              role={!currentTrack ? 'button' : undefined}
              tabIndex={!currentTrack ? 0 : undefined}
              title={!currentTrack ? '클릭하여 기본 앨범아트 사진 설정' : undefined}
              onClick={() => {
                if (!currentTrack) fileInputRef.current?.click()
              }}
              onKeyDown={(e) => {
                if (!currentTrack && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              className={`group/cover relative w-14 h-14 aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center transition-all ${
                !currentTrack ? 'cursor-pointer hover:ring-1 hover:ring-[#1DB954]/60' : ''
              }`}
            >
              {coverSrc ? (
                <FallbackImg
                  key={currentTrack ? currentTrack.trackId : coverSrc}
                  src={coverSrc}
                  fallbackSrc={currentTrack ? getFallbackCover(currentTrack.title) : ''}
                  alt="지금 재생 중인 앨범아트"
                  referrerPolicy="no-referrer"
                  className="w-full h-full aspect-square object-cover"
                />
              ) : (
                <MusicNoteIcon className="w-6 h-6 text-neutral-600 group-hover/cover:text-neutral-400 transition-colors" />
              )}
              {!currentTrack && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex flex-col items-center justify-center gap-0.5 transition-opacity">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[9px] font-semibold text-white">기본 커버</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPickDefaultCover(file)
                e.target.value = ''
              }}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">
                {currentTrack ? currentTrack.title : '재생 중인 곡 없음'}
              </p>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {currentTrack ? currentTrack.artist || '' : '곡을 선택해 재생하세요'}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="좋아요"
            title={currentTrack ? (liked ? 'Liked songs에서 제거' : 'Liked songs에 추가') : 'Liked songs에 추가'}
            disabled={!currentTrack}
            onClick={onToggleLike}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 active:scale-90 transition-all shrink-0 disabled:opacity-35 disabled:pointer-events-none"
          >
            {liked && currentTrack ? (
              <HeartFilledIcon className="w-5 h-5 text-rose-500" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
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
  onSelect,
  onEdit,
  onDelete,
}: {
  playlist: Playlist
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isLiked = pl.id === LIKED_PLAYLIST_ID

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive ? 'bg-neutral-800/90 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {pl.cover ? (
          <FallbackImg
            src={pl.cover}
            fallbackSrc={getFallbackCover(pl.name)}
            alt=""
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
