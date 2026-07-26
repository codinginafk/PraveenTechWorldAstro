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
  console.log('=== EMPIRICAL NEW ARTICLE DEPLOYMENT VERIFICATION ===');
  const liveArticle = await checkLive('https://www.praveentechworld.com/blog/why-dubai-customers-ignore-contact-us-forms-and-text-on-whatsapp');

  console.log('NEW ARTICLE LIVE:', liveArticle);
}

run();
