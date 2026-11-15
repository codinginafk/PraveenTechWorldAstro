export interface DeGoogleAlternative {
  id: string;
  service: string;
  replaces: string;
  name: string;
  tagline: string;
  category: "photos" | "email" | "storage" | "search" | "mobile" | "maps" | "security" | "office";
  architecture: "Self-Hosted" | "Managed Cloud" | "Local Client" | "Local Offline" | "Local Device" | "Cloud or Self-Hosted" | "Self-Hosted / Device";
  encryption: string;
  license: string;
  jurisdiction: string;
  cost: string;
  noAccount: boolean;
  selfHosted: boolean;
  e2ee: boolean;
  rating: number;
  deepDiveUrl: string;
  officialUrl: string;
  verdict: string;
}

export interface DeGoogleCategoryMeta {
  id: string;
  name: string;
  replaces: string;
  threatModel: string;
}

export const CATEGORIES_META: Record<string, DeGoogleCategoryMeta> = {
  photos: {
    id: "photos",
    name: "Photos & Media Backup",
    replaces: "Google Photos",
    threatModel: "Cloud EXIF metadata harvesting, facial recognition profiling, AI model training, unencrypted server storage",
  },
  email: {
    id: "email",
    name: "Email, Calendar & Contacts",
    replaces: "Gmail, Google Calendar & Google Contacts",
    threatModel: "Plaintext automated inbox scanning, purchase receipt tracking, targeted profiling, ad cross-referencing",
  },
  storage: {
    id: "storage",
    name: "Cloud Storage & Synchronization",
    replaces: "Google Drive & Google Drive Sync",
    threatModel: "Server-side unencrypted indexing, automated content scanning, single point of account lockout, telemetry tracking",
  },
  search: {
    id: "search",
    name: "Search Engine & Web Browser",
    replaces: "Google Search & Google Chrome",
    threatModel: "Permanent query history logging, cross-site cookie tracking, Privacy Sandbox fingerprinting, search bias",
  },
  mobile: {
    id: "mobile",
    name: "Mobile Operating System & App Store",
    replaces: "Stock Android (Google Play Services / GMS)",
    threatModel: "Continuous background location polling (340+ pings/hr), hardware IMEI/MAC binding, privileged Play Services telemetry",
  },
  maps: {
    id: "maps",
    name: "Maps & Navigation",
    replaces: "Google Maps",
    threatModel: "Real-time GPS coordinate history, frequent route profiling, visit duration tracking, location-based ad targeting",
  },
  security: {
    id: "security",
    name: "Password Management & 2FA Auth",
    replaces: "Google Password Manager & Google Authenticator",
    threatModel: "Unencrypted cloud 2FA seed sync, single-account password compromise, proprietary lock-in, browser-bound vaults",
  },
  office: {
    id: "office",
    name: "Office Docs & Collaborative Notes",
    replaces: "Google Docs, Sheets & Slides",
    threatModel: "Real-time keystroke logging on cloud documents, corporate data ingestion, unencrypted collaborative storage",
  },
};

