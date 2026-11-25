'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchYouTubeOEmbed, findArtworkCandidates } from '@/lib/eompotify/artwork'
import type { ArtworkCandidate, NewTrackInput } from '@/lib/eompotify/types'
import { extractYouTubeId, parseYouTubeTitle } from '@/lib/eompotify/utils'
import type { ToastType } from './toaster'
import { MusicNoteIcon, SearchIcon } from './icons'
import { ArtworkUploadButton, isCustomArtwork, prepareArtworkFile, persistTrackArtwork } from './artwork-upload'
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
  const [busy, setBusy] = useState<'metadata' | 'artwork' | null>(null)
  const busyRef = useRef<'metadata' | 'artwork' | null>(null)
  const requestRef = useRef(0)
  const videoIdRef = useRef<string | null>(null)
  const lastFetchedVideoIdRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectedArtRef = useRef('')
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const processingRef = useRef(false)
  const savingRef = useRef(false)

  const updateBusy = (value: 'metadata' | 'artwork' | null) => {
    busyRef.current = value
    setBusy(value)
  }

  const selectArt = (art: string) => {
    selectedArtRef.current = art
    setSelectedArt(art)
  }

  useEffect(() => {
    const t = setTimeout(() => urlInputRef.current?.focus(), 50)
    return () => {
      clearTimeout(t)
      clearTimeout(timerRef.current)
      requestRef.current++
    }
  }, [])

  const showResults = (found: ArtworkCandidate[]) => {
    setCandidates(found)
    if (found.length > 0) {
      const current = found.find((item) => item.albumArt === selectedArtRef.current)
      if (!isCustomArtwork(selectedArtRef.current)) selectArt((current || found[0]).albumArt)
      setStatus(`공식 앨범아트 ${found.length}개를 찾았습니다. 아래에서 선택할 수 있습니다.`)
    } else {
      setStatus('일치하는 공식 앨범아트를 찾지 못했습니다. 제목·아티스트를 확인하고 다시 검색해 주세요.')
    }
  }

  const fetchMetadata = async (videoId: string, id: number) => {
    if (id !== requestRef.current) return
    updateBusy('metadata')
    setStatus('곡 정보를 불러오는 중...')
    try {
      const oembed = await fetchYouTubeOEmbed(videoId)
      if (id !== requestRef.current) return
      if (!oembed?.title) {
        setStatus('곡 정보를 자동으로 불러오지 못했습니다. 불러오기를 다시 누르거나 제목·아티스트를 직접 입력해 주세요.')
        return
      }
      const parsed = parseYouTubeTitle(oembed.title, oembed.author_name)
      let finalTitle = parsed.title
      let finalArtist = parsed.artist === 'Unknown Artist' ? '' : parsed.artist
      // 커버 검색이 실패하더라도 먼저 가져온 제목과 아티스트는 표시한다.
      setTitle(finalTitle)
      setArtist(finalArtist)
      lastFetchedVideoIdRef.current = videoId
      setStatus('공식 앨범아트를 검색하는 중...')
      let found = await findArtworkCandidates(finalTitle, finalArtist, 5)
      if (id !== requestRef.current) return
      // 영상 제목의 아티스트/곡 순서가 반대일 때 기존 교차 검증 유지.
      if (parsed.hasExplicitSplit && finalTitle && finalArtist && (found[0]?.score ?? -99) < 16) {
        try {
          const swapped = await findArtworkCandidates(finalArtist, finalTitle, 5)
          if (id !== requestRef.current) return
          if ((swapped[0]?.score ?? -99) > (found[0]?.score ?? -99) + 2) {
            ;[finalTitle, finalArtist] = [finalArtist, finalTitle]
            found = swapped
            setTitle(finalTitle)
            setArtist(finalArtist)
          }
        } catch {
          // 역순 검색만 실패하면 원래의 검색 결과를 유지한다.
        }
      }
      if (id !== requestRef.current) return
      showResults(found)
    } catch (err) {
      if (id !== requestRef.current) return
      console.warn('앨범아트 검색 실패:', err)
      setStatus('앨범아트 검색 서비스에 연결하지 못했습니다. 앨범아트 다시 검색을 눌러 주세요.')
    } finally {
      if (id === requestRef.current) updateBusy(null)
    }
  }

  const changeUrl = (value: string) => {
    setUrl(value)
    const videoId = extractYouTubeId(value)
    if (videoId === videoIdRef.current) return
    clearTimeout(timerRef.current)
    const id = ++requestRef.current
    videoIdRef.current = videoId
    lastFetchedVideoIdRef.current = null
    setTitle('')
    setArtist('')
    selectArt('')
    setCandidates([])
    setStatus(null)
    updateBusy(videoId ? 'metadata' : null)
    if (videoId) {
      setStatus('곡 정보를 불러오는 중...')
      timerRef.current = setTimeout(() => void fetchMetadata(videoId, id), 350)
    }
  }

  const loadNow = () => {
    const videoId = extractYouTubeId(urlInputRef.current?.value || url)
    if (!videoId) {
      showToast('올바른 유튜브 링크를 입력해 주세요.', 'error')
      return
    }
    clearTimeout(timerRef.current)
    const id = ++requestRef.current
    videoIdRef.current = videoId
    void fetchMetadata(videoId, id)
  }

  const researchArtwork = async (t: string, a: string, id: number) => {
    if (id !== requestRef.current) return
    updateBusy('artwork')
    setStatus('공식 앨범아트를 검색하는 중...')
    try {
      const found = await findArtworkCandidates(t.trim(), a.trim(), 5)
      if (id !== requestRef.current) return
      showResults(found)
    } catch (err) {
      if (id !== requestRef.current) return
      console.warn('앨범아트 검색 실패:', err)
      setStatus('앨범아트 검색 서비스에 연결하지 못했습니다. 다시 검색해 주세요.')
    } finally {
      if (id === requestRef.current) updateBusy(null)
    }
  }

  const scheduleResearch = (t: string, a: string, immediate = false) => {
    clearTimeout(timerRef.current)
    const id = ++requestRef.current
    if (!immediate) {
      if (!isCustomArtwork(selectedArtRef.current)) selectArt('')
      setCandidates([])
    }
    if (!t.trim() && !a.trim()) {
      updateBusy(null)
      setStatus(null)
      if (immediate) showToast('노래 제목 또는 아티스트를 먼저 입력해 주세요.', 'error')
      return
    }
    // 입력 후 검색 대기 시간에도 추가 버튼을 막아 검색 결과가 누락되지 않게 한다.
    updateBusy('artwork')
    setStatus('공식 앨범아트를 검색하는 중...')
    if (immediate) void researchArtwork(t, a, id)
    else timerRef.current = setTimeout(() => void researchArtwork(t, a, id), 650)
  }

  const handleImageFile = async (file: File) => {
    if (processingRef.current || savingRef.current || busyRef.current === 'metadata') return
    clearTimeout(timerRef.current)
    const id = ++requestRef.current
    updateBusy(null)
    processingRef.current = true
    setProcessing(true)
    try {
      const art = await prepareArtworkFile(file)
      if (id !== requestRef.current) return
      selectArt(art)
      setStatus('직접 선택한 이미지가 적용되었습니다.')
    } catch (err) {
      if (id === requestRef.current) {
        setStatus('이미지를 적용하지 못했습니다. 기존 앨범아트를 유지합니다.')
        showToast(err instanceof Error ? err.message : '이미지를 처리하지 못했습니다.', 'error')
      }
    } finally {
      if (id === requestRef.current) {
        processingRef.current = false
        setProcessing(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busyRef.current || processingRef.current || savingRef.current) return
    const videoId = extractYouTubeId(url)
    if (!videoId) {
      showToast('유효한 유튜브 링크를 입력해 주세요.', 'error')
      urlInputRef.current?.focus()
      return
    }
    if (!title.trim() && lastFetchedVideoIdRef.current !== videoId) {
      showToast('노래 제목을 입력하거나 불러오기를 눌러 주세요.', 'error')
      return
    }
    savingRef.current = true
    setSaving(true)
    const id = ++requestRef.current
    try {
      const chosen = selectedArtRef.current || ''
      const albumArt = chosen.startsWith('data:image/') ? await persistTrackArtwork(chosen) : chosen
      if (id !== requestRef.current) return
      onSubmit({ videoId, title: title.trim() || '제목 없음', artist: artist.trim() || 'Unknown Artist', albumArt })
    } catch {
      if (id === requestRef.current) showToast('앨범아트를 저장하지 못했습니다. 다시 시도해 주세요.', 'error')
    } finally {
      if (id === requestRef.current) {
        savingRef.current = false
        setSaving(false)
      }
    }
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
              disabled={processing || saving}
              value={url}
              onChange={(e) => changeUrl(e.target.value)}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-[#121212] text-white placeholder-neutral-500 border border-neutral-700 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/20 rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none transition-all"
            />
            <button
              type="button"
              disabled={busy !== null || processing || saving}
              onClick={loadNow}
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{title.trim() || '노래 제목'}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{artist.trim() || '아티스트'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <button type="button" disabled={busy !== null || processing || saving}
                onClick={() => scheduleResearch(title, artist, true)}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] whitespace-nowrap font-semibold text-[#1DB954] border border-neutral-700 transition-colors disabled:opacity-60">
                <SearchIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{busy === 'artwork' ? '검색 중...' : '앨범아트 다시 검색'}</span>
              </button>
              <ArtworkUploadButton disabled={busy === 'metadata' || saving} processing={processing} onFile={handleImageFile} />
            </div>
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-neutral-300">공식 앨범아트 선택</span>
            <ArtworkGrid candidates={candidates} selected={selectedArt} onSelect={(art) => { if (!processingRef.current && !savingRef.current) selectArt(art) }} />
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
              disabled={busy === 'metadata' || processing || saving}
              onChange={(e) => {
                setTitle(e.target.value)
                scheduleResearch(e.target.value, artist)
              }}
              className={inputClass.replace('text-sm', 'text-base sm:text-sm')}
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
              disabled={busy === 'metadata' || processing || saving}
              onChange={(e) => {
                setArtist(e.target.value)
                scheduleResearch(title, e.target.value)
              }}
              className={inputClass.replace('text-sm', 'text-base sm:text-sm')}
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
            disabled={busy !== null || processing || saving}
            className="disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] hover:bg-[#1ed760] text-neutral-950 transition-colors"
          >
            {saving ? '저장 중...' : processing ? '이미지 처리 중...' : busy ? '검색 중...' : '추가하기'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
