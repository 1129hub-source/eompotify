import type { Playlist } from './types'

export const STORAGE_KEY = 'vibetube_v4_playlists'
export const SUBTITLE_STORAGE_KEY = 'vibetube_v4_subtitle'
export const DEFAULT_COVER_STORAGE_KEY = 'eompotify_v1_default_cover'
export const DEFAULT_BRAND_SUBTITLE = 'Music Player'
export const LIKED_PLAYLIST_ID = 'pl-liked-songs'
export const LIKED_PLAYLIST_NAME = 'Liked songs'

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-default-1',
    name: 'My K-Pop Mix',
    cover: '',
    tracks: [
      {
        id: 'tr-sample-1',
        videoId: 'M9G4guYg-i8',
        title: 'Angel Bite',
        artist: 'TXT',
        albumArt: '',
        needsArtworkLookup: true,
      },
      {
        id: 'tr-sample-2',
        videoId: '88GkYKvnvvI',
        title: 'Sign',
        artist: 'izna',
        albumArt: '',
        needsArtworkLookup: true,
      },
    ],
  },
]