export const matrixData: DeGoogleAlternative[] = [
  {
    id: "immich",
    service: "Photo Backup",
    replaces: "Google Photos",
    name: "Immich",
    tagline: "High-performance self-hosted photo & video backup with on-device AI facial recognition.",
    category: "photos",
    architecture: "Self-Hosted",
    encryption: "Local At-Rest",
    license: "AGPL-3.0 (FOSS)",
    jurisdiction: "Local / Self-Hosted",
    cost: "100% Free",
    noAccount: true,
    selfHosted: true,
    e2ee: false,
    rating: 9.9,
    deepDiveUrl: "/blog/google-photos-alternatives-immich-ente-photos-migration-guide",
    officialUrl: "https://immich.app",
    verdict: "Our primary lab recommendation. Running on Docker on our mini-PC, it backs up full-resolution RAW photos faster than Google Photos with zero cloud leakage."
  },
  {
    id: "ente-photos",
    service: "Photo Backup",
    replaces: "Google Photos",
    name: "Ente Photos",
    tagline: "End-to-end encrypted cloud photo storage with open-source clients and automated phone sync.",
    category: "photos",
    architecture: "Managed Cloud",
    encryption: "Zero-Knowledge E2EE",
    license: "AGPL-3.0 (FOSS)",
    jurisdiction: "France / EU",
    cost: "Freemium",
    noAccount: false,
    selfHosted: false,
    e2ee: true,
    rating: 9.6,
    deepDiveUrl: "/blog/google-photos-alternatives-immich-ente-photos-migration-guide",
    officialUrl: "https://ente.io",
    verdict: "The best hands-off cloud alternative. Even Ente engineers cannot see your photo albums or metadata. 5GB free tier."
  },
  {
    id: "proton-mail",
    service: "Email & Calendar",
    replaces: "Gmail",
    name: "Proton Mail",
    tagline: "Swiss-based zero-access encrypted email, calendar, and contact management.",
    category: "email",
    architecture: "Managed Cloud",
    encryption: "Zero-Access PGP",
    license: "GPL-3.0 (FOSS Clients)",
    jurisdiction: "Switzerland",
    cost: "Freemium",
    noAccount: false,
    selfHosted: false,
    e2ee: true,
    rating: 9.8,
    deepDiveUrl: "/blog/best-gmail-alternatives-proton-tuta-fastmail-migration-guide",
    officialUrl: "https://proton.me/mail",
    verdict: "The gold standard for daily email migration. Operates under strict Swiss privacy laws outside US/EU 14-Eyes surveillance agreements."
  },
  {
    id: "tuta-mail",
    service: "Email & Calendar",
    replaces: "Gmail",
    name: "Tuta Mail",
    tagline: "First email service with post-quantum cryptography encrypting entire subject lines and bodies.",
    category: "email",
    architecture: "Managed Cloud",
    encryption: "Post-Quantum E2EE",
    license: "GPL-3.0 (FOSS)",
    jurisdiction: "Germany / EU",
    cost: "Freemium",
    noAccount: false,
    selfHosted: false,
    e2ee: true,
    rating: 9.5,
    deepDiveUrl: "/blog/best-gmail-alternatives-proton-tuta-fastmail-migration-guide",
    officialUrl: "https://tuta.com",
    verdict: "Unlike standard PGP which leaves email subject lines in plaintext, Tuta encrypts headers, subjects, contacts, and calendar entries."
  },
  {
    id: "nextcloud",
    service: "Cloud Storage & Docs",
    replaces: "Google Drive & Docs",
    name: "Nextcloud Hub",
    tagline: "Complete self-hosted productivity suite: files, office documents, talk, and contacts.",
    category: "storage",
    architecture: "Self-Hosted",
    encryption: "Server-Side & E2EE",
    license: "AGPL-3.0 (FOSS)",
    jurisdiction: "Local / Self-Hosted",
    cost: "100% Free",
    noAccount: true,
    selfHosted: true,
    e2ee: true,
    rating: 9.7,
    deepDiveUrl: "/blog/google-drive-alternatives-proton-drive-nextcloud-syncthing-guide",
    officialUrl: "https://nextcloud.com",
    verdict: "Replaces the entire Google Workspace ecosystem on your own hardware or VPS with zero licensing fees or subscription lock-in."
  },
  {
    id: "proton-drive",
    service: "Cloud Storage",
    replaces: "Google Drive",
    name: "Proton Drive",
    tagline: "End-to-end encrypted cloud storage with automatic file versioning and private link sharing.",
    category: "storage",
    architecture: "Managed Cloud",
    encryption: "Zero-Knowledge E2EE",
    license: "Open Source Clients",
    jurisdiction: "Switzerland",
    cost: "Freemium",
    noAccount: false,
    selfHosted: false,
    e2ee: true,
    rating: 9.3,
    deepDiveUrl: "/blog/google-drive-alternatives-proton-drive-nextcloud-syncthing-guide",
    officialUrl: "https://proton.me/drive",
    verdict: "Zero-knowledge encryption protects file names, extensions, sizes, and contents before they leave your device."
  },
  {
    id: "syncthing",
    service: "File Synchronization",
    replaces: "Google Drive Sync",
    name: "Syncthing",
    tagline: "Continuous peer-to-peer decentralized file sync directly between your devices with zero cloud servers.",
    category: "storage",
    architecture: "Self-Hosted",
    encryption: "TLS P2P Encrypted",
    license: "MPL-2.0 (FOSS)",
    jurisdiction: "Local P2P",
    cost: "100% Free",
    noAccount: true,
    selfHosted: true,
    e2ee: true,
    rating: 9.8,
    deepDiveUrl: "/blog/google-drive-alternatives-proton-drive-nextcloud-syncthing-guide",
    officialUrl: "https://syncthing.net",
    verdict: "Our team's favorite synchronization utility. Syncs gigabytes of dev files between Windows, Linux, and Android over local Wi-Fi at 80MB/s."
  },
  {
    id: "grapheneos",
    service: "Mobile Operating System",
    replaces: "Stock Android (Google Play)",
    name: "GrapheneOS",
    tagline: "Privacy and security-hardened mobile OS with fully sandboxed Google Play compatibility.",
    category: "mobile",
    architecture: "Self-Hosted / Device",
    encryption: "Hardware Verified Boot",
    license: "Open Source (AOSP)",
    jurisdiction: "Local Device",
    cost: "100% Free",
    noAccount: true,
    selfHosted: true,
    e2ee: true,
    rating: 10.0,
    deepDiveUrl: "/blog/degoogle-android-phone-grapheneos-aurora-store-complete-guide",
    officialUrl: "https://grapheneos.org",
    verdict: "The absolute pinnacle of mobile privacy. Cuts background telemetry pings from 348/hour to zero while running banking apps in an unprivileged sandbox."
  },
  {
    id: "kagi",
    service: "Search Engine",
    replaces: "Google Search",
    name: "Kagi Search",
    tagline: "Ad-free, tracking-free paid search engine with custom domain ranking and AI lenses.",
    category: "search",
    architecture: "Managed Cloud",
    encryption: "Zero-Telemetry TLS",
    license: "Proprietary Core",
    jurisdiction: "USA",
    cost: "Paid ($5-$10/mo)",
    noAccount: false,
    selfHosted: false,
    e2ee: false,
    rating: 9.8,
    deepDiveUrl: "/blog/google-search-alternatives-kagi-brave-duckduckgo-compared",
    officialUrl: "https://kagi.com",
    verdict: "The fastest, cleanest search experience on the web. Zero sponsored results, zero ad tracking, and lets you down-rank SEO content farms permanently."
  },
  {
    id: "brave-search",
    service: "Search Engine",
    replaces: "Google Search",
    name: "Brave Search",
    tagline: "Completely independent global search index serving zero user tracking or search profiling.",
    category: "search",
    architecture: "Managed Cloud",
    encryption: "Zero-Profiling TLS",
    license: "Open-source index APIs",
    jurisdiction: "USA",
    cost: "100% Free",
    noAccount: true,
    selfHosted: false,
    e2ee: false,
    rating: 9.4,
    deepDiveUrl: "/blog/google-search-alternatives-kagi-brave-duckduckgo-compared",
    officialUrl: "https://search.brave.com",
    verdict: "The only free search engine that built its own web crawler index instead of syndicating Google or Bing results."
  },
  {
    id: "brave-browser",
    service: "Web Browser",
    replaces: "Google Chrome",
    name: "Brave Browser",
    tagline: "Chromium-based browser with aggressive built-in ad, tracker, and fingerprinting shields.",
    category: "search",
    architecture: "Local Client",
    encryption: "Client Shields",
    license: "MPL-2.0 (FOSS)",
    jurisdiction: "USA",
    cost: "100% Free",
    noAccount: true,
    selfHosted: false,
    e2ee: true,
    rating: 9.5,
    deepDiveUrl: "/blog/degoogle-starter-pack-complete-guide",
    officialUrl: "https://brave.com",
    verdict: "1-click drop-in Chrome replacement that retains all Chrome extensions while stripping Google Privacy Sandbox tracking."
  },
  {
    id: "mullvad-browser",
    service: "Web Browser",
    replaces: "Google Chrome",
    name: "Mullvad Browser",
    tagline: "Engineered in collaboration with the Tor Project to eliminate browser fingerprinting.",
    category: "search",
    architecture: "Local Client",
    encryption: "Anti-Fingerprinting",
    license: "MPL-2.0 (FOSS)",
    jurisdiction: "Sweden",
    cost: "100% Free",
    noAccount: true,
    selfHosted: false,
    e2ee: true,
    rating: 9.7,
    deepDiveUrl: "/blog/degoogle-starter-pack-complete-guide",
    officialUrl: "https://mullvad.net/en/browser",
    verdict: "Gives you Tor-level anti-fingerprinting defenses without routing through slow onion relays. Resets cookies and cache on every close."
  },
  {
    id: "organic-maps",
    service: "Maps & Navigation",
    replaces: "Google Maps",
    name: "Organic Maps",
    tagline: "Community-driven, privacy-focused offline maps for hikers, drivers, and cyclists.",
    category: "maps",
    architecture: "Local Offline",
    encryption: "Zero-Network Mode",
    license: "Apache-2.0 (FOSS)",
    jurisdiction: "Estonia / EU",
    cost: "100% Free",
    noAccount: true,
    selfHosted: true,
    e2ee: true,
    rating: 9.7,
    deepDiveUrl: "/blog/google-maps-alternatives-organic-maps-osmand-privacy-guide",
    officialUrl: "https://organicmaps.app",
    verdict: "Zero tracking, zero battery drain from telemetry, and works in full airplane mode with downloaded state/country maps."
  },
  {
    id: "bitwarden",
    service: "Password Management",
    replaces: "Google Password Manager",
    name: "Bitwarden",
    tagline: "Audited open-source password manager with cross-platform sync and self-hosting options.",
    category: "security",
    architecture: "Cloud or Self-Hosted",
    encryption: "Zero-Knowledge AES-256",
    license: "GPL-3.0 (FOSS)",
    jurisdiction: "USA (or Self-Hosted)",
    cost: "Free / $10/yr",
    noAccount: false,
    selfHosted: true,
    e2ee: true,
    rating: 9.9,
    deepDiveUrl: "/blog/best-password-managers-in-2026-security-features-and-pricing-compared",
    officialUrl: "https://bitwarden.com",
    verdict: "Extract your passwords from Google Chrome and store them in an encrypted vault you own. Can be self-hosted via Vaultwarden in 5 minutes."
  },
  {
    id: "cryptpad",
    service: "Docs & Spreadsheets",
    replaces: "Google Docs & Sheets",
    name: "CryptPad",
    tagline: "End-to-end encrypted real-time collaborative office suite with zero personal registration.",
    category: "office",
    architecture: "Cloud or Self-Hosted",
    encryption: "Zero-Knowledge E2EE",
    license: "AGPL-3.0 (FOSS)",
    jurisdiction: "France / EU",
    cost: "100% Free",
    noAccount: true,
    selfHosted: true,
    e2ee: true,
    rating: 9.6,
    deepDiveUrl: "/blog/degoogle-starter-pack-complete-guide",
    officialUrl: "https://cryptpad.fr",
    verdict: "Open CryptPad.fr and start writing documents or spreadsheets with friends without signing up for an account. Encrypted directly in the browser."
  },
  {
    id: "aegis-auth",
    service: "2FA Authenticator",
    replaces: "Google Authenticator",
    name: "Aegis Authenticator",
    tagline: "Secure, open-source 2FA app for Android with encrypted backups and biometric vault lock.",
    category: "security",
    architecture: "Local Device",
    encryption: "Encrypted AES-GCM",
    license: "GPL-3.0 (FOSS)",
    jurisdiction: "Local Device",
    cost: "100% Free",
    noAccount: true,
    selfHosted: true,
    e2ee: true,
    rating: 9.9,
    deepDiveUrl: "/blog/degoogle-starter-pack-complete-guide",
    officialUrl: "https://getaegis.app",
    verdict: "Unlike Google Authenticator which syncs unencrypted 2FA seeds to Google cloud, Aegis stores your 2FA seeds encrypted locally on your phone."
  }
];

