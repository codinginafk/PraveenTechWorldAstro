import https from 'https';

function checkLive(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          firstSentence: body.match(/<p class="[^"]*leading-relaxed[^"]*">(.*?)<\/p>/s)?.[1]?.replace(/<[^>]+>/g, '').trim() || 'Not found',
          bodyTitle: body.match(/<title>(.*?)<\/title>/)?.[1] || 'No Title'
        });
      });
    }).on('error', (err) => resolve({ url, error: err.message }));
  });
}

async function run() {
  console.log('=== EMPIRICAL FRONT-LOADED KEYWORDS VERIFICATION ===');
  const karama = await checkLive('https://www.praveentechworld.com/services/karama');
  const burDubai = await checkLive('https://www.praveentechworld.com/services/bur-dubai');
  const dubai = await checkLive('https://www.praveentechworld.com/services/dubai');

  console.log('KARAMA HUB:', karama);
  console.log('BUR DUBAI HUB:', burDubai);
  console.log('DUBAI MASTER HUB:', dubai);
}

run();
