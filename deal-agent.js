/* ═══════════════════════════════════════════
   DEAL-AGENT.JS — Deal status agent
   Accenture Governance Dashboard v2.0

   Domain: Deal overview (Slide 1)
   Analyses: deal metadata, milestone states,
             stage progression, 4-week plan.
   Outputs:  Insight banner on Deal overview view.
═══════════════════════════════════════════ */

'use strict';

window.DealAgent = (() => {

  const id         = 'deal';
  const name       = 'Deal status agent';
  const role       = 'Deal overview & milestone tracking';
  const targetView = 'overview';
  const ico        = 'ti-layout-dashboard';
  const ibg        = 'rgba(161,0,255,.1)';

  const caps = [
    'Reads deal metadata and milestone dates',
    'Identifies overdue or at-risk milestones',
    'Recommends 4-week plan adjustments',
    'Flags misalignment between current and next stage',
  ];

  const desc = 'Analyses current deal state, milestone completion, stage progress and 4-week plan. Identifies blockers, surfaces overdue items and recommends next actions.';

  const systemPrompt = [
    'You are a specialist deal governance analyst for Accenture.',
    'Analyse the deal data provided and return a concise, actionable insight in 3-5 sentences.',
    'Focus on milestone risks, stage progression gaps and what the team should do in the next week.',
    'Be specific — use the actual deal name, dates and stage names from the data.',
    'Write in clear prose. No markdown, no bullet points, no headers.',
  ].join(' ');

  /* ── Build context from STATE ── */
  function buildContext() {
    return {
      deal:       STATE.deal,
      milestones: STATE.milestones,
      stages:     STATE.stages,
      weekPlan:   STATE.weekPlan,
    };
  }

  /* ── Build prompt string ── */
  function buildPrompt(ctx) {
    const msList = ctx.milestones
      .map(m => `${m.label}: ${m.state} (${m.date})`)
      .join(', ');

    const overdue = ctx.milestones
      .filter(m => m.state === 'progress')
      .map(m => m.label);

    const thisWeek = ctx.weekPlan.find(w => w.cur);
    const tasks = thisWeek ? thisWeek.tasks.map(t => t.t).join(', ') : 'none';

    return [
      `Deal status analysis for: ${ctx.deal.name} (${ctx.deal.client}), value ${ctx.deal.value}.`,
      `Current stage: ${ctx.deal.currentStage}. Next stage: ${ctx.deal.nextStage}.`,
      `Last commercials run: ${ctx.deal.commercialsDate}.`,
      `Milestones: ${msList}.`,
      overdue.length ? `Currently in progress: ${overdue.join(', ')}.` : '',
      `This week's tasks: ${tasks}.`,
      'Analyse the milestone status, stage progression and any at-risk items.',
      'What should the team focus on in the next week to stay on track for client submission?',
    ].filter(Boolean).join('\n');
  }

  /* ── Apply insight to the UI ── */
  function applyInsight(insight) {
    const banner = document.getElementById('dealAgentBanner');
    const text   = document.getElementById('dealAgentInsight');
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