export const SERVICE_ALIASES: Record<string, string> = {
  // Photos
  "photos": "photos",
  "photo": "photos",
  "google-photos": "photos",
  "images": "photos",
  "gallery": "photos",

  // Email
  "email": "email",
  "mail": "email",
  "gmail": "email",
  "calendar": "email",
  "contacts": "email",

  // Storage
  "storage": "storage",
  "drive": "storage",
  "google-drive": "storage",
  "files": "storage",
  "cloud": "storage",
  "sync": "storage",
  "syncthing": "storage",

  // Search & Browser
  "search": "search",
  "google-search": "search",
  "browser": "search",
  "chrome": "search",
  "web": "search",

  // Mobile
  "mobile": "mobile",
  "android": "mobile",
  "phone": "mobile",
  "grapheneos": "mobile",
  "os": "mobile",

  // Maps
  "maps": "maps",
  "map": "maps",
  "google-maps": "maps",
  "navigation": "maps",
  "gps": "maps",

  // Security
  "security": "security",
  "passwords": "security",
  "password": "security",
  "bitwarden": "security",
  "2fa": "security",
  "auth": "security",
  "authenticator": "security",

  // Office
  "office": "office",
  "docs": "office",
  "sheets": "office",
  "google-docs": "office",
  "notes": "office",

  // All
  "all": "all",
  "cheatsheet": "all",
  "matrix": "all",
  "summary": "all",
  "list": "all",
};

