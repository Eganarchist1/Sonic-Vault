const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const crypto = require('crypto');

// Generate PKCE Challenge
const generateRandomString = (length) => {
  return crypto.randomBytes(60).toString('hex').slice(0, length);
};

const code_verifier = generateRandomString(128);

const base64urlencode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const sha256 = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest();
};

const code_challenge = base64urlencode(sha256(code_verifier));
const client_id = '8a8ce1c224b94e2289c656d0f1eb0789';
const redirect_uri = 'https://developer.spotify.com/';

(async () => {
  console.log('Launching clean browser session...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();

  console.log('Navigating directly to Official Spotify Developer Login...');
  
  // Use response_type=code with PKCE code_challenge
  const authUrl = \`https://accounts.spotify.com/authorize?client_id=\${client_id}&response_type=code&redirect_uri=\${encodeURIComponent(redirect_uri)}&code_challenge_method=S256&code_challenge=\${code_challenge}&scope=user-library-read%20playlist-read-private\`;
  
  await page.goto(authUrl, { waitUntil: 'networkidle2' });
  console.log('Spotify Official Developer Login opened! Please log in and click "Agree".');

  // Listen for the URL to change to the developer callback URL so we can grab the code!
  page.on('framenavigated', async (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (url.includes('developer.spotify.com') && url.includes('code=')) {
        const codeMatch = url.match(/[?&]code=([^&]*)/);
        if (codeMatch && codeMatch[1]) {
           const authorization_code = codeMatch[1];
           console.log('\n✅ EXTRACTED AUTHORIZATION CODE. Exchanging for Access Token...');
           
           // Exchange code for token via POST request
           const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
             },
             body: new URLSearchParams({
               client_id: client_id,
               grant_type: 'authorization_code',
               code: authorization_code,
               redirect_uri: redirect_uri,
               code_verifier: code_verifier,
             })
           });

           const tokenData = await tokenResponse.json();

           if (tokenData.access_token) {
             console.log('\n\n========================================');
             console.log('✅ EXTRACTED OFFICIAL SPOTIFY OAUTH TOKEN:');
             console.log(tokenData.access_token);
             console.log('========================================\n\n');
           } else {
             console.log('❌ Failed to exchange code for token:', tokenData);
           }
        }
      }
    }
  });

})();
