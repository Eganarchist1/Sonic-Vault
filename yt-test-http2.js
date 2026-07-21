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
    // Let's find ANY variable containing the playlist data
    // Usually it's window.ytInitialData, window['ytInitialData'], ytcfg.set, etc.
    const hasInitialData = data.toLowerCase().includes('initialdata');
    const hasYtcfg = data.includes('ytcfg.set({');
    const hasDataLoaded = data.includes('data-loaded');

    console.log('Mobile HTML Data Analysis:');
    console.log('- Includes "initialdata" (case insensitive):', hasInitialData);
    console.log('- Includes "ytcfg.set({":', hasYtcfg);
    
    // Find the first instance of ytcfg.set and print a snippet
    if (hasYtcfg) {
        const snippet = data.substring(data.indexOf('ytcfg.set({'), data.indexOf('ytcfg.set({') + 300);
        console.log('- ytcfg snippet:', snippet);
    }
    
    // Check if initialData exists under a different case like ytInitialData
    const match = data.match(/([a-zA-Z0-9_]+)\s*=\s*JSON\.parse\('/);
    if (match) {
        console.log('- Found JSON.parse variable:', match[1]);
    }
    
    const objMatch = data.match(/window\["ytInitialData"\]\s*=\s*\{/);
    if (objMatch) {
        console.log('- Found window["ytInitialData"] object!');
    }
  });
});
req.end();
