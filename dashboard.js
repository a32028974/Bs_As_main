// ===========================
//   CONFIG APIs
// ===========================
const API_CAJA  = 'https://script.google.com/macros/s/AKfycbygfUukDj6EaUcvoBpgnltC0ba2Mj4CuqUMRpHsLrF_483jTHbis3ARUSsomGS2u36xhA/exec';
const API_STOCK = 'https://script.google.com/macros/s/AKfycbxtrNeXKm41RjLD8eVByCHsiXd3cqH6SLkE7Cpoop8KYKq6Ly-WPJtzM8-SEUMptlsbrw/exec';

// San Miguel (aprox) para Open-Meteo
const LAT = -34.54;
const LON = -58.71;

// ===========================
//   HELPERS DOM / FECHA
// ===========================
const $ = (s) => document.querySelector(s);

function formatFechaLarga(d) {
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}

function formatFechaCorta(d) {
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

function toDateFromSheet(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  if (typeof s === 'number') {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  const str = String(s).trim();
  // dd/mm/aa o dd/mm/aaaa
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const yy = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    return new Date(yy, mo, d);
  }
  // ISO
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const yy = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    return new Date(yy, mo, d);
  }
  const d2 = new Date(str);
  return isNaN(d2) ? null : d2;
}

// ===========================
//   RELOJ
// ===========================
function initClock() {
  const chipFecha = $('#chipFecha');
  const chipHora  = $('#chipHora');
  const clockTime = $('#clockTime');
  const clockDate = $('#clockDate');

  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    clockTime.textContent = `${hh}:${mm}:${ss}`;
    chipHora.textContent  = `${hh}:${mm}`;

    const fechaLarga = formatFechaLarga(now);
    const fechaCorta = now.toLocaleDateString('es-AR');
    clockDate.textContent = fechaLarga;
    chipFecha.textContent = fechaCorta;
  }

  tick();
  setInterval(tick, 1000);
}

// ===========================
//   CLIMA (Open-Meteo)
// ===========================
function weatherCodeToText(code) {
  const c = Number(code);
  if (c === 0) return 'Cielo despejado';
  if ([1,2,3].includes(c)) return 'Algo nublado';
  if ([45,48].includes(c)) return 'Neblina / niebla';
  if ([51,53,55,56,57].includes(c)) return 'Llovizna';
  if ([61,63,65,66,67,80,81,82].includes(c)) return 'Lluvia';
  if ([71,73,75,77,85,86].includes(c)) return 'Nieve';
  if ([95,96,99].includes(c)) return 'Tormenta';
  return 'Condición variable';
}

async function loadWeather() {
  const boxTemp   = $('#weatherTemp');
  const boxDesc   = $('#weatherDesc');
  const feel      = $('#weatherFeel');
  const wind      = $('#weatherWind');
  const statusTag = $('#weatherStatus');
  const updated   = $('#weatherUpdated');

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&timezone=America%2FArgentina%2FBuenos_Aires`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const js  = await res.json();
    const cw  = js.current_weather;

    if (!cw) throw new Error('Respuesta sin current_weather');

    const temp = Math.round(cw.temperature);
    const desc = weatherCodeToText(cw.weathercode);

    boxTemp.textContent = `${temp}°`;
    boxDesc.textContent = desc;
    feel.textContent    = `Sensación: ${temp}° (aprox.)`;
    wind.textContent    = `Viento: ${Math.round(cw.windspeed)} km/h`;
    statusTag.textContent = 'OK clima';
    statusTag.classList.remove('tag-soft');
    statusTag.classList.add('tag-green');

    const now = new Date();
    updated.textContent = `Actualizado ${now.toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'})}`;
  } catch (err) {
    console.error('Weather error', err);
    boxTemp.textContent = '--°';
    boxDesc.textContent = 'No se pudo obtener el clima';
    feel.textContent    = 'Sensación: —';
    wind.textContent    = 'Viento: —';
    statusTag.textContent = 'Sin conexión';
    statusTag.classList.remove('tag-green');
    updated.textContent = '—';
  }
}

