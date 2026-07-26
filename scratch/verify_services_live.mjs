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
          hasExactPhone: body.includes('971562980106'),
          bodyTitle: body.match(/<title>(.*?)<\/title>/)?.[1] || 'No Title'
        });
      });
    }).on('error', (err) => resolve({ url, error: err.message }));
  });
}

async function run() {
  console.log('=== EMPIRICAL PHONE NUMBER VERIFICATION ===');
  const services = await checkLive('https://www.praveentechworld.com/services');
  const karama = await checkLive('https://www.praveentechworld.com/services/karama');
  const burDubai = await checkLive('https://www.praveentechworld.com/services/bur-dubai');

  console.log('SERVICES HUB PHONE VERIFIED:', services.hasExactPhone, '(Status:', services.statusCode + ')');
  console.log('KARAMA PAGE PHONE VERIFIED:', karama.hasExactPhone, '(Status:', karama.statusCode + ')');
  console.log('BUR DUBAI PHONE VERIFIED:', burDubai.hasExactPhone, '(Status:', burDubai.statusCode + ')');
}

run();
