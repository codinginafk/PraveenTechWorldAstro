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
  console.log('--- CHECKING .HTML ROUTES ---');
  const servicesHtml = await checkLive('https://www.praveentechworld.com/services.html');
  const karamaHtml = await checkLive('https://www.praveentechworld.com/services/karama.html');

  console.log('SERVICES.HTML:', servicesHtml);
  console.log('KARAMA.HTML:', karamaHtml);
}

run();
