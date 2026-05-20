/* ═══════════════════════════════════════════
   DATA.JS — Application state (single source of truth)
   Accenture Governance Dashboard v2.1 (Option B)

   All views and agents read from / write to this
   shared STATE object. Never import state elsewhere.
═══════════════════════════════════════════ */

'use strict';

window.STATE = {

  /* ── API KEY (set via Settings modal) ── */
  apiKey: '',

  /* ── SANDBOX MODE (active by default — no API key needed) ── */
  /* Set to false and provide an apiKey to use the real Claude API */
  sandboxMode: true,

  /* ── DEALS CATALOGUE ── */
  /* These are the selectable deals. Selecting one populates
     deal, milestones, stages, weekPlan below. */
  dealsCatalogue: [
    {
      id: 'd1',
      name: 'Cloud Transformation — APAC Banking',
      client: 'ANZ Bank',
      value: '£8.2M',
      tier: 'T2',
      status: 'In review',
      commercialsDate: '14 May 2026',
      currentStage: 'Solution Review',
      nextStage: 'NBM',
      milestones: [
        { id:'m1', label:'Estimate complete',   state:'done',     date:'28 Apr 2026' },
        { id:'m2', label:'Commercial complete', state:'done',     date:'05 May 2026' },
        { id:'m3', label:'QAD',                 state:'progress', date:'20 May 2026' },
        { id:'m4', label:'Solution review',     state:'progress', date:'27 May 2026' },
        { id:'m5', label:'NBM',                 state:'todo',     date:'03 Jun 2026' },
        { id:'m6', label:'Client submission',   state:'todo',     date:'10 Jun 2026' },
      ],
      stages: [
        { label:'Estimate',    sub:'complete',  st:'done' },
        { label:'Commercial',  sub:'complete',  st:'done' },
        { label:'QAD',         sub:'in review', st:'done' },
        { label:'Soln review', sub:'current',   st:'cur'  },
        { label:'NBM',         sub:'next',      st:'next' },
        { label:'Submission',  sub:'upcoming',  st:'todo' },
      ],
      weekPlan: [
        { label:'Week 19 (12 May)', cur:false, tasks:[
          { t:'Pricing spreadsheet finalise', c:'wt-pur' },
          { t:'Inventory review — Java',      c:'wt-grn' },
          { t:'SP51 RACI alignment',          c:'wt-grn' },
        ]},
        { label:'Week 20 (19 May)', cur:true, tasks:[
          { t:'QAD preparation',       c:'wt-amb' },
          { t:'myISP staffing update', c:'wt-pur' },
          { t:'Rate card validation',  c:'wt-pur' },
        ]},
        { label:'Week 21 (26 May)', cur:false, tasks:[
          { t:'Solution review pack',   c:'wt-amb' },
          { t:'SF inventory gap close', c:'wt-grn' },
          { t:'Traceability check',     c:'wt-grn' },
        ]},
        { label:'Week 22 (02 Jun)', cur:false, tasks:[
          { t:'NBM submission',         c:'wt-blu' },
          { t:'Client docs final',      c:'wt-blu' },
          { t:'E2E inventory sign-off', c:'wt-grn' },
        ]},
      ],
    },
    {
      id: 'd2',
      name: 'Landing Zone — Gov Cloud',
      client: 'Dept. of Finance',
      value: '£3.1M',
      tier: 'T1',
      status: 'Approved',
      commercialsDate: '02 May 2026',
      currentStage: 'NBM',
      nextStage: 'Client Submission',
      milestones: [
        { id:'m1', label:'Estimate complete',   state:'done',     date:'10 Apr 2026' },
        { id:'m2', label:'Commercial complete', state:'done',     date:'25 Apr 2026' },
        { id:'m3', label:'QAD',                 state:'done',     date:'05 May 2026' },
        { id:'m4', label:'Solution review',     state:'done',     date:'12 May 2026' },
        { id:'m5', label:'NBM',                 state:'progress', date:'19 May 2026' },
        { id:'m6', label:'Client submission',   state:'todo',     date:'26 May 2026' },
      ],
      stages: [
        { label:'Estimate',    sub:'complete', st:'done' },
        { label:'Commercial',  sub:'complete', st:'done' },
        { label:'QAD',         sub:'complete', st:'done' },
        { label:'Soln review', sub:'complete', st:'done' },
        { label:'NBM',         sub:'current',  st:'cur'  },
        { label:'Submission',  sub:'next',     st:'next' },
      ],
      weekPlan: [
        { label:'Week 19 (12 May)', cur:false, tasks:[
          { t:'NBM pack preparation',    c:'wt-amb' },
          { t:'Security baseline review',c:'wt-grn' },
        ]},
        { label:'Week 20 (19 May)', cur:true, tasks:[
          { t:'NBM presentation',        c:'wt-amb' },
          { t:'Client submission draft', c:'wt-blu' },
          { t:'Final pricing sign-off',  c:'wt-pur' },
        ]},
        { label:'Week 21 (26 May)', cur:false, tasks:[
          { t:'Client submission send',  c:'wt-blu' },
          { t:'Contract negotiation',    c:'wt-blu' },
        ]},
        { label:'Week 22 (02 Jun)', cur:false, tasks:[
          { t:'Contract sign',           c:'wt-grn' },
          { t:'Mobilisation kick-off',   c:'wt-grn' },
        ]},
      ],
    },
    {
      id: 'd3',
      name: 'Digital Transformation',
      client: 'Telstra',
      value: '£14.5M',
      tier: 'T3',
      status: 'Pending board',
      commercialsDate: '08 May 2026',
      currentStage: 'QAD',
      nextStage: 'Solution Review',
      milestones: [
        { id:'m1', label:'Estimate complete',   state:'done',     date:'15 Apr 2026' },
        { id:'m2', label:'Commercial complete', state:'progress', date:'22 May 2026' },
        { id:'m3', label:'QAD',                 state:'progress', date:'29 May 2026' },
        { id:'m4', label:'Solution review',     state:'todo',     date:'05 Jun 2026' },
        { id:'m5', label:'NBM',                 state:'todo',     date:'12 Jun 2026' },
        { id:'m6', label:'Client submission',   state:'todo',     date:'19 Jun 2026' },
      ],
      stages: [
        { label:'Estimate',    sub:'complete',  st:'done' },
        { label:'Commercial',  sub:'in progress',st:'cur' },
        { label:'QAD',         sub:'next',      st:'next' },
        { label:'Soln review', sub:'upcoming',  st:'todo' },
        { label:'NBM',         sub:'upcoming',  st:'todo' },
        { label:'Submission',  sub:'upcoming',  st:'todo' },
      ],
      weekPlan: [
        { label:'Week 19 (12 May)', cur:false, tasks:[
          { t:'Commercial modelling',    c:'wt-pur' },
          { t:'T3 governance prep',      c:'wt-amb' },
          { t:'Board briefing pack',     c:'wt-amb' },
        ]},
        { label:'Week 20 (19 May)', cur:true, tasks:[
          { t:'Commercials finalise',    c:'wt-pur' },
          { t:'QAD pack preparation',   c:'wt-amb' },
          { t:'Rate card alignment',     c:'wt-pur' },
        ]},
        { label:'Week 21 (26 May)', cur:false, tasks:[
          { t:'QAD submission',          c:'wt-amb' },
          { t:'Board governance review', c:'wt-amb' },
          { t:'SP51 final version',      c:'wt-grn' },
        ]},
        { label:'Week 22 (02 Jun)', cur:false, tasks:[
          { t:'Solution review',         c:'wt-amb' },
          { t:'Client clarifications',   c:'wt-blu' },
        ]},
      ],
    },
  ],

  /* ── ACTIVE DEAL (set by selectDeal) ── */
  deal: {
    name:            'Cloud Transformation — APAC Banking',
    client:          'ANZ Bank',
    value:           '£8.2M',
    commercialsDate: '14 May 2026',
    currentStage:    'Solution Review',
    nextStage:       'NBM',
  },

  /* ── MILESTONES ── */
  milestones: [
    { id:'m1', label:'Estimate complete',   state:'done',     date:'28 Apr 2026' },
    { id:'m2', label:'Commercial complete', state:'done',     date:'05 May 2026' },
    { id:'m3', label:'QAD',                 state:'progress', date:'20 May 2026' },
    { id:'m4', label:'Solution review',     state:'progress', date:'27 May 2026' },
    { id:'m5', label:'NBM',                 state:'todo',     date:'03 Jun 2026' },
    { id:'m6', label:'Client submission',   state:'todo',     date:'10 Jun 2026' },
  ],

  /* ── STAGES ── */
  stages: [
    { label:'Estimate',    sub:'complete',  st:'done' },
    { label:'Commercial',  sub:'complete',  st:'done' },
    { label:'QAD',         sub:'in review', st:'done' },
    { label:'Soln review', sub:'current',   st:'cur'  },
    { label:'NBM',         sub:'next',      st:'next' },
    { label:'Submission',  sub:'upcoming',  st:'todo' },
  ],

  /* ── 4-WEEK PLAN ── */
  weekPlan: [
    { label:'Week 19 (12 May)', cur:false, tasks:[
      { t:'Pricing spreadsheet finalise', c:'wt-pur' },
      { t:'Inventory review — Java',      c:'wt-grn' },
      { t:'SP51 RACI alignment',          c:'wt-grn' },
    ]},
    { label:'Week 20 (19 May)', cur:true, tasks:[
      { t:'QAD preparation',       c:'wt-amb' },
      { t:'myISP staffing update', c:'wt-pur' },
      { t:'Rate card validation',  c:'wt-pur' },
    ]},
    { label:'Week 21 (26 May)', cur:false, tasks:[
      { t:'Solution review pack',   c:'wt-amb' },
      { t:'SF inventory gap close', c:'wt-grn' },
      { t:'Traceability check',     c:'wt-grn' },
    ]},
    { label:'Week 22 (02 Jun)', cur:false, tasks:[
      { t:'NBM submission',         c:'wt-blu' },
      { t:'Client docs final',      c:'wt-blu' },
      { t:'E2E inventory sign-off', c:'wt-grn' },
    ]},
  ],

  /* ── FEATURES ── */
  features: {
    total:    200,
    java:     150,
    sf:       50,
    untagged: 5,
  },

  /* ── REQUIREMENTS ── */
  requirements: {
    total:    151,
    withFeat: 150,
    noFeat:   1,
  },

  /* ── INVENTORY ── */
  inventory: [
    { name:'Inventory Java.xlsx',       tech:'Java',       gaps:3 },
    { name:'Inventory Salesforce.xlsx', tech:'Salesforce', gaps:4 },
    { name:'E2E Inventory.xlsx',        tech:'E2E',        gaps:0 },
  ],

  /* ── EFFORT ── */
  effort: [
    { src:'myISP staffing', days:1240, st:'ok'   },
    { src:'SP51',           days:1238, st:'ok'   },
    { src:'Pricing sheet',  days:1245, st:'warn' },
    { src:'Client Dec.',    days:1200, st:'warn' },
  ],

  /* ── PRICE ── */
  price: [
    { src:'myISP staffing', val:'£4,840,000', st:'ok'   },
    { src:'SP51',           val:'£4,832,000', st:'ok'   },
    { src:'Pricing sheet',  val:'£4,870,000', st:'warn' },
    { src:'Client Dec.',    val:'£4,680,000', st:'warn' },
  ],

  /* ── VALIDATIONS ── */
  validations: [
    { id:'v1', q:'All features without inventory — have they been addressed in SP51 or staffing sheet?',
      ans:null, note:'', confidence:null },
    { id:'v2', q:'Does the SP51 RACI reflect what client has asked in RFP or client clarifications?',
      ans:null, note:'', confidence:null },
    { id:'v3', q:'Are the SP51 external assumptions aligned with what client has asked in RFP or client clarifications?',
      ans:null, note:'', confidence:null },
    { id:'v4', q:'Is the rate card (hourly rates) in myISP staffing sheet aligned with the rate card model for the account?',
      ans:null, note:'', confidence:null },
    { id:'v5', q:'Are the summary tables in Agent 1c output files aligned with the content in SP51?',
      ans:null, note:'', confidence:null },
  ],

  /* ── UPLOADED FILES ── */
  // { [slot]: { files:[{name,size,parsed}], summary:string, structured:object } }
  uploadedFiles: {},

  /* ── STRUCTURED EXTRACTED DATA (populated by smarter FileReader) ── */
  // Richer than uploadedFiles.summary — keyed by data domain, not by slot
  extracted: {
    features:       null,   // { total, java, sf, untagged, featureIds:[], reqIds:[] }
    inventory:      null,   // { java:{ids:[],gaps:[]}, sf:{ids:[],gaps:[]}, e2e:{ids:[],gaps:[]} }
    traceability:   null,   // { matched:[], unmatched:[], gapRows:[] }
    sp51:           null,   // { effortTotal, priceTotal, raci:[], assumptions:[], ratecardRows:[] }
    myisp:          null,   // { effortTotal, priceTotal, ratecardRows:[], roleRows:[] }
    pricingSheet:   null,   // { effortTotal, priceTotal, adjustments:[] }
    rfp:            null,   // { text, keyRequirements:[] }
    clientDec:      null,   // { effortTotal, priceTotal }
  },

  /* ── AGENT STATUS ── */
  agentStatus: { deal:'idle', features:'idle', pricing:'idle', doc:'idle' },

  /* ── AGENT OUTPUTS ── */
  agentOutputs:  { deal:null, features:null, pricing:null, doc:null },
  agentLastRun:  { deal:null, features:null, pricing:null, doc:null },

  /* ── CONSOLE LOG ── */
  logLines: [],
};
