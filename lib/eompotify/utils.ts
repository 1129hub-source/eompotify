export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function getFallbackCover(title = 'Music') {
  const label = encodeURIComponent((title || 'Music').slice(0, 12))
  return `https://placehold.co/300x300/1e1e1e/1DB954?text=${label}`
}

/** 모바일·외부 네트워크 환경에서도 앨범아트가 깨지지 않도록 HTTPS 변환 및 사이즈 최적화 */
export function normalizeArtworkUrl(url: string | undefined | null, size = 400) {
  if (!url) return ''
  let clean = String(url).trim()
  if (clean.startsWith('http://')) {
    clean = 'https://' + clean.slice(7)
  }
  if (clean.includes('mzstatic.com')) {
    clean = clean.replace(/\/\d+x\d+bb\.(jpg|png|webp)/i, `/${size}x${size}bb.jpg`)
  }
  return clean
}

/** 유튜브 URL에서 11자리 영상 ID 추출 */
export function extractYouTubeId(input: string | null | undefined) {
  if (!input) return null
  const trimmed = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  ]
  for (const regex of patterns) {
    const match = trimmed.match(regex)
    if (match && match[1]) return match[1]
  }
  return null
}

/** 비공식·유통사·방송사 채널명 여부 판별 (아티스트명 오인 방지) */
const NON_ARTIST_CHANNEL_REGEX =
  /(HYBE\s*LABELS|SMTOWN|JYP\s*Entertainment|YG\s*ENTERTAINMENT|1theK|Stone\s*Music|GENIE\s*MUSIC|Bugs|Melon|Mnet|KBS|SBS|MBC|JTBC|dingo|it's\s*Live|Studio\s*Choom|THE\s*FIRST\s*TAKE|COLORS|VEVO|Lyrics|가사|플레이리스트|Playlist|Music|Audio|노래|직캠|Fancam|Kpop|K-Pop)/i

/** 자주 쓰이는 아티스트 약어·한영 별칭 매핑 (검색 정확도 향상) */
export const ARTIST_ALIASES: Record<string, string> = {
  txt: 'TOMORROW X TOGETHER',
  투모로우바이투게더: 'TOMORROW X TOGETHER',
  투바투: 'TOMORROW X TOGETHER',
  bts: 'BTS',
  방탄소년단: 'BTS',
  svt: 'SEVENTEEN',
  세븐틴: 'SEVENTEEN',
  skz: 'Stray Kids',
  스트레이키즈: 'Stray Kids',
  '스트레이 키즈': 'Stray Kids',
  아이브: 'IVE',
  에스파: 'aespa',
  르세라핌: 'LE SSERAFIM',
  뉴진스: 'NewJeans',
  블랙핑크: 'BLACKPINK',
  트와이스: 'TWICE',
  레드벨벳: 'Red Velvet',
  아이들: '(G)I-DLE',
  여자아이들: '(G)I-DLE',
  엔하이픈: 'ENHYPEN',
  아일릿: 'ILLIT',
  라이즈: 'RIIZE',
  보이넥스트도어: 'BOYNEXTDOOR',
  보넥도: 'BOYNEXTDOOR',
  투어스: 'TWS',
  제로베이스원: 'ZEROBASEONE',
  제베원: 'ZEROBASEONE',
  이즈나: 'izna',
  데이식스: 'DAY6',
  아이유: 'IU',
  태연: 'TAEYEON',
  백현: 'BAEKHYUN',
  정국: 'Jung Kook',
  지드래곤: 'G-DRAGON',
  빅뱅: 'BIGBANG',
  엑소: 'EXO',
  샤이니: 'SHINEE',
  소녀시대: "Girls' Generation",
}

/** 검색/비교용 문자열 정규화 (소문자, 공백·특수문자 제거) */
export function normalizeText(str: string | null | undefined) {
  return String(str || '')
    .toLowerCase()
    .replace(/[\s\-_.'’"“”‘’`~!@#$%^&*()+=\[\]{}|\\/:;<>?,]/g, '')
}

/** 괄호 안의 부제·부가정보를 제거한 핵심 텍스트 추출 */
export function stripBracketContent(str: string | null | undefined) {
  return String(str || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/【[^】]*】/g, ' ')
    .replace(/「[^」]*」/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** 유튜브 영상 제목에서 비공식 영상 태그(가사/자막/라이브/직캠 등)를 걷어내고 제목·아티스트 분리 */
export function parseYouTubeTitle(rawTitle: string, authorName = '') {
  const noiseKeyword =
    '(MV|M\\/V|Official|Audio|Lyric(s)?|Color\\s*Coded|HAN\\s*\\/?\\s*ROM\\s*\\/?\\s*ENG|KOR\\s*\\/?\\s*ENG|ENG\\s*SUB|KOR\\s*SUB|SUB|CC|Video|Live|Performance|Ver\\.?|HD|4K|Teaser|Full|Stage|Fancam|MR|Inst\\.?|Instrumental|Karaoke|Cover|1\\s*Hour|1시간|가사|자막|한글자막|번역|해석|발음|직캠|교차편집|노래방|음원|무대|인기가요|뮤직뱅크|엠카운트다운|음악중심|잇츠라이브|킬링보이스)'

  const cleaned = String(rawTitle || '')
    .replace(new RegExp(`\\[[^\\]]*${noiseKeyword}[^\\]]*\\]`, 'gi'), ' ')
    .replace(new RegExp(`\\([^)]*${noiseKeyword}[^)]*\\)`, 'gi'), ' ')
    .replace(new RegExp(`【[^】]*${noiseKeyword}[^】]*】`, 'gi'), ' ')
    .replace(/\b(Official\s*(Music\s*)?Video|Official\s*Audio|Color\s*Coded\s*Lyrics|Lyrics?\s*Video|M\/V|MV)\b/gi, ' ')
    .replace(/(가사\s*첨부|가사\s*해석|한글\s*자막|1시간\s*반복|무한\s*반복|고음질|풀버전)/gi, ' ')
    .replace(/#\S+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  let cleanAuthor = String(authorName || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s*Official$/i, '')
    .trim()

  if (NON_ARTIST_CHANNEL_REGEX.test(cleanAuthor)) {
    cleanAuthor = ''
  }

  let artist = cleanAuthor
  let title = cleaned
  let hasExplicitSplit = false

  // 1) "Artist - Title" / "Title - Artist" 구분자 분리
  const separators = [' - ', ' – ', ' — ', ' | ', ' / ']
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned
        .split(sep)
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length >= 2) {
        artist = parts[0]
        title = parts[1]
        hasExplicitSplit = true
        break
      }
    }
  }

  // 2) 구분자가 없을 때: 아티스트 '노래 제목' 또는 아티스트 "노래 제목" 패턴 인식
  if (!hasExplicitSplit) {
    const quoteMatch = cleaned.match(/^(.+?)\s*['"‘’“”『「](.+?)['"‘’“”』」]/)
    if (quoteMatch && quoteMatch[1] && quoteMatch[2]) {
      artist = quoteMatch[1].trim()
      title = quoteMatch[2].trim()
      hasExplicitSplit = true
    }
  }

  title = title.replace(/^['"‘’“”\-–—|/:·•\s]+|['"‘’“”\-–—|/:·•\s]+$/g, '').trim()
  artist = artist.replace(/^['"‘’“”\-–—|/:·•\s]+|['"‘’“”\-–—|/:·•\s]+$/g, '').trim()

  return {
    title: title || rawTitle || '제목 없음',
    artist: artist || 'Unknown Artist',
    hasExplicitSplit,
  }
}

/** 이미지를 중앙 크롭해 정사각형 JPEG data URL로 변환 */
export function cropImageFileToSquare(file: File, size: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('image load failed'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas unavailable'))
          return
        }
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
