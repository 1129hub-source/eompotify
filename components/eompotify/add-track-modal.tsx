'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchYouTubeOEmbed, findArtworkCandidates } from '@/lib/eompotify/artwork'
import type { ArtworkCandidate, NewTrackInput } from '@/lib/eompotify/types'
import { extractYouTubeId, parseYouTubeTitle } from '@/lib/eompotify/utils'
import type { ToastType } from './toaster'
import { MusicNoteIcon } from './icons'
import { ArtworkGrid, inputClass, ModalHeader, ModalShell } from './modal-shell'

type Props = {
  onClose: () => void
  onSubmit: (track: NewTrackInput) => void
  showToast: (message: string, type?: ToastType) => void
}

export function AddTrackModal({ onClose, onSubmit, showToast }: Props) {
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [selectedArt, setSelectedArt] = useState('')
  const [candidates, setCandidates] = useState<ArtworkCandidate[]>([])
  const [isFetching, setIsFetching] = useState(false)

  const isFetchingRef = useRef(false)
  const lastFetchedVideoIdRef = useRef<string | null>(null)
  const researchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectedArtRef = useRef('')

  const selectArt = (art: string) => {
    selectedArtRef.current = art
    setSelectedArt(art)
  }

  useEffect(() => {
    const t = setTimeout(() => urlInputRef.current?.focus(), 50)
    return () => {
      clearTimeout(t)
      clearTimeout(researchTimerRef.current)
    }
  }, [])

  const fetchMetadata = async (force = false) => {
    const videoId = extractYouTubeId(urlInputRef.current?.value ?? '')
    if (!videoId) {
      if (force) showToast('올바른 유튜브 링크를 입력해 주세요.', 'error')
      return null
    }
    if (!force && lastFetchedVideoIdRef.current === videoId) return null
    if (isFetchingRef.current) return null

    isFetchingRef.current = true
    lastFetchedVideoIdRef.current = videoId
    setIsFetching(true)
    setStatus('곡 정보와 공식 앨범아트를 검색하는 중...')

    try {
      const oembed = await fetchYouTubeOEmbed(videoId)
      let parsed = { title: '', artist: '', hasExplicitSplit: false }
      if (oembed && oembed.title) {
        parsed = parseYouTubeTitle(oembed.title, oembed.author_name)
      }

      let finalTitle = parsed.title
      let finalArtist = parsed.artist === 'Unknown Artist' ? '' : parsed.artist
      let found = await findArtworkCandidates(finalTitle, finalArtist, 5)

      // 비공식 영상에 흔한 "노래제목 - 아티스트" 역순인 경우 교차 검증
      if (parsed.hasExplicitSplit && finalTitle && finalArtist) {
        const topScore = found[0]?.score ?? -99
        if (topScore < 16) {
          const swapped = await findArtworkCandidates(finalArtist, finalTitle, 5)
          const swappedTopScore = swapped[0]?.score ?? -99
          if (swappedTopScore > topScore + 2) {
            const temp = finalTitle
            finalTitle = finalArtist
            finalArtist = temp
            found = swapped
          }
        }
      }

      if (finalTitle) setTitle(finalTitle)
      if (finalArtist) setArtist(finalArtist)

      if (found.length > 0) {
        selectArt(found[0].albumArt)
        setCandidates(found)
        setStatus('곡 정보와 공식 앨범아트를 불러왔습니다.')
      } else {
        selectArt('')
        setCandidates([])
        setStatus('곡 정보를 불러왔습니다. 제목·아티스트를 다듬어 앨범아트를 다시 검색해 보세요.')
      }
      return { title: finalTitle, artist: finalArtist }
    } catch (err) {
      console.warn('메타데이터 조회 실패:', err)
      setStatus('정보를 자동으로 불러오지 못했습니다. 직접 입력해 주세요.')
      return null
    } finally {
      isFetchingRef.current = false
      setIsFetching(false)
    }
  }

  const researchArtwork = async (silent: boolean, t = title, a = artist) => {
    const qTitle = t.trim()
    const qArtist = a.trim()
    if (!qTitle && !qArtist) {
      if (!silent) showToast('노래 제목 또는 아티스트를 먼저 입력해 주세요.', 'error')
      return
    }
    if (!silent) setStatus('공식 앨범아트를 다시 검색하는 중...')
    const found = await findArtworkCandidates(qTitle, qArtist, 5)
    if (found.length > 0) {
      selectArt(found[0].albumArt)
      setCandidates(found)
      if (!silent) setStatus(`공식 앨범아트 ${found.length}개를 찾았습니다.`)
    } else if (!silent) {
      setCandidates([])
      setStatus('일치하는 공식 앨범아트를 찾지 못했습니다.')
    }
  }

  const scheduleResearch = (t: string, a: string) => {
    clearTimeout(researchTimerRef.current)
    researchTimerRef.current = setTimeout(() => {
      if (t.trim() || a.trim()) researchArtwork(true, t, a)
    }, 650)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const videoId = extractYouTubeId(url)
    if (!videoId) {
      showToast('유효한 유튜브 링크를 입력해 주세요.', 'error')
      urlInputRef.current?.focus()
      return
    }

    let finalTitle = title
    let finalArtist = artist
    if (lastFetchedVideoIdRef.current !== videoId && !title.trim()) {
      const fetched = await fetchMetadata(true)
      if (fetched) {
        finalTitle = fetched.title || finalTitle
        finalArtist = fetched.artist || finalArtist
      }
    }

    onSubmit({
      videoId,
      title: finalTitle.trim() || '제목 없음',
      artist: finalArtist.trim() || 'Unknown Artist',
      albumArt: selectedArtRef.current || '',
    })
  }

  return (
    <ModalShell onClose={onClose} labelledBy="add-track-title">
      <ModalHeader
        id="add-track-title"
        title="곡 추가하기"
        description="유튜브 주소를 붙여넣으면 곡 정보를 자동으로 가져옵니다."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="add-url-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
            유튜브 링크
          </label>
          <div className="flex gap-2">
            <input
              ref={urlInputRef}
              id="add-url-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (extractYouTubeId(e.target.value)) fetchMetadata(false)
              }}
              onPaste={() => {
                setTimeout(() => fetchMetadata(false), 60)
              }}
              className="flex-1 min-w-0 bg-[#121212] text-white placeholder-neutral-500 border border-neutral-700 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/20 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
            />
            <button
              type="button"
              disabled={isFetching}
              onClick={() => fetchMetadata(true)}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-[#1DB954] border border-neutral-700 shrink-0 transition-colors disabled:opacity-60"
            >
              불러오기
            </button>
          </div>
          {status && (
            <p className="text-[11px] text-neutral-400 mt-1.5" aria-live="polite">
              {status}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#121212] border border-neutral-800">
          <div className="w-16 h-16 aspect-square rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
            {selectedArt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedArt} alt="앨범아트 미리보기" className="w-full h-full aspect-square object-cover" />
            ) : (
              <MusicNoteIcon className="w-6 h-6 text-neutral-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{title.trim() || '노래 제목'}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{artist.trim() || '아티스트'}</p>
            <button
              type="button"
              onClick={() => researchArtwork(false)}
              className="mt-2 text-[11px] font-semibold text-[#1DB954] hover:underline"
            >
              앨범아트 다시 검색
            </button>
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-neutral-300">공식 앨범아트 선택</span>
            <ArtworkGrid candidates={candidates} selected={selectedArt} onSelect={selectArt} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-title-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
              노래 제목
            </label>
            <input
              id="add-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                scheduleResearch(e.target.value, artist)
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-artist-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
              아티스트
            </label>
            <input
              id="add-artist-input"
              type="text"
              value={artist}
              onChange={(e) => {
                setArtist(e.target.value)
                scheduleResearch(title, e.target.value)
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] hover:bg-[#1ed760] text-neutral-950 transition-colors"
          >
            추가하기
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
