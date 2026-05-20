/* ═══════════════════════════════════════════
   PRICING-AGENT.JS — Price & effort validation agent
   Accenture Governance Dashboard v2.0

   Domain: Price & effort (Slide 3)
   Analyses: effort days and price across myISP,
             SP51, pricing sheet and client dec.
             Runs 5 compliance validation checks.
   Reads:    myISP staffing, SP51, pricing sheet (if uploaded).
   Outputs:  Insight banner on Price & effort view.
             Auto-suggests Yes/No answers where determinable.
═══════════════════════════════════════════ */

'use strict';

window.PricingAgent = (() => {

  const id         = 'pricing';
  const name       = 'Price & effort validation agent';
  const role       = 'Cross-system reconciliation & compliance';
  const targetView = 'pricing';
  const ico        = 'ti-currency-pound';
  const ibg        = '#E6F1FB';

  const caps = [
    'Parses myISP, SP51 and pricing spreadsheet totals',
    'Calculates variance between all four sources',
    'Auto-answers Yes/No validation checks from file data',
    'Generates variance explanation and recommended actions',
  ];

  const desc = 'Compares effort and price figures across myISP staffing, SP51, pricing spreadsheet and client dec. Flags variances, runs 5 compliance checks and summarises validation status with recommended actions.';

  const systemPrompt = [
    'You are a specialist commercial governance analyst for Accenture.',
    'Analyse the effort and price reconciliation data provided.',
    'Return a concise, actionable insight in 3-5 sentences.',
    'Focus on: which variances are significant (>2%), likely root causes, and which of the 5 validation checks still need to be completed.',
    'Be specific — use the actual numbers from the data.',
    'Write in clear prose. No markdown, no bullet points, no headers.',
  ].join(' ');

  /* ── Build context from STATE + uploaded files ── */
  function buildContext() {
    const ctx = {
      deal:        STATE.deal,
      effort:      STATE.effort,
      price:       STATE.price,
      validations: STATE.validations,
    };

    /* Compute variance summary */
    ctx.effortVariance = _computeVariance(STATE.effort.map(e => e.days));
    ctx.priceVariance  = _computePriceVariance(STATE.price);

    /* Count answered validations */
    ctx.validationsAnswered = STATE.validations.filter(v => v.ans !== null).length;
    ctx.validationsYes      = STATE.validations.filter(v => v.ans === 'yes').length;
    ctx.validationsNo       = STATE.validations.filter(v => v.ans === 'no').length;

    /* Attach file summaries if available */
    if (STATE.uploadedFiles.myisp)   ctx.myISPFileSummary   = STATE.uploadedFiles.myisp.summary;
    if (STATE.uploadedFiles.sp51)    ctx.sp51FileSummary    = STATE.uploadedFiles.sp51.summary;
    if (STATE.uploadedFiles.pricing) ctx.pricingFileSummary = STATE.uploadedFiles.pricing.summary;

    return ctx;
  }

  /* ── Build prompt string ── */
  function buildPrompt(ctx) {
    const effortLines = ctx.effort
      .map(e => `  ${e.src}: ${e.days.toLocaleString()} days (${e.st === 'ok' ? 'matching' : 'variance'})`)
      .join('\n');

    const priceLines = ctx.price
      .map(p => `  ${p.src}: ${p.val} (${p.st === 'ok' ? 'matching' : 'variance'})`)
      .join('\n');

    const valLines = ctx.validations
      .map(v => `  [${v.ans ? v.ans.toUpperCase() : 'NOT ANSWERED'}] ${v.q.substring(0, 70)}...`)
      .join('\n');

    return [
      `Price and effort validation for deal: ${ctx.deal.name} (${ctx.deal.client}).`,
      '',
      'Effort reconciliation (days):',
      effortLines,
      `Effort variance (max − min): ${ctx.effortVariance.spread} days (${ctx.effortVariance.pct}% of max).`,
      '',
      'Price reconciliation:',
      priceLines,
      '',
      `Validation checks: ${ctx.validationsAnswered}/5 answered. Yes: ${ctx.validationsYes}. No: ${ctx.validationsNo}. Unanswered: ${5 - ctx.validationsAnswered}.`,
      'Validation questions:',
      valLines,
      '',
      ctx.myISPFileSummary   ? `myISP file data:\n${ctx.myISPFileSummary}`   : '',
      ctx.sp51FileSummary    ? `SP51 file data:\n${ctx.sp51FileSummary}`     : '',
      ctx.pricingFileSummary ? `Pricing file data:\n${ctx.pricingFileSummary}` : '',
      '',
      'Analyse: (1) which effort variances are significant and why, (2) which price variances need investigation, (3) which validation checks are most urgent to complete.',
    ].filter(l => l !== undefined).join('\n');
  }

  /* ── Apply insight to the UI ── */
  function applyInsight(insight) {
    const banner = document.getElementById('priceAgentBanner');
    const text   = document.getElementById('priceAgentInsight');
    if (banner && text) {
      text.textContent = insight;
      banner.style.display = 'block';
    }
  }

  /* ── Internal helpers ── */
  function _computeVariance(values) {
    const nums  = values.filter(v => typeof v === 'number' && !isNaN(v));
    const max   = Math.max(...nums);
    const min   = Math.min(...nums);
    const spread = max - min;
    const pct    = max > 0 ? Math.round(spread / max * 100) : 0;
    return { max, min, spread, pct };
  }

  function _computePriceVariance(priceArr) {
    const amounts = priceArr.map(p => {
      const n = parseInt(String(p.val).replace(/[^0-9]/g, ''));
      return isNaN(n) ? null : n;
    }).filter(Boolean);
    if (!amounts.length) return { spread: 0, pct: 0 };
    const max    = Math.max(...amounts);
    const min    = Math.min(...amounts);
    const spread = max - min;
    const pct    = max > 0 ? Math.round(spread / max * 100) : 0;
    return { max, min, spread, pct };
  }

  /* ── Register with Orchestrator ── */
  const agent = { id, name, role, targetView, ico, ibg, caps, desc, systemPrompt, buildContext, buildPrompt, applyInsight };
  document.addEventListener('DOMContentLoaded', () => Orchestrator.register(id, agent));

  return agent;

})();
