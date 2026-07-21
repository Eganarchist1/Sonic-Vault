const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
  
  console.log('Navigating to YouTube Music mobile...');
  await page.goto('https://music.youtube.com/playlist?list=PL4fGSI1pQAn5p8m-x4F292B4lKWeo5Lq2', { waitUntil: 'networkidle2' });
  
  // Extract all potential JSON data variables
  const data = await page.evaluate(() => {
    return {
      hasYtInitialData: typeof ytInitialData !== 'undefined',
      hasYtcfg: typeof ytcfg !== 'undefined',
      keys: Object.keys(window).filter(k => k.includes('yt') || k.includes('Data') || k.includes('player')),
      htmlSnippet: document.body.innerHTML.substring(0, 500)
    };
  });
  
  console.log('Extraction results:', data);
  await browser.close();
})();
