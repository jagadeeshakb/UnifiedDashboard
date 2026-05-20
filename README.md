# Accenture Governance Dashboard

> **Internal / Confidential** · Solution Architecture & Governance Practice · v2.0 · May 2026

AI-powered deal governance dashboard for Accenture solution teams. Three focused agents — one per governance domain — powered by Claude Sonnet.

---

## Repository structure

```
governance-dashboard/
│
├── index.html              ← Main entry point — loads all files
│
├── base.css                ← Design tokens, resets, buttons, forms, badges
├── layout.css              ← Sidebar, topbar, view shell, responsive
├── components.css          ← Milestones, stage track, week plan, tables, validation
├── agents.css              ← Agent cards, console, status dots
├── styles.css              ← File reader drop zones, inventory items
│
├── data.js                 ← STATE — single source of truth for all data
├── orchestrator.js         ← Agent sequencer, activity log, Claude API caller
├── deal-agent.js           ← Deal status agent (Slide 1 domain)
├── features-agent.js       ← Features & traceability agent (Slide 2 domain)
├── pricing-agent.js        ← Price & effort validation agent (Slide 3 domain)
├── file-reader.js          ← Excel/CSV parser, auto-applies data to STATE
├── app.js                  ← Navigation, render functions, modals, init
│
├── .github/
│   └── workflows/
│       └── jekyll-docker.yml   ← Auto-deploys on every push to main
│
└── README.md
```

---

## The three agents

| Agent | File | Domain | Slide |
|---|---|---|---|
| Deal status agent | `deal-agent.js` | Deal metadata, milestones, 4-week plan | Slide 1 |
| Features & traceability agent | `features-agent.js` | Feature tagging, inventory gaps, traceability | Slide 2 |
| Price & effort validation agent | `pricing-agent.js` | myISP/SP51/pricing reconciliation, 5 compliance checks | Slide 3 |

Each agent implements the same interface:
- `buildContext()` — reads relevant fields from `STATE`
- `buildPrompt(ctx)` — builds the Claude prompt string
- `applyInsight(insight)` — shows the result on the correct view
- Registers itself with `Orchestrator.register()` on `DOMContentLoaded`

---

## JS load order (critical)

```html
<script src="data.js"></script>        <!-- STATE must exist first -->
<script src="orchestrator.js"></script> <!-- needs STATE -->
<script src="deal-agent.js"></script>   <!-- registers with Orchestrator -->
<script src="features-agent.js"></script>
<script src="pricing-agent.js"></script>
<script src="file-reader.js"></script>  <!-- needs all agents + App -->
<script src="app.js"></script>          <!-- init on DOMContentLoaded -->
```

---

## Deploy to GitHub Pages

**5 minutes — no build step:**

1. Create a new **public** repository on GitHub
2. Upload all files (maintain folder structure)
3. Settings → Pages → Branch: `main` / `/(root)` → Save
4. Live at `https://YOUR-USERNAME.github.io/REPO-NAME/`

The included `jekyll-docker.yml` workflow auto-deploys on every push.

---

## Adding a new agent

1. Create `my-agent.js` following the pattern in `deal-agent.js`
2. Add `<script src="my-agent.js"></script>` to `index.html` before `app.js`
3. Add the agent's view banner HTML to `index.html`
4. Add the agent ID to `Orchestrator.SEQUENCE` if it should run in "run all"

---

## Production activation

To connect live Accenture systems:

1. Obtain API credentials from Accenture IT (DSP endpoint, myISP MSAL config)
2. Add MSAL in `<head>` of `index.html`
3. The Claude API calls in `orchestrator.js` (`_callClaude`) already use the real Anthropic endpoint — provide your API key via environment variable or secure config

---

*Accenture Governance Dashboard · v2.0 · May 2026 · Internal / Confidential*
