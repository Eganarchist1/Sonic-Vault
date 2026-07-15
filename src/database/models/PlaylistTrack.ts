import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'
import type { Relation } from '@nozbe/watermelondb'
import Playlist from './Playlist'
import Track from './Track'

export default class PlaylistTrack extends Model {
  static table = 'playlist_tracks'

  @field('playlist_id') playlistId!: string
  @field('track_id') trackId!: string

  @relation('playlists', 'playlist_id') playlist!: Relation<Playlist>
  @relation('tracks', 'track_id') track!: Relation<Track>
}