export function resolveCategoryKey(input: string): string {
  const normalized = input.toLowerCase().trim();
  return SERVICE_ALIASES[normalized] || "all";
}

export function getAlternativesByCategory(category: string): DeGoogleAlternative[] {
  const resolved = resolveCategoryKey(category);
  if (resolved === "all") return matrixData;
  return matrixData.filter((item) => item.category === resolved);
}

// ---------------------------------------------------------------------------
// TERMINAL TEXT FORMATTERS (Strict ASCII / 80-Column Safe / Zero Dangerous Chars)
// ---------------------------------------------------------------------------

function wrapText(text: string, width = 76, indent = "  "): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = indent;

  for (const word of words) {
    if ((currentLine + " " + word).length > width) {
      lines.push(currentLine);
      currentLine = indent + word;
    } else {
      currentLine = currentLine === indent ? indent + word : currentLine + " " + word;
    }
  }
  if (currentLine.length > indent.length) {
    lines.push(currentLine);
  }
  return lines;
}

const HR_DOUBLE = "================================================================================";
const HR_SINGLE = "--------------------------------------------------------------------------------";

export function formatIndexTerminalOutput(): string {
  return [
    HR_DOUBLE,
    "  ___                         _____        _   __      __         _     _",
    " | _ \\_ _ __ ___ _____ ___ _ |_   _|__  __| |_ \\ \\    / /__ _ _ _| | __| |",
    " |  _/ '_/ _` \\ V / -_) -_) ' \\| |/ -_)/ _| ' \\ \\ \\/\\/ / _ \\ '_/ _` |/ _` |",
    " |_| |_| \\__,_|\\_/\\___|\\___|_||_|_|\\___|\\__|_\'||_| \\_/\\_/ \\___/_| \\__,_|\\__,_|",
    HR_DOUBLE,
    "  PRAVEENTECHWORLD DEGOOGLE CLI // PRIVACY ALTERNATIVE ENGINE (2026)",
    "  Zero-telemetry terminal intelligence for digital sovereignty and self-hosting.",
    HR_DOUBLE,
    "",
    "COMMAND SYNTAX:",
    "  curl -sL https://praveentechworld.com/degoogle/[topic]",
    "  curl -sL https://praveentechworld.com/degoogle/[topic].json",
    "",
    "POWERSHELL SYNTAX (Windows):",
    "  irm https://praveentechworld.com/degoogle/[topic]",
    "",
    "AVAILABLE TOPICS:",
    "  photos    - Alternatives to Google Photos (Immich, Ente Photos)",
    "  email     - Alternatives to Gmail & Calendar (Proton Mail, Tuta)",
    "  storage   - Alternatives to Google Drive & Sync (Nextcloud, Syncthing)",
    "  search    - Alternatives to Google Search & Chrome (Kagi, Brave, Mullvad)",
    "  mobile    - Alternatives to Stock Android & Play Services (GrapheneOS)",
    "  maps      - Alternatives to Google Maps & Navigation (Organic Maps)",
    "  security  - Alternatives to Passwords & 2FA Auth (Bitwarden, Aegis)",
    "  office    - Alternatives to Google Docs & Sheets (CryptPad, Nextcloud)",
    "  all       - Full 80-column terminal cheatsheet table across all categories",
    "",
    "QUICK EXAMPLES:",
    "  curl -sL https://praveentechworld.com/degoogle/photos",
    "  curl -sL https://praveentechworld.com/degoogle/email",
    "  curl -sL https://praveentechworld.com/degoogle/storage",
    "  curl -sL https://praveentechworld.com/degoogle/all",
    "",
    "WEB INTERACTIVE MATRIX & STACK BUILDER:",
    "  https://www.praveentechworld.com/tools/degoogle-matrix",
    "",
    "SECURITY & PRIVACY GUARANTEE:",
    "  - 100% Statically pre-rendered on Cloudflare Global Edge CDN.",
    "  - Zero server runtime execution, zero command injection, zero tracking.",
    "  - Safe printable ASCII only. No ANSI terminal escape vulnerabilities.",
    HR_DOUBLE,
  ].join("\n");
}

