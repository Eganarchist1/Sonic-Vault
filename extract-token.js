const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

(async () => {
  console.log('Launching interactive browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Hide Puppeteer/Webdriver signature from Google's bot detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // Use a standard Windows desktop User Agent to prevent mobile-specific capability checks
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  console.log('Monitoring Network Requests...');
  let foundSpotify = false;
  let foundYouTube = false;
  
  await page.setRequestInterception(true);
  page.on('request', request => {
    const headers = request.headers();
    const url = request.url();
    
    // Check Spotify
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && authHeader.includes('Bearer ') && (url.includes('spotify.com') || url.includes('spotify.net'))) {
      if (!foundSpotify) {
        console.log('\n\n========================================');
        console.log('✅ EXTRACTED SPOTIFY ACCESS TOKEN:');
        console.log(authHeader.replace('Bearer ', ''));
        console.log('App-Platform Header:', headers['app-platform']);
        console.log('========================================\n\n');
        foundSpotify = true;
      }
    }

    // Check YouTube Music
    if (url.includes('music.youtube.com') || url.includes('youtubei/v1')) {
      const cookie = headers['cookie'] || headers['Cookie'];
      if (cookie && cookie.includes('SAPISID') && !foundYouTube) {
        console.log('\n\n========================================');
        console.log('✅ EXTRACTED YOUTUBE MUSIC COOKIES:');
        console.log('SAPISID Found. Authorization Headers:', authHeader || 'None');
        console.log('========================================\n\n');
        foundYouTube = true;
      }
    }
    
    request.continue();
  });

  console.log('Navigating to Spotify and YouTube Music...');
  
  // Open Spotify in the first tab
  await page.goto('https://accounts.spotify.com/en/login?continue=https://open.spotify.com/', { waitUntil: 'networkidle2' });
  console.log('Spotify opened! Please log in.');

  // Open YouTube Music in a second tab
  const ytPage = await browser.newPage();
  await ytPage.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  await ytPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  
  // Apply the same interceptor to the new tab
  await ytPage.setRequestInterception(true);
  ytPage.on('request', request => {
    const headers = request.headers();
    const url = request.url();
    if (url.includes('music.youtube.com') || url.includes('youtubei/v1')) {
      const cookie = headers['cookie'] || headers['Cookie'];
      if (cookie && cookie.includes('SAPISID') && !foundYouTube) {
        console.log('\n\n========================================');
        console.log('✅ EXTRACTED YOUTUBE MUSIC COOKIES:');
        console.log('SAPISID Found. Authorization Headers:', headers['authorization'] || 'None');
        console.log('========================================\n\n');
        foundYouTube = true;
      }
    }
    request.continue();
  });

  await ytPage.goto('https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/', { waitUntil: 'networkidle2' });
  console.log('YouTube Music opened in the second tab! You can log in whenever you are ready.');

})();
