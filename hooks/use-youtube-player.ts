'use client'

import { useCallback, useEffect, useRef } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

const YT_API_SRC = 'https://www.youtube.com/iframe_api'

type Handlers = {
  onPlaying: () => void
  onPaused: () => void
  onEnded: () => void
  onError: (code: number | undefined) => void
  onProgress?: (currentTime: number, duration: number) => void
}

export function useYouTubePlayer(handlers: Handlers) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const apiReadyRef = useRef(false)
  const pendingVideoIdRef = useRef<string | null>(null)
  const activeVideoIdRef = useRef<string | null>(null)
  const playerReadyRef = useRef(false)
  const progressEnabledRef = useRef(false)
  const pendingSeekRef = useRef<{ time: number; until: number } | null>(null)
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  const reportProgress = useCallback(() => {
    const player = playerRef.current
    if (!playerReadyRef.current || !progressEnabledRef.current || !activeVideoIdRef.current || !player) return
    if (typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') return
    const videoId = player.getVideoData?.()?.video_id
    if (videoId && videoId !== activeVideoIdRef.current) return
    const cur = Number(player.getCurrentTime())
    const dur = Number(player.getDuration())
    if (!Number.isFinite(cur) || !Number.isFinite(dur) || dur <= 0) return
    // YouTube의 비동기 seek 응답 전에는 이전 위치로 UI가 튀지 않도록 한다.
    const pending = pendingSeekRef.current
    if (pending && Date.now() < pending.until && Math.abs(cur - pending.time) > 2) return
    pendingSeekRef.current = null
    handlersRef.current.onProgress?.(Math.max(0, Math.min(cur, dur)), dur)
  }, [])

  useEffect(() => {
    const interval = setInterval(reportProgress, 250)
    return () => clearInterval(interval)
  }, [reportProgress])

  const load = useCallback((videoId: string) => {
    activeVideoIdRef.current = videoId
    progressEnabledRef.current = false
    pendingSeekRef.current = null
    const YT = window.YT
    if (!apiReadyRef.current || !YT || !YT.Player || !hostRef.current) {
      pendingVideoIdRef.current = videoId
      return
    }

    if (playerRef.current && !playerReadyRef.current) {
      pendingVideoIdRef.current = videoId
      return
    }
    if (!playerRef.current) {
      const playerVars: Record<string, unknown> = {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
      }
      if (/^https?:$/.test(window.location.protocol) && window.location.origin && window.location.origin !== 'null') {
        playerVars.origin = window.location.origin
      }

      const mount = document.createElement('div')
      hostRef.current.appendChild(mount)

      playerRef.current = new YT.Player(mount, {
        videoId,
        host: 'https://www.youtube.com',
        playerVars,
        events: {
          onReady: (e: any) => {
            playerReadyRef.current = true
            const pending = pendingVideoIdRef.current
            pendingVideoIdRef.current = null
            if (!activeVideoIdRef.current) e.target.stopVideo()
            else if (pending) e.target.loadVideoById(pending)
            else e.target.playVideo()
          },
          onStateChange: (e: any) => {
            if (!activeVideoIdRef.current) return
            const reportedId = e.target.getVideoData?.()?.video_id
            if (reportedId && reportedId !== activeVideoIdRef.current) return
            if (e.data === YT.PlayerState.PLAYING) {
              progressEnabledRef.current = true
              handlersRef.current.onPlaying()
              reportProgress()
            } else if (e.data === YT.PlayerState.PAUSED) {
              progressEnabledRef.current = true
              handlersRef.current.onPaused()
              reportProgress()
            } else if (e.data === YT.PlayerState.ENDED && progressEnabledRef.current) {
              reportProgress()
              handlersRef.current.onEnded()
            }
          },
          onError: (e: any) => {
            if (!activeVideoIdRef.current) return
            progressEnabledRef.current = false
            pendingSeekRef.current = null
            handlersRef.current.onError(e?.data)
          },
        },
      })
    } else if (typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(videoId)
    }
  }, [reportProgress])

  useEffect(() => {
    const markReady = () => {
      apiReadyRef.current = true
      if (pendingVideoIdRef.current) {
        const vid = pendingVideoIdRef.current
        pendingVideoIdRef.current = null
        load(vid)
      }
    }

    if (window.YT && window.YT.Player) {
      markReady()
      return
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      markReady()
    }

    if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
      const script = document.createElement('script')
      script.src = YT_API_SRC
      document.head.appendChild(script)
    }
  }, [load])

  const toggle = useCallback(() => {
    const player = playerRef.current
    if (!playerReadyRef.current || !player || typeof player.getPlayerState !== 'function') return false
    if (player.getPlayerState() === window.YT.PlayerState.PLAYING) player.pauseVideo()
    else player.playVideo()
    return true
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current
    if (!playerReadyRef.current || !progressEnabledRef.current || !activeVideoIdRef.current || !player || typeof player.seekTo !== 'function' || !Number.isFinite(seconds)) return false
    const duration = Number(player.getDuration?.())
    if (!Number.isFinite(duration) || duration <= 0) return false
    const time = Math.max(0, Math.min(seconds, duration))
    try {
      player.seekTo(time, true)
      pendingSeekRef.current = { time, until: Date.now() + 1500 }
      return true
    } catch {
      return false
    }
  }, [])

  const restart = useCallback(() => {
    const player = playerRef.current
    if (playerReadyRef.current && player && typeof player.seekTo === 'function') {
      pendingSeekRef.current = { time: 0, until: Date.now() + 1500 }
      player.seekTo(0, true)
      player.playVideo()
      return true
    }
    return false
  }, [])

  const stop = useCallback(() => {
    const player = playerRef.current
    activeVideoIdRef.current = null
    pendingVideoIdRef.current = null
    pendingSeekRef.current = null
    progressEnabledRef.current = false
    if (playerReadyRef.current && player && typeof player.stopVideo === 'function') player.stopVideo()
  }, [])

  return { hostRef, load, toggle, seekTo, restart, stop }
}
