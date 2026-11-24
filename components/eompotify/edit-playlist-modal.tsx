'use client'

import { useRef, useState } from 'react'
import { LIKED_PLAYLIST_ID } from '@/lib/eompotify/constants'
import type { Playlist } from '@/lib/eompotify/types'
import { cropImageFileToSquare } from '@/lib/eompotify/utils'
import type { ToastType } from './toaster'
import { MusicNoteIcon, UploadIcon } from './icons'
import { inputClass, ModalHeader, ModalShell } from './modal-shell'

type Props = {
  playlist: Playlist
  onClose: () => void
  onSubmit: (values: { name: string; cover: string }) => void
  showToast: (message: string, type?: ToastType) => void
}

export function EditPlaylistModal({ playlist: pl, onClose, onSubmit, showToast }: Props) {
  const isLiked = pl.id === LIKED_PLAYLIST_ID
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(pl.name)
  const [cover, setCover] = useState(pl.cover || '')
  const [coverUrl, setCoverUrl] = useState(pl.cover && !pl.cover.startsWith('data:') ? pl.cover : '')

  const trackCovers = Array.from(new Set(pl.tracks.map((t) => t.albumArt).filter(Boolean))).slice(0, 5)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다.', 'error')
      return
    }
    try {
      // 공용 스토리지 트래픽·용량 절약을 위해 300x300 정사각형으로 리사이즈
      const dataUrl = await cropImageFileToSquare(file, 300, 0.85)
      setCoverUrl('')
      setCover(dataUrl)
    } catch (err) {
      console.warn('커버 이미지 처리 실패:', err)
    }
  }

  return (
    <ModalShell onClose={onClose} labelledBy="edit-playlist-title">
      <ModalHeader
        id="edit-playlist-title"
        title="플레이리스트 편집"
        description="이름과 커버 이미지를 변경할 수 있습니다."
        onClose={onClose}
      />

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const nextName = name.trim()
          if (!isLiked && !nextName) return
          onSubmit({ name: nextName, cover })
        }}
      >
        <div className="flex items-center gap-4 p-3 rounded-xl bg-[#121212] border border-neutral-800">
          <div className="relative w-16 h-16 aspect-square rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="커버 미리보기" className="w-full h-full aspect-square object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500">
                <MusicNoteIcon className="w-7 h-7" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="edit-playlist-cover-file"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-[#1DB954] border border-neutral-700 transition-colors"
              >
                <UploadIcon className="w-3.5 h-3.5" />
                <span>이미지 업로드</span>
              </label>
              <input
                ref={fileInputRef}
                id="edit-playlist-cover-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setCoverUrl('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                  setCover('')
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                기본 아이콘
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">기기에서 사진을 올리거나 아래에서 선택하세요.</p>
          </div>
        </div>

        <div>
          <label htmlFor="edit-playlist-name-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
            이름
          </label>
          <input
            id="edit-playlist-name-input"
            type="text"
            maxLength={40}
            required
            disabled={isLiked}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {isLiked && <p className="text-[11px] text-neutral-500 mt-1.5">Liked songs의 이름은 변경할 수 없습니다.</p>}
        </div>

        <div>
          <label htmlFor="edit-playlist-cover-url-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
            커버 이미지 URL (선택)
          </label>
          <input
            id="edit-playlist-cover-url-input"
            type="url"
            placeholder="https://..."
            value={coverUrl}
            onChange={(e) => {
              setCoverUrl(e.target.value)
              setCover(e.target.value.trim())
            }}
            className={inputClass}
          />
        </div>

        {trackCovers.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-neutral-300">수록곡 앨범아트로 설정</span>
            <div className="grid grid-cols-5 gap-2">
              {trackCovers.map((url) => (
                <button
                  key={url}
                  type="button"
                  aria-label="이 앨범아트를 커버로 설정"
                  onClick={() => {
                    setCoverUrl(url)
                    setCover(url)
                  }}
                  className="aspect-square rounded-lg overflow-hidden border border-neutral-700 hover:border-[#1DB954] transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

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
