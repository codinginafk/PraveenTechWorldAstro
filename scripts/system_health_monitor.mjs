console.log('====================================================');
console.log(' 🛡️ PRAVEENTECHWORLD ORCHESTRATION & HEALTH MONITOR');
console.log('====================================================');

const CHECKS = [
  { name: 'Main Site HTTPS', url: 'https://www.praveentechworld.com' },
  { name: 'Services Site HTTPS', url: 'https://services.praveentechworld.com' },
  { name: 'Main Sitemap XML', url: 'https://www.praveentechworld.com/sitemap-0.xml', contentType: /xml/i },
  { name: 'Services Robots.txt', url: 'https://services.praveentechworld.com/robots.txt', contentType: /text|plain/i },
];

async function checkEndpoint(item) {
  const target = item.url;
  try {
    const response = await fetch(target, {
      redirect: 'follow',
      headers: { 'User-Agent': 'PTW-HealthMonitor/1.1' },
      signal: AbortSignal.timeout(12000),
    });
    const contentType = response.headers.get('content-type') || '';
    const typeOk = !item.contentType || item.contentType.test(contentType);
    const statusOk = response.status >= 200 && response.status < 300;
    return {
      name: item.name,
      url: target,
      finalUrl: response.url,
      statusCode: response.status,
      contentType,
      status: statusOk && typeOk ? 'PASS ✅' : 'FAIL ❌',
      error: !statusOk ? `HTTP ${response.status}` : (!typeOk ? `Unexpected content type: ${contentType || 'none'}` : undefined),
    };
  } catch (err) {
    return { name: item.name, url: target, status: 'FAIL ❌', error: err.message };
  }
}

async function checkDNS() {
  try {
    // Use an abortable DNS-over-HTTPS request.  dns.resolveNs() cannot be
    // cancelled, so a timed-out local resolver can keep this monitor process
    // alive long after it has reported a result.
    let payload;
    try {
      const response = await fetch('https://cloudflare-dns.com/dns-query?name=praveentechworld.com&type=NS', {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) payload = await response.json();
    } catch {
      // Fallback to Google DoH
      const fallbackRes = await fetch('https://dns.google/resolve?name=praveentechworld.com&type=NS', {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(6000),
      });
      if (fallbackRes.ok) payload = await fallbackRes.json();
    }
    if (!payload) throw new Error('DoH resolvers unreachable');
    const ns = (payload.Answer || []).map(answer => answer.data).filter(Boolean);
    if (ns.length === 0) throw new Error('No NS records returned');
    const isCloudflare = ns.some(n => n.includes('cloudflare.com'));
    return {
      ok: true,
      status: isCloudflare ? 'PASS ✅' : 'PROPAGATING ⏳',
      nameservers: ns.join(', ')
    };
  } catch (err) {
    return { ok: false, status: 'DEGRADED ⚠️', error: err.message };
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
    const destination = res.finalUrl && res.finalUrl !== res.url ? ` → ${res.finalUrl}` : '';
    console.log(`  [${res.status}] ${res.name} -> HTTP ${res.statusCode || 'ERR'}${destination}`);
    if (res.error) console.log(`    Detail: ${res.error}`);
  }

  console.log('\n[3/3] System Failure Risk Analysis & Alerts:');
  const failures = results.filter(r => r.status.includes('FAIL'));
  if (!dnsRes.ok) failures.push({ name: 'DNS nameserver resolution', error: dnsRes.error });

  if (failures.length === 0) {
    console.log('  🟢 ALL LIVE WEBSITES & ENDPOINTS ARE 100% OPERATIONAL. 0 Failures Detected.');
  } else {
    console.log(`  🚨 ${failures.length} HEALTH CHECK(S) NEED ATTENTION:`);
    failures.forEach(f => {
      console.log(`    - ${f.name} failed: ${f.error || 'HTTP ' + f.statusCode}`);
    });
    if (results.every(r => r.status.includes('PASS')) && !dnsRes.ok) {
      console.log('  ℹ️  HTTP endpoints passed; DNS health is degraded or the monitoring resolver timed out.');
    }
  }

  console.log('\n====================================================\n');
}

runMonitor();
