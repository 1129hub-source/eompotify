import type { ArtworkCandidate } from './types'
import { ARTIST_ALIASES, normalizeText, stripBracketContent } from './utils'

// 모든 기기가 같은 출처의 Next.js API를 호출한다.
async function requestMusicSearch(params: Record<string, string>) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`/api/music-search?${new URLSearchParams(params)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Music search HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchYouTubeOEmbed(videoId: string): Promise<{ title: string; author_name: string } | null> {
  try {
    const data = await requestMusicSearch({ kind: 'metadata', videoId })
    return typeof data?.title === 'string' ? { title: data.title, author_name: data.author_name || '' } : null
  } catch {
    return null
  }
}

type ItunesItem = {
  artworkUrl100?: string
  trackName?: string
  collectionName?: string
  artistName?: string
}

async function searchItunes(query: string, limit: number, country: string, entity: string): Promise<ArtworkCandidate[]> {
  const data = await requestMusicSearch({ kind: 'artwork', q: query.trim().slice(0, 300), limit: String(limit), country, entity })
  if (!Array.isArray(data?.results)) throw new Error('Invalid artwork response')
  return (data.results as ItunesItem[])
    .filter((item) => item.artworkUrl100)
    .map((item) => ({
      trackName: item.trackName || item.collectionName || '',
      collectionName: item.collectionName || '',
      artistName: item.artistName || '',
      entity,
      albumArt: item.artworkUrl100!.replace('100x100bb', '600x600bb'),
    }))
}

/** KR/US 결과 중 한쪽 검색이 실패해도 성공한 결과는 사용한다. */
async function searchItunesMultiStore(query: string, limit = 8, entity = 'song') {
  if (!query || !query.trim()) return []
  const results = await Promise.allSettled(['KR', 'US'].map((country) => searchItunes(query, limit, country, entity)))
  const successful = results.filter((result): result is PromiseFulfilledResult<ArtworkCandidate[]> => result.status === 'fulfilled')
  if (!successful.length) throw new Error('Artwork search unavailable')
  return successful.flatMap((result) => result.value)
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
  let successfulSearches = 0
  const collect = async (tasks: Promise<ArtworkCandidate[]>[]) => {
    const results = await Promise.allSettled(tasks)
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successfulSearches++
        rawPool.push(...result.value)
      }
    }
  }
  await collect(primaryQueries.slice(0, 3).map((q) => searchItunesMultiStore(q, 8, 'song')))

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
    await collect(fallbackTasks)
  }

  if (successfulSearches === 0 && primaryQueries.length > 0) throw new Error('Artwork search unavailable')
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
