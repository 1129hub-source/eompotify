'use client'

import { useRef, useState } from 'react'
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

  const isRepeatActive = repeatMode !== 'off'
  const repeatTitle = repeatMode === 'one' ? '한 곡 반복 재생' : repeatMode === 'all' ? '전체 반복 재생' : '반복 재생 꺼짐'

  return (
    <footer className="relative z-30 w-full shrink-0 bg-[#181818] border-t border-neutral-800/90 pt-[12px] pb-[max(4px,env(safe-area-inset-bottom))]">
      <div className="w-full grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)_18rem] items-center gap-y-2">
        {/* 좌측: 큰 화면에서도 항상 좌측 사이드바(w-72) 바로 아래에 고정 */}
        <div className="flex items-center gap-3 min-w-0 w-full px-5">
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
        <div className="flex flex-col items-center gap-[4px] w-full min-w-0 max-w-[730px] justify-self-center px-[12px] sm:px-[24px]">
          <div className="flex items-center gap-[12px] sm:gap-[19px]">
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="랜덤 재생"
              aria-pressed={isShuffle}
              title={isShuffle ? '랜덤 재생 켜짐' : '랜덤 재생 꺼짐'}
              className={`relative w-[34px] h-[34px] flex items-center justify-center hover:text-white transition-colors ${
                isShuffle ? 'text-[#1DB954]' : 'text-[#a7a7a7]'
              }`}
            >
              <svg className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 3h4v4M3 20L21 3M17 21h4v-4M14 14l7 7M3 4l5 5" />
              </svg>
              {isShuffle && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />
              )}
            </button>
            <button
              type="button"
              onClick={onPrev}
              aria-label="이전 곡"
              className="w-[34px] h-[34px] flex items-center justify-center text-[#b3b3b3] hover:text-white transition-colors"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? "일시정지" : "재생"}
              className="w-[45px] h-[45px] rounded-full bg-white hover:scale-105 active:scale-95 text-[#121212] flex items-center justify-center transition-transform"
            >
              {isPlaying ? (
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                </svg>
              ) : (
                <svg className="w-[18px] h-[18px] ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="다음 곡"
              className="w-[34px] h-[34px] flex items-center justify-center text-[#b3b3b3] hover:text-white transition-colors"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label="반복 재생"
              title={repeatTitle}
              className={`relative w-[34px] h-[34px] flex items-center justify-center hover:text-white transition-colors ${
                isRepeatActive ? 'text-[#1DB954]' : 'text-[#a7a7a7]'
              }`}
            >
              <svg className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 2l4 4-4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 11V10a4 4 0 014-4h14" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 22l-4-4 4-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13v1a4 4 0 01-4 4H3" />
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

          <SeekBar
            key={cur ? `${cur.playlistId}:${cur.trackId}` : 'empty'}
            enabled={!!cur}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
          />
        </div>

        {/* 우측 균형 여백 (PC 중앙 컨트롤 정렬 유지) */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>
    </footer>
  )
}

function SeekBar({ enabled, currentTime, duration, onSeek }: {
  enabled: boolean
  currentTime: number
  duration: number
  onSeek: (seconds: number) => void
}) {
  const [draft, setDraft] = useState<number | null>(null)
  const pointerRef = useRef<number | null>(null)
  const safeDuration = enabled && Number.isFinite(duration) && duration > 0 ? duration : 0
  const clamp = (value: number) => Math.min(safeDuration, Math.max(0, Number.isFinite(value) ? value : 0))
  const time = clamp(draft ?? currentTime)
  const progress = safeDuration ? time / safeDuration * 100 : 0

  function commit(input: HTMLInputElement) {
    if (pointerRef.current === null) return
    pointerRef.current = null
    setDraft(null)
    if (safeDuration > 0) onSeek(clamp(Number(input.value)))
  }

  return (
    <div className="w-full flex items-center gap-[12px]">
      <span className="text-[14px] leading-[20px] font-normal tabular-nums text-[#a7a7a7] w-[32px] text-right shrink-0">{formatTime(time)}</span>
      <div className="group relative flex-1 min-w-0 h-[24px] flex items-center rounded-[3px] focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-white/70">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-[5px] rounded-[3px] bg-[#424242] overflow-hidden">
          <div className="h-full rounded-[3px] bg-white" style={{ width: `${progress}%` }} />
        </div>
        <input
          type="range"
          aria-label="재생 구간 이동"
          aria-valuetext={`${formatTime(time)} / ${formatTime(safeDuration)}`}
          min={0}
          max={safeDuration || 1}
          step="any"
          disabled={!safeDuration}
          value={time}
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button !== 0 || !safeDuration) return
            pointerRef.current = e.pointerId
            setDraft(time)
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onChange={(e) => {
            const value = clamp(Number(e.currentTarget.value))
            if (pointerRef.current !== null) setDraft(value)
            else onSeek(value) // 키보드·보조기기 조작은 즉시 반영
          }}
          onPointerUp={(e) => { if (pointerRef.current === e.pointerId) commit(e.currentTarget) }}
          onLostPointerCapture={(e) => { if (pointerRef.current === e.pointerId) commit(e.currentTarget) }}
          onPointerCancel={() => { pointerRef.current = null; setDraft(null) }}
          onBlur={(e) => commit(e.currentTarget)}
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key) || !safeDuration) return
            e.preventDefault()
            const delta = e.key === 'PageUp' ? safeDuration / 10 : e.key === 'PageDown' ? -safeDuration / 10 : ['ArrowLeft', 'ArrowDown'].includes(e.key) ? -5 : 5
            onSeek(clamp(e.key === 'Home' ? 0 : e.key === 'End' ? safeDuration : time + delta))
          }}
          className="absolute inset-0 z-10 w-full h-full m-0 opacity-0 cursor-pointer touch-none disabled:cursor-default"
        />
      </div>
      <span className="text-[14px] leading-[20px] font-normal tabular-nums text-[#a7a7a7] w-[32px] shrink-0">{formatTime(safeDuration)}</span>
    </div>
  )
}
