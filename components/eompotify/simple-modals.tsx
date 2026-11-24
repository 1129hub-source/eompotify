'use client'

import { useEffect, useRef, useState } from 'react'
import { inputClass, ModalShell } from './modal-shell'

export function NewPlaylistModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm" scroll={false} labelledBy="new-playlist-title">
      <h3 id="new-playlist-title" className="text-lg font-bold text-white">
        새 플레이리스트 만들기
      </h3>
      <p className="text-xs text-neutral-400 mt-1">플레이리스트 이름을 입력하세요.</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = name.trim()
          if (trimmed) onSubmit(trimmed)
        }}
      >
        <input
          ref={inputRef}
          type="text"
          maxLength={40}
          required
          aria-label="플레이리스트 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#1DB954] hover:bg-[#1ed760] text-neutral-950 transition-colors"
          >
            만들기
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

export function ConfirmDeleteModal({
  description,
  onClose,
  onConfirm,
}: {
  description: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm" scroll={false} labelledBy="confirm-delete-title">
      <h3 id="confirm-delete-title" className="text-lg font-bold text-white">
        재생목록을 삭제할까요?
      </h3>
      <p className="text-sm text-neutral-400 mt-2">{description}</p>
      <div className="flex items-center justify-end gap-2 mt-5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
        >
          삭제하기
        </button>
      </div>
    </ModalShell>
  )
}
