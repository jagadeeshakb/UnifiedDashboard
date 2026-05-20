/* ═══════════════════════════════════════════
   DOC-AGENT.JS — Document intelligence agent  v1.0
   Accenture Governance Dashboard (Option B)

   Domain: Slide 3 — the 5 Yes/No validation checks
   This is the agent the PPTX was asking about when it said
   "WILL THIS NEED AN AGENT OR A PYTHON / EXE SCRIPT?"

   What it does:
   ✓ Reads the structured content from SP51 (RACI,
     assumptions, rate card, summary tables)
   ✓ Reads myISP staffing sheet (rate card, role breakdown)
   ✓ Reads RFP / client clarification doc (if uploaded)
   ✓ Reads traceability data (features without inventory)
   ✓ Sends everything to Claude with the 5 questions
   ✓ Claude answers each question Yes / No / Insufficient data
     with a concise reasoning note for each
   ✓ Auto-populates all 5 validation check rows
     (marks answer + adds reasoning note below each check)
   ✓ Shows overall compliance banner on Price & effort view

   Runs LAST in sequence — after pricing agent has
   already reconciled the numbers.
═══════════════════════════════════════════ */

'use strict';

window.DocAgent = (() => {

  const id         = 'doc';
  const name       = 'Document intelligence agent';
  const role       = 'Auto-answer 5 compliance validation checks';
  const targetView = 'pricing';
  const ico        = 'ti-file-analytics';
  const ibg        = '#FAEEDA';   /* amber tint — distinct from the other three */

  const caps = [
    'Reads RACI, assumptions and rate card tabs from SP51',
    'Cross-references myISP rate card against account model',
    'Compares SP51 assumptions against RFP / client clarifications',
    'Checks inventory coverage for all untagged features',
    'Auto-populates all 5 Yes / No answers with reasoning',
  ];

  const desc = 'Reads the full content of SP51, myISP staffing sheet and (optionally) the RFP/clarifications document. Answers all five compliance validation checks automatically using Claude, with a reasoning note for each answer. Upload the RFP document to File reader for the most accurate analysis.';

  const systemPrompt = [
    'You are a specialist deal governance compliance analyst for Accenture.',
    'You will be given structured content from SP51, myISP staffing sheets, inventory data and optionally an RFP or client clarification document.',
    'Answer EXACTLY 5 validation questions.',
    'For each question, respond in this exact JSON format:',
    '[{"id":"v1","ans":"yes","confidence":"high","note":"one concise sentence explaining why"},',
    ' {"id":"v2","ans":"no","confidence":"medium","note":"..."},',
    ' {"id":"v3","ans":"insufficient","confidence":"low","note":"what information is missing"},',
    ' {"id":"v4","ans":"yes","confidence":"high","note":"..."},',
    ' {"id":"v5","ans":"yes","confidence":"medium","note":"..."}]',
    'ans must be exactly "yes", "no", or "insufficient".',
    'confidence must be exactly "high", "medium", or "low".',
    'note must be one sentence under 120 characters.',
    'Return ONLY the JSON array. No other text, no markdown, no explanation outside the JSON.',
  ].join(' ');

  /* ── Build context from STATE.extracted ── */
  function buildContext() {
    const ex = STATE.extracted;
    const ctx = {
      validationQuestions: STATE.validations.map(v => ({ id:v.id, q:v.q })),
      traceability:  ex.traceability  || null,
      features:      ex.features      || null,
      sp51:          null,
      myisp:         null,
      rfp:           null,
    };

    /* SP51 structured content */
    if (ex.sp51) {
      ctx.sp51 = {
        effortTotal:  ex.sp51.effortTotal,
        priceTotal:   ex.sp51.priceTotal,
        hasRaci:      ex.sp51.raci.length > 0,
        raciSample:   ex.sp51.raci.slice(0, 5),           /* first 5 RACI rows */
        hasAssumptions: ex.sp51.assumptions.length > 0,
        assumptionsSample: ex.sp51.assumptions.slice(0, 10), /* first 10 assumptions */
        hasRatecard:  ex.sp51.ratecardRows.length > 0,
        ratecardSample: ex.sp51.ratecardRows.slice(0, 5),
        summaryText:  ex.sp51.summaryText || '',
      };
    }

    /* myISP structured content */
    if (ex.myisp) {
      ctx.myisp = {
        effortTotal:    ex.myisp.effortTotal,
        priceTotal:     ex.myisp.priceTotal,
        hasRatecard:    ex.myisp.ratecardRows.length > 0,
        ratecardSample: ex.myisp.ratecardRows.slice(0, 5),
        summaryText:    ex.myisp.summaryText || '',
      };
    }

    /* RFP / clarification text */
    if (ex.rfp) {
      ctx.rfp = { text: ex.rfp.text.slice(0, 2000) }; /* cap to stay in context */
    }

    /* Inventory gap context */
    ctx.inventoryGaps = STATE.inventory.map(i => ({
      tech: i.tech,
      gaps: i.gaps,
    }));
    ctx.totalInventoryGaps = STATE.inventory.reduce((s, i) => s + i.gaps, 0);

    return ctx;
  }

  /* ── Build prompt string ── */
  function buildPrompt(ctx) {
    const lines = [
      '=== VALIDATION QUESTIONS ===',
      ctx.validationQuestions.map(v => `${v.id}: ${v.q}`).join('\n'),
      '',
      '=== INVENTORY / FEATURE GAP DATA ===',
      `Total inventory gaps (features without inventory): ${ctx.totalInventoryGaps}`,
      ctx.inventoryGaps.map(g => `  ${g.tech}: ${g.gaps} features without inventory`).join('\n'),
      ctx.traceability
        ? `Feature traceability: ${ctx.traceability.covered} covered, ${ctx.traceability.uncovered} uncovered`
        : 'Feature traceability: not computed (no files uploaded)',
    ];

    if (ctx.sp51) {
      lines.push('', '=== SP51 CONTENT ===');
      lines.push(`Effort total: ${ctx.sp51.effortTotal || 'not found'}`);
      lines.push(`Price total: ${ctx.sp51.priceTotal || 'not found'}`);
      lines.push(`Has RACI tab: ${ctx.sp51.hasRaci}`);
      if (ctx.sp51.hasRaci && ctx.sp51.raciSample.length) {
        lines.push('RACI sample rows:');
        ctx.sp51.raciSample.forEach(r => lines.push('  ' + JSON.stringify(r)));
      }
      lines.push(`Has Assumptions tab: ${ctx.sp51.hasAssumptions}`);
      if (ctx.sp51.hasAssumptions && ctx.sp51.assumptionsSample.length) {
        lines.push('Assumptions sample:');
        ctx.sp51.assumptionsSample.forEach(a => lines.push('  - ' + a));
      }
      lines.push(`Has Rate Card tab: ${ctx.sp51.hasRatecard}`);
      if (ctx.sp51.hasRatecard && ctx.sp51.ratecardSample.length) {
        lines.push('Rate card sample rows:');
        ctx.sp51.ratecardSample.forEach(r => lines.push('  ' + JSON.stringify(r)));
      }
      if (ctx.sp51.summaryText) {
        lines.push('SP51 full content (first 200 lines):');
        lines.push(ctx.sp51.summaryText.slice(0, 1500));
      }
    } else {
      lines.push('', '=== SP51 ===', 'SP51 file not uploaded.');
    }

    if (ctx.myisp) {
      lines.push('', '=== myISP STAFFING SHEET ===');
      lines.push(`Effort total: ${ctx.myisp.effortTotal || 'not found'}`);
      lines.push(`Price total: ${ctx.myisp.priceTotal || 'not found'}`);
      lines.push(`Has Rate Card tab: ${ctx.myisp.hasRatecard}`);
      if (ctx.myisp.hasRatecard && ctx.myisp.ratecardSample.length) {
        lines.push('Rate card sample rows:');
        ctx.myisp.ratecardSample.forEach(r => lines.push('  ' + JSON.stringify(r)));
      }
      if (ctx.myisp.summaryText) {
        lines.push('myISP content (first 200 lines):');
        lines.push(ctx.myisp.summaryText.slice(0, 1000));
      }
    } else {
      lines.push('', '=== myISP ===', 'myISP staffing sheet not uploaded.');
    }

    if (ctx.rfp) {
      lines.push('', '=== RFP / CLIENT CLARIFICATIONS ===');
      lines.push(ctx.rfp.text);
    } else {
      lines.push('', '=== RFP / CLIENT CLARIFICATIONS ===',
        'RFP not uploaded. For v2, v3: answer based on SP51 internal consistency only.');
    }

    lines.push('', '=== INSTRUCTION ===');
    lines.push('Answer all 5 validation questions. Return ONLY the JSON array as instructed in your system prompt.');
    lines.push('For questions where you have insufficient data, use ans: "insufficient".');

    return lines.join('\n');
  }

  /* ── Parse Claude's JSON response ── */
  function _parseResponse(raw) {
    try {
      /* Strip any accidental markdown fences */
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch (_) {
      /* Fallback: try to extract a JSON array from anywhere in the text */
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        try { return JSON.parse(m[0]); } catch (_) { /* noop */ }
      }
      return null;
    }
  }

  /* ── Apply answers to STATE + UI ── */
  function applyInsight(raw) {
    const answers = _parseResponse(raw);

    if (answers && Array.isArray(answers)) {
      let applied = 0;
      answers.forEach(a => {
        const v = STATE.validations.find(x => x.id === a.id);
        if (!v) return;

        /* Map 'insufficient' → null (no button highlighted) */
        v.ans        = (a.ans === 'yes' || a.ans === 'no') ? a.ans : null;
        v.note       = a.note       || '';
        v.confidence = a.confidence || 'low';
        applied++;
      });

      Orchestrator.alog(name,
        `Auto-answered ${applied}/5 validation checks`, 'success');

      /* Re-render the pricing view to show all answers */
      App.renderPricing();

      /* Show the doc agent insight banner on the pricing view */
      const yesCount  = STATE.validations.filter(v => v.ans === 'yes').length;
      const noCount   = STATE.validations.filter(v => v.ans === 'no').length;
      const insuff    = STATE.validations.filter(v => v.ans === null).length;
      const summary   = `Auto-analysis complete: ${yesCount} Yes, ${noCount} No, ${insuff} insufficient data. ` +
        (noCount > 0 ? `${noCount} check${noCount>1?'s':''} failed — review the notes below each question. ` : '') +
        (insuff  > 0 ? `${insuff} check${insuff>1?'s':''} need more file data (upload RFP/clarifications for full coverage).` : '');

      const banner = document.getElementById('docAgentBanner');
      const text   = document.getElementById('docAgentInsight');
      if (banner && text) { text.textContent = summary; banner.style.display = 'block'; }

    } else {
      /* Could not parse JSON — show raw response as fallback */
      Orchestrator.alog(name, 'Could not parse structured answers — showing raw response', 'warning');
      const banner = document.getElementById('docAgentBanner');
      const text   = document.getElementById('docAgentInsight');
      if (banner && text) {
        text.textContent = 'Agent returned unstructured analysis: ' + raw.slice(0, 400);
        banner.style.display = 'block';
      }
    }
  }

  /* ── Register with Orchestrator ── */
  const agent = {
    id, name, role, targetView, ico, ibg, caps, desc,
    systemPrompt, buildContext, buildPrompt, applyInsight,
  };
  document.addEventListener('DOMContentLoaded', () => Orchestrator.register(id, agent));

  return agent;

})();
