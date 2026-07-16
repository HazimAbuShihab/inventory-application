# Deployment Guide

The app is a static Vite SPA backed by Supabase — deploy the `dist/` folder to any
static host (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, nginx).

## 1. Build

```bash
npm ci
npm run build   # outputs dist/
```

Set the environment variables at build time (they are inlined into the bundle):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is publishable by design — authorization is enforced server-side by RLS.
Never expose the `service_role` key to the frontend or commit it anywhere.

## 2. SPA routing

The app uses client-side routing. Configure a catch-all rewrite to `index.html`:

- **Vercel**: `vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **Netlify**: `_redirects` → `/* /index.html 200`
- **nginx**: `try_files $uri /index.html;`

## 3. Security headers

Serve these headers from your host/CDN:

```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://<project-ref>.supabase.co; img-src 'self' data: blob: https://<project-ref>.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

(`style-src 'unsafe-inline'` is required by Tailwind's runtime-injected styles in dev
tooling and some Radix primitives; tighten further if your host supports nonces.)

## 4. Supabase production checklist

- [ ] Apply all migrations in `supabase/migrations` (`supabase db push`)
- [ ] **Enable leaked-password protection**: Dashboard → Authentication → Passwords
      (flagged by the security advisor; cannot be enabled via API)
- [ ] Set Auth → URL Configuration → Site URL to your production domain
      (password-reset emails redirect there)
- [ ] Rotate/remove demo accounts before inviting real users
- [ ] Review Dashboard → Advisors after any schema change
- [ ] Keep the `asset-images` bucket private (it is by default in the migrations)

## 5. CI/CD

`.github/workflows/ci.yml` runs lint, typecheck, tests, and build on every push/PR.
Add a deploy step for your host of choice after the `build` job (both Vercel and
Netlify can also watch the repo directly — in that case set the two `VITE_*` env
variables in their dashboard).

## 6. Database changes

Never edit the schema through the Supabase dashboard in production. Add a new file to
`supabase/migrations` (timestamp-prefixed), apply it with `supabase db push` or the
Supabase MCP `apply_migration` tool, and regenerate `src/types/database.ts` types
afterwards (`supabase gen types typescript`).
