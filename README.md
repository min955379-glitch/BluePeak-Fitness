# BluePeak Fitness — landing page

Static site for BluePeak Fitness: hero, floor zones, class timetable, TDEE & macro
calculator, coaches, memberships, FAQ and a 3-day pass lead-capture form.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | The page (served at `/`) |
| `assets/app.js` | Behaviour: live club status, mobile menu, lead modal, calculator, scroll-spy |
| `assets/styles.css` | Compiled Tailwind CSS (generated — do not edit by hand) |
| `src/input.css` | Tailwind entry file and custom CSS |
| `tailwind.config.js` | Brand colours and fonts |
| `vercel.json` | Security headers and clean URLs for Vercel |

## Develop

```bash
npm install
npm run build   # regenerate assets/styles.css after changing classes or src/input.css
npm run dev     # rebuild CSS on change
```

Open `index.html` directly or serve the folder with any static server.

## Configure before going live

Edit the `CONFIG` object at the top of `assets/app.js`:

- `clubTimeZone` — the club's IANA time zone for the open/closed badge.
- `leadEndpoint` — HTTPS endpoint that accepts a JSON `POST` for each lead. While this is empty the form shows the phone fallback and does **not** claim the request was received.

Business content (phone number, address, prices, class times, coach roles) is placeholder
copy and must be checked before publishing.

## Deploy

Deployed to Vercel as a static site. No build step is needed on Vercel because the compiled
CSS is committed. Push to the branch and promote to production from Vercel.
