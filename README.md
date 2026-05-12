# Perene

An AI styling tool that helps working professionals decide what to wear from their existing wardrobe in under 30 seconds.

**Live at:** [perene.vercel.app](https://perene.vercel.app)
**Repository:** [github.com/beejalsangani-cloud/perene](https://github.com/beejalsangani-cloud/perene)

---

## 1. Context, user, and problem

### The user

Working professional women aged 25-45 who:
- Build a wardrobe over years but have trouble accessing it cognitively
- Make 30-50 outfit decisions per month for varied occasions (office, social, travel, evening)
- Experience decision fatigue around getting dressed, especially on busy mornings
- Are comfortable with mobile apps and willing to try AI tools

### The workflow being improved

The daily ritual of getting dressed. Specifically, the workflow has three persistent friction points:

1. **Forgetting what you own.** A typical wardrobe contains 80-150 items; users actively recall maybe 30 of them. The rest is invisible.
2. **Pairing pieces under decision fatigue.** Mornings are not the time for creative styling.
3. **Knowing what's missing.** Gaps in a wardrobe are rarely identified before they become a problem.

### Why this matters

The "I have nothing to wear" problem is real, frequent, and unsolved. Existing alternatives all have meaningful gaps:

- **Stitch Fix** sends items the user doesn't yet own; doesn't help with what they do own
- **Pinterest / Instagram** show inspirational outfits the user can't actually replicate from their wardrobe
- **Personal stylists** are expensive ($50-200/session) and not on-demand
- **Manual closet decision-making** takes 5-15 minutes and produces inconsistent results

Perene targets this gap: AI-driven styling that uses the user's *actual* wardrobe.

---

## 2. Solution and design

### What I built

Perene is a Next.js web application with four core workflows:

**A. Style profile (one-time onboarding)**
User takes an 8-question style quiz covering gender, age range, body type, style descriptors (Classic, Minimalist, Edgy, etc.), lifestyle (office worker, creative professional, etc.), typical occasions, color preferences, and budget. All 8 fields are stored in Supabase and flow into the AI generation prompt as a STYLE PROFILE block.

**B. Closet digitization**
User photographs each clothing item with their phone camera. The image is processed by:
- `remove.bg` API for background removal
- Claude Haiku 4.5 for AI metadata extraction (category, color, fit, season)

Result: a tagged, searchable digital wardrobe stored in Supabase.

**C. Outfit generation (closet-first)**
User provides an occasion (text input or click a Discover inspiration photo). The system:
- Fetches user's closet items + style profile
- Sends items + occasion + profile to Claude Opus 4.6 (multimodal — accepts inspiration images as URL input)
- Returns a complete outfit using user's real items
- Identifies missing items the user doesn't yet own
- For each missing item, generates affiliate "Shop the look" recommendations across 9 retailers (Reformation, Aritzia, Net-a-Porter, Nordstrom, Saks, ASOS, Anthropologie, Free People, & Other Stories)

**D. Affiliate URL reliability**
A server-side validator checks each affiliate URL before showing it to the user. Invalid URLs are silently hidden. A Supabase-cached layer (24h TTL) keeps repeated checks fast (~50ms).

### Key GenAI design choices

| Choice | Rationale |
|---|---|
| **Claude Opus 4.6 for outfit generation** | Multimodal input accepts inspiration photos directly. Strong reasoning over structured wardrobe data. |
| **Claude Haiku 4.5 for image tagging** | Cheaper than Sonnet, sufficient for garment classification. ~$0.003/item upload. |
| **Style quiz feeds STYLE PROFILE prompt block** | 8 quiz fields become structured context the AI uses for every generation. Personalization without per-request training. |
| **Vision-based inspiration matching** | When users click a Discover photo, Claude sees the image directly rather than relying on text captions. Improved gap accuracy from 2/5 to 4/5 (see evaluation). |
| **No RAG, no agents** | The workflow doesn't need them. Adding complexity would slow generation and add failure modes without improving output quality. |
| **Server-side URL validation** | Affiliate URL reliability is an unsolved problem in fashion-tech. Validation catches dead URLs and SPA blank-page failures without expanding LLM scope. |
| **Soft gate on empty closet** | The product is honest about its limits: outfit generation is blocked until 5+ items are uploaded. Prevents the "fake answer" failure mode common in pure-LLM tools. |

### What I deliberately did NOT build

- **Retailer-first generation** (build complete outfit from retailers when closet is empty). This is a known v2 feature for occasion-shopping (weddings, grad nights, vacations). Out of scope for v1 to keep closet-first promise clear.
- **Multi-agent or RAG architecture.** Workflow doesn't benefit from these.
- **Custom AI models.** Anthropic's API is sufficient.

---

## 3. Evaluation and results

### Test methodology

3 representative use cases tested against 2 baselines.

**3 metrics measured:**
- **Time to decision** (seconds, lower is better)
- **Occasion fit** (1-5 subjective scale)
- **Gap accuracy** (1-5 subjective scale — does the system identify real gaps without hallucinating items?)

**2 baselines compared:**
- **Manual** — user stands in closet, decides themselves
- **ChatGPT prompt-only** — user types "I have these items: [list 20]. What should I wear for [occasion]?"

### Results summary

| | Speed | Occasion Fit | Gap Accuracy | Honest Failure |
|---|---|---|---|---|
| **Perene** | ~15 sec | 4/5 | 4/5 | 5/5 |
| **ChatGPT prompt-only** | ~60+ sec | 3/5 | 2/5 | 2/5 |
| **Manual** | 5-15 min | Variable | N/A | N/A |

### Test Case 1 — Routine workday

**Scenario:** User asks for an outfit for "Tuesday office day."

Perene generates an outfit using actual closet items in ~15 seconds. ChatGPT generates generic text suggestions in 60+ seconds (user has to type their inventory). Manual closet decision-making takes 5-15 minutes for users with decision fatigue.

**Key finding:** Speed advantage is marginal vs. confident manual users. The real win is **consistency** — Perene produces a thought-through outfit even when the user is exhausted.

### Test Case 2 — Inspiration matching (Perene's most differentiating feature)

**Scenario:** User clicks a Discover photo showing a polished outfit (white blazer, rust silk camisole, cream wide-leg pants, brown boots, pink handbag).

This case was tested in two phases — before and after shipping multimodal vision input:

| Metric | Perene (text-only) | Perene (multimodal vision) | ChatGPT prompt-only |
|---|---|---|---|
| Gap accuracy | 2/5 — invented a "gold layered necklace" not in the photo | 4/5 — correctly identified rust silk camisole, white blazer | 3/5 — can list items but not connected to closet |

**Key finding:** Passing the photo as a multimodal image input (rather than just the photo's text caption) substantially improved Perene's understanding of what's in the inspiration. This is the strongest GenAI design choice in the project.

### Test Case 3 — Empty closet (failure mode)

**Scenario:** New user signs up but uploads zero items, tries to generate.

- **Perene:** Blocks generation. Welcome flow directs user to upload 5+ items first. Honest failure (5/5).
- **ChatGPT:** Confidently produces a plausible-sounding outfit suggestion despite knowing nothing about the user (2/5).
- **Manual:** N/A (you can't dress from an empty closet).

**Key finding:** Perene's architectural choice to require a closet *before* generating prevents the "fake answer" failure mode that pure-LLM systems are prone to. The product knows its limits.

### Where Perene breaks down

Honest failure analysis:

1. **AI substitution when closet is sparse.** If the user owns no cream pants and clicks a cream-pants inspiration photo, the AI substitutes a different bottom from the closet. The generated outfit feels "off" from the inspiration. This is a fundamental closet-first limitation — addressed in part by the upcoming retailer-first v2.

2. **Affiliate URL drift.** Search-based affiliate URLs sometimes return adjacent products rather than exact matches. (Example: Aritzia search for "rust silk camisole top" returns 73 items, none of which are rust or burnt orange.) Mitigated with explicit UX language: *"Browse similar items at these retailers — exact matches not guaranteed."* Complete reliability would require either headless-browser content validation or direct retailer API integration.

3. **SPA retailer limitations.** Mejuri and Sézane were removed from the affiliate list because their JavaScript-rendered search pages return HTTP 200 for "no results" pages — the server-side validator can't distinguish a valid product listing from an empty one. Workaround: rely on retailers that render server-side.

### Where a human should stay involved

- The user is the final judge — Perene recommends, doesn't decide
- For high-stakes occasions (wedding, interview, photo shoot), users should override AI suggestions
- Affiliate recommendations are "browse adjacent items," not "buy this exact thing"
- Privacy: closet photos are stored in Supabase and only accessible to the owning user

---

## 4. Artifact snapshot

### Live product

[perene.vercel.app](https://perene.vercel.app)

### Key features visible in the live product

- Landing page with 4-tile benefit grid
- 8-question style quiz feeding into the AI prompt
- Sign Up / Log In flow with first-name capture and opt-in marketing consent
- Welcome flow that gates outfit generation until user uploads 5 items
- Closet stats on the wardrobe page (items by category, outfits generated, last visit)
- Camera capture with AI metadata detection and background removal
- Outfit generation (text occasion + photo inspiration)
- "Shop the look" affiliate links across 9 retailers
- Vercel Web Analytics for visitor data

### Repository structure

---

## Setup and usage

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (free tier sufficient)
- Anthropic API key
- Mailchimp API key (optional, for marketing email sync)
- Unsplash API key (for inspiration photos)
- remove.bg API key (for camera capture background removal)

### Environment variables

Create a `.env.local` file in the repository root with the following:

### Database setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor. This creates the tables for `user_profiles`, `wardrobe_items`, `outfits`, and `affiliate_url_checks`.

### Run locally

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Test the workflow

1. Sign up at `/signup` with a real email and first name
2. You will be redirected to `/welcome`
3. Take the 8-question style quiz to create your style profile
4. Click "Add your first item →" to upload a photo of a clothing item
5. Repeat until you have 5+ items in your closet
6. Click "Generate an outfit" — type an occasion or pick a Discover inspiration photo
7. View the result at `/outfits/[id]`

### Live demo

A live deployed version is available at [perene.vercel.app](https://perene.vercel.app). To test the workflow without setting up the database locally, you can sign up directly there.

---

## Tech stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Styling:** Tailwind CSS v4
- **Database & Auth:** Supabase (Postgres)
- **AI:** Anthropic SDK (Claude Opus 4.6 for generation, Claude Haiku 4.5 for image tagging)
- **Image processing:** remove.bg API for background removal, Unsplash for inspiration content
- **Email:** Mailchimp API (consent-gated)
- **Analytics:** Vercel Web Analytics
- **Hosting:** Vercel
- **Domain:** myperene.com (purchased, pending DNS configuration)

---

## Acknowledgements

Built as part of an MBA course on Generative AI. Architecture and implementation by Beejal Sangani, with engineering assistance from Claude Code (Anthropic).