// ===========================
//   CAJA – ÚLTIMA VENTA
// ===========================
async function loadUltimaVenta() {
  const descEl = $('#ultimaVentaDesc');
  const empEl  = $('#ultimaVentaEmp');
  const fdpEl  = $('#ultimaVentaFdp');
  const horaEl = $('#ultimaVentaHora');

  try {
    const res = await fetch(`${API_CAJA}?action=ultimas&n=1`, { cache: 'no-store' });
    const js  = await res.json();
    if (!js.ok || !js.data || !js.data.length) {
      descEl.textContent = 'Todavía no hay ventas registradas.';
      empEl.textContent  = '—';
      fdpEl.textContent  = '—';
      horaEl.textContent = '—';
      return;
    }
    const v = js.data[0];
    descEl.textContent = v.desc || '(Sin descripción)';
    empEl.textContent  = v.emp  || '—';
    fdpEl.textContent  = v.fdp  || '—';
    horaEl.textContent = v.hora ? `Hoy · ${v.hora}` : '—';
  } catch (err) {
    console.error('Ultima venta error', err);
    descEl.textContent = 'Error cargando la última venta.';
    empEl.textContent  = '—';
    fdpEl.textContent  = '—';
    horaEl.textContent = '—';
  }
}

// ===========================
//   STOCK – ULTIMO AGREGADO / VENDIDO / MARCA TOP
// ===========================

const MAP_HEADERS = {
  'N ANTEOJO': 'n_anteojo',
  'N° ANTEOJO': 'n_anteojo',
  'NUMERO': 'n_anteojo',
  'N ANTEOJOS': 'n_anteojo',
  'MARCA': 'marca',
  'MODELO': 'modelo',
  'COLOR': 'color',
  'ARMAZON': 'armazon',
  'ARMAZÓN': 'armazon',
  'FAMILIA': 'familia',
  'CRISTAL': 'cristal_color',
  'CRISTAL / COLOR': 'cristal_color',
  'COLOR CRISTAL': 'cristal_color',
  'CALIBRE': 'calibre',
  'PRECIO PUBLICO': 'precio',
  'PRECIO PÚBLICO': 'precio',
  'PRECIO PUBLICO (LISTA)': 'precio',
  'FECHA INGRESO': 'fecha_ingreso',
  'INGRESO': 'fecha_ingreso',
  'FECHA DE VENTA': 'fecha_venta',
  'VENTA': 'fecha_venta',
  'VENDEDOR': 'vendedor',
  'CODIGO DE BARRAS': 'codigo_barras',
  'CÓDIGO DE BARRAS': 'codigo_barras',
  'OBSERVACIONES': 'observaciones',
  'FABRICA': 'fabrica',
  'FÁBRICA': 'fabrica'
};

