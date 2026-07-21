const crypto = require('crypto');
const https = require('https');

// We use an empty SAPISID just to see what the API returns (it should return Unauthenticated, but format should be JSON)
const sapisid = '12345';
const time = Math.floor(Date.now() / 1000);
const str = `${time} ${sapisid} https://music.youtube.com`;
const hash = crypto.createHash('sha1').update(str).digest('hex');
const authHeader = `SAPISIDHASH ${time}_${hash}`;

const payload = JSON.stringify({
  context: {
    client: {
      clientName: "WEB_REMIX",
      clientVersion: "1.20230522.01.00",
      hl: "en",
    }
  },
  browseId: "FEmusic_liked_videos"
});

const options = {
  hostname: 'music.youtube.com',
  port: 443,
  path: '/youtubei/v1/browse',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
    'Origin': 'https://music.youtube.com',
    'Cookie': `SAPISID=${sapisid};`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const snippet = data.substring(0, 500);
    console.log('YouTube API Response snippet:', snippet);
  });
});

req.on('error', (e) => console.error(e));
req.write(payload);
req.end();
