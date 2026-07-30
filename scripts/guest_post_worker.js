export default {
  async fetch(request, env, ctx) {
    // 1. Dynamic CORS Configuration for multi-domain support
    const allowedOrigins = [
      'https://praveentechworld.com',
      'https://www.praveentechworld.com',
      'https://services.praveentechworld.com'
    ];
    
    const requestOrigin = request.headers.get('Origin');
    const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();
      const { name, email, topic, outline, doc_url, turnstileToken, website_hp } = body;

      // 1. Honeypot Spambot Filter
      if (website_hp) {
        return new Response(JSON.stringify({ message: 'Success' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Input Validation
      if (!name || !email || !topic || !outline || !doc_url) {
        return new Response(JSON.stringify({ error: 'All fields are required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. Optional Turnstile Verification (Runs if TURNSTILE_SECRET_KEY is configured in Worker env)
      if (env.TURNSTILE_SECRET_KEY && turnstileToken) {
        const clientIp = request.headers.get('CF-Connecting-IP') || '';
        const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
            remoteip: clientIp
          })
        });

        const turnstileOutcome = await turnstileRes.json();
        if (!turnstileOutcome.success) {
          return new Response(JSON.stringify({ error: 'Security verification failed. Please try again.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Payload Construction
      const submissionId = `pitch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        id: submissionId,
        name,
        email,
        topic,
        outline,
        doc_url,
        submittedFrom: requestOrigin || 'direct',
        submittedAt: new Date().toISOString()
      };

      // 3. Staging Buffer: Write to Cloudflare KV (30-day retention)
      if (env.PITCHES_KV) {
        await env.PITCHES_KV.put(submissionId, JSON.stringify(payload), { expirationTtl: 86400 * 30 });
      }

      // 4. Asynchronous Background Execution (Airtable + Resend)
      ctx.waitUntil((async () => {
        // HTML Escaping Helper
        const sanitize = (str) => String(str).replace(/[&<>"']/g, (m) => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));

        // A. Post to Airtable
        if (env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID) {
          try {
            await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Pitches`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  "Author Name": name,
                  "Author Email": email,
                  "Topic / Headline": topic,
                  "Pitch Outline": outline,
                  "Google Doc Link": doc_url,
                  "Status": "New Pitch",
                  "Source": requestOrigin || "praveentechworld.com"
                }
              })
            });
          } catch (err) {
            console.error('[Airtable Sync Failed]:', err);
          }
        }

        // B. Send Email Notification via Resend
        if (env.RESEND_API_KEY) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'PraveenTechWorld Guest Posts <contact@praveentechworld.com>',
                to: ['contact@praveentechworld.com'],
                subject: `📝 New Pitch: ${topic}`,
                html: `
                  <h2>New Guest Post Pitch Submitted</h2>
                  <p><strong>Author:</strong> ${sanitize(name)} (${sanitize(email)})</p>
                  <p><strong>Topic:</strong> ${sanitize(topic)}</p>
                  <p><strong>Outline:</strong></p>
                  <blockquote style="background:#f4f4f5; padding:12px; border-left:4px solid #6366f1;">
                    ${sanitize(outline).replace(/\n/g, '<br>')}
                  </blockquote>
                  <p><strong>Google Doc:</strong> <a href="${sanitize(doc_url)}" target="_blank" rel="noopener">${sanitize(doc_url)}</a></p>
                  <p><small>Stored in Edge KV ID: <code>${submissionId}</code></small></p>
                `
              })
            });
          } catch (err) {
            console.error('[Resend Delivery Failed]:', err);
          }
        }
      })());

      // 5. Success Response to Visitor (< 200ms)
      return new Response(JSON.stringify({
        success: true,
        message: 'Your pitch has been submitted successfully! We review pitches within 48 hours.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal server error processing pitch.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
