'use client'

import { useState } from 'react'
import { findArtworkCandidates } from '@/lib/eompotify/artwork'
import type { ArtworkCandidate, Track } from '@/lib/eompotify/types'
import { getFallbackCover } from '@/lib/eompotify/utils'
import type { ToastType } from './toaster'
import { SearchIcon } from './icons'
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

  const handleSearch = async () => {
    const t = title.trim()
    const a = artist.trim()
    if (!t && !a) {
      showToast('노래 제목 또는 아티스트를 입력해 주세요.', 'error')
      return
    }
    setSearching(true)
    try {
      const found = await findArtworkCandidates(t, a, 5)
      setCandidates(found)
      if (found.length === 0) showToast('일치하는 공식 앨범아트를 찾지 못했습니다.', 'error')
    } finally {
      setSearching(false)
    }
  }

  return (
    <ModalShell onClose={onClose} labelledBy="edit-track-title">
      <ModalHeader
        id="edit-track-title"
        title="곡 정보 수정"
        description="노래 제목, 아티스트, 공식 앨범아트를 변경할 수 있습니다."
        onClose={onClose}
      />

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const t = title.trim()
          const a = artist.trim()
          if (!t || !a) return
          onSubmit({ title: t, artist: a, albumArt: selectedArt || track.albumArt || '' })
        }}
      >
        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#121212] border border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="앨범아트"
            className="w-16 h-16 aspect-square rounded-lg object-cover bg-neutral-900 border border-neutral-800 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-400">현재 선택된 앨범아트</p>
            <button
              type="button"
              disabled={searching}
              onClick={handleSearch}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-[#1DB954] border border-neutral-700 transition-colors disabled:opacity-60"
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span>앨범아트 다시 검색</span>
            </button>
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-neutral-300">검색된 앨범아트 (클릭하여 선택)</span>
            <ArtworkGrid
              candidates={candidates}
              selected={selectedArt}
              onSelect={(url) => {
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
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
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className={inputClass}
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
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] hover:bg-[#1ed760] text-neutral-950 transition-colors"
          >
            저장하기
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
