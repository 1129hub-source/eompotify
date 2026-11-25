'use client'

import { useRef } from 'react'
import { uploadImageDataUrl } from '@/lib/eompotify/remote'
import { UploadIcon } from './icons'

export const isCustomArtwork = (url: string) =>
  url.startsWith('data:image/') || url.includes('/eompotify-images/track-covers/')

// Decode locally and keep the same square format as playlist covers.
export async function prepareArtworkFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.name)) {
    throw new Error('이미지 파일을 선택해 주세요.')
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('20MB 이하의 이미지를 선택해 주세요.')
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('이미지를 열 수 없습니다. JPG, PNG 또는 WebP로 다시 시도해 주세요.'))
      img.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    if (!side) throw new Error('이미지 크기를 확인할 수 없습니다.')
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = Math.min(400, side)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('이미지를 처리할 수 없습니다.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
    const result = canvas.toDataURL('image/jpeg', 0.84)
    if (!result.startsWith('data:image/jpeg;')) throw new Error('이미지 변환에 실패했습니다.')
    return result
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Use the existing public image bucket. As with playlist covers, a compressed
// data URL can be stored in the shared text column if storage upload fails.
export async function persistTrackArtwork(art: string): Promise<string> {
  if (!art.startsWith('data:image/')) return art
  try {
    return await uploadImageDataUrl(art, 'track-covers')
  } catch (error) {
    console.warn('앨범아트 스토리지 업로드 실패, DB에 직접 저장합니다:', error)
    return art
  }
}

export function ArtworkUploadButton({ disabled, processing, onFile }: {
  disabled: boolean
  processing: boolean
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" disabled={disabled || processing}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center justify-center gap-1 whitespace-nowrap px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-[#1DB954] border border-neutral-700 transition-colors disabled:opacity-50">
        <UploadIcon className="w-3.5 h-3.5 shrink-0" />
        {processing ? '처리 중...' : '이미지 업로드'}
      </button>
      <input ref={inputRef} type="file" accept="image/*,.heic,.heif" className="hidden"
        aria-label="앨범아트 이미지 선택" disabled={disabled || processing}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          e.currentTarget.value = ''
          if (file) onFile(file)
        }} />
    </>
  )
}
