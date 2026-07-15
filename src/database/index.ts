import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { mySchema } from './schema'
import Track from './models/Track'
import Playlist from './models/Playlist'
import PlaylistTrack from './models/PlaylistTrack'

const adapter = new SQLiteAdapter({
  schema: mySchema,
  // (You might want to comment out migrations for development)
  // migrations,
  // (optional database name or file system path)
  // dbName: 'myapp',
  // (recommended option, should work flawlessly out of the box on iOS. On Android,
  // additional installation steps have to be taken - disable if you run into issues...)
  jsi: true, /* Platform.OS === 'ios' */
  // (optional, but you should implement this method)
  onSetUpError: error => {
    // Database failed to load -- offer the user to reload the app or log out
    console.error('Database setup failed', error)
  }
})

export const database = new Database({
  adapter,
  modelClasses: [
    Track,
    Playlist,
    PlaylistTrack,
  ],
})
