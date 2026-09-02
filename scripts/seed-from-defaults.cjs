/**
 * Seeds every section from the frontend's shipped defaults.
 *
 *   1. In lko-cu:  bun run scripts/dump-cms-defaults.ts  (writes cms-defaults.json)
 *   2. In cms:     node scripts/seed-from-defaults.cjs ../lko-cu/cms-defaults.json
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
const { createStrapi } = require('@strapi/strapi');

(async () => {

const dataPath = process.argv[2];
if (!dataPath) { console.error('usage: node scripts/seed-from-defaults.cjs <cms-defaults.json>'); process.exit(1); }
const D = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.resolve(path.dirname(dataPath), 'public');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-seed-'));

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska' };

const app = await createStrapi({ distDir: path.resolve(__dirname, '..', 'dist') }).load();
const uploadService = app.plugin('upload').service('upload');
const fileCache = new Map();
let uploaded = 0, reused = 0, failed = 0;

/** One upload at a time: sharp under a burst of parallel uploads has crashed this process. */
let queue = Promise.resolve();
const serialized = (fn) => { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; };

/** Media library name for a source url: unique per path, stable across runs. */
const mediaName = (url) => url.replace(/^https?:\/\//, '').replace(/^\//, '').replace(/[\\/]+/g, '__').replace(/[?#].*$/, '');

/** Uploads (or finds) one asset and returns its file id, or null when it cannot be had. */
async function media(asset) {
  if (!asset) return null;
  const url = typeof asset === 'string' ? asset : asset.url ?? asset.src;
  const alt = (typeof asset === 'object' && (asset.alt ?? asset.alternativeText)) || undefined;
  if (!url) return null;
  if (fileCache.has(url)) return fileCache.get(url);
  return serialized(() => uploadOne(url, alt));
}

async function uploadOne(url, alt) {
  if (fileCache.has(url)) return fileCache.get(url);
  const name = mediaName(url);
  const existing = await app.db.query('plugin::upload.file').findOne({ where: { name } });
  if (existing) { fileCache.set(url, existing.id); reused++; return existing.id; }

  let filepath, mimetype;
  const ext = path.extname(url.replace(/[?#].*$/, '')).toLowerCase();
  try {
    if (/^https?:\/\//.test(url)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mimetype = res.headers.get('content-type')?.split(';')[0] || MIME[ext] || 'application/octet-stream';
      filepath = path.join(tmpDir, name + (ext || ''));
      fs.writeFileSync(filepath, Buffer.from(await res.arrayBuffer()));
    } else {
      const src = path.join(PUBLIC_DIR, url);
      if (!fs.existsSync(src)) throw new Error('missing on disk');
      filepath = path.join(tmpDir, name);
      fs.copyFileSync(src, filepath);
      mimetype = MIME[ext] || 'application/octet-stream';
    }
    const [file] = await uploadService.upload({
      data: { fileInfo: { name, alternativeText: alt, caption: alt } },
      files: { filepath, originalFilename: name, mimetype, size: fs.statSync(filepath).size },
    });
    fileCache.set(url, file.id); uploaded++;
    return file.id;
  } catch (e) {
    console.warn(`  ! media skipped ${url}: ${e.message}`);
    failed++; fileCache.set(url, null);
    return null;
  }
}
const mediaList = async (assets) => (await Promise.all((assets ?? []).map(media))).filter((id) => id != null);

/** Upserts and publishes a single type. */
async function single(uid, data) {
  const docs = app.documents(uid);
  const current = await docs.findFirst({ status: 'draft' });
  if (current) await docs.update({ documentId: current.documentId, data, status: 'published' });
  else await docs.create({ data, status: 'published' });
  console.log(`✓ ${uid}`);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const orNull = (v) => (v === '' || v === undefined ? null : v);

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
});

// ── moments ─────────────────────────────────────────────────────────────────
await single('api::moments-milestone-section.moments-milestone-section', {
  heading: D.moments.heading,
  cards: (await Promise.all(D.moments.cards.map(async (c) => ({
    badge: c.badge, head_sans: c.headSans, head_italic: c.headItalic, head_tail: orNull(c.headTail), body: c.body,
    image: await media(c.image), image_caption: orNull(c.imageCaption), image_treatment: c.imageTreatment ?? 'cover',
    tiles: c.tiles.map((t) => ({ label: t.label, value: t.value, value_suffix: orNull(t.valueSuffix), rows: (t.rows ?? []).map((r) => ({ label: r.label, value: orNull(r.value) })) })),
  })))).filter((c) => c.image),
});

// ── placement ───────────────────────────────────────────────────────────────
await single('api::placement-section.placement-section', {
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
  galleries: (await Promise.all(D.campus.galleries.map(async (g) => ({ group: slug(g.group), images: await mediaList(g.photos) })))).filter((g) => g.images.length),
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

// ── programs (collection) ───────────────────────────────────────────────────
{
  const docs = app.documents('api::program.program');
  let created = 0, updated = 0;
  for (const p of D.programs) {
    const data = {
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
})().catch((e) => { console.error(e); process.exit(1); });
