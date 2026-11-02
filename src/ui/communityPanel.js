import { fetchCommunityStickers, fetchCommunityTexts, fetchTags, submitSticker, publicImageUrl } from '../lib/community.js';
import { recolorThumb } from '../lib/recolor.js';
import { brandColors } from '../engine/fontSets.js';
import { icon } from './icons.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function menuRow({ title, hint }, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'menu-row leaf';
  b.innerHTML = '<span class="menu-ic"></span><span class="menu-text"><strong></strong><small></small></span><span class="menu-go"></span>';
  b.querySelector('strong').textContent = title;
  b.querySelector('small').textContent = hint;
  b.addEventListener('click', onClick);
  return b;
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('es-ES'); } catch { return ''; }
}

function renderTexts(container, { onPick }) {
  container.innerHTML = '';
  const wrap = el('div', 'menu-list');
  wrap.appendChild(el('p', 'hint', 'Cargando…'));
  container.appendChild(wrap);
  fetchCommunityTexts().then((items) => {
    wrap.innerHTML = '';
    if (!items.length) { wrap.appendChild(el('p', 'hint', 'Todavía no hay textos guardados. Desde el editor de un texto, toca "Añadir a la comunidad".')); return; }
    items.forEach((item) => wrap.appendChild(menuRow({ title: item.text_content, hint: formatDate(item.created_at) }, () => onPick(item.text_content))));
  }).catch(() => {
    wrap.innerHTML = '';
    wrap.appendChild(el('p', 'hint', 'No se ha podido cargar la lista. Comprueba tu conexión.'));
  });
}

function renderStickers(container, { onPick }) {
  let activeTag = null;
  let view = 'grid';
  let stickers = [];
  let tags = [];

  async function load() {
    [stickers, tags] = await Promise.all([fetchCommunityStickers(activeTag), fetchTags()]);
    paint();
  }

  function buildUploadForm() {
    const g = el('div', 'prop-group');
    g.appendChild(el('p', 'hint', 'Sube un dibujo plano, de un solo color y con fondo transparente, para que se recoloree bien (PNG).'));

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png';
    g.appendChild(fileInput);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Nombre (opcional)';
    nameInput.style.cssText = 'width:100%;margin-top:10px';
    g.appendChild(nameInput);

    const selected = new Set();
    const tagWrap = el('div', 'toggle-row wrap');
    tagWrap.style.marginTop = '10px';
    function paintTags() {
      tagWrap.innerHTML = '';
      tags.forEach((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t;
        if (selected.has(t)) b.classList.add('active');
        b.addEventListener('click', () => { selected.has(t) ? selected.delete(t) : selected.add(t); paintTags(); });
        tagWrap.appendChild(b);
      });
    }
    paintTags();
    g.appendChild(tagWrap);

    const newTag = document.createElement('input');
    newTag.type = 'text';
    newTag.placeholder = 'Nueva etiqueta… (Enter para añadirla)';
    newTag.style.cssText = 'width:100%;margin-top:8px';
    newTag.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !newTag.value.trim()) return;
      e.preventDefault();
      const t = newTag.value.trim();
      if (!tags.includes(t)) tags.push(t);
      selected.add(t);
      newTag.value = '';
      paintTags();
    });
    g.appendChild(newTag);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn';
    submitBtn.style.cssText = 'width:100%;margin-top:14px';
    submitBtn.textContent = 'Publicar';
    submitBtn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) { alert('Elige un archivo PNG.'); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Publicando…';
      try {
        await submitSticker(file, nameInput.value.trim(), [...selected]);
        alert('Publicado, ya lo puede ver todo el mundo.');
        view = 'grid';
        await load();
      } catch (err) {
        console.error('Error publicando sticker de comunidad', err);
        alert('No se ha podido publicar. Comprueba tu conexión e inténtalo de nuevo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publicar';
      }
    });
    g.appendChild(submitBtn);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn small';
    cancel.style.cssText = 'width:100%;margin-top:8px';
    cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', () => { view = 'grid'; paint(); });
    g.appendChild(cancel);

    return g;
  }

  function paint() {
    container.innerHTML = '';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'btn';
    upBtn.style.cssText = 'width:100%;margin-bottom:14px';
    upBtn.innerHTML = `${icon('upload', 20)} Subir el tuyo`;
    upBtn.addEventListener('click', () => { view = 'upload'; paint(); });
    container.appendChild(upBtn);

    if (view === 'upload') { container.appendChild(buildUploadForm()); return; }

    if (tags.length) {
      const chips = el('div', 'toggle-row wrap');
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.textContent = 'Todas';
      if (!activeTag) allBtn.classList.add('active');
      allBtn.addEventListener('click', () => { activeTag = null; load(); });
      chips.appendChild(allBtn);
      tags.forEach((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t;
        if (activeTag === t) b.classList.add('active');
        b.addEventListener('click', () => { activeTag = t; load(); });
        chips.appendChild(b);
      });
      container.appendChild(chips);
    }

    if (!stickers.length) {
      container.appendChild(el('p', 'hint', 'Todavía no hay stickers con esta etiqueta.'));
      return;
    }

    const grid = el('div', 'gallery-grid');
    stickers.forEach((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gallery-item';
      const img = document.createElement('img');
      const src = publicImageUrl(item.image_path);
      img.src = src;
      img.alt = item.name || 'Sticker de la comunidad';
      if (item.brand_recolor !== false) {
        recolorThumb(src, brandColors()[0].hex, 300).then((url) => { img.src = url; }).catch(() => {});
      }
      const label = document.createElement('span');
      label.textContent = item.name || formatDate(item.created_at);
      b.appendChild(img);
      b.appendChild(label);
      b.addEventListener('click', () => onPick(item));
      grid.appendChild(b);
    });
    container.appendChild(grid);
  }

  container.innerHTML = '';
  container.appendChild(el('p', 'hint', 'Cargando…'));
  load().catch(() => { container.innerHTML = ''; container.appendChild(el('p', 'hint', 'No se ha podido cargar la lista. Comprueba tu conexión.')); });
}

// kind: 'stickers' | 'texts'
export function renderCommunitySection(container, { kind, onPickSticker, onPickText }) {
  if (kind === 'texts') renderTexts(container, { onPick: onPickText });
  else renderStickers(container, { onPick: onPickSticker });
}
