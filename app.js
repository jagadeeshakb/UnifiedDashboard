/* ═══════════════════════════════════════════
   APP.JS — Application controller
   Accenture Governance Dashboard v2.0

   Responsibilities:
   - Navigation (nav function)
   - Render all three views
   - Render agent cards
   - All edit modals (deal, week plan, features, pricing)
   - Modal and toast utilities
   - Init on DOMContentLoaded
═══════════════════════════════════════════ */

'use strict';

window.App = (() => {

  /* ── NAVIGATION ── */
  const BCMAP = {
    overview: 'Deal overview',
    features: 'Features & inventory',
    pricing:  'Price & effort',
    agents:   'AI agents',
    files:    'File reader',
  };

  function nav(v) {
    document.querySelectorAll('.view')
      .forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn')
      .forEach(b => b.classList.toggle('active', b.dataset.v === v));
    const view = document.getElementById('view-' + v);
    if (view) view.classList.add('active');
    const bc = document.getElementById('bcCur');
    if (bc) bc.textContent = BCMAP[v] || v;
  }

  /* ══════════════════════════════════════════
     RENDER: DEAL OVERVIEW
  ══════════════════════════════════════════ */
  function renderOverview() {
    const d = STATE.deal;

    /* Header fields */
    _setText('hDealName', d.name);
    _setText('hClient',   d.client);
    _setText('hValue',    d.value);
    _setText('hCommDate', 'Last commercials: ' + d.commercialsDate);

    const curr = document.getElementById('hCurrStage');
    const next = document.getElementById('hNextStage');
    if (curr) curr.innerHTML = '<i class="ti ti-circle-dot"></i> ' + d.currentStage;
    if (next) next.innerHTML = '<i class="ti ti-circle"></i> ' + d.nextStage;

    /* Milestones */
    const ml = document.getElementById('milestoneList');
    if (ml) {
      ml.innerHTML = STATE.milestones.map(m => {
        const cls = m.state === 'done' ? 'ms-done' : m.state === 'progress' ? 'ms-progress' : 'ms-todo';
        const ico = m.state === 'done' ? 'ti-check' : m.state === 'progress' ? 'ti-clock' : 'ti-circle-dashed';
        const bdg = m.state === 'done' ? 'bg-green' : m.state === 'progress' ? 'bg-amber' : 'bg-gray';
        const lbl = m.state === 'done' ? 'Done' : m.state === 'progress' ? 'In progress' : 'Upcoming';
        return `<div class="ms-row">
          <div class="ms-dot ${cls}"><i class="ti ${ico}"></i></div>
          <div class="ms-label">${m.label}</div>
          <div class="ms-date">${m.date}</div>
          <span class="badge ${bdg}" style="font-size:10px;">${lbl}</span>
        </div>`;
      }).join('');
    }

    /* Stage track */
    const st = document.getElementById('stageTrack');
    if (st) {
      st.innerHTML = STATE.stages.map((s, i) => {
        const clsMap = { done:'sd-done', cur:'sd-cur', next:'sd-next', todo:'sd-todo' };
        const icoMap = { done:'ti-check', cur:'ti-circle-dot', next:'ti-circle', todo:'ti-circle-dashed' };
        const conn = i > 0
          ? `<div class="stage-conn ${STATE.stages[i-1].st === 'done' ? 'done' : ''}"></div>`
          : '';
        return `${conn}<div class="stage-item">
          <div class="stage-dot ${clsMap[s.st]}"><i class="ti ${icoMap[s.st]}"></i></div>
          <div class="stage-name">${s.label}</div>
          <div class="stage-sub">${s.sub}</div>
        </div>`;
      }).join('');
    }

    /* 4-week plan */
    const wp = document.getElementById('weekPlan');
    if (wp) {
      wp.innerHTML = STATE.weekPlan.map(w => `
        <div class="week-col ${w.cur ? 'wk-cur' : ''}">
          <div class="week-hd">${w.cur ? '▶ ' : ''}${w.label}</div>
          <div class="week-body">
            ${w.tasks.map(t => `<div class="week-task ${t.c}">${t.t}</div>`).join('')}
          </div>
        </div>`).join('');
    }
  }

  /* ══════════════════════════════════════════
     RENDER: FEATURES & INVENTORY
  ══════════════════════════════════════════ */
  function renderFeatures() {
    const f = STATE.features;
    const r = STATE.requirements;

    _setText('fTotal', f.total);
    _setText('rTotal', r.total);

    /* Feature breakdown bars */
    const fb = document.getElementById('featureBreakdown');
    if (fb) {
      const items = [
        { label:'Tagged to Java',        count:f.java,     pct:_pct(f.java, f.total),     col:'#185FA5', gap:false },
        { label:'Tagged to Salesforce',  count:f.sf,       pct:_pct(f.sf,   f.total),     col:'#0F6E56', gap:false },
        { label:'Not tagged / generic',  count:f.untagged, pct:_pct(f.untagged, f.total), col:'#dc2626', gap:true  },
      ];
      fb.innerHTML = items.map(x => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="font-size:12.5px;color:var(--ink-600);">${x.label}</span>
            <span style="font-size:12.5px;font-weight:500;color:var(--ink-800);">
              ${x.count}
              ${x.gap && x.count > 0 ? '<span class="badge bg-amber" style="font-size:10px;margin-left:4px;">Gap</span>' : ''}
            </span>
          </div>
          <div class="feat-bar">
            <div class="feat-bar-fill" style="width:${x.pct}%;background:${x.col};"></div>
          </div>
        </div>`).join('');
    }

    /* Requirements breakdown */
    const rb = document.getElementById('reqBreakdown');
    if (rb) {
      rb.innerHTML = `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="font-size:12.5px;color:var(--ink-600);">With feature mapping</span>
            <span style="font-size:12.5px;font-weight:500;">${r.withFeat}</span>
          </div>
          <div class="feat-bar"><div class="feat-bar-fill" style="width:${_pct(r.withFeat,r.total)}%;background:var(--g400);"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="font-size:12.5px;color:var(--ink-600);">Without feature mapping</span>
            <span style="font-size:12.5px;font-weight:500;">
              ${r.noFeat}
              ${r.noFeat > 0 ? '<span class="badge bg-red" style="font-size:10px;margin-left:4px;">Action</span>' : ''}
            </span>
          </div>
          <div class="feat-bar"><div class="feat-bar-fill" style="width:${_pct(r.noFeat,r.total)}%;background:var(--r400);"></div></div>
        </div>`;
    }

    /* Inventory */
    const il = document.getElementById('inventoryList');
    if (il) {
      il.innerHTML = STATE.inventory.map(inv => `
        <div class="inv-item">
          <div class="inv-item-hd">
            <span class="inv-tech">${inv.tech}</span>
            ${inv.gaps > 0
              ? `<span class="badge bg-amber" style="font-size:10px;"><i class="ti ti-alert-triangle"></i> ${inv.gaps} gap${inv.gaps>1?'s':''}</span>`
              : `<span class="badge bg-green" style="font-size:10px;"><i class="ti ti-check"></i> No gaps</span>`}
          </div>
          <a href="#" class="link-chip" onclick="App.toast('Opening ${inv.name}','info');return false;">
            <i class="ti ti-file-spreadsheet"></i> ${inv.name}
          </a>
        </div>`).join('');
    }

    /* Traceability table */
    const ts = document.getElementById('traceSection');
    if (ts) {
      ts.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Requirements</th><th>Feature mapping</th><th>Inventory match</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td style="font-weight:500;">REQ-001 – REQ-150 (150 requirements)</td>
              <td>150 features mapped</td>
              <td><span class="badge bg-green">Yes</span></td>
              <td><span class="badge bg-green"><i class="ti ti-check"></i> Traced</span></td>
            </tr>
            <tr>
              <td style="font-weight:500;">REQ-151 (1 requirement)</td>
              <td>No feature mapping</td>
              <td><span class="badge bg-red">No</span></td>
              <td><span class="badge bg-amber"><i class="ti ti-alert-triangle"></i> Gap — action needed</span></td>
            </tr>
          </tbody>
        </table>`;
    }
  }

  /* ══════════════════════════════════════════
     RENDER: PRICE & EFFORT
  ══════════════════════════════════════════ */
  function renderPricing() {
    const stBadge = st => st === 'ok'
      ? '<span class="match-ok"><i class="ti ti-check"></i>Matching</span>'
      : '<span class="match-warn"><i class="ti ti-alert-triangle"></i>Variance</span>';

    const eb = document.getElementById('effortBody');
    if (eb) {
      eb.innerHTML = STATE.effort.map(e =>
        `<tr><td>${e.src}</td>
         <td style="font-family:var(--fm);font-weight:500;">${e.days.toLocaleString()}</td>
         <td>${stBadge(e.st)}</td></tr>`
      ).join('') +
      `<tr class="pe-total"><td>Overall status</td><td></td>
       <td><span class="match-warn"><i class="ti ti-alert-triangle"></i>Review needed</span></td></tr>`;
    }

    const pb = document.getElementById('priceBody');
    if (pb) {
      pb.innerHTML = STATE.price.map(p =>
        `<tr><td>${p.src}</td>
         <td style="font-family:var(--fm);font-weight:500;">${p.val}</td>
         <td>${stBadge(p.st)}</td></tr>`
      ).join('') +
      `<tr class="pe-total"><td>Overall status</td><td></td>
       <td><span class="match-warn"><i class="ti ti-alert-triangle"></i>Review needed</span></td></tr>`;
    }

    /* Validation summary badge */
    const vs = document.getElementById('valSummary');
    if (vs) {
      const answered = STATE.validations.filter(v => v.ans !== null).length;
      const yes      = STATE.validations.filter(v => v.ans === 'yes').length;
      vs.innerHTML = answered === 0
        ? '<span class="badge bg-gray">0 of 5 answered</span>'
        : `<span class="badge ${yes === answered ? 'bg-green' : yes === 0 ? 'bg-red' : 'bg-amber'}">${yes}/${answered} Yes</span>`;
    }

    /* Validation check list */
    const vc = document.getElementById('valChecks');
    if (vc) {
      vc.innerHTML = STATE.validations.map(v => {
        const confBadge = v.confidence
          ? `<span class="badge ${v.confidence==='high'?'bg-green':v.confidence==='medium'?'bg-amber':'bg-gray'}" style="font-size:10px;margin-left:6px;">${v.confidence} confidence</span>`
          : '';
        return `<div class="val-check" id="vc-${v.id}">
          <div class="vc-icon ${v.ans==='yes' ? 'vc-yes' : v.ans==='no' ? 'vc-no' : 'vc-na'}">
            <i class="ti ti-${v.ans==='yes' ? 'check' : v.ans==='no' ? 'x' : 'minus'}"></i>
          </div>
          <div style="flex:1;">
            <div class="vc-q">${v.q}</div>
            ${v.note ? `<div style="font-size:12px;color:var(--ink-400);margin-bottom:5px;font-style:italic;display:flex;align-items:center;gap:4px;"><i class="ti ti-robot" style="font-size:12px;color:var(--a400);"></i>${v.note}${confBadge}</div>` : ''}
            <div class="vc-btns">
              <button class="vcb vcb-y ${v.ans==='yes'?'on':''}" onclick="App.setVal('${v.id}','yes')">Yes</button>
              <button class="vcb vcb-n ${v.ans==='no' ?'on':''}" onclick="App.setVal('${v.id}','no')">No</button>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }

  function setVal(id, ans) {
    const v = STATE.validations.find(x => x.id === id);
    if (!v) return;
    v.ans = v.ans === ans ? null : ans;
    renderPricing();
    toast(ans === 'yes' ? 'Marked Yes' : 'Marked No', ans === 'yes' ? 'success' : 'warning');
  }

  /* ══════════════════════════════════════════
     RENDER: AGENT CARDS
  ══════════════════════════════════════════ */
  function renderAgentCards() {
    const container = document.getElementById('agentCards');
    if (!container) return;

    /* Pull agent definitions from registered agents — 4 agents now */
    const agents = [
      window.DealAgent,
      window.FeaturesAgent,
      window.PricingAgent,
      window.DocAgent,
    ].filter(Boolean);

    container.innerHTML = agents.map(a => {
      const st    = STATE.agentStatus[a.id] || 'idle';
      const sdCls = { idle:'sd-idle', running:'sd-run', done:'sd-ready', error:'sd-error' }[st] || 'sd-idle';
      const lastRun = STATE.agentLastRun[a.id] || '';
      const output  = STATE.agentOutputs[a.id];

      return `<div class="agent-card">
        <div class="agent-hd">
          <div class="agent-av" style="background:${a.ibg};">
            <i class="ti ${a.ico}" style="color:var(--ac);"></i>
            <span class="agent-sdot ${sdCls}" id="sdot-${a.id}"></span>
          </div>
          <div style="flex:1;">
            <div class="agent-name">${a.name}</div>
            <div class="agent-role">${a.role}</div>
          </div>
          <span class="badge ${st==='done'?'bg-green':st==='running'?'bg-amber':st==='error'?'bg-red':'bg-gray'}"
                style="font-size:10px;">${st}</span>
        </div>
        <p class="agent-desc">${a.desc}</p>
        <div class="agent-caps">
          ${a.caps.map(c => `<div class="agent-cap"><i class="ti ti-check"></i>${c}</div>`).join('')}
        </div>
        <div class="agent-foot">
          <button class="agent-run ${st==='running'?'running':''}"
            id="abtn-${a.id}"
            onclick="Orchestrator.runAgent('${a.id}')"
            ${st==='running' ? 'disabled' : ''}>
            <i class="ti ${st==='running' ? 'ti-loader-2 spin' : 'ti-player-play'}"></i>
            ${st === 'running' ? 'Running...' : 'Run agent'}
          </button>
          <button class="btn btn-sec btn-sm" onclick="App.nav('${a.targetView}')">
            <i class="ti ti-arrow-right"></i> View
          </button>
          ${lastRun ? `<span class="agent-last">Last: ${lastRun}</span>` : ''}
          <span class="badge ${STATE.sandboxMode?'bg-green':'bg-blue'}" style="font-size:10px;margin-left:auto;">
            ${STATE.sandboxMode?'Sandbox':'Live'}
          </span>
        </div>
        ${output ? `<div class="agent-output-wrap"><div class="agent-output ai-resp">${output}</div></div>` : ''}
      </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════
     DEAL SELECTOR
  ══════════════════════════════════════════ */
  function selectDeal(dealId) {
    const deal = STATE.dealsCatalogue.find(d => d.id === dealId);
    if (!deal) return;

    /* Copy deal fields into active STATE */
    STATE.deal.name            = deal.name;
    STATE.deal.client          = deal.client;
    STATE.deal.value           = deal.value;
    STATE.deal.commercialsDate = deal.commercialsDate;
    STATE.deal.currentStage    = deal.currentStage;
    STATE.deal.nextStage       = deal.nextStage;
    STATE.milestones           = deal.milestones.map(m => ({...m}));
    STATE.stages               = deal.stages.map(s => ({...s}));
    STATE.weekPlan             = deal.weekPlan.map(w => ({...w, tasks: w.tasks.map(t=>({...t}))}));

    /* Reset agent outputs for fresh run on new deal — use agentId to avoid shadowing */
    ['deal','features','pricing','doc'].forEach(agentId => {
      STATE.agentStatus[agentId]  = 'idle';
      STATE.agentOutputs[agentId] = null;
      STATE.agentLastRun[agentId] = null;
    });
    STATE.validations.forEach(v => { v.ans = null; v.note = ''; v.confidence = null; });

    /* Re-render all views */
    renderOverview();
    renderFeatures();
    renderPricing();
    renderAgentCards();

    /* Hide all insight banners */
    ['dealAgentBanner','featAgentBanner','priceAgentBanner','docAgentBanner']
      .forEach(bannerId => {
        const el = document.getElementById(bannerId);
        if (el) el.style.display = 'none';
      });

    /* Update the selector button label */
    const sel = document.getElementById('dealSelectorBtn');
    if (sel) {
      const tierCls = deal.tier==='T1' ? 'bg-green' : deal.tier==='T2' ? 'bg-amber' : 'bg-purple';
      sel.innerHTML =
        `<i class="ti ti-briefcase" style="font-size:14px;flex-shrink:0;"></i>` +
        `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${deal.name}</span>` +
        `<span class="badge ${tierCls}" style="font-size:10px;flex-shrink:0;">${deal.tier}</span>` +
        `<i class="ti ti-chevron-down" style="font-size:12px;color:var(--ink-300);flex-shrink:0;"></i>`;
    }

    toast('Deal loaded: ' + deal.name, 'success');
    Orchestrator.alog('System', 'Active deal: ' + deal.name + ' (' + deal.tier + ')', 'info');
  }

  function openDealSelector() {
    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${STATE.dealsCatalogue.map(d => `
          <div class="deal-sel-card ${STATE.deal.name===d.name?'deal-sel-active':''}"
               onclick="App.selectDeal('${d.id}');App.closeModal()">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="font-size:14px;font-weight:500;color:var(--ink-900);">${d.name}</div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="badge ${d.tier==='T1'?'bg-green':d.tier==='T2'?'bg-amber':'bg-purple'}">${d.tier}</span>
                <span class="badge ${d.status==='Approved'?'bg-green':d.status==='In review'?'bg-amber':'bg-red'}" style="font-size:10px;">${d.status}</span>
              </div>
            </div>
            <div style="display:flex;gap:16px;font-size:12.5px;color:var(--ink-500);">
              <span><i class="ti ti-building" style="font-size:13px;"></i> ${d.client}</span>
              <span><i class="ti ti-currency-pound" style="font-size:13px;"></i> ${d.value}</span>
              <span><i class="ti ti-git-branch" style="font-size:13px;"></i> ${d.currentStage} → ${d.nextStage}</span>
            </div>
            <div style="margin-top:8px;">
              <div style="height:5px;background:var(--ink-100);border-radius:3px;overflow:hidden;">
                <div style="height:100%;background:${d.tier==='T3'?'var(--ac)':d.tier==='T2'?'var(--a400)':'var(--g400)'};border-radius:3px;width:${d.status==='Approved'?100:d.status==='In review'?60:30}%;"></div>
              </div>
            </div>
          </div>`).join('')}
        <div style="border-top:0.5px solid var(--ink-100);padding-top:10px;margin-top:4px;">
          <button class="btn btn-ghost btn-sm" style="width:100%;" onclick="App.openNewDeal()">
            <i class="ti ti-plus"></i> Add new deal manually
          </button>
        </div>
      </div>`;

    openModal('Select deal', body,
      `<button class="btn btn-sec" onclick="App.closeModal()">Cancel</button>`);
  }

  function openNewDeal() {
    closeModal();
    openModal('New deal', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="fg"><label class="form-label">Deal name</label><input class="form-input" id="nd-name" placeholder="e.g. Cloud Migration — Client Name"></div>
        <div class="fg"><label class="form-label">Client</label><input class="form-input" id="nd-client" placeholder="Client organisation"></div>
        <div class="grid2">
          <div class="fg"><label class="form-label">Value</label><input class="form-input" id="nd-value" placeholder="£0.0M"></div>
          <div class="fg"><label class="form-label">Tier</label>
            <select class="form-input" id="nd-tier"><option>T1</option><option selected>T2</option><option>T3</option></select>
          </div>
          <div class="fg"><label class="form-label">Current stage</label>
            <select class="form-input" id="nd-stage">
              ${['Estimate','Commercial','QAD','Solution Review','NBM','Client Submission'].map(s=>`<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="fg"><label class="form-label">Last commercials date</label><input class="form-input" id="nd-cdate" type="date"></div>
        </div>
      </div>`,
      `<button class="btn btn-sec" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-pri" onclick="App.saveNewDeal()"><i class="ti ti-check"></i> Create deal</button>`);
  }

  function saveNewDeal() {
    const name   = document.getElementById('nd-name')?.value?.trim();
    const client = document.getElementById('nd-client')?.value?.trim();
    if (!name || !client) { toast('Name and client are required', 'warning'); return; }

    const tier    = document.getElementById('nd-tier')?.value  || 'T2';
    const stage   = document.getElementById('nd-stage')?.value || 'Estimate';
    const value   = document.getElementById('nd-value')?.value || '£TBC';
    const cdate   = document.getElementById('nd-cdate')?.value || new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const stageList = ['Estimate','Commercial','QAD','Solution Review','NBM','Client Submission'];
    const ci = stageList.indexOf(stage);
    const nextStage = stageList[ci+1] || stage;

    const newDeal = {
      id: 'd' + Date.now(),
      name, client, value, tier,
      status: 'In progress',
      commercialsDate: cdate,
      currentStage: stage,
      nextStage,
      milestones: [
        { id:'m1', label:'Estimate complete',   state: ci>0?'done':'todo', date:'TBC' },
        { id:'m2', label:'Commercial complete', state: ci>1?'done':'todo', date:'TBC' },
        { id:'m3', label:'QAD',                 state: ci>2?'done':'todo', date:'TBC' },
        { id:'m4', label:'Solution review',     state: ci>3?'done':'todo', date:'TBC' },
        { id:'m5', label:'NBM',                 state: ci>4?'done':'todo', date:'TBC' },
        { id:'m6', label:'Client submission',   state:'todo',              date:'TBC' },
      ],
      stages: stageList.map((label, i) => ({
        label: label.replace('Solution Review','Soln review').replace('Client Submission','Submission'),
        sub: i < ci ? 'complete' : i === ci ? 'current' : i === ci+1 ? 'next' : 'upcoming',
        st:  i < ci ? 'done'     : i === ci ? 'cur'     : i === ci+1 ? 'next' : 'todo',
      })),
      weekPlan: [
        { label:'Week 1', cur:true,  tasks:[{t:'Kickoff & planning', c:'wt-pur'}] },
        { label:'Week 2', cur:false, tasks:[{t:'Requirements review', c:'wt-grn'}] },
        { label:'Week 3', cur:false, tasks:[{t:'Review & approvals', c:'wt-amb'}] },
        { label:'Week 4', cur:false, tasks:[{t:'Submission prep', c:'wt-blu'}] },
      ],
    };

    STATE.dealsCatalogue.push(newDeal);
    closeModal();
    selectDeal(newDeal.id);
    toast('Deal created: ' + name, 'success');
  }

  /* ══════════════════════════════════════════
     API KEY SETTINGS
  ══════════════════════════════════════════ */
  function openSettings() {
    openModal('Settings', `
      <div style="display:flex;flex-direction:column;gap:16px;">

        <!-- Sandbox toggle -->
        <div style="padding:14px;background:${STATE.sandboxMode?'rgba(22,163,74,.06)':'var(--raised)'};border:1px solid ${STATE.sandboxMode?'rgba(22,163,74,.25)':'var(--ink-100)'};border-radius:var(--rlg);transition:all .2s;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:14px;font-weight:500;color:var(--ink-800);">
              <i class="ti ti-test-pipe" style="font-size:15px;color:${STATE.sandboxMode?'var(--g400)':'var(--ink-400)'};margin-right:4px;"></i>
              Sandbox mode
              <span class="badge ${STATE.sandboxMode?'bg-green':'bg-gray'}" style="margin-left:8px;font-size:10px;">${STATE.sandboxMode?'Active':'Off'}</span>
            </div>
            <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">
              <input type="checkbox" id="cfg-sandbox" ${STATE.sandboxMode?'checked':''} style="opacity:0;width:0;height:0;"
                onchange="document.getElementById('cfg-sandbox-wrap').style.opacity=this.checked?'0.4':'1'">
              <span onclick="var cb=document.getElementById('cfg-sandbox');cb.checked=!cb.checked;cb.dispatchEvent(new Event('change'));"
                style="position:absolute;cursor:pointer;inset:0;background:${STATE.sandboxMode?'var(--g400)':'var(--ink-200)'};border-radius:24px;transition:.2s;">
                <span style="position:absolute;content:'';height:18px;width:18px;left:${STATE.sandboxMode?'23':'3'}px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;"></span>
              </span>
            </label>
          </div>
          <div style="font-size:12px;color:var(--ink-400);line-height:1.5;">
            When active, agents generate realistic insights from your deal data instantly — no API key needed. Disable to use real Claude AI.
          </div>
        </div>

        <!-- API key (dimmed when sandbox on) -->
        <div id="cfg-sandbox-wrap" style="opacity:${STATE.sandboxMode?'0.4':'1'};transition:opacity .2s;">
          <div class="form-label">Anthropic API key</div>
          <input class="form-input" id="cfg-key" type="password"
            placeholder="sk-ant-api03-..." value="${STATE.apiKey}"
            autocomplete="off" style="font-family:var(--fm);font-size:13px;">
          <div style="font-size:12px;color:var(--ink-400);margin-top:6px;line-height:1.5;">
            Only needed when Sandbox mode is off. Stored in memory only — never sent anywhere except directly to the Anthropic API.
            Get a key at <a href="https://console.anthropic.com" target="_blank" style="color:var(--ac);">console.anthropic.com</a>.
          </div>
        </div>

        <div style="padding:10px 12px;background:var(--b50);border-radius:var(--rmd);border:0.5px solid var(--b100);font-size:12px;color:var(--b600);line-height:1.5;">
          <i class="ti ti-shield-check" style="font-size:13px;margin-right:3px;"></i>
          Your API key runs entirely in your browser — never stored on any server.
        </div>
      </div>`,
      `<button class="btn btn-sec" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-pri" onclick="App.saveSettings()"><i class="ti ti-check"></i> Save</button>`);
  }

  function saveSettings() {
    const sandbox = document.getElementById('cfg-sandbox')?.checked ?? true;
    const key     = document.getElementById('cfg-key')?.value?.trim() || '';
    STATE.sandboxMode = sandbox;
    STATE.apiKey      = key;
    closeModal();

    const cdot  = document.getElementById('cdot');
    const ctext = document.getElementById('ctext');

    if (sandbox) {
      toast('Sandbox mode active — agents ready', 'success');
      Orchestrator.alog('System', 'Sandbox mode enabled', 'success');
      if (cdot)  cdot.className  = 'cdot ready';
      if (ctext) ctext.textContent = 'Sandbox · 4 agents ready';
    } else if (key) {
      toast('Live mode — API key saved', 'success');
      Orchestrator.alog('System', 'Live mode enabled with API key', 'success');
      if (cdot)  cdot.className  = 'cdot ready';
      if (ctext) ctext.textContent = 'Live · 4 agents ready';
    } else {
      toast('Live mode requires an API key — agents paused', 'warning');
      if (cdot)  cdot.className  = 'cdot';
      if (ctext) ctext.textContent = 'Add API key to run agents';
    }
  }
  function openEditDeal() {
    const d = STATE.deal;
    const stageOpts = ['Estimate','Commercial','QAD','Solution Review','NBM','Client Submission']
      .map(s => `<option${s===d.currentStage?' selected':''}>${s}</option>`).join('');
    const nextOpts  = ['Estimate','Commercial','QAD','Solution Review','NBM','Client Submission']
      .map(s => `<option${s===d.nextStage?' selected':''}>${s}</option>`).join('');

    openModal('Edit deal details', `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="fg"><label class="form-label">Deal name</label><input class="form-input" id="ed-name" value="${d.name}"></div>
        <div class="fg"><label class="form-label">Client name</label><input class="form-input" id="ed-client" value="${d.client}"></div>
        <div class="fg"><label class="form-label">Latest value</label><input class="form-input" id="ed-value" value="${d.value}"></div>
        <div class="fg"><label class="form-label">Last commercials date</label><input class="form-input" id="ed-cdate" value="${d.commercialsDate}"></div>
        <div class="grid2">
          <div class="fg"><label class="form-label">Current stage</label><select class="form-input" id="ed-stage">${stageOpts}</select></div>
          <div class="fg"><label class="form-label">Next stage</label><select class="form-input" id="ed-next">${nextOpts}</select></div>
        </div>
      </div>`,
      `<button class="btn btn-sec" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-pri" onclick="App.saveDeal()"><i class="ti ti-check"></i> Save</button>`
    );
  }

  function saveDeal() {
    STATE.deal.name            = document.getElementById('ed-name').value   || STATE.deal.name;
    STATE.deal.client          = document.getElementById('ed-client').value || STATE.deal.client;
    STATE.deal.value           = document.getElementById('ed-value').value  || STATE.deal.value;
    STATE.deal.commercialsDate = document.getElementById('ed-cdate').value  || STATE.deal.commercialsDate;
    STATE.deal.currentStage    = document.getElementById('ed-stage').value;
    STATE.deal.nextStage       = document.getElementById('ed-next').value;

    /* Sync stage dots */
    const labels = ['Estimate','Commercial','QAD','Solution Review','NBM','Client Submission'];
    const ci = labels.indexOf(STATE.deal.currentStage);
    STATE.stages.forEach((s, i) => {
      s.st  = i < ci ? 'done' : i === ci ? 'cur' : i === ci + 1 ? 'next' : 'todo';
      s.sub = { done:'complete', cur:'current', next:'next', todo:'upcoming' }[s.st];
    });
    closeModal();
    renderOverview();
    toast('Deal updated', 'success');
  }

  function openEditWeekPlan() {
    openModal('Edit 4-week plan', `
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${STATE.weekPlan.map((w, wi) => `
          <div>
            <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-400);margin-bottom:8px;">${w.label}</div>
            ${w.tasks.map((t, ti) => `
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                <input class="form-input" style="flex:1;" value="${t.t}"
                  onchange="STATE.weekPlan[${wi}].tasks[${ti}].t=this.value">
                <button style="background:none;border:none;cursor:pointer;color:var(--r400);font-size:14px;"
                  onclick="STATE.weekPlan[${wi}].tasks.splice(${ti},1);App.openEditWeekPlan()">
                  <i class="ti ti-x"></i>
                </button>
              </div>`).join('')}
            <button class="btn btn-ghost btn-sm"
              onclick="STATE.weekPlan[${wi}].tasks.push({t:'New task',c:'wt-pur'});App.openEditWeekPlan()">
              <i class="ti ti-plus"></i> Add task
            </button>
          </div>`).join('')}
      </div>`,
      `<button class="btn btn-sec" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-pri" onclick="App.closeModal();App.renderOverview();App.toast('Plan updated','success')">
         <i class="ti ti-check"></i> Save plan
       </button>`
    );
  }

  function openEditFeatures() {
    openModal('Edit features & inventory data', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="grid2">
          <div class="fg"><label class="form-label">Total features</label><input class="form-input" type="number" id="ef-tot"  value="${STATE.features.total}"></div>
          <div class="fg"><label class="form-label">Tagged Java</label><input class="form-input" type="number" id="ef-java" value="${STATE.features.java}"></div>
          <div class="fg"><label class="form-label">Tagged Salesforce</label><input class="form-input" type="number" id="ef-sf"   value="${STATE.features.sf}"></div>
          <div class="fg"><label class="form-label">Untagged / not generic</label><input class="form-input" type="number" id="ef-unt"  value="${STATE.features.untagged}"></div>
          <div class="fg"><label class="form-label">Requirements with feature</label><input class="form-input" type="number" id="er-wf"   value="${STATE.requirements.withFeat}"></div>
          <div class="fg"><label class="form-label">Requirements without feature</label><input class="form-input" type="number" id="er-wof"  value="${STATE.requirements.noFeat}"></div>
        </div>
        <div class="form-label" style="margin-top:4px;">Inventory gaps per stream</div>
        ${STATE.inventory.map((inv, i) => `
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:13px;flex:1;color:var(--ink-700);">${inv.name}</span>
            <input class="form-input" style="width:80px;" type="number" value="${inv.gaps}"
              onchange="STATE.inventory[${i}].gaps=+this.value">
          </div>`).join('')}
      </div>`,
      `<button class="btn btn-sec" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-pri" onclick="App.saveFeatures()"><i class="ti ti-check"></i> Save</button>`
    );
  }

  function saveFeatures() {
    STATE.features.total         = +document.getElementById('ef-tot').value  || STATE.features.total;
    STATE.features.java          = +document.getElementById('ef-java').value || STATE.features.java;
    STATE.features.sf            = +document.getElementById('ef-sf').value   || STATE.features.sf;
    STATE.features.untagged      = +document.getElementById('ef-unt').value  || STATE.features.untagged;
    STATE.requirements.withFeat  = +document.getElementById('er-wf').value   || STATE.requirements.withFeat;
    STATE.requirements.noFeat    = +document.getElementById('er-wof').value  || STATE.requirements.noFeat;
    STATE.requirements.total     = STATE.requirements.withFeat + STATE.requirements.noFeat;
    closeModal();
    renderFeatures();
    toast('Features data updated', 'success');
  }

  function openEditPricing() {
    openModal('Edit price & effort values', `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <div class="form-label" style="margin-bottom:8px;">Effort (days)</div>
          ${STATE.effort.map((e, i) => `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
              <span style="font-size:12.5px;width:140px;color:var(--ink-700);">${e.src}</span>
              <input class="form-input" style="width:90px;" type="number" value="${e.days}"
                onchange="STATE.effort[${i}].days=+this.value">
              <select class="form-input" style="width:120px;" onchange="STATE.effort[${i}].st=this.value">
                <option value="ok"${e.st==='ok'?' selected':''}>Matching</option>
                <option value="warn"${e.st==='warn'?' selected':''}>Variance</option>
              </select>
            </div>`).join('')}
        </div>
        <div>
          <div class="form-label" style="margin-bottom:8px;">Price (£)</div>
          ${STATE.price.map((p, i) => `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
              <span style="font-size:12.5px;width:140px;color:var(--ink-700);">${p.src}</span>
              <input class="form-input" style="flex:1;" value="${p.val}"
                onchange="STATE.price[${i}].val=this.value">
              <select class="form-input" style="width:120px;" onchange="STATE.price[${i}].st=this.value">
                <option value="ok"${p.st==='ok'?' selected':''}>Matching</option>
                <option value="warn"${p.st==='warn'?' selected':''}>Variance</option>
              </select>
            </div>`).join('')}
        </div>
      </div>`,
      `<button class="btn btn-sec" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-pri" onclick="App.closeModal();App.renderPricing();App.toast('Pricing data updated','success')">
         <i class="ti ti-check"></i> Save
       </button>`
    );
  }

  /* ══════════════════════════════════════════
     MODAL UTILITIES
  ══════════════════════════════════════════ */
  function openModal(title, body, foot = '') {
    _setText('modalTitle', title, true);
    const mb = document.getElementById('modalBody');
    const mf = document.getElementById('modalFoot');
    if (mb) mb.innerHTML = body;
    if (mf) mf.innerHTML = foot;
    document.getElementById('modalOverlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  }

  /* ══════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════ */
  function toast(msg, type = 'info', dur = 3500) {
    const icons = {
      success: 'ti-circle-check',
      error:   'ti-alert-circle',
      warning: 'ti-alert-triangle',
      info:    'ti-info-circle',
    };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<i class="ti ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    document.getElementById('toastWrap').appendChild(el);
    setTimeout(() => {
      el.style.transition = 'all .3s';
      el.style.opacity    = '0';
      el.style.transform  = 'translateX(20px)';
      setTimeout(() => el.remove(), 350);
    }, dur);
  }

  /* ══════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════ */
  function _setText(id, text, asText = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (asText) el.textContent = text; else el.textContent = text;
  }

  function _pct(n, total) {
    return total > 0 ? Math.round(n / total * 100) : 0;
  }

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  function init() {
    /* Responsive sidebar */
    const checkMobile = () => {
      const mb = document.getElementById('menuBtn');
      if (!mb) return;
      if (window.innerWidth <= 900) {
        mb.style.display = 'flex';
      } else {
        mb.style.display = 'none';
        document.getElementById('sidebar').classList.remove('open');
      }
    };
    window.addEventListener('resize', checkMobile);
    checkMobile();

    /* Close sidebar on outside click (mobile) */
    document.addEventListener('click', e => {
      if (window.innerWidth <= 900 &&
          !e.target.closest('.sidebar') &&
          !e.target.closest('#menuBtn')) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });

    /* Select first deal on load */
    if (STATE.dealsCatalogue.length) selectDeal(STATE.dealsCatalogue[0].id);
    else { renderOverview(); renderFeatures(); renderPricing(); renderAgentCards(); }

    /* Status indicator */
    setTimeout(() => {
      const cdot  = document.getElementById('cdot');
      const ctext = document.getElementById('ctext');
      if (STATE.sandboxMode) {
        if (cdot)  cdot.className  = 'cdot ready';
        if (ctext) ctext.textContent = 'Sandbox · 4 agents ready';
      } else if (STATE.apiKey) {
        if (cdot)  cdot.className  = 'cdot ready';
        if (ctext) ctext.textContent = 'Live · 4 agents ready';
      } else {
        if (cdot)  cdot.className  = 'cdot';
        if (ctext) ctext.textContent = 'Add API key to run agents';
      }
    }, 900);

    /* Initial log entries */
    Orchestrator.alog('System', 'Governance Dashboard v2.1 initialised — Sandbox mode active', 'success');
    Orchestrator.alog('System', '4 agents ready — click Run to generate insights from deal data', 'info');
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    nav,
    renderOverview, renderFeatures, renderPricing, renderAgentCards,
    setVal,
    selectDeal, openDealSelector, openNewDeal, saveNewDeal,
    openSettings, saveSettings,
    openEditDeal,    saveDeal,
    openEditWeekPlan,
    openEditFeatures, saveFeatures,
    openEditPricing,
    openModal, closeModal,
    toast,
  };

})();
