'use client'

import { useState } from 'react'
import type { CurrentTrack, RepeatMode } from '@/lib/eompotify/types'
import { getFallbackCover, normalizeArtworkUrl } from '@/lib/eompotify/utils'
import { FallbackImg } from './fallback-img'
import { MusicNoteIcon } from './icons'

type Props = {
  currentTrack: CurrentTrack | null
  isPlaying: boolean
  isShuffle: boolean
  repeatMode: RepeatMode
  currentTime: number
  duration: number
  onSeek: (seconds: number) => void
  onToggleShuffle: () => void
  onPrev: () => void
  onPlayPause: () => void
  onNext: () => void
  onCycleRepeat: () => void
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function PlayerBar({
  currentTrack: cur,
  isPlaying,
  isShuffle,
  repeatMode,
  currentTime,
  duration,
  onSeek,
  onToggleShuffle,
  onPrev,
  onPlayPause,
  onNext,
  onCycleRepeat,
}: Props) {
  const [draggingTime, setDraggingTime] = useState<number | null>(null)

  const isRepeatActive = repeatMode !== 'off'
  const repeatTitle = repeatMode === 'one' ? '한 곡 반복 재생' : repeatMode === 'all' ? '전체 반복 재생' : '반복 재생 꺼짐'

  const effectiveTime = draggingTime !== null ? draggingTime : currentTime
  const safeDuration = duration > 0 ? duration : 0
  const progressPercent = safeDuration > 0 ? Math.min(100, Math.max(0, (effectiveTime / safeDuration) * 100)) : 0

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#181818]/95 backdrop-blur-xl border-t border-neutral-800/90 px-3 sm:px-5 py-2.5 sm:py-3">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* 좌측: 큰 화면에서도 항상 좌측 사이드바(w-72) 바로 아래에 고정 */}
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-64 lg:w-72 shrink-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
            {cur ? (
              <FallbackImg
                key={cur.trackId}
                src={normalizeArtworkUrl(cur.albumArt) || getFallbackCover(cur.title)}
                fallbackSrc={getFallbackCover(cur.title)}
                alt="앨범아트"
                referrerPolicy="no-referrer"
                className="w-full h-full aspect-square object-cover"
              />
            ) : (
              <MusicNoteIcon className="w-5 h-5 text-neutral-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{cur ? cur.title : '재생 중인 곡 없음'}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{cur ? cur.artist || '' : '곡을 클릭해 재생하세요'}</p>
          </div>
        </div>

        {/* 중앙: 재생 컨트롤 버튼 + 시간 표기 및 구간 이동 재생바 */}
        <div className="flex flex-col items-center gap-1.5 w-full max-w-xl flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="랜덤 재생"
              aria-pressed={isShuffle}
              title={isShuffle ? '랜덤 재생 켜짐' : '랜덤 재생 꺼짐'}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:text-white hover:bg-neutral-800 transition-colors ${
                isShuffle ? 'text-[#1DB954]' : 'text-neutral-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
              {isShuffle && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />
              )}
            </button>
            <button
              type="button"
              onClick={onPrev}
              aria-label="이전 곡"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              aria-label="재생 또는 일시정지"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-neutral-200 hover:scale-105 active:scale-95 text-neutral-950 flex items-center justify-center transition-all shadow-md"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="다음 곡"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label="반복 재생"
              title={repeatTitle}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:text-white hover:bg-neutral-800 transition-colors ${
                isRepeatActive ? 'text-[#1DB954]' : 'text-neutral-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 1l4 4-4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 11V9a4 4 0 014-4h14" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 23l-4-4 4-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13v2a4 4 0 01-4 4H3" />
              </svg>
              {repeatMode === 'one' && (
                <span className="absolute top-0.5 right-0.5 text-[9px] font-extrabold leading-none px-1 py-0.5 rounded-full bg-[#1DB954] text-neutral-950">
                  1
                </span>
              )}
              {isRepeatActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />
              )}
            </button>
          </div>

          {/* 재생 시간 표기 + 구간 이동 바 */}
          <div className="w-full flex items-center gap-2.5 px-1">
            <span className="text-[11px] font-medium tabular-nums text-neutral-400 w-9 text-right shrink-0">
              {formatTime(effectiveTime)}
            </span>

            <div className="group/seek relative flex-1 h-4 flex items-center">
              <div className="w-full h-1.5 rounded-full bg-neutral-700/80 overflow-hidden">
                <div
                  className="h-full bg-[#1DB954] group-hover/seek:bg-[#1ed760] transition-[background-color]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{ left: `${progressPercent}%` }}
              />
              <input
                type="range"
                aria-label="재생 구간 이동"
                min={0}
                max={safeDuration || 100}
                step={0.1}
                disabled={!cur || safeDuration <= 0}
                value={safeDuration > 0 ? Math.min(safeDuration, effectiveTime) : 0}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setDraggingTime(val)
                }}
                onMouseUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value)
                  setDraggingTime(null)
                  onSeek(val)
                }}
                onTouchEnd={(e) => {
                  const val = Number((e.target as HTMLInputElement).value)
                  setDraggingTime(null)
                  onSeek(val)
                }}
                onKeyUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value)
                  setDraggingTime(null)
                  onSeek(val)
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
              />
            </div>

            <span className="text-[11px] font-medium tabular-nums text-neutral-400 w-9 shrink-0">
              {formatTime(safeDuration)}
            </span>
          </div>
        </div>

        {/* 우측 균형 여백 (PC 중앙 컨트롤 정렬 유지) */}
        <div className="hidden sm:block sm:w-64 lg:w-72 shrink-0" />
      </div>
    </footer>
  )
}
