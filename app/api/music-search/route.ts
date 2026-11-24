// 음악 메타데이터와 커버 검색은 서버에서 수행한다. 모바일 브라우저의
// 외부 JSONP 스크립트 차단·CORS 정책에 의존하지 않는다.
const headers = { 'Cache-Control': 'no-store' }

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers })
}

async function getJson(url: URL, timeout = 7000): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`)
  return response.json()
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const kind = params.get('kind')

  if (kind === 'metadata') {
    const videoId = params.get('videoId') || ''
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json({ error: 'Invalid video ID' }, 400)
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    // 서버에서는 두 공급자 중 먼저 성공한 응답을 사용한다.
    const youtube = new URL('https://www.youtube.com/oembed')
    youtube.searchParams.set('url', videoUrl)
    youtube.searchParams.set('format', 'json')
    const noembed = new URL('https://noembed.com/embed')
    noembed.searchParams.set('url', videoUrl)
    try {
      const data = await Promise.any([youtube, noembed].map(async (url) => {
        const value = await getJson(url) as { title?: unknown; author_name?: unknown }
        if (typeof value?.title !== 'string' || !value.title.trim()) throw new Error('Missing title')
        return { title: value.title, author_name: typeof value.author_name === 'string' ? value.author_name : '' }
      }))
      return json(data)
    } catch {
      return json({ error: 'Metadata unavailable' }, 502)
    }
  }

  if (kind === 'artwork') {
    const term = (params.get('q') || '').trim()
    const country = params.get('country') || 'KR'
    const entity = params.get('entity') || 'song'
    const limit = Number(params.get('limit') || '8')
    if (!term || term.length > 300 || !['KR', 'US'].includes(country) || !['song', 'album'].includes(entity) || !Number.isInteger(limit) || limit < 1 || limit > 20) {
      return json({ error: 'Invalid artwork query' }, 400)
    }
    const url = new URL('https://itunes.apple.com/search')
    url.search = new URLSearchParams({ term, country, entity, media: 'music', limit: String(limit) }).toString()
    try {
      const value = await getJson(url) as { results?: unknown }
      if (!Array.isArray(value?.results)) throw new Error('Invalid artwork response')
      // 필요한 공개 메타데이터만 돌려준다. 임의 주소 프록시는 허용하지 않는다.
      const results = value.results.slice(0, limit).flatMap((item: unknown) => {
        if (!item || typeof item !== 'object') return []
        const row = item as Record<string, unknown>
        const art = typeof row.artworkUrl100 === 'string' ? row.artworkUrl100 : ''
        if (!/^https:\/\/[^/]+\.mzstatic\.com\//i.test(art)) return []
        return [{ artworkUrl100: art, trackName: typeof row.trackName === 'string' ? row.trackName : '', collectionName: typeof row.collectionName === 'string' ? row.collectionName : '', artistName: typeof row.artistName === 'string' ? row.artistName : '' }]
      })
      return json({ results })
    } catch {
      return json({ error: 'Artwork search unavailable' }, 502)
    }
  }

  return json({ error: 'Unknown search type' }, 400)
}
