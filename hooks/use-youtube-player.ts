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
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerRef.current
      if (!player || typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') return
      const cur = Number(player.getCurrentTime()) || 0
      const dur = Number(player.getDuration()) || 0
      if (dur > 0) {
        handlersRef.current.onProgress?.(cur, dur)
      }
    }, 250)

    return () => clearInterval(interval)
  }, [])

  const load = useCallback((videoId: string) => {
    const YT = window.YT
    if (!apiReadyRef.current || !YT || !YT.Player || !hostRef.current) {
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
            e.target.playVideo()
          },
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING) {
              handlersRef.current.onPlaying()
              const dur = Number(e.target.getDuration?.()) || 0
              const cur = Number(e.target.getCurrentTime?.()) || 0
              if (dur > 0) handlersRef.current.onProgress?.(cur, dur)
            } else if (e.data === YT.PlayerState.PAUSED) {
              handlersRef.current.onPaused()
            } else if (e.data === YT.PlayerState.ENDED) {
              handlersRef.current.onEnded()
            }
          },
          onError: (e: any) => {
            handlersRef.current.onError(e?.data)
          },
        },
      })
    } else if (typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(videoId)
    }
  }, [])

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
    if (!player || typeof player.getPlayerState !== 'function') return false
    if (player.getPlayerState() === window.YT.PlayerState.PLAYING) player.pauseVideo()
    else player.playVideo()
    return true
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(seconds, true)
      return true
    }
    return false
  }, [])

  const restart = useCallback(() => {
    const player = playerRef.current
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(0, true)
      player.playVideo()
      return true
    }
    return false
  }, [])

  const stop = useCallback(() => {
    const player = playerRef.current
    if (player && typeof player.stopVideo === 'function') player.stopVideo()
  }, [])

  return { hostRef, load, toggle, seekTo, restart, stop }
}
