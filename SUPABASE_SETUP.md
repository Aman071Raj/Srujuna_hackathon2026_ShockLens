# Supabase setup for ShockLens

ShockLens uses Supabase Auth for email/password accounts when the Supabase keys are configured. The existing Express/Prisma API continues to own portfolio and goal operations; it verifies Supabase access tokens and stores app profile rows in the Supabase Postgres database. If the frontend keys are absent, the existing local Express login remains available.

## 1. Configure the Supabase project

1. Create or open a Supabase project.
2. In **Project Settings → API**, copy the project URL and the **publishable/anon** key. Do not use a `service_role` key in frontend code.
3. In **Authentication → URL Configuration**, add these Redirect URLs for local development:
   - `http://localhost:5173/auth/callback`
   - `http://127.0.0.1:5173/auth/callback`
4. In **Authentication → Providers → Email**, choose whether email confirmations are required. If enabled, ShockLens displays a confirmation message and the callback links to the app.

## 2. Set local environment variables

Copy `apps/frontend/.env.example` to `apps/frontend/.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Copy `apps/backend/.env.example` to `apps/backend/.env` and set:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the same project URL and publishable/anon key.
- `DATABASE_URL` to the Supabase Postgres connection string from **Project Settings → Database → Connection string**. Choose a connection option compatible with Prisma and your runtime.
- `SESSION_SECRET` to a long random value.

The example files are templates only. Do not commit `.env`, `.env.local`, database passwords, or service-role/secret keys. The API validates user tokens using the public anon key and Supabase Auth; no service-role key is required.

## 3. Install dependencies and apply the schema

From the repository root:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:push --workspace=apps/backend
```

This syncs the complete existing Prisma schema plus the new optional Supabase identity link and password hash to the connected database. Review the Prisma schema changes and back up any database containing important data before syncing. For an existing database with production data, use a reviewed migration plan rather than treating `db push` as a backup or deployment process.

Then start the app from the repository root:

```powershell
npm.cmd run dev
```

The frontend talks to Vite at `http://localhost:5173`; Vite proxies `/api` to the Express API on port `4000`.

## 4. Auth behavior

- Sign-up stores the display name in Supabase user metadata. With email confirmation enabled, the user must follow the email link before signing in.
- Sign-in obtains a Supabase session; API requests include its access token. The backend validates the token with Supabase Auth and links the corresponding profile to the local `User` row.
- Password reset links return to `/auth/callback` and are subject to the Supabase Redirect URL allowlist.
- If a Supabase account uses an email already present in the local user table, the profile is linked to that existing app user.

For deployment, configure the same frontend and backend values in the hosting environment, add the production `/auth/callback` URL to Supabase Redirect URLs, and restrict the app's CORS origins to its deployed site.

## References

- Supabase email/password Auth guide: https://supabase.com/docs/guides/auth/passwords
- Supabase JavaScript `auth.getUser` reference: https://supabase.com/docs/reference/javascript/auth-getuser
- Supabase Auth method guidance: https://supabase.com/docs/guides/auth
