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
- Columna `brand` en `community_items` (texto, nullable): al subir un sticker se guarda ahí la marca activa
  (`cjs`/`oes`/`ajt`), porque cada marca usa tipografías distintas y un sticker pensado para una no siempre
  cuadra en otra. Por defecto la galería solo muestra los de tu marca + los que no tienen marca (`brand IS
  NULL`, "valen para todas"); el botón "Mostrar todos" en `communityPanel.js` quita ese filtro. No hay forma
  de marcar un sticker como "vale para todas" al subirlo (se decidió no complicar el formulario); si hace
  falta, se cambia a mano en Supabase poniendo `brand = NULL` en esa fila.

## Sombra, degradado y margen de stickers

- **Sombra difusa** (opcional, en textos, logos y stickers): `src/engine/shadow.js` (valores y capas que la
  reciben) y `src/ui/shadowControls.js` (interruptor + opacidad/difuminado/distancia). En los stickers rápidos el
  lienzo crece lo justo para que la sombra no se corte (`applyShadowMargin` en `main.js`; `shadowBase` mide la
  sombra sobre el sticker, no sobre el lienzo ampliado). Las fotos de las stories no llevan sombra.
- **Degradado de legibilidad** (negro → transparente, 9:16): plantilla «Degradado de legibilidad» en la
  pantalla de inicio «Fondos». `src/engine/gradient.js` (tramo, opacidad, lado, puntos), `src/templates/gradient.js`,
  `src/ui/gradientPanel.js`. Descarga PNG transparente 1080×1920 (`degradado_9x16_*.png`).
- **Margen transparente en stickers** (Instagram pintaba fondo blanco en algunos móviles, p. ej. Huelga
  General → 11N): `src/lib/pad.js`. Todos los stickers se descargan con un 6 % de margen por lado y centrados
  en un lienzo cuadrado (lado máximo 4000 px por el límite de canvas de iOS). Regla del usuario: todo lo que se
  descarga con transparencia es un sticker (logos incluidos). Solo el fondo vertical, que es opaco, lleva
  `noPad: true` en `gallery.js` y se descarga tal cual.

## Fondos de la comunidad

Inicio → «Fondos»: el degradado de legibilidad va SIEMPRE el primero (orden pedido por el usuario), después
«Fondos de la comunidad» (lista) y «Subir un fondo» (abre directamente el formulario). También está en
Comunidad → «Fondos de la comunidad». Código: `renderBackgrounds` en `communityPanel.js`, `fetchCommunityBackgrounds` /
`submitBackground` en `community.js`. Se guardan en `community_items` con `type = 'fondo'` (`brand_recolor = false`,
sin marca ni etiquetas) y en el mismo bucket `community`. Se abren con el visor de galería y se descargan tal cual
(`noPad: true`, no son stickers). **Pendiente de comprobar en Supabase**: si `type` tiene una restricción (CHECK)
que solo admite `sticker`/`texto`, hay que añadir `fondo`; la subida no se probó para no publicar nada de prueba.