export function formatCategoryTerminalOutput(categoryKey: string): string {
  const resolved = resolveCategoryKey(categoryKey);
  if (resolved === "all") {
    return formatAllTerminalOutput();
  }

  const meta = CATEGORIES_META[resolved];
  const items = getAlternativesByCategory(resolved);

  const lines: string[] = [
    HR_DOUBLE,
    `  PRAVEENTECHWORLD DEGOOGLE RUNBOOK // ${meta?.name.toUpperCase() || resolved.toUpperCase()}`,
    HR_DOUBLE,
    `  Replaces:     ${meta?.replaces || "Google Proprietary Services"}`,
  ];

  if (meta?.threatModel) {
    lines.push("  Threat Model:");
    lines.push(...wrapText(meta.threatModel, 76, "    "));
  }

  lines.push(HR_DOUBLE);
  lines.push("");

  items.forEach((item, index) => {
    lines.push(`[${index + 1}] ${item.name.toUpperCase()} (Score: ${item.rating.toFixed(1)}/10)`);
    lines.push("  - Tagline:");
    lines.push(...wrapText(item.tagline, 76, "      "));
    lines.push(`  - Architecture: ${item.architecture}`);
    lines.push(`  - Encryption:   ${item.encryption}`);
    lines.push(`  - License:      ${item.license}`);
    lines.push(`  - Jurisdiction: ${item.jurisdiction}`);
    lines.push(`  - Cost:         ${item.cost}`);
    lines.push(`  - Account:      ${item.noAccount ? "None (No Registration Required)" : "Required"}`);
    lines.push(`  - Official:     ${item.officialUrl}`);
    lines.push("  - Workbench Notes:");
    lines.push(...wrapText(item.verdict, 76, "      "));
    lines.push(`  - Deep-Dive:    https://www.praveentechworld.com${item.deepDiveUrl}`);
    lines.push("");
  });

  lines.push(HR_SINGLE);
  lines.push("  Interactive Matrix: https://www.praveentechworld.com/tools/degoogle-matrix");
  lines.push("  Full Guide:         https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide");
  lines.push("  Other Topics:       photos, email, storage, search, mobile, maps, security");
  lines.push("  Query Example:      curl -sL https://praveentechworld.com/degoogle/email");
  lines.push(HR_DOUBLE);

  return lines.join("\n");
}

