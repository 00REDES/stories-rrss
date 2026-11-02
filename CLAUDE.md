# Stories RRSS — notas para Claude

Responde en castellano, con lenguaje sencillo: el usuario no es programador.

App web (PWA) para hacer stories y stickers de Instagram con la identidad de CJS, OES y AJT sin Photoshop.
Publicada en GitHub Pages: https://cjsocialista00.github.io/stories-rrss/ (repo CJSocialista00/stories-rrss,
rama main). Actualizar = commit + `git push` **solo cuando el usuario lo pida**.

- Probar en local: `python devserver.py` (puerto 5500, también desde el móvil por la IP de la red).
- Archivos clave: `src/main.js`, `src/engine/stageRenderer.js`, `src/engine/fontSets.js` (tipografías y
  paletas por marca), `src/templates/` (plantillas, ubicación, logo AJT), `src/ui/` (interfaz).
- Colores: CJS rojo #f54949, negro #282929, blanco. OES #ff4331, #ffffff, #000000, turquesa #1adcc8.
  AJT según su manual: rojo #ff002c, crema #f3f3e8, negro #000000.
- En los stickers de ubicación NO hay color libre: solo los colores de la marca activa.
- Interfaz sencilla: paneles únicos, sin controles redundantes, sin emojis ni degradados («plana de taller»).
- Si dice que va lento: comprobar primero que se reinició el servidor y se recargó la página.

## Comunidad (stickers y textos compartidos)

Sección del menú "Comunidad" (`src/ui/communityPanel.js`, `src/lib/community.js`): cualquier comité puede
subir un sticker (se recolorea igual que los oficiales) o guardar un texto, sin login, publicación
inmediata y sin aprobación previa. El usuario modera después a mano desde el panel de Supabase (borra la
fila y, si procede, el archivo del Storage).

- Backend: proyecto Supabase **APP STORIES** (`https://rxppxgfbziqfqeowrppj.supabase.co`, región eu-west-3,
  free tier). La clave usada en el cliente es la **`anon` clásica** (JWT, pestaña "Legacy" de API Keys) —
  las claves nuevas `sb_publishable_...` de este proyecto dan 401 en `/rest/v1`, no sirven aquí.
- Tablas: `community_items` (stickers y textos, columna `type`) y `community_tags` (etiquetas, sembrada con
  "Consignas" de fábrica). RLS activo: `anon` solo puede insertar con `status='visible'` y leer lo visible;
  sin update/delete desde el cliente.
- Storage: bucket `community` (público en lectura, **sin límite de tamaño de archivo**, política de insert
  para `anon`). Se quitó a propósito el límite inicial de 300 KB: un PNG en color de buena calidad supera
  fácilmente ese tope, y no hay paso de conversión/reducción en el cliente (decisión del usuario, 2026-11-02).
  Los borrados de Storage no se pueden hacer por SQL (`protect_delete()` lo impide): se borran desde
  Storage → Files en el panel, no con `delete from storage.objects`.
