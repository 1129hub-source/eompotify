import type { ArtworkCandidate } from './types'
import { ARTIST_ALIASES, normalizeText, stripBracketContent } from './utils'

export async function fetchYouTubeOEmbed(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  const endpoints = [
    `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  ]
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep)
      if (!res.ok) continue
      const data = await res.json()
      if (data && data.title) {
        return {
          title: data.title as string,
          author_name: (data.author_name as string) || '',
        }
      }
    } catch {
      // 다음 엔드포인트 시도
    }
  }
  return null
}

type ItunesItem = {
  artworkUrl100?: string
  trackName?: string
  collectionName?: string
  artistName?: string
}

/** JSONP 방식으로 iTunes Search API 호출 (미리보기 iframe CORS 차단 우회, song/album 모두 지원) */
function searchItunesJsonp(query: string, limit = 8, country = '', entity = 'song'): Promise<ArtworkCandidate[]> {
  return new Promise((resolve) => {
    if (!query || !query.trim()) {
      resolve([])
      return
    }
    const w = window as unknown as Record<string, unknown>
    const callbackName = `itunesCb_${Date.now()}_${Math.floor(Math.random() * 100000)}`
    const script = document.createElement('script')
    let settled = false

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script)
      try {
        delete w[callbackName]
      } catch {
        w[callbackName] = undefined
      }
    }

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        resolve([])
      }
    }, 4500)

    w[callbackName] = (json: { results?: ItunesItem[] }) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      const items = Array.isArray(json && json.results) ? json.results! : []
      resolve(
        items
          .filter((item) => item.artworkUrl100)
          .map((item) => ({
            trackName: item.trackName || item.collectionName || '',
            collectionName: item.collectionName || '',
            artistName: item.artistName || '',
            entity,
            albumArt: item.artworkUrl100!.replace('100x100bb', '600x600bb'),
          })),
      )
    }

    const encoded = encodeURIComponent(query.trim())
    const countryParam = country ? `&country=${country}` : ''
    script.src = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=${entity}&limit=${limit}${countryParam}&callback=${callbackName}`
    script.onerror = () => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        cleanup()
        resolve([])
      }
    }
    document.head.appendChild(script)
  })
}

/** iTunes Search API로 KR/글로벌 스토어 병렬 검색 후 병합 */
async function searchItunesMultiStore(query: string, limit = 8, entity = 'song') {
  if (!query || !query.trim()) return []
  const [krRes, usRes] = await Promise.all([
    searchItunesJsonp(query, limit, 'KR', entity),
    searchItunesJsonp(query, limit, 'US', entity),
  ])
  return [...krRes, ...usRes]
}

/** 아티스트 입력값에서 검색용 별칭 변형 목록 생성 */
function expandArtistVariants(artist: string) {
  const raw = String(artist || '').trim()
  if (!raw || raw === 'Unknown Artist') return []

  const variants = new Set<string>()
  const stripped = stripBracketContent(raw)
  if (stripped) variants.add(stripped)

  const bracketMatches = raw.match(/\(([^)]+)\)/g) || []
  bracketMatches.forEach((m) => {
    const inner = m.slice(1, -1).trim()
    if (inner) variants.add(inner)
  })

  Array.from(variants).forEach((v) => {
    const alias = ARTIST_ALIASES[v.toLowerCase()] || ARTIST_ALIASES[v]
    if (alias) variants.add(alias)
  })

  return Array.from(variants).filter(Boolean)
}

