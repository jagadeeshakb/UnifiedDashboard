/* ═══════════════════════════════════════════
   ORCHESTRATOR.JS — Agent sequencer & log
   Accenture Governance Dashboard v2.0

   Responsibilities:
   - Receive run commands (single agent / run all)
   - Sequence agents in dependency order
   - Manage agent status transitions
   - Write timestamped entries to activity log
   - Route completion to correct insight banner

   Not an AI agent itself — this is the runtime.
═══════════════════════════════════════════ */

'use strict';

window.Orchestrator = (() => {

  /* ── Dependency order for "run all" ── */
  /* doc runs last — it reads what pricing + features have extracted */
  const SEQUENCE = ['deal', 'features', 'pricing', 'doc'];

  /* ── Agent registry (populated by each agent file) ── */
  const _agents = {};

  function register(id, agentObj) {
    _agents[id] = agentObj;
  }

  /* ── Run a single agent ── */
  async function runAgent(agentId, targetView) {
    if (STATE.agentStatus[agentId] === 'running') return;

    const agent = _agents[agentId];
    if (!agent) { alog('Orchestrator', 'Agent not found: ' + agentId, 'error'); return; }

    STATE.agentStatus[agentId] = 'running';
    App.renderAgentCards();

    alog(agent.name, 'Agent started', 'info');

    const context = agent.buildContext();
    alog(agent.name, 'Context built — sending to Claude...', 'info');

    try {
      const prompt   = agent.buildPrompt(context);
      const insight  = await _callClaude(agent.systemPrompt, prompt);

      STATE.agentOutputs[agentId]  = insight;
      STATE.agentLastRun[agentId]  = new Date().toLocaleTimeString();
      STATE.agentStatus[agentId]   = 'done';

      alog(agent.name, 'Analysis complete', 'success');
      agent.applyInsight(insight);
      App.renderAgentCards();
      App.toast(agent.name + ' complete', 'success');

    } catch (err) {
      STATE.agentStatus[agentId] = 'error';
      alog(agent.name, 'Error: ' + (err.message || err), 'error');
      App.renderAgentCards();
      App.toast('Agent error — check console', 'error');
    }
  }

  /* ── Run all agents in sequence ── */
  async function runAll() {
    App.toast('Running all 4 agents in sequence...', 'info');
    App.nav('agents');
    for (const id of SEQUENCE) {
      await runAgent(id, _agents[id]?.targetView || id);
    }
    App.toast('All 4 agents complete', 'success');
  }

  /* ── Claude API call ── */
  async function _callClaude(systemPrompt, userPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API error');
    return (data.content || []).map(c => c.type === 'text' ? c.text : '').join(' ').trim()
           || 'No insight returned.';
  }

  /* ── Activity log ── */
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

/* ── Convenience global for HTML onclick attributes ── */
function alog(agent, msg, level) { Orchestrator.alog(agent, msg, level); }
