'use client'

import { useState } from 'react'

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string
  fallbackSrc?: string
  onFinalError?: () => void
}

/** 이미지 로드 실패 시 한 번만 대체 이미지로 전환 */
export function FallbackImg({ src, fallbackSrc, onFinalError, alt = '', ...rest }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const useFallback = failedSrc === src && !!fallbackSrc
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      alt={alt}
      src={useFallback ? fallbackSrc : src}
      onError={() => {
        if (failedSrc !== src && fallbackSrc) setFailedSrc(src)
        else onFinalError?.()
      }}
    />
  )
}