/** 검색 결과와 사용자 곡 정보(제목·아티스트)의 일치 점수 계산 */
function scoreArtworkCandidate(item: ArtworkCandidate, cleanTitle: string, artistVariants: string[]) {
  const normTargetTitle = normalizeText(stripBracketContent(cleanTitle) || cleanTitle)
  const normItemTrack = normalizeText(stripBracketContent(item.trackName) || item.trackName)
  const normItemFullTrack = normalizeText(item.trackName)
  const normItemCollection = normalizeText(item.collectionName)
  const normItemArtist = normalizeText(item.artistName)

  let score = 0

  if (normTargetTitle) {
    if (normItemTrack === normTargetTitle || normItemFullTrack === normTargetTitle) {
      score += 12
    } else if (normItemTrack.includes(normTargetTitle) || normTargetTitle.includes(normItemTrack)) {
      score += 7
    } else if (normItemCollection.includes(normTargetTitle)) {
      score += 4
    }
  }

  if (artistVariants.length > 0 && normItemArtist) {
    let bestArtistScore = 0
    for (const v of artistVariants) {
      const nv = normalizeText(v)
      if (!nv) continue
      if (normItemArtist === nv) {
        bestArtistScore = Math.max(bestArtistScore, 12)
      } else if (normItemArtist.includes(nv) || nv.includes(normItemArtist)) {
        bestArtistScore = Math.max(bestArtistScore, 8)
      }
    }
    score += bestArtistScore
  }

  const lowerTrack = `${item.trackName || ''} ${item.collectionName || ''}`.toLowerCase()
  const lowerTarget = String(cleanTitle || '').toLowerCase()
  const penaltyWords = [
    'karaoke',
    'instrumental',
    'inst.',
    'tribute',
    'lullaby',
    'music box',
    'piano cover',
    '8-bit',
    'sped up',
    'slowed',
    'nightcore',
    '노래방',
    '반주',
    '오르골',
  ]
  for (const pw of penaltyWords) {
    if (lowerTrack.includes(pw) && !lowerTarget.includes(pw)) {
      score -= 8
    }
  }

  if (item.entity === 'song') score += 1

  return score
}

/** 아티스트와 노래 제목 기반으로 공식 1:1 앨범아트 후보를 다단계 검색·중복 제거·정렬 */
export async function findArtworkCandidates(title: string, artist: string, limit = 5): Promise<ArtworkCandidate[]> {
  const cleanTitle = String(title || '').trim()
  const coreTitle = stripBracketContent(cleanTitle) || cleanTitle
  const artistVariants = expandArtistVariants(artist)
  const primaryArtist = artistVariants[0] || ''
  const aliasArtist = artistVariants.find((v) => v !== primaryArtist) || ''

  const primaryQueries: string[] = []
  if (coreTitle && primaryArtist) primaryQueries.push(`${primaryArtist} ${coreTitle}`)
  if (coreTitle && aliasArtist) primaryQueries.push(`${aliasArtist} ${coreTitle}`)
  if (cleanTitle && cleanTitle !== coreTitle && primaryArtist) primaryQueries.push(`${primaryArtist} ${cleanTitle}`)
  if (primaryQueries.length === 0 && coreTitle) primaryQueries.push(coreTitle)
  if (primaryQueries.length === 0 && primaryArtist) primaryQueries.push(primaryArtist)

  const rawPool: ArtworkCandidate[] = []
  const firstWave = await Promise.all(primaryQueries.slice(0, 3).map((q) => searchItunesMultiStore(q, 8, 'song')))
  firstWave.forEach((list) => rawPool.push(...list))

  const topScoreSoFar = rawPool.reduce(
    (max, item) => Math.max(max, scoreArtworkCandidate(item, cleanTitle, artistVariants)),
    -99,
  )
  if (rawPool.length === 0 || topScoreSoFar < 14) {
    const fallbackTasks: Promise<ArtworkCandidate[]>[] = []
    if (coreTitle) fallbackTasks.push(searchItunesMultiStore(coreTitle, 8, 'song'))
    if (primaryArtist && coreTitle) {
      fallbackTasks.push(searchItunesMultiStore(`${primaryArtist} ${coreTitle}`, 6, 'album'))
    } else if (primaryArtist) {
      fallbackTasks.push(searchItunesMultiStore(primaryArtist, 6, 'album'))
    }
    const secondWave = await Promise.all(fallbackTasks)
    secondWave.forEach((list) => rawPool.push(...list))
  }

  if (rawPool.length === 0) return []

  const scored = rawPool.map((item) => ({
    ...item,
    score: scoreArtworkCandidate(item, cleanTitle, artistVariants),
  }))
  scored.sort((a, b) => b.score - a.score)

  const uniqueByArt: ArtworkCandidate[] = []
  const seenUrls = new Set<string>()
  for (const item of scored) {
    if (!item.albumArt || seenUrls.has(item.albumArt)) continue
    seenUrls.add(item.albumArt)
    uniqueByArt.push(item)
    if (uniqueByArt.length >= limit) break
  }

  return uniqueByArt
}
