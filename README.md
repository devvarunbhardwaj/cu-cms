# CU CMS

Strapi 5 + Postgres. Backs the copy and media on the `lko-cu` site — 19 content
types, one per section, plus the `program` collection.

The site never depends on this being up: every section ships its own copy as a
typed fallback, so with Strapi unreachable the pages still render. What this
gives you is the ability to change them without a deploy.

## Running it locally

You need Docker (for Postgres) and Node 20+.

```bash
cp .env.example .env      # then replace the `replace-me` secrets, see below
docker compose up -d      # Postgres on :5432
npm install
npm run build             # required before seeding: the seed boots from dist/
npm run develop           # admin on http://localhost:1337/admin
```

The database block in `.env.example` already matches `docker-compose.yml`, so
it works unedited. The secrets do not — generate each one:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

`APP_KEYS` wants four of them comma-separated; the other five take one each.

## Seeding the database

The seed writes every section from the frontend's shipped defaults, so a fresh
database comes up matching what the site already renders. It boots Strapi
in-process — **no API token, and no public permissions needed**.

It is two steps, because the defaults live in the frontend repo:

```bash
# 1. in lko-cu — writes cms-defaults.json (gitignored, regenerate freely)
bun run scripts/dump-cms-defaults.ts

# 2. in cms — reads that file and upserts every section
node scripts/seed-from-defaults.cjs ../lko-cu/cms-defaults.json
```

**Stop `npm run develop` before you seed.** The script boots its own Strapi
instance, and two of them against one database will fight.

Re-runnable and idempotent: media is keyed by source path so nothing uploads
twice, single types are updated in place, and programs are matched on
`program_code`.

### Flags

Both are independent — use either, both, or neither.

| Flag | Effect |
| --- | --- |
| `--mock` | Placeholder copy instead of the real text. Every string becomes `Testing <field> <n>`, every number becomes `69`. Links, enums and the keys components match on are left alone so nothing breaks structurally. |
| `--fresh-media` | Swaps every image for a different photograph, from Lorem Picsum. Each keeps its source's aspect ratio, and the choice is a hash of the path so a slot draws the same photo on every run. Video is left alone. |

`--mock` answers "is this text coming from Strapi or from the bundle?".
`--fresh-media` answers the same question for images, which `--mock` alone
cannot — it leaves photography untouched, so a page of placeholder text still
shows the real pictures.

```bash
# obviously-fake copy AND obviously-different photos
node scripts/seed-from-defaults.cjs ../lko-cu/cms-defaults.json --mock --fresh-media

# back to the real thing
node scripts/seed-from-defaults.cjs ../lko-cu/cms-defaults.json
```

Stand-ins are stored under their own names, so the real assets are never
overwritten — going back is a re-seed without the flag, not a re-download.

## Checking it from the frontend

On the site, `?cms=fresh` bypasses the session cache (payloads are cached with
`staleTime: Infinity`, so without it you keep seeing the last fetch), and
`?cms=debug` logs any field that fell back to its default.

Note the frontend needs `NEXT_PUBLIC_STRAPI_URL=http://localhost:1337` in
`lko-cu/.env.local`, and `next dev` compiles the landing page on first request
— give it 15–20s before concluding nothing is coming through.

---

# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
