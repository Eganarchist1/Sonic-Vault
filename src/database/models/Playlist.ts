import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators'
import type { Query } from '@nozbe/watermelondb'
import PlaylistTrack from './PlaylistTrack'

export default class Playlist extends Model {
  static table = 'playlists'

  @field('name') name!: string
  @field('remote_id') remoteId!: string
  @field('source') source!: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  @children('playlist_tracks') playlistTracks!: Query<PlaylistTrack>
}
