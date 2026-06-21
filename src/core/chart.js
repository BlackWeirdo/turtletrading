// Core logic for the CDP chart reader. Every expression below reads the LIVE
// chart engine `window.__chart2` (Lightweight Charts wrapper) inside the
// chart.turtletrading.vn iframe and returns ONLY primitives/plain JSON — the
// engine objects (series/chart) have circular refs and must never be returned.
//
// ⚠️ All selectors are minified internal keys (__chart2 / .active / .inds /
// ._data / ._ntData / ._mtfDir). They WILL break when the site updates.
// They are intentionally centralized here so patching is a one-file job.
//
// ⚠️ The exact schema of a single `inds[]` entry (param keys, where the
// computed series values live) is NOT yet known — the recon profile had no
// indicators. Until discovery on a real chart with indicators added, we
// extract every scalar own-property generically and flag schema_unknown.
import { evalChart } from '../cdp.js';

// JS helper source injected into each evaluated expression. Pulls only
// scalar (string/number/boolean) own-properties from an object — safe, no
// circular refs.
const SCALARS_FN = `function __scalars(o){var r={};if(!o||typeof o!=='object')return r;for(var k in o){try{var v=o[k];var t=typeof v;if(v===null||t==='string'||t==='number'||t==='boolean')r[k]=v;}catch(e){}}return r;}`;

// Map an indicator entry to {type, params, schema_unknown}. Generic until the
// real inds[] schema is discovered.
const INDS_MAP_FN = `function __indMap(i){var type=i&&(i.type||i.name||i.id||i.kind)||null;var p=__scalars(i);delete p.type;delete p.name;delete p.id;delete p.kind;return {type:type,params:p,schema_unknown:true};}`;

export async function status() {
  const expr = `(function(){
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var data = c._data || [];
    var inds = c.inds || [];
    return { has_chart:true, sym:c.sym, tf:c.tf, src:c.src, last:c.last, indicators:inds.length, bars:data.length };
  })()`;
  const r = await evalChart(expr);
  if (!r || !r.has_chart) return { connected: true, has_chart: false, note: 'CDP connected but no active chart found (__chart2.active missing)' };
  return { connected: true, ...r };
}

export async function getView() {
  const expr = `(function(){
    ${SCALARS_FN}${INDS_MAP_FN}
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var inds = (c.inds||[]).map(__indMap);
    var ov = c.ov || {};
    var overlays = Object.keys(ov);
    return {
      has_chart:true, sym:c.sym, tf:c.tf, src:c.src, last:c.last,
      bars:(c._data||[]).length,
      indicators: inds,
      drawings: (c.drawings||[]).length,
      overlays: overlays,
      ntCfg: c._ntCfgSig || null
    };
  })()`;
  const r = await evalChart(expr);
  if (!r || !r.has_chart) return { has_chart: false, note: 'no active chart (__chart2.active missing)' };
  if (!r.indicators.length) r.note = 'no indicators currently added on the chart';
  return r;
}

export async function getIndicators({ with_values = true } = {}) {
  const expr = `(function(){
    ${SCALARS_FN}${INDS_MAP_FN}
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var inds = (c.inds||[]).map(function(i){
      var m = __indMap(i);
      if (${with_values}) {
        // Best-effort: expose any short numeric array under common keys.
        try {
          var keys=['values','_values','data','_data','series'];
          for (var j=0;j<keys.length;j++){
            var a=i[keys[j]];
            if (Array.isArray(a) && a.length){ m.last_value = a[a.length-1]; break; }
          }
        } catch(e){}
      }
      return m;
    });
    return { has_chart:true, count:inds.length, indicators:inds };
  })()`;
  const r = await evalChart(expr);
  if (!r || !r.has_chart) return { has_chart: false, note: 'no active chart' };
  if (!r.count) r.note = 'no indicators currently added on the chart';
  return r;
}

export async function getMarketStructure({ swings = true } = {}) {
  const expr = `(function(){
    ${SCALARS_FN}
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var data = c._data || [];
    // ATR / noise box overlay
    var atr_box = { cfg: c._ntCfgSig || null, active: !!c._ntData };
    // Multi-timeframe regime direction from the controller, if present
    var ctrl = window.__chart2 || {};
    var mtf = ctrl._mtfDir || null;
    // Swing highs/lows via simple fractal (n=2) on close-ish data [t,o,h,l,c,v]
    var swings = [];
    if (${swings} && data.length > 5) {
      var n=2;
      for (var i=n;i<data.length-n;i++){
        var hi=data[i][2], lo=data[i][3], isH=true, isL=true;
        for (var k=1;k<=n;k++){
          if (data[i-k][2]>=hi||data[i+k][2]>=hi) isH=false;
          if (data[i-k][3]<=lo||data[i+k][3]<=lo) isL=false;
        }
        if (isH) swings.push({ t:data[i][0], type:'high', price:hi });
        else if (isL) swings.push({ t:data[i][0], type:'low', price:lo });
      }
    }
    var recent = swings.slice(-20);
    var resistance = recent.filter(function(s){return s.type==='high';}).map(function(s){return s.price;});
    var support = recent.filter(function(s){return s.type==='low';}).map(function(s){return s.price;});
    return {
      has_chart:true, sym:c.sym, tf:c.tf, last:c.last,
      atr_box: atr_box,
      mtf_regime: mtf,
      swings: recent,
      levels: { support:support, resistance:resistance }
    };
  })()`;
  const r = await evalChart(expr);
  if (!r || !r.has_chart) return { has_chart: false, note: 'no active chart' };
  return r;
}

export async function getOhlcv({ limit = 300 } = {}) {
  const expr = `(function(){
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var data = c._data || [];
    var bars = data.slice(-${Math.max(1, Math.min(2000, limit))});
    // Normalise each bar to [t,o,h,l,c,v] if it's an object.
    var out = bars.map(function(b){
      if (Array.isArray(b)) return b;
      return [b.time||b.t, b.open||b.o, b.high||b.h, b.low||b.l, b.close||b.c, b.volume||b.v];
    });
    return { has_chart:true, sym:c.sym, tf:c.tf, count:out.length, bars:out };
  })()`;
  const r = await evalChart(expr);
  if (!r || !r.has_chart) return { has_chart: false, note: 'no active chart' };
  r.format = '[t,o,h,l,c,v]';
  return r;
}
