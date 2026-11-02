// Cliente ligero (fetch directo a la API REST/Storage de Supabase) para la
// sección «Comunidad»: stickers y textos que cualquier comité puede subir.
// Se publica al instante (sin aprobación); el usuario modera después a mano
// desde el panel de Supabase. La clave de abajo es pública por diseño (va
// protegida por las políticas RLS del proyecto, no por secreto).

const SUPABASE_URL = 'https://rxppxgfbziqfqeowrppj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cHB4Z2ZiemlxZnFlb3dycHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NzcyNzYsImV4cCI6MjEwOTA1MzI3Nn0.0XXYg-Robm6IpKa6rs5rnqBn-snnKm5CxM00Q2vxSUc';
const REST = `${SUPABASE_URL}/rest/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

const CACHE_KEY = 'rrss_community_cache_v1';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(patch) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), ...patch, updatedAt: Date.now() })); } catch { /* sin espacio: se sigue solo en memoria */ }
}

async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function publicImageUrl(path) {
  return `${STORAGE}/object/public/community/${path}`;
}

// Lista de stickers visibles, más recientes primero; si se pide una etiqueta,
// filtra por ella. Sin red, devuelve la última lista conocida (cache local).
export async function fetchCommunityStickers(tag) {
  const filter = tag ? `&tags=cs.{${encodeURIComponent(tag)}}` : '';
  try {
    const rows = await getJSON(`${REST}/community_items?type=eq.sticker&status=eq.visible&order=created_at.desc${filter}`);
    if (!tag) writeCache({ stickers: rows });
    return rows;
  } catch {
    return (readCache().stickers || []).filter((r) => !tag || (r.tags || []).includes(tag));
  }
}

export async function fetchCommunityTexts() {
  try {
    const rows = await getJSON(`${REST}/community_items?type=eq.texto&status=eq.visible&order=created_at.desc`);
    writeCache({ texts: rows });
    return rows;
  } catch {
    return readCache().texts || [];
  }
}

export async function fetchTags() {
  try {
    const rows = await getJSON(`${REST}/community_tags?select=name&order=name.asc`);
    const names = rows.map((r) => r.name);
    writeCache({ tags: names });
    return names;
  } catch {
    return readCache().tags || ['Consignas'];
  }
}

function newFileName() {
  const id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  return `${id}.png`;
}

export async function submitSticker(file, name, tags = []) {
  const path = newFileName();
  const up = await fetch(`${STORAGE}/object/community/${path}`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': file.type || 'image/png' },
    body: file,
  });
  if (!up.ok) throw new Error('No se pudo subir la imagen');

  const row = { type: 'sticker', name: name || null, image_path: path, brand_recolor: true, tags, status: 'visible' };
  const ins = await fetch(`${REST}/community_items`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!ins.ok) throw new Error('No se pudo publicar el sticker');

  // etiquetas nuevas: se añaden a la lista compartida para que aparezcan en
  // el buscador y el desplegable la próxima vez (duplicados se ignoran)
  await Promise.all(tags.map((t) => fetch(`${REST}/community_tags`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ name: t }),
  }).catch(() => {})));
}

export async function submitText(text) {
  const row = { type: 'texto', text_content: text, status: 'visible' };
  const ins = await fetch(`${REST}/community_items`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!ins.ok) throw new Error('No se pudo publicar el texto');
}
