# PraveenTechWorld security audit — 2026-08-27

## Scope

This is a read-only review of the repository configuration and public DNS for `praveentechworld.com`. It is not a penetration test. DNS changes were not made.

## Findings

### Email authentication

- SPF is present at the apex: `v=spf1 include:_spf.google.com ~all`.
- DMARC is present at `_dmarc`: `v=DMARC1; p=none; rua=mailto:hello@praveentechworld.com`.
- `p=none` collects reports but does not quarantine or reject spoofed mail. Do not change it until every legitimate sender is known and alignment reports have been reviewed.
- No common Google/DKIM selectors (`google`, `default`, `selector1`, or `selector2`) returned a TXT record during this check. The mail provider's actual DKIM selector must be confirmed before adding a record.
- The domain currently publishes an AWS inbound MX. That identifies inbound routing, not every legitimate outbound sender; SPF/DKIM must be based on the actual outbound mail services.

### DNS security

- The authoritative nameservers are Cloudflare nameservers.
- No DNSKEY/DS response was observed for the domain in the public resolver check, so DNSSEC appears not to be enabled. Confirm this in Cloudflare and at the domain registrar before enabling it.
- CAA was not verified by the installed Windows resolver because that resolver does not expose CAA as a supported record type. Verify CAA in Cloudflare or with a DNSSEC/DNS inspection tool.

### Registration protection

- Public RDAP data identifies IONOS as the registrar and shows `client transfer prohibited`.
- The same RDAP response shows `secureDNS.delegationSigned: false` and does not show `client delete prohibited` or `client update prohibited`. The scanner's deletion/update protection findings are therefore valid and must be fixed at the registrar.

### TLS and HSTS

- The Cloudflare edge accepted read-only handshake tests capped at TLS 1.0, TLS 1.1, and TLS 1.2 on 2026-08-27. Set Cloudflare's zone minimum TLS version to 1.2 or higher.
- The deployed `www` response sends `max-age=63072000; includeSubDomains; preload`, but the HTTPS apex redirect and `services.praveentechworld.com` currently send only `max-age=63072000`. This explains the scanner's HSTS `includeSubDomains` finding.
- The separate services project already contains the full HSTS header in its local `vercel.json`, but that project has uncommitted changes and the live response does not reflect them. It must be reviewed, committed, and deployed separately.
- HTTP is open on ports 80/HTTP because the apex and `www` use it to issue permanent redirects to HTTPS. That is normal for a public HTTPS site and is not itself a data exposure; verify the redirect remains unconditional.
- The weak TLS 1.2 cipher finding is consistent with a Cloudflare edge using its broad compatibility/legacy cipher profile. Review Cloudflare's cipher-suite setting after raising the minimum TLS version; do not attempt to solve this in Astro source.

### Web application and deployment

- `vercel.json` already contained HSTS, MIME-sniffing protection, frame protection, Referrer-Policy, Permissions-Policy, CSP, and COOP.
- The repository now adds `frame-ancestors 'none'`, CSP `form-action`, Cross-Origin-Resource-Policy, and X-Permitted-Cross-Domain-Policies.
- The public `robots.txt` now advertises only the canonical generated sitemap endpoint, `/sitemap-0.xml`. The old `/sitemap.xml` and `/sitemap-index.xml` redirects remain for compatibility; their duplicate GSC submissions must be removed manually.
- The Turnstile verification endpoint now rejects oversized tokens, reports missing server configuration without contacting the provider, avoids returning provider details to clients, and uses a generic upstream failure response.
- `public/.well-known/security.txt` exists and points to the privacy policy.

### Live verification

- A direct HTTPS header check on 2026-08-27 returned `200 OK` for `https://www.praveentechworld.com/` and confirmed HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP, Referrer-Policy, Permissions-Policy, and COOP on the deployed response.
- The deployed response did not yet contain the newly added `frame-ancestors`, CSP `form-action`, Cross-Origin-Resource-Policy, or X-Permitted-Cross-Domain-Policies protections. Those are repository changes and will appear only after a successful deployment.
- The deployed response also includes `Access-Control-Allow-Origin: *`. Because the site is a public static site and no credentialed cross-origin API was identified, this is not automatically an exploit, but it should be removed or narrowed at the layer that adds it if cross-origin access is not required.
- Local validation now passes `astro check` with 0 errors, 0 warnings, and 0 hints; `npm ci` succeeds from the lockfile; and the production build completes with the 138-article content, duplicate-title, missing-image, Astro, and Pagefind steps.

## External actions still required

1. Confirm every outbound mail sender: Google Workspace, Formspree, AWS SES, or any other service.
2. Enable that provider's DKIM and publish its exact selector record.
3. Review DMARC aggregate reports, then move gradually from `p=none` to `p=quarantine` and eventually `p=reject`.
4. Set Cloudflare Minimum TLS Version to 1.2 or higher. If the account supports cipher-suite customization, use the Modern/PCI-compatible profile only after checking client compatibility.
5. Configure HSTS for the zone or each host so the apex redirect and every web-facing subdomain consistently send `max-age=63072000; includeSubDomains; preload`. Verify every subdomain supports HTTPS before enabling `includeSubDomains`, then submit the registered domain `praveentechworld.com` to the HSTS preload service.
6. Enable deletion and update protection at IONOS; keep the existing transfer lock.
7. Enable DNSSEC in Cloudflare and publish the resulting DS record at IONOS.
8. Verify CAA and restrict issuance to the certificate authorities actually used by the site.
9. Deploy the repository changes, then re-check the final HTTPS response headers on both `www` and the apex redirect.
10. Remove the duplicate sitemap submissions from Google Search Console and retain only `/sitemap-0.xml`; confirm Bing uses the same canonical sitemap.

## Release caution

Do not add a guessed DKIM, SPF include, DMARC enforcement policy, DNSSEC DS value, or CAA record. A wrong mail record can break legitimate delivery, and a wrong DS record can make the domain unavailable through validating resolvers.
