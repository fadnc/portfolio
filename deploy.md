# Portfolio — Deployment Guide & Pin-Pointing (Alias) Issue

## Overview

This is a static portfolio site (plain HTML/CSS/JS) deployed on **Vercel**.

- **GitHub repo:** https://github.com/fadnc/portfolio (branch `master`)
- **Vercel project:** `portfolio` under the account/team `ncfadhil-4079's projects`
- **Production URL:** https://portfolio-ten-black-73.vercel.app
- **Primary public URL:** https://fadhilmuhammednc.vercel.app

---

## ⚠️ The Pin-Pointing (Alias) Issue — IMPORTANT

### Symptom

After redeploying, changes do **not** show up on **https://fadhilmuhammednc.vercel.app** —
it keeps serving an older snapshot of the site (old resume, old project links).

### Root cause

`fadhilmuhammednc.vercel.app` is a **manually created alias pinned to one specific
deployment URL**, not to "production".

When you deploy, Vercel:

1. Creates a brand-new immutable deployment (e.g. `portfolio-e0oauxc2o-....vercel.app`)
2. Automatically re-points the automatic production alias
   (`portfolio-ten-black-73.vercel.app`) to the new deployment ✅
3. Does **NOT** touch manual aliases — `fadhilmuhammednc.vercel.app` stays pinned to
   whatever deployment it was pointed at originally, forever ❌

This bit us already: for ~1 week the URL served a 9-day-old frozen deployment
(`portfolio-n7uhj097e`) and looked "broken/outdated" even though every redeploy worked.

All aliases for this project can be inspected with:

```
vercel alias ls
```

(Purchased/custom domains are listed separately with `vercel domains ls` — `.vercel.app`
subdomains are aliases, not domains, so they don't appear there.)

### Fix / manual step required after every deploy

After any `vercel --prod --yes` deploy, note the new deployment URL and re-point the
alias manually:

```
vercel alias "<NEW_DEPLOYMENT_URL>" fadhilmuhammednc.vercel.app

# Example (the CLI prints the new deployment URL on deploy):
vercel alias portfolio-e0oauxc2o-ncfadhil-4079s-projects.vercel.app fadhilmuhammednc.vercel.app
```

If `portfolio-ten-black-73.vercel.app` also ever drifts (e.g. dashboard/gJD deploy didn't
promote), re-point it the same way with that URL as the second argument.

Alternatively, hold both command lines in PowerShell and re-alias both at once:

```
vercel alias portfolio-<NEW HASH>-ncfadhil-4079s-projects.vercel.app fadhilmuhammednc.vercel.app
vercel alias portfolio-<NEW HASH>-ncfadhil-4079s-projects.vercel.app portfolio-ten-black-73.vercel.app
```

### Durable options (avoid needing the manual step)

- Deploy **only** via the CLI from this repo and remember the re-alias step, or
- In the Vercel dashboard, bind the alias so it always follows production if Vercel
  offers that, or
- Attach a real custom domain (e.g. `fadhilmuhammednc.com`); custom domains are added
  at the project level and automatically follow each new production deployment:

```
vercel domains add <your-domain.com>
vercel alias <NEW_DEPLOYMENT_URL> <your-domain.com>
```

---

## Deploying

Prerequisite: logged into Vercel CLI as the `ncfadhil-4079` account
(`vercel whoami` should show `ncfadhil-4079`).

### Standard flow

```powershell
# 1. Commit work
git add -A
git commit -m "describe the change"
git push

# 2. Deploy to production (deploys the CURRENT working directory, not git)
vercel --prod --yes

# 3. Re-point the manual alias (see the pin-pointing section above)
vercel alias "<NEW_DEPLOYMENT_URL>" fadhilmuhammednc.vercel.app
```

Notes:

- `vercel --prod --yes` deploys the **local directory content**, so always commit/push
  first to keep GitHub and Vercel in sync.
- `--yes` skips the interactive "Link to existing project?" prompt.
- If Vercel suddenly serves outdated content again, first re-run `vercel alias ls`

### Deploying from a clean clone (new machine)

```powershell
git clone https://github.com/fadnc/portfolio.git
cd portfolio
npm install -g vercel
vercel login

# Link to the existing project ONCE:
vercel link --project portfolio --scope ncfadhil-4079s-projects -y

# Then deploy:
vercel --prod --yes
```

---

## Cache notes

- `index.html` is served with `Cache-Control: public, max-age=0, must-revalidate`, so a
  normal refresh sees updates.
- **PDFs and other static assets are immutable-cached by Vercel/CDN.** Replacing a file
  keeps its URL forever stale for some users. Correct approach: **rename the file and
  update references** (this is what happened with the resume: commit `424869a` renamed
  `assets/resume.pdf` → `assets/Fadhil-Muhammed-NC-Resume.pdf` and updated the 3 links
  in `index.html`). Never "just replace" `*.pdf`/`styles.css`-type files hoping to bust
  cache — rename instead.

---

## History of related issues (reference)

| Date | Issue | Fix |
|---|---|---|
| Oct 27 '26 | Production served old deployment; Agentic repo link + resume stale | Forced CLI redeploy `vercel --prod --yes` |
| Oct 28 '26 | `fadhilmuhammednc.vercel.app` frozen on a 9-day-old deployment | Re-aliased to the current production deployment |
| Oct 28 '26 | Styling reverted to earlier "glassfield" look + latest content | Restored `styles.css`/`script.js`/`index.html` from the earlier deployment (`portfolio-n7uhj097e`), patched in new resume filename, new Agentic repo URL and newer skill lists (commit `953074e`) |
