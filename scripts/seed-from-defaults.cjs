/**
 * Seeds every section from the frontend's shipped defaults.
 *
 *   1. In lko-cu:  bun run scripts/dump-cms-defaults.ts  (writes cms-defaults.json)
 *   2. In cms:     node scripts/seed-from-defaults.cjs ../lko-cu/cms-defaults.json [--mock] [--fresh-media]
 *
 * Boots Strapi in-process (no HTTP server, no API token needed), uploads the
 * referenced media out of lko-cu/public into the media library, then upserts
 * and publishes each single type and the programs collection. Re-runnable:
 * uploads are keyed by a name derived from the source path, single types are
 * updated in place, programs are matched on program_code.
 *
 * Stop `strapi develop` before running this — two instances on one database
 * is asking for trouble.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { createStrapi } = require('@strapi/strapi');

(async () => {

const dataPath = process.argv.find((a) => a.endsWith('.json'));
const MOCK = process.argv.includes('--mock');
const FRESH_MEDIA = process.argv.includes('--fresh-media');
if (!dataPath) { console.error('usage: node scripts/seed-from-defaults.cjs <cms-defaults.json> [--mock] [--fresh-media]'); process.exit(1); }

/**
 * `--mock`: write placeholder content instead of the real copy, so it is
 * obvious on the page which sections are being served by Strapi rather than
 * by the shipped fallback. Every text field becomes "Testing <field> <n>",
 * every number becomes 69. Media, links, enums and the keys the components
 * match on (year, program_code, logo_id, partner) are left alone so nothing
 * breaks structurally.
 */
