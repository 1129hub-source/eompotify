'use client'

import { useEffect, useRef, useState } from 'react'
import { findArtworkCandidates } from '@/lib/eompotify/artwork'
import type { ArtworkCandidate, Track } from '@/lib/eompotify/types'
import { getFallbackCover } from '@/lib/eompotify/utils'
import type { ToastType } from './toaster'
import { SearchIcon } from './icons'
import { ArtworkUploadButton, prepareArtworkFile, persistTrackArtwork } from './artwork-upload'
import { ArtworkGrid, inputClass, ModalHeader, ModalShell } from './modal-shell'

type Props = {
  track: Track
  onClose: () => void
  onSubmit: (values: { title: string; artist: string; albumArt: string }) => void
  showToast: (message: string, type?: ToastType) => void
}

export function EditTrackModal({ track, onClose, onSubmit, showToast }: Props) {
  const [title, setTitle] = useState(track.title)
  const [artist, setArtist] = useState(track.artist)
  const [selectedArt, setSelectedArt] = useState(track.albumArt || '')
  const [preview, setPreview] = useState(track.albumArt || getFallbackCover(track.title))
  const [candidates, setCandidates] = useState<ArtworkCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [status, setStatus] = useState('')
  const requestRef = useRef(0)
  const searchingRef = useRef(false)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const processingRef = useRef(false)
  const savingRef = useRef(false)
  useEffect(() => () => { requestRef.current++ }, [])

  const resetResults = () => {
    requestRef.current++
    searchingRef.current = false
    setSearching(false)
    setCandidates([])
    setStatus('')
  }

  const handleSearch = async () => {
    const t = title.trim()
    const a = artist.trim()
    if (!t && !a) {
      showToast('노래 제목 또는 아티스트를 입력해 주세요.', 'error')
      return
    }
    if (searchingRef.current || processingRef.current || savingRef.current) return
    const id = ++requestRef.current
    searchingRef.current = true
    setSearching(true)
    setStatus('공식 앨범아트를 검색하는 중...')
    try {
      const found = await findArtworkCandidates(t, a, 5)
      if (id !== requestRef.current) return
      setCandidates(found)
      if (found.length > 0) {
        setStatus(`공식 앨범아트 ${found.length}개를 찾았습니다.`)
        if (!selectedArt || selectedArt.includes('i.ytimg.com')) {
          setSelectedArt(found[0].albumArt)
          setPreview(found[0].albumArt)
        }
      } else setStatus('일치하는 공식 앨범아트를 찾지 못했습니다.')
    } catch (err) {
      if (id !== requestRef.current) return
      console.warn('앨범아트 검색 실패:', err)
      setStatus('앨범아트 검색 서비스에 연결하지 못했습니다. 다시 검색해 주세요.')
    } finally {
      if (id === requestRef.current) {
        searchingRef.current = false
        setSearching(false)
      }
    }
  }

  const handleImageFile = async (file: File) => {
    if (processingRef.current || savingRef.current) return
    const id = ++requestRef.current
    searchingRef.current = false
    setSearching(false)
    processingRef.current = true
    setProcessing(true)
    try {
      const art = await prepareArtworkFile(file)
      if (id !== requestRef.current) return
      setSelectedArt(art)
      setPreview(art)
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

  return (
    <ModalShell onClose={onClose} labelledBy="edit-track-title">
      <ModalHeader
        id="edit-track-title"
        title="곡 정보 수정"
        description="노래 제목, 아티스트, 앨범아트를 변경할 수 있습니다."
        onClose={onClose}
      />

      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (searchingRef.current || processingRef.current || savingRef.current) return
          const t = title.trim()
          const a = artist.trim()
          if (!t || !a) return
          savingRef.current = true
          setSaving(true)
          const id = ++requestRef.current
          try {
            const chosen = selectedArt || track.albumArt || ''
            const albumArt = chosen.startsWith('data:image/') ? await persistTrackArtwork(chosen) : chosen
            if (id !== requestRef.current) return
            onSubmit({ title: t, artist: a, albumArt })
          } catch {
            if (id === requestRef.current) showToast('앨범아트를 저장하지 못했습니다. 다시 시도해 주세요.', 'error')
          } finally {
            if (id === requestRef.current) {
              savingRef.current = false
              setSaving(false)
            }
          }
        }}
      >
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 p-3 rounded-xl bg-[#121212] border border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="앨범아트"
            className="sm:row-span-2 w-16 h-16 aspect-square rounded-lg object-cover bg-neutral-900 border border-neutral-800 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs text-neutral-400">현재 선택된 앨범아트</p>
          </div>
          <div className="col-span-2 sm:col-span-1 sm:col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <button type="button" disabled={searching || processing || saving} onClick={handleSearch}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] whitespace-nowrap font-semibold text-[#1DB954] border border-neutral-700 transition-colors disabled:opacity-60">
                <SearchIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{searching ? '검색 중...' : '앨범아트 다시 검색'}</span>
              </button>
              <ArtworkUploadButton disabled={saving} processing={processing} onFile={handleImageFile} />
          </div>
        </div>

        {status && <p className="text-[11px] text-neutral-400" aria-live="polite">{status}</p>}

        {candidates.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-neutral-300">검색된 앨범아트 (클릭하여 선택)</span>
            <ArtworkGrid
              candidates={candidates}
              selected={selectedArt}
              onSelect={(url) => {
                if (processingRef.current || savingRef.current) return
                setSelectedArt(url)
                setPreview(url)
              }}
            />
          </div>
        )}

        <div>
          <label htmlFor="edit-title-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
            노래 제목
          </label>
          <input
            id="edit-title-input"
            type="text"
            required
            disabled={processing || saving}
            value={title}
            onChange={(e) => { setTitle(e.target.value); resetResults() }}
            className={inputClass.replace('text-sm', 'text-base sm:text-sm')}
          />
        </div>

        <div>
          <label htmlFor="edit-artist-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
            아티스트
          </label>
          <input
            id="edit-artist-input"
            type="text"
            required
            disabled={processing || saving}
            value={artist}
            onChange={(e) => { setArtist(e.target.value); resetResults() }}
            className={inputClass.replace('text-sm', 'text-base sm:text-sm')}
          />
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
            disabled={searching || processing || saving}
            className="disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] hover:bg-[#1ed760] text-neutral-950 transition-colors"
          >
            {saving ? '저장 중...' : processing ? '이미지 처리 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
