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
          bodyTitle: body.match(/<title>(.*?)<\/title>/)?.[1] || 'No Title'
        });
      });
    }).on('error', (err) => resolve({ url, error: err.message }));
  });
}

async function run() {
  console.log('=== EMPIRICAL BOTH ARTICLES DEPLOYMENT VERIFICATION ===');
  const article1 = await checkLive('https://www.praveentechworld.com/blog/why-dubai-customers-ignore-contact-us-forms-and-text-on-whatsapp');
  const article2 = await checkLive('https://www.praveentechworld.com/blog/tiktok-vs-whatsapp-vs-instagram-which-social-platform-dominates-dubai');

  console.log('ARTICLE 1 (WHATSAPP FORMS):', article1);
  console.log('ARTICLE 2 (UAE SOCIAL MEDIA):', article2);
}

run();
