/* ═══════════════════════════════════════════
   ORCHESTRATOR.JS — Agent sequencer & log
   Accenture Governance Dashboard v2.1

   Sandbox mode: active by default.
   Agents run immediately with realistic pre-written
   responses derived from live STATE data.
   No API key required in sandbox mode.

   To use real Claude AI:
   1. Click ⚙ Settings
   2. Enter your Anthropic API key
   3. Toggle off Sandbox mode
═══════════════════════════════════════════ */

'use strict';

window.Orchestrator = (() => {

  /* ── Dependency order — doc runs last ── */
  const SEQUENCE = ['deal', 'features', 'pricing', 'doc'];

  /* ── Agent registry ── */
  const _agents = {};
  function register(id, agentObj) { _agents[id] = agentObj; }

  /* ═══════════════════════════════════════
     RUN A SINGLE AGENT
  ═══════════════════════════════════════ */
  async function runAgent(agentId) {
    if (STATE.agentStatus[agentId] === 'running') return;

    const agent = _agents[agentId];
    if (!agent) { alog('Orchestrator', 'Agent not found: ' + agentId, 'error'); return; }

    /* Require API key only when NOT in sandbox mode */
    if (!STATE.sandboxMode && !STATE.apiKey) {
      App.toast('Add your Anthropic API key in ⚙ Settings, or enable Sandbox mode', 'warning');
      alog('Orchestrator', 'No API key — open Settings or enable Sandbox mode', 'warning');
      App.openSettings();
      return;
    }

    STATE.agentStatus[agentId] = 'running';
    App.renderAgentCards();
    alog(agent.name, `Agent started ${STATE.sandboxMode ? '(sandbox)' : '(live)'}`, 'info');

    const context = agent.buildContext();
    alog(agent.name, 'Context built — ' + (STATE.sandboxMode ? 'generating sandbox response...' : 'sending to Claude...'), 'info');

    /* Simulate network delay in sandbox so it feels real */
    if (STATE.sandboxMode) await _delay(900 + Math.random() * 700);

    try {
      const insight = STATE.sandboxMode
        ? _sandboxResponse(agentId)
        : await _callClaude(agent.systemPrompt, agent.buildPrompt(context));

      STATE.agentOutputs[agentId]  = insight;
      STATE.agentLastRun[agentId]  = new Date().toLocaleTimeString();
      STATE.agentStatus[agentId]   = 'done';

      alog(agent.name, 'Analysis complete', 'success');
      agent.applyInsight(insight);

      /* Doc agent also needs to auto-fill validation checks in sandbox */
      if (agentId === 'doc') _sandboxFillValidations();

      App.renderAgentCards();
      App.toast(agent.name + ' complete', 'success');

    } catch (err) {
      STATE.agentStatus[agentId] = 'error';
      const msg = err.message || String(err);
      alog(agent.name, 'Error: ' + msg, 'error');
      App.renderAgentCards();
      if (msg.includes('401') || msg.includes('auth') || msg.includes('key')) {
        App.toast('Invalid API key — check ⚙ Settings', 'error');
      } else if (msg.includes('403')) {
        App.toast('API key not authorised for this model', 'error');
      } else if (msg.includes('429')) {
        App.toast('Rate limit — wait a moment and retry', 'warning');
      } else {
        App.toast('Agent error: ' + msg.slice(0, 80), 'error');
      }
    }
  }

  /* ═══════════════════════════════════════
     RUN ALL AGENTS IN SEQUENCE
  ═══════════════════════════════════════ */
  async function runAll() {
    App.toast('Running all 4 agents' + (STATE.sandboxMode ? ' (sandbox mode)...' : '...'), 'info');
    App.nav('agents');
    for (const id of SEQUENCE) {
      await runAgent(id);
    }
    App.toast('All 4 agents complete', 'success');
  }

  /* ═══════════════════════════════════════
     SANDBOX RESPONSES
     Realistic insights derived from live STATE
     so they change when you switch deals.
  ═══════════════════════════════════════ */
  function _sandboxResponse(agentId) {
    const d  = STATE.deal;
    const ms = STATE.milestones;
    const f  = STATE.features;
    const r  = STATE.requirements;
    const inv = STATE.inventory;

    const overdue  = ms.filter(m => m.state === 'progress').map(m => m.label);
    const done     = ms.filter(m => m.state === 'done').map(m => m.label);
    const upcoming = ms.filter(m => m.state === 'todo').map(m => m.label);
    const totalGaps = inv.reduce((s, i) => s + i.gaps, 0);
    const effortVals = STATE.effort.map(e => e.days);
    const effortMax  = Math.max(...effortVals);
    const effortMin  = Math.min(...effortVals);
    const effortSpread = effortMax - effortMin;

    const responses = {
      deal: `${d.name} for ${d.client} is currently at ${d.currentStage} stage with ${d.value} deal value. `
          + (overdue.length
              ? `${overdue.join(' and ')} ${overdue.length > 1 ? 'are' : 'is'} in progress and require immediate attention to avoid slipping the ${d.nextStage} milestone. `
              : `All in-progress milestones are on track. `)
          + (done.length
              ? `${done.join(', ')} ${done.length > 1 ? 'have' : 'has'} been completed successfully. `
              : '')
          + `The team should focus this week on closing ${overdue[0] || upcoming[0] || d.currentStage} to maintain momentum toward ${d.nextStage}. `
          + `With ${upcoming.length} milestone${upcoming.length !== 1 ? 's' : ''} still ahead, the critical path to client submission remains tight — ensure all stakeholders are aligned on the ${d.nextStage} timeline.`,

      features: `The feature set for ${d.name} comprises ${f.total} features: ${f.java} Java-tagged, ${f.sf} Salesforce-tagged, and ${f.untagged} untagged or non-generic features that require immediate classification before client submission. `
              + (r.noFeat > 0
                  ? `There ${r.noFeat === 1 ? 'is' : 'are'} ${r.noFeat} requirement${r.noFeat > 1 ? 's' : ''} with no feature mapping — this traceability gap must be resolved as it represents a risk to scope completeness. `
                  : `All ${r.total} requirements have feature mappings — traceability is complete. `)
              + (totalGaps > 0
                  ? `Inventory gaps total ${totalGaps} across ${inv.filter(i=>i.gaps>0).map(i=>i.tech+' ('+i.gaps+')').join(', ')} — these features have no corresponding inventory entries and must be addressed in SP51 or the staffing sheet before QAD sign-off. `
                  : `All features have corresponding inventory entries — no gaps identified. `)
              + `Priority action: tag the ${f.untagged} untagged feature${f.untagged !== 1 ? 's' : ''} and confirm SP51 coverage for all inventory gaps.`,

      pricing: `Effort reconciliation across four sources shows a spread of ${effortSpread} days (${effortMin.toLocaleString()}–${effortMax.toLocaleString()} days), representing a ${Math.round(effortSpread/effortMax*100)}% variance that is `
             + (effortSpread/effortMax < 0.02 ? 'within acceptable tolerance.' : effortSpread/effortMax < 0.05 ? 'within acceptable tolerance but worth investigating the specific role assumptions in each source.' : 'significant and requires root-cause analysis before client submission.')
             + ` myISP staffing and SP51 are ${Math.abs(STATE.effort[0].days - STATE.effort[1].days) <= 10 ? 'well-aligned' : 'misaligned'}, which is the most important cross-check. `
             + `Price variance across sources is ${STATE.price.filter(p=>p.st==='warn').length > 0 ? 'flagged on ' + STATE.price.filter(p=>p.st==='warn').map(p=>p.src).join(' and ') + ' — reconcile before QAD' : 'within tolerance across all sources'}. `
             + `The 5 validation checks below should be completed — the document intelligence agent can auto-answer these from uploaded SP51 and myISP files.`,

      doc: `[Sandbox] Document intelligence analysis for ${d.name}: Based on the current deal data, `
         + (totalGaps > 0
             ? `the ${totalGaps} inventory gap${totalGaps>1?'s':''} require verification in SP51 — check that all unmatched features are explicitly covered in the staffing assumptions. `
             : `all features appear to have inventory coverage — SP51 scope alignment is likely intact. `)
         + `The RACI and external assumptions in SP51 should be cross-referenced against any client clarification documents to confirm alignment. `
         + `Rate card consistency between myISP staffing and the account rate card model is a mandatory check before client submission. `
         + `Upload SP51, myISP staffing sheet and the RFP/clarification document to the File reader for a full automated analysis of all 5 validation checks.`,
    };

    return responses[agentId] || `[Sandbox] Analysis complete for ${agentId} agent on deal: ${d.name}.`;
  }

  /* Fill validation checks with realistic sandbox answers */
  function _sandboxFillValidations() {
    const totalGaps  = STATE.inventory.reduce((s, i) => s + i.gaps, 0);
    const effortVals = STATE.effort.map(e => e.days);
    const spread     = Math.max(...effortVals) - Math.min(...effortVals);
    const pctSpread  = spread / Math.max(...effortVals);

    const sandboxAnswers = [
      {
        id: 'v1',
        ans: totalGaps === 0 ? 'yes' : 'no',
        confidence: totalGaps === 0 ? 'high' : 'medium',
        note: totalGaps === 0
          ? 'All features have inventory entries — no outstanding gaps in SP51 or staffing sheet.'
          : `${totalGaps} feature${totalGaps>1?'s':''} without inventory — verify SP51 coverage for these items.`,
      },
      {
        id: 'v2',
        ans: 'insufficient',
        confidence: 'low',
        note: 'No RFP or client clarification document uploaded — cannot verify SP51 RACI alignment.',
      },
      {
        id: 'v3',
        ans: 'insufficient',
        confidence: 'low',
        note: 'Upload RFP/client clarification document to File reader to enable automated assumption alignment check.',
      },
      {
        id: 'v4',
        ans: pctSpread < 0.05 ? 'yes' : null,
        confidence: pctSpread < 0.02 ? 'high' : 'medium',
        note: pctSpread < 0.05
          ? 'myISP effort is within 5% of SP51 — rate card alignment appears consistent.'
          : 'Effort variance exceeds 5% — upload myISP staffing sheet for rate card tab comparison.',
      },
      {
        id: 'v5',
        ans: STATE.effort[0].st === 'ok' && STATE.effort[1].st === 'ok' ? 'yes' : 'no',
        confidence: 'medium',
        note: STATE.effort[0].st === 'ok' && STATE.effort[1].st === 'ok'
          ? 'Summary table totals in myISP and SP51 are matching — Agent 1c output appears aligned.'
          : 'Variance detected between sources — review Agent 1c summary tables against SP51 content.',
      },
    ];

    sandboxAnswers.forEach(a => {
      const v = STATE.validations.find(x => x.id === a.id);
      if (!v) return;
      v.ans        = a.ans;
      v.note       = a.note;
      v.confidence = a.confidence;
    });

    App.renderPricing();

    /* Show doc agent banner */
    const answered = STATE.validations.filter(v => v.ans !== null).length;
    const yesCount = STATE.validations.filter(v => v.ans === 'yes').length;
    const noCount  = STATE.validations.filter(v => v.ans === 'no').length;
    const insuff   = STATE.validations.filter(v => v.ans === null).length;
    const summary  = `[Sandbox] Auto-analysis: ${yesCount} Yes, ${noCount} No, ${insuff} insufficient data. `
      + (insuff > 0 ? 'Upload SP51 and RFP files for full automated coverage.' : 'All checks answered.');

    const banner = document.getElementById('docAgentBanner');
    const text   = document.getElementById('docAgentInsight');
    if (banner && text) { text.textContent = summary; banner.style.display = 'block'; }
  }

  /* ═══════════════════════════════════════
     REAL CLAUDE API CALL
  ═══════════════════════════════════════ */
  async function _callClaude(systemPrompt, userPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    STATE.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-5-20251001',
        max_tokens: 1000,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`API ${response.status}: ${err?.error?.message || response.statusText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API error');
    return (data.content || [])
      .map(c => c.type === 'text' ? c.text : '').join(' ').trim()
      || 'No insight returned.';
  }

  function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ═══════════════════════════════════════
     ACTIVITY LOG
  ═══════════════════════════════════════ */
  function alog(agent, msg, level = 'info') {
    const t = new Date().toTimeString().slice(0, 8);
    STATE.logLines.push({ t, agent, msg, level });
    const el = document.getElementById('agentLog');
    if (!el) return;
    el.innerHTML = STATE.logLines.slice(-60).map(l =>
      `<div class="log-line ll-${l.level}">` +
      `<span class="log-time">${l.t}</span>` +
      `<span class="log-agent">[${l.agent.split(' ')[0]}]</span>` +
      `<span class="log-msg">${l.msg}</span></div>`
    ).join('');
    el.scrollTop = el.scrollHeight;
  }

  function clearLog() {
    STATE.logLines = [];
    const el = document.getElementById('agentLog');
    if (el) el.innerHTML = '';
  }

  return { register, runAgent, runAll, alog, clearLog };

})();

/* ── Convenience global ── */
function alog(a, m, l) { Orchestrator.alog(a, m, l); }