const KEEP_KEYS = new Set([
  'image', 'images', 'thumbnail', 'clip', 'clip_poster', 'fallback_image', 'background_video', 'tour_video',
  'tour_poster', 'logo', 'certifications', 'company_logo', 'person_image', 'company_image', 'partner_logos',
  'gallery', 'author_avatar',
  'video_url', 'video_link', 'link', 'cta_link', 'countdown_deadline',
  'group', 'stream', 'icon', 'glyph', 'tone', 'image_treatment', 'discipline', 'level', 'theme',
  'platform', 'cucet_deadline',
  'year', 'program_code', 'logo_id', 'partner', 'salary_unit', 'prefix', 'cucet_compulsory', 'cucet_scholarship_applicable',
]);
const SHORT_KEYS = new Set(['mobile_title', 'mobile_subtitle', 'num', 'prefix', 'register_submit_label']);
const mockCounters = new Map();
function mockText(key, value) {
  if (/^(https?:\/\/|#|\/)/.test(value)) return value;
  // Figures keep their shape ("10,000+" -> "69+", "₹1.7 CR" -> "₹69 CR") so the
  // count-up and unit parsing still have something to work on.
  if (/\d/.test(value) && value.length <= 16) return value.replace(/\d[\d,]*(\.\d+)?/g, '69');
  const n = (mockCounters.get(key) ?? 0) + 1; mockCounters.set(key, n);
  // Fields whose cap is too tight for `Testing <field> <n>` get the short form.
  if (SHORT_KEYS.has(key)) return `Test ${n}`;
  const label = key.replace(/_/g, ' ');
  const accent = /\*[^*]+\*/.test(value);
  const brk = value.includes('\n');
  if (accent) return `Testing ${label} ${n}${brk ? '\n' : ' '}*accent ${n}*`;
  if (brk) return `Testing ${label} ${n}\nline two`;
  return `Testing ${label} ${n}`;
}
function mock(data) {
  if (!MOCK) return data;
  const walk = (value, key) => {
    if (Array.isArray(value)) return value.map((v) => walk(v, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, KEEP_KEYS.has(k) ? v : walk(v, k)]));
    if (typeof value === 'number') return 69;
    if (typeof value === 'string' && value.trim()) return mockText(key, value);
    return value;
  };
  return walk(data, '');
}
const D = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.resolve(path.dirname(dataPath), 'public');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-seed-'));

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska' };

const app = await createStrapi({ distDir: path.resolve(__dirname, '..', 'dist') }).load();
const uploadService = app.plugin('upload').service('upload');
const fileCache = new Map();
let uploaded = 0, reused = 0, failed = 0;

/**
 * One upload at a time: sharp under a burst of parallel uploads has crashed
 * this process (SIGBUS). Only the upload call is serialized -- the download
 * that precedes it is pure network and runs concurrently, which matters when
 * `--fresh-media` is fetching 290 files rather than reading them off disk.
 */
let queue = Promise.resolve();
const serialized = (fn) => { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; };

/** Bounded concurrency for the download half. */
let inFlight = 0;
const waiters = [];
async function withSlot(fn, limit = 8) {
  if (inFlight >= limit) await new Promise((r) => waiters.push(r));
  inFlight++;
  try { return await fn(); }
  finally { inFlight--; const next = waiters.shift(); if (next) next(); }
}

/**
 * `--fresh-media`: swap every image for a different photograph.
 *
 * `--mock` alone proves the *copy* is coming from Strapi; it deliberately
 * leaves media alone, so a page full of placeholder text still shows the real
 * photography and there is no way to tell by eye whether the images are being
 * served by the CMS or by the bundle. This closes that gap.
 *
 * Two rules make the swap safe to look at:
 *
 * The replacement keeps the source's aspect ratio, read off the real file with
 * sharp. Nothing here is `object-contain` -- a 16:9 hero given a square photo
 * would be cropped to something the layout was never designed around, and the
 * point is to see the layout intact with different pictures in it.
 *
 * The seed is a hash of the original path, so a given slot draws the same
 * photograph on every run. A re-seed that reshuffled all 290 images would make
 * it impossible to tell a real change from noise.
 *
 * Video is left alone: there is no equivalent source for it, and the two clips
 * are backgrounds rather than content.
 */
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mkv']);

/** Longest edge of a stand-in, so 290 downloads stay reasonable. */
const FRESH_CAP = 1400;

/**
 * The source's own dimensions, capped, so the replacement drops into the same
 * slot. Falls back to 4:3 when the file cannot be measured (an SVG has no
 * intrinsic raster size, and sharp will not read one).
 */
async function freshSize(url) {
  const src = path.join(PUBLIC_DIR, url);
  try {
    const { width, height } = await sharp(src).metadata();
    if (!width || !height) throw new Error('no intrinsic size');
    const scale = Math.min(1, FRESH_CAP / Math.max(width, height));
    return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
  } catch {
    return { w: 1200, h: 900 };
  }
}

/**
 * A stable stand-in photograph for one source path, or null to keep the
 * original (video, and anything not served off local disk).
 *
 * Lorem Picsum rather than the Unsplash API: it is the same photography, it
 * needs no key, and `/seed/<x>` makes the choice a pure function of the path.
 */
async function freshMediaUrl(url) {
  if (/^https?:\/\//.test(url)) return null;
  const ext = path.extname(url.replace(/[?#].*$/, '')).toLowerCase();
  if (VIDEO_EXT.has(ext)) return null;
  const { w, h } = await freshSize(url);
  const seed = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12);
  return `https://picsum.photos/seed/${seed}/${w}/${h}.jpg`;
}

/** Media library name for a source url: unique per path, stable across runs. */
const mediaName = (url) => url.replace(/^https?:\/\//, '').replace(/^\//, '').replace(/[\\/]+/g, '__').replace(/[?#].*$/, '');

/** Uploads (or finds) one asset and returns its file id, or null when it cannot be had. */
async function media(asset) {
  if (!asset) return null;
  const url = typeof asset === 'string' ? asset : asset.url ?? asset.src;
  const alt = (typeof asset === 'object' && (asset.alt ?? asset.alternativeText)) || undefined;
  if (!url) return null;
  if (fileCache.has(url)) return fileCache.get(url);
  const pending = uploadOne(url, alt);
  fileCache.set(url, pending);
  return pending;
}

async function uploadOne(url, alt) {
  if (fileCache.has(url)) return fileCache.get(url);
  /*
    Resolved here rather than at the call sites so every media field goes
    through it, and cached under the *original* path so a slot keeps its
    stand-in for the whole run. The library name comes from the picsum url, so
    the real assets are never overwritten -- flipping back is just a re-seed
    without the flag.
  */
  const source = (FRESH_MEDIA && (await freshMediaUrl(url))) || url;
  const name = mediaName(source);
  const existing = await app.db.query('plugin::upload.file').findOne({ where: { name } });
  if (existing) { fileCache.set(url, existing.id); reused++; return existing.id; }

  let filepath, mimetype;
  const ext = path.extname(source.replace(/[?#].*$/, '')).toLowerCase();
  try {
    if (/^https?:\/\//.test(source)) {
      const res = await withSlot(() => fetch(source));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mimetype = res.headers.get('content-type')?.split(';')[0] || MIME[ext] || 'application/octet-stream';
      filepath = path.join(tmpDir, name + (ext || ''));
      fs.writeFileSync(filepath, Buffer.from(await res.arrayBuffer()));
    } else {
      const src = path.join(PUBLIC_DIR, source);
      if (!fs.existsSync(src)) throw new Error('missing on disk');
      filepath = path.join(tmpDir, name);
      fs.copyFileSync(src, filepath);
      mimetype = MIME[ext] || 'application/octet-stream';
    }
    const [file] = await serialized(() => uploadService.upload({
      data: { fileInfo: { name, alternativeText: alt, caption: alt } },
      files: { filepath, originalFilename: name, mimetype, size: fs.statSync(filepath).size },
    }));
    fileCache.set(url, file.id); uploaded++;
    return file.id;
  } catch (e) {
    console.warn(`  ! media skipped ${url}: ${e.message}`);
    failed++; fileCache.set(url, null);
    return null;
  }
}
const mediaList = async (assets) => (await Promise.all((assets ?? []).map(media))).filter((id) => id != null);

/**
 * Like `mediaList`, but for a list whose *positions* carry meaning — the
 * portrait crops in `campus-life-section.gallery.images_mobile` are paired with
 * `images` by index.
 *
 * A failed upload is truncated at rather than filtered out. Dropping one from
 * the middle would shift every crop after it onto the wrong frame, which the
 * site renders without complaint; stopping short only costs the tail its crops,
 * and a missing crop already falls back to its landscape frame.
 */
const mediaSlots = async (assets) => {
  const ids = await Promise.all((assets ?? []).map(media));
  const gap = ids.indexOf(null);
  if (gap === -1) return ids;
  console.warn(`  ! media slot ${gap} failed to upload, dropping ${ids.length - gap} paired asset(s)`);
  return ids.slice(0, gap);
};

/** Upserts and publishes a single type. */
async function single(uid, data) {
  const docs = app.documents(uid);
  data = mock(data);
  const current = await docs.findFirst({ status: 'draft' });
  if (current) await docs.update({ documentId: current.documentId, data, status: 'published' });
  else await docs.create({ data, status: 'published' });
  console.log(`✓ ${uid}`);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const orNull = (v) => (v === '' || v === undefined ? null : v);

// ── announcement bar ────────────────────────────────────────────────────────
await single('api::announcement-bar.announcement-bar', {
  message: D.announcement.message,
  cta_label: D.announcement.ctaLabel,
  contact_links: D.announcement.contactLinks.map((c) => ({ label: c.label, link: c.link, icon: c.icon })),
  social_links: D.announcement.socialLinks.map((s) => ({ platform: s.platform, link: s.link })),
});

// ── hero ────────────────────────────────────────────────────────────────────
await single('api::hero-section.hero-section', {
  heading: D.hero.heading, subheading: D.hero.subheading,
  fallback_image: await media(D.hero.fallbackImage),
  countdown_deadline: D.hero.countdownDeadline ? new Date(D.hero.countdownDeadline).toISOString() : null,
  countdown_label: orNull(D.hero.countdownLabel),
});
await single('api::hero-background-video.hero-background-video', { background_video: await media(D.heroVideo.video) });

// ── tradition ───────────────────────────────────────────────────────────────
await single('api::tradition-section.tradition-section', {
  heading: D.tradition.heading, film_heading: D.tradition.filmHeading, cta_label: D.tradition.ctaLabel,
  opportunities_text: D.tradition.opportunitiesText,
  stats: D.tradition.stats.map((s) => ({ value: s.value, label: s.label, note: orNull(s.note) })),
  highlight_slides: D.tradition.slides.map((s) => ({ title: s.title, description: s.description })),
  alumni: (await Promise.all(D.tradition.alumni.map(async (a) => ({ image: await media(a.image), name: a.name, role: a.role, status: orNull(a.status) })))).filter((a) => a.image),
  highlights: (await Promise.all(D.tradition.highlights.map(async (h) => ({ image: await media(h.image), title: h.title })))).filter((h) => h.image),
  quick_links: D.tradition.quickLinks.map((l) => ({ label: l.label, link: l.href })),
  placement_metrics: D.tradition.placementMetrics.map((s) => ({ value: s.value, label: s.label, note: orNull(s.note) })),
  overview_metrics: D.tradition.overviewMetrics.map((s) => ({ value: s.value, label: s.label, note: orNull(s.note) })),
  research_metrics: D.tradition.researchMetrics.map((s) => ({ value: s.value, label: s.label, note: orNull(s.note) })),
  departments: D.tradition.departments.map((d) => ({ name: d.name, companies: d.companies, students: d.students })),
  impact_rings: D.tradition.impactRings.map((r) => ({ label: r.label, value: r.value, total: r.total })),
  patents: D.tradition.patents.map((p) => ({ title: p.title, application_id: p.applicationId, author: orNull(p.author) })),
  research_domains: D.tradition.researchDomains.map((label) => ({ label })),
  research_clusters: D.tradition.researchClusters.map((label) => ({ label })),
  lab_images: await mediaList(D.tradition.labImages),
});

// ── moments ─────────────────────────────────────────────────────────────────
await single('api::moments-milestone-section.moments-milestone-section', {
  heading: D.moments.heading,
  cards: (await Promise.all(D.moments.cards.map(async (c) => ({
    badge: c.badge, head_sans: c.headSans, head_italic: c.headItalic, head_tail: orNull(c.headTail), body: c.body,
    image: await media(c.image), image_mobile: await media(c.imageMobile),
    image_caption: orNull(c.imageCaption), image_treatment: c.imageTreatment ?? 'cover',
    tiles: c.tiles.map((t) => ({ label: t.label, value: t.value, value_suffix: orNull(t.valueSuffix), rows: (t.rows ?? []).map((r) => ({ label: r.label, value: orNull(r.value) })) })),
  })))).filter((c) => c.image),
});

// ── placement ───────────────────────────────────────────────────────────────
await single('api::placement-section.placement-section', {
  heading: D.placement.heading,
  subheading: orNull(D.placement.subheading),
  cta_label: orNull(D.placement.ctaLabel),
  alumni_heading: D.placement.alumniHeading,
  alumni_subheading: orNull(D.placement.alumniSubheading),
  stories_heading: D.placement.storiesHeading,
  stories_cta_label: orNull(D.placement.storiesCtaLabel),
  network_heading: D.placement.networkHeading,
  recruiters: (await Promise.all(D.placement.recruiters.map(async (r) => ({
    name: r.name, logo: await media(r.logo),
  })))).filter((r) => r.logo),
  metrics: D.placement.metrics.map((m) => ({ value: m.value, label: m.label })),
  yearly_stats: D.placement.years.map((y) => ({
    year: y.year, companies_visited: y.companiesVisited, students_placed: y.studentsPlaced,
    highest_package: orNull(y.highestPackage), highest_package_intl: orNull(y.highestPackageIntl),
    package_bands: (y.packages ?? []).map((b) => ({ label: b.name, value: b.value })),
  })),
  achievers: (await Promise.all(D.placement.achievers.slice(0, 3).map(async (a) => ({
    name: a.name, designation: a.designation, placed_in: a.placedIn, salary_value: a.salaryValue, salary_unit: a.salaryUnit,
    company_logo: await media(a.companyLogo), person_image: await media(a.personImage),
  })))).filter((a) => a.company_logo && a.person_image),
  success_stories: (await Promise.all(D.placement.stories.map(async (s) => ({
    stream: slug(s.stream), name: s.name, designation: s.designation,
    company_image: await media(s.companyImage), person_image: await media(s.personImage), successful_sessions: s.successfulSessions ?? 0,
  })))).filter((s) => s.company_image && s.person_image),
});

// ── why choose CU ───────────────────────────────────────────────────────────
await single('api::why-choose-cu-section.why-choose-cu-section', {
  heading: D.why.heading,
  reasons: (await Promise.all(D.why.reasons.map(async (r) => ({
    group: slug(r.group), title: r.title, subtitle: r.subtitle, mobile_title: orNull(r.mobileTitle), mobile_subtitle: orNull(r.mobileSubtitle),
    card_title: r.cardTitle, description: r.description, images: await mediaList(r.images),
  })))).filter((r) => r.images.length),
});

// ── international ───────────────────────────────────────────────────────────
await single('api::international-section.international-section', {
  heading: D.intl.heading, subheading: orNull(D.intl.subheading),
  cards: (await Promise.all(D.intl.cards.map(async (c) => ({ title: c.title, description: c.text, image: await media(c.image) })))).filter((c) => c.image),
  partner_logos: await mediaList(D.intl.partnerLogos),
});

// ── campus life ─────────────────────────────────────────────────────────────
await single('api::campus-life-section.campus-life-section', {
  heading: D.campus.heading, subheading: orNull(D.campus.subheading), cta_label: D.campus.ctaLabel,
  /*
    `images_mobile` is index-paired with `images`, so a photo with no portrait
    crop re-uses its own landscape frame in that slot rather than being skipped
    -- skipping would slide every later crop onto the wrong frame. `media`
    caches by url, so the repeat costs a lookup, not a second upload.
  */
  galleries: (await Promise.all(D.campus.galleries.map(async (g) => ({
    group: slug(g.group),
    images: await mediaList(g.photos),
    images_mobile: await mediaSlots(g.photos.map((p) => ({ url: p.mobile || p.url, alt: p.alt }))),
  })))).filter((g) => g.images.length),
});

// ── see us in action ────────────────────────────────────────────────────────
await single('api::see-us-in-action-section.see-us-in-action-section', {
  heading: D.seeUs.heading, subheading: orNull(D.seeUs.subheading),
  categories: (await Promise.all(D.seeUs.categories.map(async (c) => ({ title: c.title, icon: c.icon, video_url: c.videoUrl, image: await media(c.image) })))).filter((c) => c.image),
  carousel: await Promise.all(D.seeUs.carousel.map(async (c) => ({ title: c.title, video_link: c.videoLink, thumbnail: await media(c.image) }))),
});

// ── step inside ─────────────────────────────────────────────────────────────
await single('api::step-inside-section.step-inside-section', {
  heading: D.step.heading, tour_video: await media(D.step.video), tour_poster: await media(D.step.poster),
});

// ── innovation & startups ───────────────────────────────────────────────────
await single('api::innovation-startups-section.innovation-startups-section', {
  ecosystem_heading: D.innovation.ecosystemHeading, ecosystem_subheading: orNull(D.innovation.ecosystemSubheading),
  pillars_heading: D.innovation.pillarsHeading, pillars_subheading: orNull(D.innovation.pillarsSubheading),
  startups_subheading: orNull(D.innovation.startupsSubheading),
  stats: D.innovation.stats.map((s) => ({ value: s.value, prefix: orNull(s.prefix), label: s.label, tone: s.tone })),
  pillars: D.innovation.pillars.map((p) => ({ title: p.title, body: p.body, glyph: p.glyph, chips: p.chips.map((label) => ({ label })) })),
  startups: await Promise.all(D.innovation.startups.map(async (s) => ({
    name: s.name, sector: s.sector, founders: s.founders, description: s.description, video_url: s.videoUrl,
    clip: await media(s.clipSrc), clip_poster: await media(s.clipPoster),
  }))),
  grid_tiles: (await Promise.all(D.innovation.tiles.map(async (t) => ({ caption: t.caption, gallery: await mediaList(t.gallery.map((g) => ({ url: g.src, alt: g.alt }))) })))).filter((t) => t.gallery.length),
});

// ── testimonials ────────────────────────────────────────────────────────────
await single('api::testimonial-section.testimonial-section', {
  heading: D.testimonial.heading, achievers_heading: D.testimonial.achieversHeading,
  testimonials: await Promise.all(D.testimonial.reels.map(async (r) => ({ title: r.title, video_link: r.videoLink, thumbnail: await media(r.image) }))),
  achiever_videos: D.testimonial.achievers.map((a) => ({ title: a.videoTitle, video_link: a.videoLink })),
});

// ── news ────────────────────────────────────────────────────────────────────
await single('api::news-section.news-section', {
  heading: D.news.heading,
  tabs: D.news.tabLabels.map((t) => ({ label: t.label, group: t.group })),
  stories: (await Promise.all(D.news.stories.map(async (s) => ({ group: s.group, title: s.title, description: s.description, image: await media(s.image) })))).filter((s) => s.image),
  articles: (await Promise.all(D.news.articles.map(async (a) => ({
    title_accent: a.titleAccent, title_lead: a.titleLead, title_highlight: a.titleHighlight, title_tail: orNull(a.titleTail),
    image: await media(a.image), author_name: a.author.name, author_role: a.author.role, author_avatar: await media(a.author.avatar),
  })))).filter((a) => a.image),
});

// ── faq ─────────────────────────────────────────────────────────────────────
await single('api::faq-section.faq-section', {
  heading: D.faq.heading,
  entries: D.faq.entries.map((e) => ({ group: slug(e.group), question: e.question, answer: e.answer, cta_label: e.cta?.label ?? null, cta_link: e.cta?.href ?? null })),
});

// ── programs section chrome ─────────────────────────────────────────────────
await single('api::programs-section.programs-section', {
  heading: D.programsSection.heading,
  subheading: orNull(D.programsSection.subheading),
  cucet_eyebrow: orNull(D.programsSection.cucetEyebrow),
  cucet_heading: D.programsSection.cucetHeading,
  cucet_description: orNull(D.programsSection.cucetDescription),
  cucet_deadline: D.programsSection.cucetDeadline ? new Date(D.programsSection.cucetDeadline).toISOString() : null,
  cucet_deadline_label: orNull(D.programsSection.cucetDeadlineLabel),
  cucet_cta_label: orNull(D.programsSection.cucetCtaLabel),
  cucet_cta_link: orNull(D.programsSection.cucetCtaLink),
  cucet_helpline: orNull(D.programsSection.cucetHelpline),
  scholarship_slabs: D.programsSection.slabs.map((s) => ({ marks: s.marks, award: s.award })),
});

// ── mobile dock ─────────────────────────────────────────────────────────────
await single('api::mobile-dock.mobile-dock', {
  cta_label: D.mobileDock.ctaLabel,
  register_eyebrow: D.mobileDock.registerEyebrow,
  register_heading: D.mobileDock.registerHeading,
  register_deadline_note: D.mobileDock.registerDeadlineNote,
  register_consent: D.mobileDock.registerConsent,
  register_submit_label: D.mobileDock.registerSubmitLabel,
  register_success_title: D.mobileDock.registerSuccessTitle,
  register_success_body: D.mobileDock.registerSuccessBody,
  chat_title: D.mobileDock.chatTitle,
  chat_status: D.mobileDock.chatStatus,
  chat_greeting: D.mobileDock.chatGreeting,
  chat_placeholder: D.mobileDock.chatPlaceholder,
  chat_suggestions: D.mobileDock.chatSuggestions.map((c) => ({ label: c.label })),
});

// ── research page ───────────────────────────────────────────────────────────
await single('api::research-page.research-page', {
  eyebrow: D.researchPage.eyebrow,
  intro: D.researchPage.intro,
});

// ── programs (collection) ───────────────────────────────────────────────────
{
  const docs = app.documents('api::program.program');
  let created = 0, updated = 0;
  for (const p of D.programs) {
    const rawData = {
      program_code: p.programCode, program_name: p.programName, program_short_name: orNull(p.programShortName), title: p.title,
      discipline: D.disciplineSlugs[p.discipline] ?? slug(p.discipline), level: p.level, theme: p.theme ?? 'light',
      duration: p.duration, duration_years: orNull(p.durationYears), format: orNull(p.format), description: p.description,
      eligibility: orNull(p.eligibility), eligibility_criteria: orNull(p.eligibilityCriteria), fee_per_semester: p.feePerSemester ?? null,
      cucet_compulsory: !!p.cucetCompulsory, cucet_scholarship_applicable: !!p.cucetScholarshipApplicable,
      deadline: orNull(p.deadline), partner: orNull(p.partner), logo_id: p.logoId,
      image: await media(p.image), logo: await media(p.logo), certifications: await mediaList((p.certifications ?? []).map((c) => c.image)),
      features: await Promise.all((p.features ?? []).map(async (f) => ({ num: f.num, title: f.title, title_highlight: orNull(f.titleHighlight), description: f.description, image: await media(f.image) }))),
      roles: (p.roles ?? []).map((label) => ({ label })),
    };
    const data = mock(rawData);
    const existing = await docs.findFirst({ filters: { program_code: p.programCode }, status: 'draft' });
    if (existing) { await docs.update({ documentId: existing.documentId, data, status: 'published' }); updated++; }
    else { await docs.create({ data, status: 'published' }); created++; }
  }
  // Anything left over from hand testing that is not in the defaults goes.
  const codes = new Set(D.programs.map((p) => p.programCode));
  const all = await docs.findMany({ status: 'draft', limit: 1000 });
  let removed = 0;
  for (const doc of all) if (!codes.has(doc.program_code)) { await docs.delete({ documentId: doc.documentId }); removed++; }
  console.log(`✓ api::program.program  created ${created}, updated ${updated}, removed ${removed}`);
}

console.log(`media: uploaded ${uploaded}, reused ${reused}, failed ${failed}`);
fs.rmSync(tmpDir, { recursive: true, force: true });
await app.destroy();
process.exit(0);
})().catch((e) => { console.error(e); if (e.details?.errors) console.error(JSON.stringify(e.details.errors.map((x) => `${x.path?.join(".")}: ${x.message}`), null, 1)); process.exit(1); });
