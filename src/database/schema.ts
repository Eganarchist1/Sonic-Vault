import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tracks',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'source', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'artist', type: 'string' },
        { name: 'artwork_url', type: 'string', isOptional: true },
        { name: 'duration', type: 'number' },
        { name: 'local_uri', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'playlists',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'source', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'playlist_tracks',
      columns: [
        { name: 'playlist_id', type: 'string', isIndexed: true },
        { name: 'track_id', type: 'string', isIndexed: true },
      ]
    })
  ]
})
