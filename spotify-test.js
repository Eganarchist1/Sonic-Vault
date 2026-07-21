const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  console.log('Navigating to Spotify...');
  await page.goto('https://open.spotify.com/', { waitUntil: 'networkidle2' });
  
  const data = await page.evaluate(() => {
    return {
      keys: Object.keys(window).filter(k => k.includes('spotify') || k.includes('store') || k.includes('state')),
      hasStore: typeof __PRELOADED_STATE__ !== 'undefined',
    };
  });
  
  console.log('Spotify Extraction results:', data);
  await browser.close();
})();
