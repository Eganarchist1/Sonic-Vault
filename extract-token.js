const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  console.log('Connecting to interactive browser...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  
  // Set a standard desktop User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  console.log('Monitoring Network Requests...');
  let foundToken = false;
  
  await page.setRequestInterception(true);
  page.on('request', request => {
    const headers = request.headers();
    const authHeader = headers['authorization'] || headers['Authorization'];
    
    if (authHeader && authHeader.startsWith('Bearer ') && request.url().includes('spotify.com')) {
      const token = authHeader.replace('Bearer ', '');
      if (!foundToken && token.length > 50) {
        console.log('\n\n========================================');
        console.log('✅ EXTRACTED SPOTIFY ACCESS TOKEN:');
        console.log(token);
        console.log('From URL:', request.url());
        console.log('========================================\n\n');
        foundToken = true;
        fs.writeFileSync('spotify-token.txt', token);
      }
    }
    request.continue();
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('get_access_token')) {
      console.log('\n[API Call] /get_access_token was hit!');
      try {
        const json = await response.json();
        console.log('Response:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Could not parse JSON response from /get_access_token');
      }
    }
  });

  console.log('Navigating to Spotify Login...');
  await page.goto('https://accounts.spotify.com/en/login?continue=https://open.spotify.com/', { waitUntil: 'networkidle2' });

  console.log('Please log in manually in the opened browser window.');
  
  // Monitor DOM every 5 seconds for the session tag
  setInterval(async () => {
    try {
      const sessionData = await page.evaluate(() => {
        const el = document.getElementById('session');
        return el ? el.innerHTML : null;
      });
      if (sessionData && !foundToken) {
        const parsed = JSON.parse(sessionData);
        if (parsed.accessToken) {
          console.log('\n\n========================================');
          console.log('✅ EXTRACTED SPOTIFY ACCESS TOKEN FROM DOM <script id="session"> :');
          console.log(parsed.accessToken);
          console.log('========================================\n\n');
          foundToken = true;
          fs.writeFileSync('spotify-token.txt', parsed.accessToken);
        }
      }
    } catch (e) {}
  }, 5000);

})();
