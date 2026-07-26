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
          hasServicesLink: body.includes('/services'),
          bodyTitle: body.match(/<title>(.*?)<\/title>/)?.[1] || 'No Title'
        });
      });
    }).on('error', (err) => resolve({ url, error: err.message }));
  });
}

async function run() {
  console.log('--- CHECKING EXACT LIVE URLS ---');
  const services = await checkLive('https://www.praveentechworld.com/services');
  const karama = await checkLive('https://www.praveentechworld.com/services/karama');

  console.log('SERVICES HUB:', services);
  console.log('KARAMA PAGE:', karama);
}

run();
