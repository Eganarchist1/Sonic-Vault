const https = require('https');

const options = {
  hostname: 'music.youtube.com',
  port: 443,
  path: '/playlist?list=LM',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const snippet = data.substring(0, 1000);
    console.log('Mobile HTML Snippet:', snippet);
    
    // Check where initialData might be
    const ytInitialData = data.includes('ytInitialData');
    const ytcfg = data.includes('ytcfg');
    const windowYt = data.includes('window.yt');
    
    console.log({
      hasYtInitialData: ytInitialData,
      hasYtcfg: ytcfg,
      hasWindowYt: windowYt
    });
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
