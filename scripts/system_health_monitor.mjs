import https from 'https';
import dns from 'dns/promises';

console.log('====================================================');
console.log(' 🛡️ PRAVEENTECHWORLD ORCHESTRATION & HEALTH MONITOR');
console.log('====================================================');

const CHECKS = [
  { name: 'Main Site HTTPS', url: 'https://www.praveentechworld.com' },
  { name: 'Services Site HTTPS', url: 'https://services.praveentechworld.com' },
  { name: 'Main Sitemap XML', url: 'https://www.praveentechworld.com/sitemap-index.xml' },
  { name: 'Services Robots.txt', url: 'https://services.praveentechworld.com/robots.txt' },
];

async function checkEndpoint(item) {
  return new Promise((resolve) => {
    const target = item.url;
    const req = https.get(target, { headers: { 'User-Agent': 'PTW-HealthMonitor/1.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const isOk = res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          name: item.name,
          url: target,
          statusCode: res.statusCode,
          status: isOk ? 'PASS ✅' : 'FAIL ❌',
        });
      });
    });

    req.on('error', (err) => {
      resolve({ name: item.name, url: target, status: 'FAIL ❌', error: err.message });
    });

    req.setTimeout(6000, () => {
      req.destroy();
      resolve({ name: item.name, url: target, status: 'FAIL ❌', error: 'TIMEOUT (6s)' });
    });
  });
}

async function checkDNS() {
  try {
    const ns = await dns.resolveNs('praveentechworld.com');
    const isCloudflare = ns.some(n => n.includes('cloudflare.com'));
    return {
      status: isCloudflare ? 'PASS ✅' : 'PROPAGATING ⏳',
      nameservers: ns.join(', ')
    };
  } catch (err) {
    return { status: 'FAIL ❌', error: err.message };
  }
}

async function runMonitor() {
  console.log('\n[1/3] Testing Live DNS & Nameserver Health...');
  const dnsRes = await checkDNS();
  console.log(`  Nameservers: ${dnsRes.nameservers || dnsRes.error}`);
  console.log(`  DNS Status: ${dnsRes.status}`);

  console.log('\n[2/3] Testing Endpoints, SSL Certificates & HTTP Status Codes...');
  const results = [];
  for (const check of CHECKS) {
    const res = await checkEndpoint(check);
    results.push(res);
    console.log(`  [${res.status}] ${res.name} -> HTTP ${res.statusCode || 'ERR'} (${res.url})`);
  }

  console.log('\n[3/3] System Failure Risk Analysis & Alerts:');
  const failures = results.filter(r => r.status.includes('FAIL'));

  if (failures.length === 0) {
    console.log('  🟢 ALL LIVE WEBSITES & ENDPOINTS ARE 100% OPERATIONAL. 0 Failures Detected.');
  } else {
    console.log('  🚨 ALERTS DETECTED:');
    failures.forEach(f => {
      console.log(`    - ${f.name} failed: ${f.error || 'HTTP ' + f.statusCode}`);
    });
  }

  console.log('\n====================================================\n');
}

runMonitor();