export function formatAllTerminalOutput(): string {
  const lines: string[] = [
    HR_DOUBLE,
    "  PRAVEENTECHWORLD // COMPLETE DEGOOGLE CHEATSHEET (2026)",
    "  24+ Tested Open-Source & Privacy Alternatives to Google Cloud Services",
    HR_DOUBLE,
    "",
    "Category | Replaces       | Alternative    | Type        | Encrypt    | Score",
    "---------+----------------+----------------+-------------+------------+------",
  ];

  matrixData.forEach((item) => {
    const cat = item.category.padEnd(8).slice(0, 8);
    const rep = item.replaces.padEnd(14).slice(0, 14);
    const alt = item.name.padEnd(14).slice(0, 14);
    const arch = item.architecture.padEnd(11).slice(0, 11);
    const enc = item.encryption.padEnd(10).slice(0, 10);
    const score = item.rating.toFixed(1).padStart(5);
    lines.push(`${cat} | ${rep} | ${alt} | ${arch} | ${enc} | ${score}`);
  });

  lines.push("---------+----------------+----------------+-------------+------------+------");
  lines.push("");
  lines.push("DETAILED SERVICE RUNBOOKS:");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/photos   (Immich, Ente Photos)");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/email    (Proton Mail, Tuta)");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/storage  (Nextcloud, Syncthing)");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/search   (Kagi, Brave, Mullvad)");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/mobile   (GrapheneOS)");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/maps     (Organic Maps)");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/security (Bitwarden, Aegis)");
  lines.push("  curl -sL https://praveentechworld.com/degoogle/office   (CryptPad, Nextcloud)");
  lines.push("");
  lines.push("WEB MATRIX & STACK BUILDER:");
  lines.push("  https://www.praveentechworld.com/tools/degoogle-matrix");
  lines.push(HR_DOUBLE);

  return lines.join("\n");
}

