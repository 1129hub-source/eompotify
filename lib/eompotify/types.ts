export type Track = {
  id: string
  videoId: string
  title: string
  artist: string
  albumArt: string
  needsArtworkLookup?: boolean
}

export type Playlist = {
  id: string
  name: string
  cover: string
  isLiked?: boolean
  tracks: Track[]
}

export type CurrentTrack = {
  playlistId: string
  trackId: string
  videoId: string
  title: string
  artist: string
  albumArt: string
}

export type RepeatMode = 'off' | 'all' | 'one'

export type ArtworkCandidate = {
  trackName: string
  collectionName: string
  artistName: string
  entity: string
  albumArt: string
  score?: number
}

export type NewTrackInput = {
  videoId: string
  title: string
  artist: string
  albumArt: string
}
