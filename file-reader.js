/* ═══════════════════════════════════════════
   FILE-READER.JS — Smart Excel/CSV parser  v2.1
   Accenture Governance Dashboard (Option B)

   Upgrades over v2.0:
   ✓ Parses ALL sheets, not just the first
   ✓ Detects meaningful tabs by header keywords
   ✓ Cross-references Features rows vs inventory
     files to compute real per-stream gap counts
   ✓ Builds structured JSON (STATE.extracted)
     — not just a plain-text summary string
   ✓ Exposes getStructured(slot) for agents
═══════════════════════════════════════════ */

'use strict';

const _NativeFileReader = window.FileReader;
window.FReader = (() => {

  const DROP_LABELS = {
    features:'Drop Features.xlsx here',
    inventory:'Drop inventory files here',
    myisp:'Drop myISP staffing sheet',
    sp51:'Drop SP51 spreadsheet',
    pricing:'Drop pricing spreadsheet',
    rfp:'Drop RFP / client clarification doc',
  };
  const DROP_NOTES = {
    features:'Columns: Feature ID, Description, Technology, Requirement ID',
    inventory:'Inventory Java.xlsx · Inventory Salesforce.xlsx · E2E Inventory.xlsx',
    myisp:'Sheets: Summary, Rate Card, Role breakdown',
    sp51:'Sheets: RACI, Assumptions, Effort Summary, Price Summary',
    pricing:'Sheets: Price Summary, Rate Card, Adjustments',
    rfp:'Client RFP or clarification document (Excel/CSV)',
  };

  const TAB_KEYWORDS = {
    raci:        ['raci','responsible','accountable','consulted','informed'],
    assumptions: ['assumption','external assumption','constraint'],
    effort:      ['effort','days','resource day','man day','person day'],
    price:       ['price','cost','value','commercial'],
    ratecard:    ['rate','hourly','day rate','rate card','standard rate'],
    summary:     ['summary','total','grand total','overall'],
    features:    ['feature','feature id','feat id'],
    requirement: ['requirement','req id','req ref'],
    inventory:   ['inventory','inv id','component','asset'],
  };

  /* ── Public: trigger file picker ── */
  function triggerPick(slot) { document.getElementById('fp-'+slot)?.click(); }

  /* ── Drag-drop handlers ── */
  function dzDrag(e,slot){ e.preventDefault(); document.getElementById('dz-'+slot)?.classList.add('drag-over'); }
  function dzLeave(slot){ document.getElementById('dz-'+slot)?.classList.remove('drag-over'); }
  function dzDrop(e,slot){ e.preventDefault(); dzLeave(slot); _handleFiles(slot,e.dataTransfer.files); }
  function handlePick(slot,input){ _handleFiles(slot,input.files); }

  /* ── File ingestion ── */
  function _handleFiles(slot, fileList){
    if(!fileList?.length) return;
    Array.from(fileList).forEach(file=>{
      const reader = new _NativeFileReader();
      reader.onload = e=>{
        const parsed = _parseExcel(e.target.result, file.name);
        if(!STATE.uploadedFiles[slot]) STATE.uploadedFiles[slot]={files:[]};
        const existing = STATE.uploadedFiles[slot].files.findIndex(f=>f.name===file.name);
        const entry = {name:file.name,size:file.size,parsed};
        if(existing>=0) STATE.uploadedFiles[slot].files[existing]=entry;
        else            STATE.uploadedFiles[slot].files.push(entry);

        STATE.uploadedFiles[slot].summary    = _buildSummary(STATE.uploadedFiles[slot].files);
        STATE.uploadedFiles[slot].structured = _buildStructured(slot,STATE.uploadedFiles[slot].files);
        _updateDropZoneUI(slot,STATE.uploadedFiles[slot].files);
        _autoApplyToState(slot);
        _updateFileCountPip();
        document.getElementById('processBtn').disabled=false;
        Orchestrator.alog('FileReader',`Parsed: ${file.name} — ${parsed.totalRows} rows, ${Object.keys(parsed.sheets).length} sheet(s)`,'success');
        App.toast('Parsed: '+file.name,'success');
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /* ── Parse ALL sheets ── */
  function _parseExcel(buffer, filename){
    try{
      const wb=XLSX.read(buffer,{type:'array',cellText:true,cellDates:true});
      const result={filename,sheets:{},headers:{},sheetTypes:{},totalRows:0,namedTabs:{},error:null};
      wb.SheetNames.forEach(name=>{
        const ws=wb.Sheets[name];
        const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        result.sheets[name]=json;
        result.headers[name]=(json[0]||[]).map(h=>String(h));
        result.totalRows+=Math.max(0,json.length-1);
        const hdrLow=result.headers[name].map(h=>String(h).toLowerCase()).join(' ');
        const types=[];
        Object.entries(TAB_KEYWORDS).forEach(([type,kws])=>{ if(kws.some(kw=>hdrLow.includes(kw))) types.push(type); });
        result.sheetTypes[name]=types;
        types.forEach(t=>{ if(!result.namedTabs[t]) result.namedTabs[t]=name; });
      });
      return result;
    }catch(e){
      return {filename,sheets:{},headers:{},sheetTypes:{},totalRows:0,namedTabs:{},error:e.message};
    }
  }

  /* ── Build structured context per slot ── */
  function _buildStructured(slot,files){
    const ctx={slot,files:[]};
    files.forEach(f=>{
      const p=f.parsed;
      if(!p||p.error){ctx.files.push({name:f.name,error:p.error||'unknown'});return;}
      const entry={name:f.name,sheets:Object.keys(p.sheets),detectedTypes:p.namedTabs};
      if(slot==='features') entry.features=_extractFeatures(p);
      if(slot==='inventory') entry.inventory=_extractInventory(p,f.name);
      if(slot==='sp51')     entry.sp51=_extractSP51(p);
      if(slot==='myisp')    entry.myisp=_extractMyISP(p);
      if(slot==='pricing')  entry.pricing=_extractPricing(p);
      if(slot==='rfp')      entry.rfp=_extractRFP(p);
      ctx.files.push(entry);
    });
    return ctx;
  }

  function _extractFeatures(p){
    const sheetName=p.namedTabs.features||p.namedTabs.requirement||Object.keys(p.sheets)[0];
    const rows=p.sheets[sheetName]||[];
    const hdrs=(rows[0]||[]).map(h=>String(h).toLowerCase());
    const featIdCol=hdrs.findIndex(h=>h.includes('feature')&&(h.includes('id')||h.includes('#')));
    const reqIdCol =hdrs.findIndex(h=>(h.includes('req')||h.includes('requirement'))&&h.includes('id'));
    const techCol  =hdrs.findIndex(h=>h.includes('tech')||h.includes('technology')||h.includes('platform'));
    const descCol  =hdrs.findIndex(h=>h.includes('desc')||h.includes('name')||h.includes('title'));
    const dataRows =rows.slice(1).filter(r=>r.some(c=>String(c).trim()));
    const features =dataRows.map(r=>({
      id:   featIdCol>=0?String(r[featIdCol]).trim():'',
      desc: descCol  >=0?String(r[descCol]).trim():'',
      tech: techCol  >=0?String(r[techCol]).trim():'',
      reqId:reqIdCol >=0?String(r[reqIdCol]).trim():'',
    }));
    return{
      total:features.length,
      java: features.filter(f=>f.tech.toLowerCase().includes('java')).length,
      sf:   features.filter(f=>f.tech.toLowerCase().includes('salesforce')||f.tech.toLowerCase().includes('sf')).length,
      untagged:features.filter(f=>!f.tech.trim()).length,
      featureIds:features.map(f=>f.id).filter(Boolean),
      reqIds:features.map(f=>f.reqId).filter(Boolean),
      rows:features,sheetUsed:sheetName,
    };
  }

  function _extractInventory(p,filename){
    const sheetName=p.namedTabs.inventory||Object.keys(p.sheets)[0];
    const rows=p.sheets[sheetName]||[];
    const hdrs=(rows[0]||[]).map(h=>String(h).toLowerCase());
    const invIdCol =hdrs.findIndex(h=>h.includes('inv')||h.includes('component')||h.includes('asset')||h.includes('id'));
    const featIdCol=hdrs.findIndex(h=>h.includes('feature')&&h.includes('id'));
    const dataRows =rows.slice(1).filter(r=>r.some(c=>String(c).trim()));
    const items=dataRows.map(r=>({
      id:    invIdCol >=0?String(r[invIdCol]).trim():'',
      featId:featIdCol>=0?String(r[featIdCol]).trim():'',
    }));
    const fl=filename.toLowerCase();
    const tech=fl.includes('java')?'Java':fl.includes('salesforce')||fl.includes('sf')?'Salesforce':'E2E';
    const invFeatureIds=new Set(items.map(i=>i.featId).filter(Boolean));
    return{tech,total:items.length,coveredFeatureIds:[...invFeatureIds],rows:items,sheetUsed:sheetName};
  }

  function _extractSP51(p){
    const out={effortTotal:null,priceTotal:null,raci:[],assumptions:[],ratecardRows:[],summaryText:''};
    const effortSheet=p.namedTabs.effort||p.namedTabs.summary||p.namedTabs.price||Object.keys(p.sheets)[0];
    const effortRows=p.sheets[effortSheet]||[];
    out.effortTotal=_findTotal(effortRows,['day','effort','resource']);
    out.priceTotal =_findTotal(effortRows,['price','cost','value']);
    const raciSheet=p.namedTabs.raci;
    if(raciSheet){
      const r=p.sheets[raciSheet]||[];
      const hdrs=(r[0]||[]).map(h=>String(h));
      out.raci=r.slice(1).filter(row=>row.some(c=>String(c).trim()))
        .map(row=>Object.fromEntries(hdrs.map((h,i)=>[h,String(row[i]||'').trim()])));
    }
    const assumSheet=p.namedTabs.assumptions;
    if(assumSheet){
      out.assumptions=(p.sheets[assumSheet]||[]).slice(1)
        .map(r=>r.filter(c=>String(c).trim()).join(' | ')).filter(Boolean);
    }
    const rcSheet=p.namedTabs.ratecard;
    if(rcSheet){
      const r=p.sheets[rcSheet]||[];
      const hdrs=(r[0]||[]).map(h=>String(h));
      out.ratecardRows=r.slice(1).filter(row=>row.some(c=>String(c).trim()))
        .map(row=>Object.fromEntries(hdrs.map((h,i)=>[h,String(row[i]||'').trim()])));
    }
    // summary text: flatten all sheets for doc agent
    const lines=[];
    Object.entries(p.sheets).forEach(([s,rows])=>{
      lines.push(`=== ${s} ===`);
      rows.forEach(r=>{ const l=r.map(c=>String(c).trim()).filter(Boolean).join(' | '); if(l) lines.push(l); });
    });
    out.summaryText=lines.slice(0,200).join('\n');
    return out;
  }

  function _extractMyISP(p){
    const out={effortTotal:null,priceTotal:null,ratecardRows:[],summaryText:''};
    const sumSheet=p.namedTabs.summary||p.namedTabs.effort||Object.keys(p.sheets)[0];
    const sumRows=p.sheets[sumSheet]||[];
    out.effortTotal=_findTotal(sumRows,['day','effort']);
    out.priceTotal =_findTotal(sumRows,['price','cost','value']);
    const rcSheet=p.namedTabs.ratecard;
    if(rcSheet){
      const r=p.sheets[rcSheet]||[];
      const hdrs=(r[0]||[]).map(h=>String(h));
      out.ratecardRows=r.slice(1).filter(row=>row.some(c=>String(c).trim()))
        .map(row=>Object.fromEntries(hdrs.map((h,i)=>[h,String(row[i]||'').trim()])));
    }
    const lines=[];
    Object.entries(p.sheets).forEach(([s,rows])=>{
      lines.push(`=== ${s} ===`);
      rows.forEach(r=>{ const l=r.map(c=>String(c).trim()).filter(Boolean).join(' | '); if(l) lines.push(l); });
    });
    out.summaryText=lines.slice(0,200).join('\n');
    return out;
  }

  function _extractPricing(p){
    const out={effortTotal:null,priceTotal:null,summaryText:''};
    const sumSheet=p.namedTabs.summary||p.namedTabs.price||Object.keys(p.sheets)[0];
    const sumRows=p.sheets[sumSheet]||[];
    out.effortTotal=_findTotal(sumRows,['day','effort']);
    out.priceTotal =_findTotal(sumRows,['price','cost','value']);
    const lines=[];
    Object.entries(p.sheets).forEach(([s,rows])=>{
      lines.push(`=== ${s} ===`);
      rows.forEach(r=>{ const l=r.map(c=>String(c).trim()).filter(Boolean).join(' | '); if(l) lines.push(l); });
    });
    out.summaryText=lines.slice(0,100).join('\n');
    return out;
  }

  function _extractRFP(p){
    const lines=[];
    Object.entries(p.sheets).forEach(([s,rows])=>{
      lines.push(`=== ${s} ===`);
      rows.forEach(r=>{ const l=r.map(c=>String(c).trim()).filter(Boolean).join(' | '); if(l) lines.push(l); });
    });
    return{text:lines.slice(0,300).join('\n')};
  }

  /* ── Cross-reference Features vs Inventory ── */
  function _computeTraceability(){
    const featSlot=STATE.uploadedFiles.features;
    const invSlot =STATE.uploadedFiles.inventory;
    if(!featSlot?.structured?.files?.length) return;
    const featEntry=featSlot.structured.files.find(f=>f.features);
    if(!featEntry?.features) return;
    const allIds=new Set(featEntry.features.featureIds);
    const covered=new Set();
    if(invSlot?.structured?.files){
      invSlot.structured.files.forEach(f=>{
        if(f.inventory?.coveredFeatureIds) f.inventory.coveredFeatureIds.forEach(id=>covered.add(id));
      });
    }
    const uncovered=[...allIds].filter(id=>!covered.has(id));
    const matched  =[...allIds].filter(id=> covered.has(id));
    STATE.extracted.traceability={
      totalFeatures:allIds.size,covered:matched.length,
      uncovered:uncovered.length,uncoveredIds:uncovered,matchedIds:matched,
    };
    if(invSlot?.structured?.files){
      invSlot.structured.files.forEach(f=>{
        if(!f.inventory) return;
        const tech=f.inventory.tech;
        const covSet=new Set(f.inventory.coveredFeatureIds);
        const techFeats=featEntry.features.rows.filter(r=>r.tech.toLowerCase().includes(tech.toLowerCase()));
        const gaps=techFeats.filter(r=>r.id&&!covSet.has(r.id)).length;
        const invRow=STATE.inventory.find(i=>i.tech===tech);
        if(invRow) invRow.gaps=gaps;
      });
    }
    Orchestrator.alog('FileReader',`Traceability: ${matched.length} covered, ${uncovered.length} gaps`,'success');
    App.renderFeatures();
  }

  /* ── Auto-apply extracted data → STATE ── */
  function _autoApplyToState(slot){
    const uf=STATE.uploadedFiles[slot];
    if(!uf?.structured?.files) return;
    uf.structured.files.forEach(f=>{
      if(slot==='features'&&f.features){
        const fx=f.features;
        if(fx.total>0){
          STATE.features.total=fx.total; STATE.features.java=fx.java;
          STATE.features.sf=fx.sf; STATE.features.untagged=fx.untagged;
          STATE.extracted.features=fx; App.renderFeatures();
          Orchestrator.alog('FileReader',`Features: ${fx.total} total — ${fx.java} Java, ${fx.sf} SF, ${fx.untagged} untagged`,'success');
        }
      }
      if(slot==='inventory'&&f.inventory){
        if(!STATE.extracted.inventory) STATE.extracted.inventory={};
        STATE.extracted.inventory[f.inventory.tech]=f.inventory;
        Orchestrator.alog('FileReader',`Inventory (${f.inventory.tech}): ${f.inventory.total} items`,'success');
      }
      if(slot==='sp51'&&f.sp51){
        STATE.extracted.sp51=f.sp51;
        const i=STATE.effort.findIndex(e=>e.src==='SP51');
        if(i>=0){
          if(f.sp51.effortTotal){STATE.effort[i].days=f.sp51.effortTotal;STATE.effort[i].st='ok';}
          if(f.sp51.priceTotal) STATE.price[i].val=_fmtPrice(f.sp51.priceTotal);
        }
        const tabs=[f.sp51.raci.length?'RACI':'',f.sp51.assumptions.length?'Assumptions':'',f.sp51.ratecardRows.length?'RateCard':''].filter(Boolean).join(' ');
        Orchestrator.alog('FileReader',`SP51: effort=${f.sp51.effortTotal||'?'}, price=${f.sp51.priceTotal||'?'} — ${tabs||'no special tabs detected'}`,'success');
        App.renderPricing();
      }
      if(slot==='myisp'&&f.myisp){
        STATE.extracted.myisp=f.myisp;
        const i=STATE.effort.findIndex(e=>e.src==='myISP staffing');
        if(i>=0){
          if(f.myisp.effortTotal){STATE.effort[i].days=f.myisp.effortTotal;STATE.effort[i].st='ok';}
          if(f.myisp.priceTotal) STATE.price[i].val=_fmtPrice(f.myisp.priceTotal);
        }
        Orchestrator.alog('FileReader',`myISP: effort=${f.myisp.effortTotal||'?'}, price=${f.myisp.priceTotal||'?'}`,'success');
        App.renderPricing();
      }
      if(slot==='pricing'&&f.pricing){
        STATE.extracted.pricingSheet=f.pricing;
        const i=STATE.effort.findIndex(e=>e.src==='Pricing sheet');
        if(i>=0){
          if(f.pricing.effortTotal){STATE.effort[i].days=f.pricing.effortTotal;STATE.effort[i].st='ok';}
          if(f.pricing.priceTotal) STATE.price[i].val=_fmtPrice(f.pricing.priceTotal);
        }
        Orchestrator.alog('FileReader',`Pricing: effort=${f.pricing.effortTotal||'?'}, price=${f.pricing.priceTotal||'?'}`,'success');
        App.renderPricing();
      }
      if(slot==='rfp'&&f.rfp){
        STATE.extracted.rfp=f.rfp;
        Orchestrator.alog('FileReader',`RFP loaded — ${f.rfp.text.split('\n').length} lines`,'success');
      }
    });
    if(slot==='features'||slot==='inventory') _computeTraceability();
  }

  function _findTotal(rows,colKeywords){
    if(!rows?.length) return null;
    const hdrs=(rows[0]||[]).map(h=>String(h).toLowerCase());
    const colIdx=hdrs.findIndex(h=>colKeywords.some(kw=>h.includes(kw)));
    const totalRow=rows.slice(1).find(r=>String(r[0]).toLowerCase().includes('total'));
    if(totalRow&&colIdx>=0){
      const n=parseFloat(String(totalRow[colIdx]||'').replace(/[^0-9.]/g,''));
      if(!isNaN(n)&&n>0) return Math.round(n);
    }
    if(colIdx>=0){
      let max=0;
      rows.slice(1).forEach(r=>{ const n=parseFloat(String(r[colIdx]||'').replace(/[^0-9.]/g,'')); if(!isNaN(n)&&n>max) max=n; });
      if(max>0) return Math.round(max);
    }
    return null;
  }
  function _fmtPrice(n){ return n?'£'+Math.round(n).toLocaleString():'—'; }

  function _buildSummary(files){
    return files.map(f=>{
      const p=f.parsed;
      if(!p||p.error) return `${f.name}: parse error`;
      const sheets=Object.keys(p.sheets).map(s=>`${s}[${(p.headers[s]||[]).slice(0,4).join(',')}]`).join(' · ');
      const detected=Object.keys(p.namedTabs).join(',');
      return `${f.name}: ${p.totalRows} rows — ${sheets}${detected?' — detected:'+detected:''}`;
    }).join('\n');
  }

  function _updateDropZoneUI(slot,files){
    const dz=document.getElementById('dz-'+slot);
    if(dz){
      dz.classList.add('has-file');
      dz.innerHTML=`<i class="ti ti-circle-check" style="color:var(--g400);"></i>`+
        `<div class="dz-title" style="color:var(--g600);">${files.length} file${files.length>1?'s':''} loaded</div>`+
        `<div class="dz-sub" style="color:var(--g600);">${files.map(f=>f.name).join(', ')}</div>`;
    }
    if(slot==='inventory'){
      const fl=document.getElementById('fl-inventory');
      if(fl) fl.innerHTML=files.map((f,i)=>
        `<div class="file-item"><i class="ti ti-file-spreadsheet"></i>`+
        `<span class="fi-name">${f.name}</span>`+
        `<span class="fi-size">${(f.size/1024).toFixed(1)} KB</span>`+
        `<button class="fi-rm" onclick="FReader.removeFile('inventory',${i})"><i class="ti ti-x"></i></button></div>`
      ).join('');
    }
    _renderParsedSummaries();
  }

  function _updateFileCountPip(){
    const count=Object.keys(STATE.uploadedFiles).length;
    const pip=document.getElementById('fileCountPip');
    if(!pip) return;
    if(count>0){pip.textContent=count;pip.style.display='';}else pip.style.display='none';
  }

  function _renderParsedSummaries(){
    const container=document.getElementById('parsedSummaries');
    if(!container) return;
    const loaded=Object.keys(STATE.uploadedFiles);
    if(!loaded.length){container.innerHTML='';return;}
    container.innerHTML=`<div class="sec-label" style="margin-top:1.5rem;"><i class="ti ti-eye"></i> Parsed file summaries</div>`+
      loaded.map(slot=>{
        const uf=STATE.uploadedFiles[slot];
        return `<div class="parsed-card">`+
          `<div class="card-hd" style="margin-bottom:.75rem;"><i class="ti ti-file-spreadsheet"></i> ${slot.toUpperCase()}</div>`+
          uf.files.map(f=>{
            const p=f.parsed;
            if(!p||p.error) return `<div class="pc-file">${f.name}: error</div>`;
            const sheetInfo=Object.entries(p.sheetTypes||{}).map(([s,types])=>`${s}${types.length?'['+types.slice(0,2).join(',')+']':''}`).join(' · ');
            const tabs=Object.keys(p.namedTabs||{});
            return `<div style="margin-bottom:8px;">`+
              `<div class="pc-file">${f.name} — ${p.totalRows} rows</div>`+
              `<div class="pc-sheets">Sheets: ${sheetInfo}</div>`+
              (tabs.length?`<div class="pc-cols">Detected tabs: ${tabs.join(', ')}</div>`:'')+'</div>';
          }).join('')+'</div>';
      }).join('');
  }

  function removeFile(slot,idx){
    if(!STATE.uploadedFiles[slot]) return;
    STATE.uploadedFiles[slot].files.splice(idx,1);
    if(!STATE.uploadedFiles[slot].files.length){delete STATE.uploadedFiles[slot];_resetDropZone(slot);}
    else{
      STATE.uploadedFiles[slot].summary=_buildSummary(STATE.uploadedFiles[slot].files);
      STATE.uploadedFiles[slot].structured=_buildStructured(slot,STATE.uploadedFiles[slot].files);
      _updateDropZoneUI(slot,STATE.uploadedFiles[slot].files);
    }
    _updateFileCountPip();
  }

  function _resetDropZone(slot){
    const dz=document.getElementById('dz-'+slot);
    if(!dz) return;
    dz.classList.remove('has-file','drag-over');
    dz.innerHTML=`<i class="ti ti-upload"></i>`+
      `<div class="dz-title">${DROP_LABELS[slot]||'Drop file here'}</div>`+
      `<div class="dz-sub">${DROP_NOTES[slot]||''}</div>`;
  }

  async function processAll(){
    const loaded=Object.keys(STATE.uploadedFiles);
    if(!loaded.length){App.toast('No files uploaded yet','warning');return;}
    App.toast(`Processing ${loaded.length} file group(s)...`,'info');
    Orchestrator.alog('FileReader','Re-extracting structured data from all files','info');
    loaded.forEach(slot=>{
      STATE.uploadedFiles[slot].structured=_buildStructured(slot,STATE.uploadedFiles[slot].files);
      _autoApplyToState(slot);
    });
    Orchestrator.alog('FileReader','All files processed — running all 4 agents','success');
    App.toast('Files processed — running all 4 agents','success');
    App.nav('agents');
    await Orchestrator.runAll();
  }

  function getStructured(slot){ return STATE.uploadedFiles[slot]?.structured||null; }

  return{triggerPick,dzDrag,dzLeave,dzDrop,handlePick,removeFile,processAll,getStructured};

})();
