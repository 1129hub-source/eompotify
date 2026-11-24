'use client'

import { useRef, useState } from 'react'
import type { CurrentTrack } from '@/lib/eompotify/types'
import { getFallbackCover, normalizeArtworkUrl } from '@/lib/eompotify/utils'
import { FallbackImg } from './fallback-img'
import { CameraIcon, HeartFilledIcon, HeartOutlineIcon, MusicNoteIcon } from './icons'

type Props = {
  currentTrack: CurrentTrack | null
  defaultCover: string
  liked: boolean
  onToggleLike: () => void
  onPickDefaultCover: (file: File) => void
}

export function NowPlaying({ currentTrack: cur, defaultCover, liked, onToggleLike, onPickDefaultCover }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [brokenDefault, setBrokenDefault] = useState<string | null>(null)
  const editable = !cur

  const openPicker = () => {
    if (editable) fileInputRef.current?.click()
  }

  const showDefault = !cur && defaultCover && brokenDefault !== defaultCover

  return (
    <section className="flex items-center justify-between gap-4 py-2" aria-label="지금 재생 중">
      <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
        <div
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : -1}
          aria-label={editable ? '기본 앨범아트 사진 설정' : undefined}
          title={editable ? '클릭하여 기본 앨범아트 사진 설정 (권장: 300x300px ~ 400x400px 정사각형)' : undefined}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (editable && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              openPicker()
            }
          }}
          className={`group/cover relative w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-xl overflow-hidden bg-neutral-900/70 shrink-0 flex items-center justify-center ring-1 ring-transparent transition-all ${
            editable ? 'cursor-pointer hover:ring-[#1DB954]/60' : ''
          }`}
        >
          {cur ? (
            <FallbackImg
              key={cur.trackId}
              src={normalizeArtworkUrl(cur.albumArt) || getFallbackCover(cur.title)}
              fallbackSrc={getFallbackCover(cur.title)}
              alt="지금 재생 중인 앨범아트"
              referrerPolicy="no-referrer"
              className="w-full h-full aspect-square object-cover"
            />
          ) : showDefault ? (
            <FallbackImg
              src={defaultCover}
              alt="지금 재생 중인 앨범아트"
              onFinalError={() => setBrokenDefault(defaultCover)}
              className="w-full h-full aspect-square object-cover"
            />
          ) : (
            <MusicNoteIcon
              strokeWidth={1.6}
              className="w-8 h-8 text-neutral-600 group-hover/cover:text-neutral-400 transition-colors"
            />
          )}
          {editable && (
            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/cover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
              <CameraIcon className="w-4 h-4 text-white" />
              <span className="text-[10px] font-semibold text-white">기본 커버</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickDefaultCover(file)
            e.target.value = ''
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1DB954]">NOW PLAYING</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate mt-1">
            {cur ? cur.title : '재생 중인 곡 없음'}
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 truncate mt-0.5">{cur ? cur.artist || '' : ''}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label="좋아요"
        aria-pressed={!!cur && liked}
        title={cur && liked ? 'Liked songs에서 제거' : 'Liked songs에 추가'}
        disabled={!cur}
        onClick={onToggleLike}
        className="p-3 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/60 active:scale-90 transition-all shrink-0 disabled:opacity-35 disabled:pointer-events-none"
      >
        {cur && liked ? (
          <HeartFilledIcon className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500" />
        ) : (
          <HeartOutlineIcon className="w-6 h-6 sm:w-7 sm:h-7" />
        )}
      </button>
    </section>
  )
}
