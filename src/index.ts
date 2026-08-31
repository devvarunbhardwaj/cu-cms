import type { Core } from '@strapi/strapi';

/**
 * Grants the Public role read access to every `api::` content type on boot.
 *
 * Strapi creates no permissions for a newly added content type, so a section
 * added in code 403s until someone ticks it by hand in Settings → Roles →
 * Public. That turns "add a section, reload, see it on the portal" into a
 * two-step with a manual step in the middle, and it silently breaks a content
 * type that gets *renamed* — the old permission row keeps pointing at a uid
 * that no longer exists, so the new uid has no permission at all.
 *
 * Read-only by design: only `find` and `findOne` are ever granted. Write
 * actions stay manual, because nothing public should be creating entries.
 *
 * Stale rows left behind by a rename are harmless — a permission naming a uid
 * that no longer exists maps to no route — so they are not cleaned up here.
 */
async function grantPublicReadAccess(strapi: Core.Strapi): Promise<void> {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('[permissions] no public role found — skipping read-access grant');
    return;
  }

  // Iterated as entries rather than indexed by uid: `strapi.contentTypes` is a
  // generated map with no string index signature, so `[uid]` does not typecheck.
  //
  // A single type has no `findOne` route, so asking for that permission would
  // create a row that maps to nothing.
  const wanted = Object.entries(strapi.contentTypes)
    .filter(([uid]) => uid.startsWith('api::'))
    .flatMap(([uid, contentType]) =>
      contentType.kind === 'collectionType'
        ? [`${uid}.find`, `${uid}.findOne`]
        : [`${uid}.find`],
    );

  const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { action: { $in: wanted }, role: publicRole.id },
  });

  const granted = new Set(existing.map((permission) => permission.action));
  const missing = wanted.filter((action) => !granted.has(action));

  for (const action of missing) {
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: publicRole.id },
    });
  }

  if (missing.length > 0) {
    strapi.log.info(`[permissions] granted public read access to: ${missing.join(', ')}`);
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicReadAccess(strapi);
  },
};
