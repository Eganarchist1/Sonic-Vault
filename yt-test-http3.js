const https = require('https');

const options = {
  hostname: 'music.youtube.com',
  port: 443,
  path: '/playlist?list=LM',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const lower = data.toLowerCase();
    const idx = lower.indexOf('initialdata');
    if (idx !== -1) {
        // Print 50 chars before and 100 chars after
        const snippet = data.substring(idx - 50, idx + 100);
        console.log('Found initialData format:');
        console.log(snippet);
    }
  });
});
req.end();
