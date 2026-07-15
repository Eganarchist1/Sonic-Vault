import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class Track extends Model {
  static table = 'tracks'

  @field('remote_id') remoteId!: string
  @field('source') source!: string
  @field('title') title!: string
  @field('artist') artist!: string
  @field('artwork_url') artworkUrl?: string
  @field('duration') duration!: number
  @field('local_uri') localUri?: string
  @field('sync_status') syncStatus!: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
