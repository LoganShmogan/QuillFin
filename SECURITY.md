# Security Policy

QuillFin is maintained by **Save Point Limited**.

## Reporting a problem

If you find a security issue in QuillFin (the apps, the web app, the Convex backend or this repository), please email **[support@savepoint.co.nz](mailto:support@savepoint.co.nz)** with the subject line "Security: QuillFin". **Do not** open a public GitHub issue for it.

Please include what you found, how to reproduce it, what an attacker could do with it (for example, read another user's notes), and your contact details if you'd like us to follow up. We will acknowledge your report within 2 working days and keep you updated until it is fixed.

## Where secrets live

| Secret | Where it lives | Never in |
|---|---|---|
| `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Clerk settings | Convex deployment environment (`npx convex env set`) | git, the app build |
| Local dev settings | `backend/.env.local`, `webapp/.env.local`, `config/*.json` (all git-ignored) | git |
| Android signing | `android/key.properties` + keystore (git-ignored) | git |
| A user's own OpenAI / Anthropic key | The device's secure storage (`flutter_secure_storage`) | Save Point's servers, sync, logs |
| Clerk session | The device's secure storage | git, logs |

`config/example.json` and `webapp/.env.example` hold placeholders only. The values in a real `config/*.json` are publishable (public URLs and IDs), but they are kept out of git so each deployment can use its own.

## If a secret leaks

| Secret | What to do |
|---|---|
| Anthropic API key | console.anthropic.com → API keys: revoke it, create a new one, `npx convex env set ANTHROPIC_API_KEY …` |
| Stripe secret key or webhook secret | Stripe dashboard → Developers: roll the key / webhook secret, then update the Convex env |
| Clerk keys | Clerk dashboard → API keys: rotate, then update the Convex env and rebuild the apps |
| Android upload keystore | Contact Google Play support to reset the upload key |
| Convex deploy key | Convex dashboard → Settings → Deploy keys: delete it and create a new one, then update GitHub Actions secrets |