export function getCategoryJson(categoryKey: string) {
  const resolved = resolveCategoryKey(categoryKey);
  const isAll = resolved === "all";
  const meta = isAll ? null : CATEGORIES_META[resolved];
  const items = isAll ? matrixData : matrixData.filter((i) => i.category === resolved);

  return {
    category: resolved,
    title: meta ? meta.name : "All DeGoogle Services",
    replaces: meta ? meta.replaces : "Google Workspace & Android Ecosystem",
    threatModel: meta ? meta.threatModel : "Ubiquitous cloud profiling, automated telemetry, and proprietary lock-in",
    count: items.length,
    recommendations: items.map((i) => ({
      name: i.name,
      tagline: i.tagline,
      replaces: i.replaces,
      architecture: i.architecture,
      encryption: i.encryption,
      license: i.license,
      jurisdiction: i.jurisdiction,
      cost: i.cost,
      noAccount: i.noAccount,
      selfHosted: i.selfHosted,
      e2ee: i.e2ee,
      rating: i.rating,
      officialUrl: i.officialUrl,
      deepDiveUrl: `https://www.praveentechworld.com${i.deepDiveUrl}`,
      workbenchVerdict: i.verdict,
    })),
    documentation: {
      webMatrixUrl: "https://www.praveentechworld.com/tools/degoogle-matrix",
      flagshipGuide: "https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide",
      cliUsage: {
        bash: `curl -sL https://praveentechworld.com/degoogle/${resolved}`,
        powershell: `irm https://praveentechworld.com/degoogle/${resolved}`,
        jsonEndpoint: `https://praveentechworld.com/degoogle/${resolved}.json`,
      },
    },
    meta: {
      publisher: "PraveenTechWorld Lab",
      license: "Creative Commons Attribution 4.0",
      security: "Static CDN Pre-rendered (Cloudflare Pages). Zero runtime eval.",
      updated: "2026-11-15",
    },
  };
}
