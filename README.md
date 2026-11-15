# CYRAX DEVELOPERS

Website, recruitment portal, community and admin dashboard in **one small Node.js server**.
No Supabase, no database service, no npm packages to install. Everything is stored in the `data/` folder.

## Run it (2 minutes)

Needs [Node.js 18+](https://nodejs.org).

```
node server.js
```

Open http://localhost:3000 — admin panel at http://localhost:3000/admin.html

The admin login comes from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Optionally set `FOUNDER_WHATSAPP` there too.

## What lives where

| Thing | Where |
|---|---|
| All data (applications, projects, posts, members…) | `data/db.json` |
| Uploaded avatars / screenshots | `data/uploads/` |
| Automatic daily backups (last 14 kept) | `data/backups/` |
| Login-token secret (auto-generated) | `data/secret.key` |

**Back up the `data/` folder** and you have backed up everything. Restoring = put it back.

## Putting it online

You need a host that runs Node **and keeps its disk between restarts** (a VPS, Railway/Fly with a volume, Render with a persistent disk…). Static-only hosts (Netlify, GitHub Pages) cannot run this, and free tiers that wipe the disk on every deploy/restart would erase your data.

1. Upload the project (do **not** upload `.env` or `data/` — they are git-ignored).
2. Start command: `node server.js`
3. Set environment variables on the host: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FOUNDER_WHATSAPP`, and `DATA_DIR` pointing at the persistent disk (e.g. `/var/data`). `PORT` is picked up automatically.
4. Put it behind HTTPS (most hosts do this for you).

## Accounts

- **Admin**: created automatically from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Change the password any time in Admin → *My Account*. (If you later change the `ADMIN_PASSWORD` variable and restart, that value is applied again — handy if you ever get locked out.)
- **Members**: Admin → *Members* → create a login (name, email, password) and send those details to the developer. They can change their password from the site (**Password** button after signing in). Admins can reset any member's password. There is no email sending, so "forgot password" means asking an admin.

## Honest notes

- The score is a heuristic screening signal, not proof of ability; the coding challenge is stored for human review, not executed.
- "Notify" buttons open pre-filled WhatsApp/email links; there is no automatic email sending.
- Data is a JSON file: perfect for a community/recruitment site (thousands of records). If you ever need to scale far beyond that, swap `server/db.js` for a real database.
- Login attempts, applications, posts and contact messages are rate-limited per IP (in memory). Passwords are hashed with scrypt; sessions are signed tokens.