function normHeader(h) {
  return String(h || '')
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function mapStockJson(json) {
  let rows = [];
  if (json && Array.isArray(json.rows)) {
    const headers = (json.headers || []).map(h => String(h || '').trim());
    const dynamicMap = {};
    headers.forEach(h => {
      const k = normHeader(h);
      if (MAP_HEADERS[k]) dynamicMap[h] = MAP_HEADERS[k];
    });

    rows = json.rows.map(r => {
      const rec = (r && typeof r === 'object' && !Array.isArray(r)) ? r
        : (Array.isArray(r) ? Object.fromEntries(headers.map((h, i) => [h, r[i]])) : {});
      const o = {};
      for (const h of Object.keys(rec)) {
        const key = dynamicMap[h] || MAP_HEADERS[normHeader(h)];
        if (key) o[key] = rec[h];
      }
      return o;
    });
  } else if (Array.isArray(json)) {
    rows = json;
  }
  return rows;
}

async function loadStockHighlights() {
  const numUlt    = $('#ultimoStockNumero');
  const detUlt    = $('#ultimoStockDetalle');
  const famUlt    = $('#ultimoStockFamilia');
  const fechaUlt  = $('#ultimoStockFecha');

  const numVend   = $('#ultimoVendNumero');
  const detVend   = $('#ultimoVendDetalle');
  const vendVend  = $('#ultimoVendVendedor');
  const fechaVend = $('#ultimoVendFecha');
  const stockRes  = $('#stockResumen');

  const marcaNom  = $('#marcaTopNombre');
  const marcaCant = $('#marcaTopCantidad');
  const marcaUpd  = $('#marcaUpdated');

  try {
    const res = await fetch(`${API_STOCK}?todos=true`, { method: 'GET' });
    const json = await res.json();
    let rows = mapStockJson(json);

    // Filtramos cosas muy vacías
    rows = rows.filter(r => (r.n_anteojo || r.marca || r.modelo));

    if (!rows.length) {
      numUlt.textContent = '—';
      detUlt.textContent = 'Sin datos de stock';
      famUlt.textContent = '—';
      fechaUlt.textContent = '—';

      numVend.textContent = '—';
      detVend.textContent = '—';
      vendVend.textContent = '—';
      fechaVend.textContent = '—';
      stockRes.textContent = '—';

      marcaNom.textContent = '—';
      marcaCant.textContent = '—';
      marcaUpd.textContent = '—';
      return;
    }

    // 1) Último agregado (por fecha_ingreso, y si empata, por número)
    let ultimoAgregado = null;
    for (const r of rows) {
      const d = toDateFromSheet(r.fecha_ingreso);
      if (!ultimoAgregado) {
        ultimoAgregado = { row: r, date: d, num: Number(r.n_anteojo) || 0 };
        continue;
      }
      const curDate = d ? d.getTime() : 0;
      const bestDate = ultimoAgregado.date ? ultimoAgregado.date.getTime() : 0;
      if (curDate > bestDate || (curDate === bestDate && (Number(r.n_anteojo) || 0) > ultimoAgregado.num)) {
        ultimoAgregado = { row: r, date: d, num: Number(r.n_anteojo) || 0 };
      }
    }

    if (ultimoAgregado) {
      const r = ultimoAgregado.row;
      numUlt.textContent = r.n_anteojo || '—';
      detUlt.textContent = `${r.marca || ''} ${r.modelo || ''}`.trim() || '(sin detalle)';
      famUlt.textContent = (r.familia || '—').toUpperCase();
      fechaUlt.textContent = ultimoAgregado.date ? formatFechaCorta(ultimoAgregado.date) : 'Fecha no cargada';
    }

    // 2) Último vendido (fecha_venta)
    let ultimoVend = null;
    for (const r of rows) {
      if (!r.fecha_venta) continue;
      const d = toDateFromSheet(r.fecha_venta);
      if (!ultimoVend) {
        ultimoVend = { row: r, date: d };
        continue;
      }
      const curDate = d ? d.getTime() : 0;
      const bestDate = ultimoVend.date ? ultimoVend.date.getTime() : 0;
      if (curDate > bestDate) {
        ultimoVend = { row: r, date: d };
      }
    }

    if (ultimoVend) {
      const r = ultimoVend.row;
      numVend.textContent = r.n_anteojo || '—';
      detVend.textContent = `${r.marca || ''} ${r.modelo || ''}`.trim() || '(sin detalle)';
      vendVend.textContent = r.vendedor || '—';
      fechaVend.textContent = ultimoVend.date ? formatFechaCorta(ultimoVend.date) : 'Fecha no cargada';
      stockRes.textContent = 'Vendido';
    } else {
      numVend.textContent = '—';
      detVend.textContent = 'Todavía no hay ventas registradas desde este stock.';
      vendVend.textContent = '—';
      fechaVend.textContent = '—';
      stockRes.textContent = 'Sin ventas';
    }

    // 3) Marca más presente en stock (sin fecha_venta)
    const conteo = new Map();
    for (const r of rows) {
      if (r.fecha_venta) continue;  // solo disponibles
      const m = (r.marca || 'Sin marca').toString().trim();
      conteo.set(m, (conteo.get(m) || 0) + 1);
    }

    let topMarca = null;
    let topCant  = 0;
    conteo.forEach((cant, marca) => {
      if (cant > topCant) {
        topCant  = cant;
        topMarca = marca;
      }
    });

    if (topMarca) {
      marcaNom.textContent = topMarca;
      marcaCant.textContent = `${topCant} anteojo${topCant !== 1 ? 's' : ''}`;
      const ahora = new Date();
      marcaUpd.textContent = `Actualizado ${ahora.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`;
    } else {
      marcaNom.textContent = '—';
      marcaCant.textContent = 'Sin stock disponible';
      marcaUpd.textContent = '—';
    }

  } catch (err) {
    console.error('Stock highlights error', err);
    $('#ultimoStockNumero').textContent  = '—';
    $('#ultimoStockDetalle').textContent = 'Error al leer el stock';
    $('#ultimoStockFamilia').textContent = '—';
    $('#ultimoStockFecha').textContent   = '—';

    $('#ultimoVendNumero').textContent   = '—';
    $('#ultimoVendDetalle').textContent  = '—';
    $('#ultimoVendVendedor').textContent = '—';
    $('#ultimoVendFecha').textContent    = '—';
    $('#stockResumen').textContent       = '—';

    $('#marcaTopNombre').textContent     = '—';
    $('#marcaTopCantidad').textContent   = '—';
    $('#marcaUpdated').textContent       = '—';
  }
}

// ===========================
//   INIT
// ===========================
function init() {
  initClock();
  loadWeather();
  loadUltimaVenta();
  loadStockHighlights();

  // refrescar clima cada 15 min aprox
  setInterval(loadWeather, 15 * 60 * 1000);
  // refrescar venta / stock cada 5 min
  setInterval(loadUltimaVenta, 5 * 60 * 1000);
  setInterval(loadStockHighlights, 5 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
