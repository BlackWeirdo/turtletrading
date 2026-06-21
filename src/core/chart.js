// Core logic for the CDP chart reader. Every expression below reads the LIVE
// chart engine `window.__chart2` (Lightweight Charts wrapper) inside the
// chart.turtletrading.vn iframe and returns ONLY primitives/plain JSON — the
// engine objects (series/chart) have circular refs and must never be returned.
//
// ⚠️ All selectors are minified internal keys (__chart2 / .active / .inds /
// ._data / ._lastRes / ._mtfDir). They WILL break when the site updates.
// They are intentionally centralized here so patching is a one-file job.
//
// Indicator schema (discovered on a real chart, 2026-06-21):
//   inds[] entry = { id, type, params:{...}, hidden, _ref, _lastRes }
//   The COMPUTED VALUES live in `_lastRes`, whose shape depends on `type`:
//     - regime indicators (trenddet/adxregime/supertrendreg/squeeze/volregime/
//       bullbear/structure/volumereg): { last:"<state>", states:[], regimeSegments:[] }
//       → the current value is `_lastRes.last` (e.g. "up"/"weak"/"bull"/"sideways")
//     - line indicators (ema/sma/...): number[] → current = last finite number
//     - multi-line (macd:{macd,signal,histogram}, rsi:{rsi,ema,wma}): object of number[]
//     - smc: { fvg,ob,pdz,struct,liq,swings } arrays of zone/swing objects
//     - volprofile: { vp:1 } (overlay marker only)
//   `__indValue` below normalises all of these generically (no per-type table)
//   so new/unknown types still surface a useful value instead of nothing.
//   Values are returned RAW (no translation/relabelling) — the caller must not
//   invent semantics the engine did not provide.
import { evalChart } from '../cdp.js';

// JS helper source injected into each evaluated expression. Pulls only
// scalar (string/number/boolean) own-properties from an object — safe, no
// circular refs.
const SCALARS_FN = `function __scalars(o){var r={};if(!o||typeof o!=='object')return r;for(var k in o){try{var v=o[k];var t=typeof v;if(v===null||t==='string'||t==='number'||t==='boolean')r[k]=v;}catch(e){}}return r;}`;

// Value extractor: normalise an indicator's `_lastRes` into a compact, raw
// summary. Handles every observed shape generically (see header comment).
const VAL_FN = `
function __lastNum(a){if(!Array.isArray(a))return null;for(var i=a.length-1;i>=0;i--){var v=a[i];if(typeof v==='number'&&isFinite(v))return v;}return null;}
function __isNumArr(a){return Array.isArray(a)&&a.length>0&&typeof a[a.length-1]==='number';}
function __indValue(lr){
  if(lr===null||lr===undefined)return null;
  var t=typeof lr;
  if(t==='number'||t==='string'||t==='boolean')return {kind:'scalar',value:lr};
  if(Array.isArray(lr)){
    if(__isNumArr(lr))return {kind:'line',value:__lastNum(lr),points:lr.length};
    return {kind:'series',count:lr.length,last:(lr.length?lr[lr.length-1]:null)};
  }
  // regime indicators carry a headline string/number in .last
  if((typeof lr.last==='string'||typeof lr.last==='number')){
    var seg=Array.isArray(lr.regimeSegments)?lr.regimeSegments.length:undefined;
    var o={kind:'regime',value:lr.last};
    if(seg!==undefined)o.segments=seg;
    return o;
  }
  // multi-series / structured object: summarise each named field
  var r={kind:'multi',values:{}};
  for(var k in lr){
    try{
      var v=lr[k];
      if(__isNumArr(v))r.values[k]=__lastNum(v);
      else if(Array.isArray(v))r.values[k]={count:v.length,last:(v.length?v[v.length-1]:null)};
      else if(v===null||typeof v!=='object')r.values[k]=v;
    }catch(e){}
  }
  return r;
}`;

// Map an indicator entry to {id,type,hidden,params,value}. `value` is the
// real computed result from `_lastRes` (null if the engine has not computed
// it yet). `params` come from the entry's own `params` object.
const INDS_MAP_FN = `function __indMap(i,withValues){var m={id:(i&&i.id!=null?i.id:null),type:(i&&(i.type||i.name||i.kind))||null,hidden:!!(i&&i.hidden),params:__scalars(i&&i.params)};if(withValues)m.value=__indValue(i&&i._lastRes);return m;}`;

// Bar accessor: chart bars in `_data` are objects {time,open,high,low,close,
// vol/volume}; older/array shapes [t,o,h,l,c,v] are handled too.
const BAR_FN = `
function __bt(b){return Array.isArray(b)?b[0]:(b.time!=null?b.time:b.t);}
function __bh(b){return Array.isArray(b)?b[2]:(b.high!=null?b.high:b.h);}
function __bl(b){return Array.isArray(b)?b[3]:(b.low!=null?b.low:b.l);}`;

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
    ${SCALARS_FN}${VAL_FN}${INDS_MAP_FN}
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var inds = (c.inds||[]).map(function(i){return __indMap(i,true);});
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
    ${SCALARS_FN}${VAL_FN}${INDS_MAP_FN}
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var inds = (c.inds||[]).map(function(i){return __indMap(i,${!!with_values});});
    return { has_chart:true, count:inds.length, indicators:inds };
  })()`;
  const r = await evalChart(expr);
  if (!r || !r.has_chart) return { has_chart: false, note: 'no active chart' };
  if (!r.count) r.note = 'no indicators currently added on the chart';
  return r;
}

export async function getMarketStructure({ swings = true } = {}) {
  const expr = `(function(){
    ${SCALARS_FN}${BAR_FN}
    var c = window.__chart2 && window.__chart2.active;
    if (!c) return { has_chart:false };
    var data = c._data || [];
    // ATR / noise box overlay
    var atr_box = { cfg: c._ntCfgSig || null, active: !!c._ntData };
    // Multi-timeframe regime direction from the controller, if present
    var ctrl = window.__chart2 || {};
    var mtf = ctrl._mtfDir || null;
    // Swing highs/lows via simple fractal (n=2). Bars are objects
    // {time,open,high,low,close,vol}; __bh/__bl/__bt read either shape.
    var swings = [];
    if (${!!swings} && data.length > 5) {
      var n=2;
      for (var i=n;i<data.length-n;i++){
        var hi=__bh(data[i]), lo=__bl(data[i]), isH=true, isL=true;
        if (hi==null||lo==null) continue;
        for (var k=1;k<=n;k++){
          if (__bh(data[i-k])>=hi||__bh(data[i+k])>=hi) isH=false;
          if (__bl(data[i-k])<=lo||__bl(data[i+k])<=lo) isL=false;
        }
        if (isH) swings.push({ t:__bt(data[i]), type:'high', price:hi });
        else if (isL) swings.push({ t:__bt(data[i]), type:'low', price:lo });
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
