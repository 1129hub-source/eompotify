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
      // 실제 http/https 도메인 배포 환경에서는 origin을 전달해 유튜브 임베드 차단 최소화
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
            if (e.data === YT.PlayerState.PLAYING) handlersRef.current.onPlaying()
            else if (e.data === YT.PlayerState.PAUSED) handlersRef.current.onPaused()
            else if (e.data === YT.PlayerState.ENDED) handlersRef.current.onEnded()
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

  /** 재생 중이면 일시정지, 아니면 재생. 플레이어가 준비되지 않았으면 false 반환 */
  const toggle = useCallback(() => {
    const player = playerRef.current
    if (!player || typeof player.getPlayerState !== 'function') return false
    if (player.getPlayerState() === window.YT.PlayerState.PLAYING) player.pauseVideo()
    else player.playVideo()
    return true
  }, [])

  const restart = useCallback(() => {
    const player = playerRef.current
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(0)
      player.playVideo()
      return true
    }
    return false
  }, [])

  const stop = useCallback(() => {
    const player = playerRef.current
    if (player && typeof player.stopVideo === 'function') player.stopVideo()
  }, [])

  return { hostRef, load, toggle, restart, stop }
}
