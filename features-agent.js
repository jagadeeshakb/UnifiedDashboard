/* ═══════════════════════════════════════════
   FEATURES-AGENT.JS — Features & traceability agent
   Accenture Governance Dashboard v2.0

   Domain: Features & inventory (Slide 2)
   Analyses: feature tagging, requirements coverage,
             inventory gaps, traceability.
   Reads:    Features.xlsx, inventory files (if uploaded).
   Outputs:  Insight banner on Features & inventory view.
═══════════════════════════════════════════ */

'use strict';

window.FeaturesAgent = (() => {

  const id         = 'features';
  const name       = 'Features & traceability agent';
  const role       = 'Feature tagging & inventory gap analysis';
  const targetView = 'features';
  const ico        = 'ti-package';
  const ibg        = '#E1F5EE';

  const caps = [
    'Parses Features.xlsx column structure automatically',
    'Counts features by technology tag (Java / SF / untagged)',
    'Cross-checks requirements against feature mapping',
    'Identifies inventory gaps per technology stream',
  ];

  const desc = 'Reads Features.xlsx and inventory files. Checks feature tagging completeness, identifies untagged features, validates requirements-to-inventory traceability and flags gaps requiring action before client submission.';

  const systemPrompt = [
    'You are a specialist solution governance analyst for Accenture.',
    'Analyse the features and inventory data provided.',
    'Return a concise, actionable insight in 3-5 sentences.',
    'Focus on: untagged features, inventory gaps, requirements without feature mapping, and what must be fixed before client submission.',
    'Be specific — use the actual numbers from the data.',
    'Write in clear prose. No markdown, no bullet points, no headers.',
  ].join(' ');

  /* ── Build context from STATE + uploaded files ── */
  function buildContext() {
    const ctx = {
      deal:         STATE.deal,
      features:     STATE.features,
      requirements: STATE.requirements,
      inventory:    STATE.inventory,
    };

    /* Attach file summaries if available */
    if (STATE.uploadedFiles.features)  ctx.featuresFileSummary  = STATE.uploadedFiles.features.summary;
    if (STATE.uploadedFiles.inventory) ctx.inventoryFileSummary = STATE.uploadedFiles.inventory.summary;

    return ctx;
  }

  /* ── Build prompt string ── */
  function buildPrompt(ctx) {
    const f = ctx.features;
    const r = ctx.requirements;

    const invGaps = ctx.inventory
      .map(i => `${i.tech}: ${i.gaps} feature${i.gaps !== 1 ? 's' : ''} without inventory`)
      .join('; ');

    const totalGaps = ctx.inventory.reduce((s, i) => s + i.gaps, 0);

    return [
      `Features and inventory analysis for deal: ${ctx.deal.name} (${ctx.deal.client}).`,
      '',
      `Features — total: ${f.total}. Java-tagged: ${f.java}. SF-tagged: ${f.sf}. Not tagged/not generic: ${f.untagged}.`,
      `Requirements — total: ${r.total}. With feature mapping: ${r.withFeat}. Without feature mapping: ${r.noFeat}.`,
      `Inventory gaps — ${invGaps}. Total gap count: ${totalGaps}.`,
      '',
      ctx.featuresFileSummary  ? `Uploaded features file data:\n${ctx.featuresFileSummary}`  : '',
      ctx.inventoryFileSummary ? `Uploaded inventory file data:\n${ctx.inventoryFileSummary}` : '',
      '',
      'Analyse: (1) feature tagging completeness, (2) requirements-to-feature traceability gaps, (3) inventory coverage gaps per technology stream.',
      'What are the critical gaps? What specific actions are needed before client submission?',
    ].filter(l => l !== undefined).join('\n');
  }

  /* ── Apply insight to the UI ── */
  function applyInsight(insight) {
    const banner = document.getElementById('featAgentBanner');
    const text   = document.getElementById('featAgentInsight');
    if (banner && text) {
      text.textContent = insight;
      banner.style.display = 'block';
    }
  }

  /* ── Register with Orchestrator ── */
  const agent = { id, name, role, targetView, ico, ibg, caps, desc, systemPrompt, buildContext, buildPrompt, applyInsight };
  document.addEventListener('DOMContentLoaded', () => Orchestrator.register(id, agent));

  return agent;

})();
