'use client'

import { useEffect, useRef, useState } from 'react'
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

  const seekProps = { enabled: !!cur, currentTime, duration, onSeek }
  const seekKey = cur ? `${cur.playlistId}:${cur.trackId}` : 'empty'

  return (
    <footer className="relative z-30 w-full shrink-0 bg-[#171717] border-t border-neutral-800/90 pt-[11px] pb-[max(11px,env(safe-area-inset-bottom))] lg:pt-2 lg:pb-[max(4px,env(safe-area-inset-bottom))]">
      {/* 모바일: 하단바 상단에 흰색 진행선만 표시 */}
      <SeekBar key={`mobile:${seekKey}`} {...seekProps} mobile />
      <div className="w-full grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[18rem_minmax(0,1fr)_18rem] items-center gap-x-2 gap-y-2 px-3 lg:px-0 lg:gap-x-0 lg:min-h-[63px]">
        {/* 좌측: 큰 화면에서도 항상 좌측 사이드바(w-72) 바로 아래에 고정 */}
        <div className="flex items-center gap-3 min-w-0 w-full lg:px-5">
          <div className="w-[46px] h-[46px] lg:w-12 lg:h-12 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
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
            {cur ? (
              <ScrollingTitle key={`${seekKey}:${cur.title}`} title={cur.title} />
            ) : (
              <p className="text-sm font-semibold text-white truncate">재생 중인 곡 없음</p>
            )}
            <p className="text-xs text-neutral-400 truncate mt-0.5">{cur ? cur.artist || '' : '곡을 클릭해 재생하세요'}</p>
          </div>
        </div>

        {/* 모바일: 곡 정보 오른쪽에 버튼을 한 줄로 배치 / PC: 기존 중앙 배치 유지 */}
        <div className="flex flex-col items-center gap-1 w-auto lg:w-full min-w-0 max-w-[560px] justify-self-end lg:justify-self-center">
          <div className="flex items-center flex-nowrap gap-[clamp(3px,2.5vw,10px)] lg:gap-3">
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="랜덤 재생"
              aria-pressed={isShuffle}
              title={isShuffle ? '랜덤 재생 켜짐' : '랜덤 재생 꺼짐'}
              className={`relative shrink-0 w-[clamp(26px,8.15vw,34px)] h-[34px] lg:w-8 lg:h-8 flex items-center justify-center hover:text-white transition-colors ${
                isShuffle ? 'text-[#1DB954]' : 'text-[#a7a7a7]'
              }`}
            >
              <svg className="w-[19px] h-[19px] lg:w-4 lg:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
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
              className="shrink-0 w-[clamp(26px,8.15vw,34px)] h-[34px] lg:w-8 lg:h-8 flex items-center justify-center text-[#b3b3b3] hover:text-white transition-colors"
            >
              <svg className="w-[18px] h-[18px] lg:w-[16px] lg:h-[16px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? "일시정지" : "재생"}
              className="shrink-0 w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-[#121212] flex items-center justify-center transition-transform"
            >
              {isPlaying ? (
                <svg className="w-[18px] h-[18px] lg:w-[16px] lg:h-[16px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                </svg>
              ) : (
                <svg className="w-[18px] h-[18px] lg:w-[16px] lg:h-[16px] ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="다음 곡"
              className="shrink-0 w-[clamp(26px,8.15vw,34px)] h-[34px] lg:w-8 lg:h-8 flex items-center justify-center text-[#b3b3b3] hover:text-white transition-colors"
            >
              <svg className="w-[18px] h-[18px] lg:w-[16px] lg:h-[16px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label="반복 재생"
              title={repeatTitle}
              className={`relative shrink-0 w-[clamp(26px,8.15vw,34px)] h-[34px] lg:w-8 lg:h-8 flex items-center justify-center hover:text-white transition-colors ${
                isRepeatActive ? 'text-[#1DB954]' : 'text-[#a7a7a7]'
              }`}
            >
              <svg className="w-[19px] h-[19px] lg:w-4 lg:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
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

          <SeekBar key={`desktop:${seekKey}`} {...seekProps} />
        </div>

        {/* 우측 균형 여백 (PC 중앙 컨트롤 정렬 유지) */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>
    </footer>
  )
}

/** 잘린 곡 제목만 2초 후 슬라이딩. 다시 누르면 처음 위치에서 말줄임표로 복귀. */
function ScrollingTitle({ title }: { title: string }) {
  const viewportRef = useRef<HTMLButtonElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [distance, setDistance] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    const viewport = viewportRef.current
    const text = textRef.current
    if (!viewport || !text) return
    let active = true
    const measure = () => {
      if (!active) return
      const overflow = text.scrollWidth - viewport.clientWidth
      setDistance(overflow > 1 ? Math.ceil(overflow) : 0)
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(viewport)
    observer?.observe(text)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [title])

  useEffect(() => {
    if (stopped || distance === 0) {
      setMoving(false)
      return
    }
    if (!moving) {
      const timer = window.setTimeout(() => setMoving(true), 500)
      return () => window.clearTimeout(timer)
    }
    const text = textRef.current
    if (!text) return
    const duration = Math.max(900, distance / 32 * 1000)
    // 일정 속도로 제목의 끝까지 이동한 뒤 1.5초간 유지하고 처음으로 돌아간다.
    const animation = text.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(-${distance}px)` },
    ], { duration, easing: 'linear', fill: 'forwards' })
    let holdTimer: number | undefined
    animation.onfinish = () => { holdTimer = window.setTimeout(() => setMoving(false), 1500) }
    return () => {
      animation.onfinish = null
      animation.cancel()
      window.clearTimeout(holdTimer)
    }
  }, [distance, stopped, moving])

  return (
    <button
      ref={viewportRef}
      type="button"
      title={title}
      aria-label={distance > 0 ? `${title} — 제목 슬라이딩 ${stopped ? '다시 시작' : '정지'}` : title}
      aria-pressed={distance > 0 ? !stopped : undefined}
      disabled={distance === 0}
      onClick={() => { setMoving(false); setStopped((previous) => !previous) }}
      className={`block w-full min-w-0 overflow-hidden text-left text-sm font-semibold text-white ${distance > 0 ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span ref={textRef} className={moving && !stopped && distance > 0 ? 'block w-max whitespace-nowrap' : 'block truncate'}>{title}</span>
    </button>
  )
}

function SeekBar({ enabled, currentTime, duration, onSeek, mobile = false }: {
  enabled: boolean
  currentTime: number
  duration: number
  onSeek: (seconds: number) => void
  mobile?: boolean
}) {
  const [draft, setDraft] = useState<number | null>(null)
  const pointerRef = useRef<number | null>(null)
  const safeDuration = enabled && Number.isFinite(duration) && duration > 0 ? duration : 0
  const clamp = (value: number) => Math.min(safeDuration, Math.max(0, Number.isFinite(value) ? value : 0))
  const time = clamp(draft ?? currentTime)
  const progress = safeDuration ? time / safeDuration * 100 : 0

  // 직접 좌표를 계산해 보이지 않는 조절점의 크기에 관계없이
  // 화면에 그려진 선의 위치와 실제 재생 구간을 일치시킨다.
  function timeAt(clientX: number, input: HTMLInputElement) {
    const rect = input.getBoundingClientRect()
    return clamp(rect.width > 0 ? ((clientX - rect.left) / rect.width) * safeDuration : time)
  }

  function finish(value: number) {
    if (pointerRef.current === null) return
    pointerRef.current = null
    setDraft(null)
    if (safeDuration > 0) onSeek(clamp(value))
  }

  return (
    <div className={mobile ? 'absolute inset-x-0 top-0 z-10 lg:hidden' : 'hidden lg:flex w-full items-center gap-[10px]'}>
      {!mobile && <span className="min-w-[30px] text-right shrink-0 text-[12px] leading-4 font-normal tabular-nums text-[#a7a7a7]">{formatTime(time)}</span>}
      <div className={mobile ? 'relative w-full h-[10px] has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-white/70' : 'relative flex-1 min-w-0 h-4 flex items-center rounded-sm has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white/70'}>
        <div aria-hidden="true" className={mobile ? 'pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden' : 'pointer-events-none absolute inset-x-0 h-[4px] rounded-full bg-[#3d3d3d] overflow-hidden'}>
          <div className={mobile ? 'h-full bg-white' : 'h-full rounded-full bg-white'} style={{ width: `${progress}%` }} />
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
            e.preventDefault()
            e.currentTarget.focus({ preventScroll: true })
            pointerRef.current = e.pointerId
            setDraft(timeAt(e.clientX, e.currentTarget))
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (pointerRef.current === e.pointerId) setDraft(timeAt(e.clientX, e.currentTarget))
          }}
          onPointerUp={(e) => {
            if (pointerRef.current === e.pointerId) finish(timeAt(e.clientX, e.currentTarget))
          }}
          onLostPointerCapture={(e) => {
            if (pointerRef.current === e.pointerId) { pointerRef.current = null; setDraft(null) }
          }}
          onPointerCancel={(e) => {
            if (pointerRef.current === e.pointerId) { pointerRef.current = null; setDraft(null) }
          }}
          onBlur={() => { if (pointerRef.current !== null) { pointerRef.current = null; setDraft(null) } }}
          onChange={(e) => {
            if (pointerRef.current === null && safeDuration > 0) onSeek(clamp(Number(e.currentTarget.value)))
          }}
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key) || !safeDuration) return
            e.preventDefault()
            const delta = e.key === 'PageUp' ? safeDuration / 10 : e.key === 'PageDown' ? -safeDuration / 10 : ['ArrowLeft', 'ArrowDown'].includes(e.key) ? -5 : 5
            onSeek(clamp(e.key === 'Home' ? 0 : e.key === 'End' ? safeDuration : time + delta))
          }}
          className="absolute inset-0 z-10 w-full h-full m-0 opacity-0 cursor-pointer touch-none disabled:cursor-default"
        />
      </div>
      {!mobile && <span className="min-w-[30px] shrink-0 text-[12px] leading-4 font-normal tabular-nums text-[#a7a7a7]">{formatTime(safeDuration)}</span>}
    </div>
  )
}
