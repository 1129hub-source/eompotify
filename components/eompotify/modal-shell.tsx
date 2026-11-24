'use client'

import { CloseIcon } from './icons'

export const inputClass =
  'w-full bg-[#121212] text-white placeholder-neutral-500 border border-neutral-700 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/20 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all'

export function ModalShell({
  onClose,
  maxWidth = 'max-w-md',
  scroll = true,
  labelledBy,
  children,
}: {
  onClose: () => void
  maxWidth?: string
  scroll?: boolean
  labelledBy: string
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-[#181818] border border-neutral-800 rounded-2xl p-6 shadow-2xl ${
          scroll ? 'max-h-[90vh] overflow-y-auto' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ id, title, description, onClose }: { id: string; title: string; description: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 id={id} className="text-lg font-bold text-white">
          {title}
        </h3>
        <p className="text-xs text-neutral-400 mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
      >
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

export function ArtworkGrid({
  candidates,
  selected,
  onSelect,
}: {
  candidates: { albumArt: string; trackName: string; artistName: string }[]
  selected: string
  onSelect: (url: string) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {candidates.map((item) => (
        <button
          key={item.albumArt}
          type="button"
          title={`${item.trackName} - ${item.artistName}`}
          aria-label={`${item.trackName} - ${item.artistName} 앨범아트 선택`}
          aria-pressed={selected === item.albumArt}
          onClick={() => onSelect(item.albumArt)}
          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
            selected === item.albumArt ? 'border-[#1DB954] scale-95' : 'border-transparent hover:border-neutral-500'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.albumArt} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  )
}
