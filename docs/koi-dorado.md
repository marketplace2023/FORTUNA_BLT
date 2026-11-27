# Koi Dorado — primera versión de producción visual

## Referencia y alcance

Referencia pública consultada el 26 de noviembre de 2026:

- [Fortune Tiger, ficha oficial](https://www.pgsoft.com/en/games/110/).
- [Descripción oficial de reglas y presentación](https://www.pgsoft.com/en/news/88/).
- [Información de juego publicada por PG Soft](https://www.pgsoft.com/uploads/Games/Pdf/Fortune_Tiger_Gameinformation_EN.pdf).

La noticia oficial describe tres rodillos, tres filas, respins con retención de símbolos, música y personaje propios, y un x10 cuando todos los símbolos participan en un premio. La ficha dinámica no expuso una demo reproducible mediante el acceso disponible. El PDF excedió el límite del lector web. No se ha medido el ritmo de la demo ni se ha recuperado la matemática privada del proveedor.

El objetivo de esta versión es una interpretación original: estanque de jade, koi dorado, arte ilustrado propio, rodillos con parada escalonada, retención visible, premios y sonidos pentatónicos sintetizados. El personaje del escenario es una ilustración estática; esta versión no incluye animación esquelética del personaje ni una banda sonora grabada.

Koi Dorado usa cinco rodillos de tres filas. Las cinco líneas fijas recorren los cinco rodillos: tres horizontales y dos zigzags. Se pagan cinco símbolos compatibles de izquierda a derecha. La función `respinLock` permite hasta 20 respins, y el premio se multiplica por 10 cuando las 15 casillas contienen un mismo símbolo o comodines. El servidor identifica la matemática de cada ronda con su `configHash`.

## Implementación

- `/play/koi-dorado` sirve `public/koi.html`; las otras nueve rutas siguen usando `public/play.html`.
- `public/js/koi.js` proporciona símbolos, rodillos cosméticos y estados propios. Sus secuencias visuales no deciden resultados.
- `public/js/game.js` conserva el contrato de la API y la reproducción de los frames del servidor. Se añadió reconciliación de saldo tras una respuesta perdida y protección de teclado contra repetición o activación sobre controles enfocados.
- `public/css/koi.css` centra los cinco rodillos en un gabinete de tragamonedas con los medidores y los controles debajo. La orientación vertical usa el arte original. La horizontal usa el estanque panorámico y, con poca altura, reúne los medidores y los controles en una fila.
- `public/js/sound.js` añade timbres de cuerda y campana para Koi. Los demás juegos conservan sus sonidos.
- La tarjeta de Koi en el lobby usa la ilustración nueva.

## Pruebas

Arranque normal: `npm start`, abrir `http://localhost:3000/play/koi-dorado`. Si el servidor estaba abierto antes del cambio, reiniciarlo para cargar la nueva ruta.

Prueba reproducible: instalar Playwright como herramienta local (`npm install --no-save --package-lock=false playwright`) y ejecutar `node tools/test-koi.mjs`. Requiere Microsoft Edge. El script arranca un servidor de prueba en 4318 con un libro mayor temporal que elimina al terminar. No modifica `data/` ni las hojas PAR.

Se comprueban 320×568, 390×844, 768×1024, 844×390, 1024×768, 1366×768 y 1920×927. La prueba verifica el tamaño y centrado del tablero, la posición de los controles y la alineación de las líneas de pago con los símbolos. También cubre la tabla de pagos, las reglas, la carga de recursos, una ronda real, el doble clic, el saldo, la reproducción de ronda, pérdida, premio, respin, pantalla llena, parada automática en función, movimiento reducido, sonido persistente, fallo HTTP, pérdida de respuesta después de registrar la ronda y regresión de Panda. Las secuencias raras se obtienen del motor con semillas fijas y se interceptan solo dentro del navegador de prueba, sin rutas ni controles para forzar premios en producción.

Las capturas de inspección se guardan en `output/koi-qa/`. Las pruebas de interfaz no equivalen a calibración ni certificación matemática.

## Arte y prompts

Generado con la herramienta integrada `image_gen`, sin API ni recursos de terceros. Archivos usados por el proyecto:

- `public/assets/koi/scene.png`: escena ilustrada, 1024×1536.
- `public/assets/koi/scene-arcade.webp`: escena panorámica para el gabinete horizontal, 1672×941.
- `public/assets/koi/symbols.png`: atlas transparente de nueve símbolos; los primeros siete se usan en el tablero y tabla de pagos. Los dos restantes quedan reservados.

Prompt de escena (`transparent_background: false`):

> Use case: stylized-concept. Asset type: production illustrated background for original mobile slot game Koi Dorado, portrait 1024x1536. A lavish moonlit jade koi pond in an ancient Chinese garden, painterly high-end 3D animated film game art, ornate dark carved wood and gold pavilion arch framing the outer edges, warm lanterns upper corners, teal water and lotus blossoms bottom corners, fine gold dust in air, rich emerald shadows and luminous warm golden highlights. A magnificent friendly golden koi with flowing silk fins leaping in the UPPER THIRD, fully visible, curling around a luminous pearl, facing viewer slightly left. Central and lower-middle area is calm dark teal water with no detailed objects because a game board will overlay it. Depth, luxurious materials, intricate gold ornamentation at edges, cinematic lighting. No UI, no text, no numbers, no logos, no watermark. Original artwork, not a copy of any existing game.

Prompt de símbolos (`transparent_background: true`):

> Use case: stylized-concept. Production sprite atlas for original slot game Koi Dorado. Square 1536x1536 PNG with genuine transparent background. EXACTLY NINE separated game symbols arranged in a perfectly regular 3 by 3 grid, each centered in its equal square cell with generous transparent padding, no touching across cells. Consistent premium polished 3D game illustration, rich gilded bevels, soft cinematic light from upper left, saturated jade, coral and gold. No text, labels, numbers, frames or shadows outside each object. Top row left to right: (1) majestic curling golden koi fish with flowing amber fins, (2) vermilion red lucky envelope with embossed circular gold ornament, (3) ornate glowing red silk lantern with golden tassel. Middle row: (4) plump drawstring gold silk money pouch with coins, (5) glossy mandarin orange with two dark green leaves, (6) cluster of three jade bamboo stalks with leaves. Bottom row: (7) delicate pink-and-ivory lotus-shaped pastry on small jade saucer, (8) radiant pearl set into an ornate gold lotus ornament, (9) round ancient golden coin with square hole. All 9 icons equally sized and consistently lit, detailed readable silhouettes on transparency. Original game artwork, not emoji, not flat vector.

Prompt de la escena panorámica (`transparent_background: false`):

> Use case: stylized-concept. Create a NEW original wide panoramic landscape background illustration for Koi Dorado, an arcade slot set in a moonlit jade koi pond. Landscape 16:9 composition. The central 60% is mostly low-contrast deep jade water and atmospheric mist because a separate large playable reel cabinet will cover it. Design the outer edges to read independently: in the LEFTMOST 20%, a luminous golden orange koi fish curves vertically, leaping above water with flowing fins, a small pearl near its mouth and a warm hanging lantern overhead. Fit the complete fish body inside the left fifth of the image with clear dark negative space between it and the center. On the RIGHTMOST 20%, a traditional lakeside pavilion with amber lights, a small distant waterfall, and deep coral flowering branches. Gold and coral lotus blossoms in both lower corners. Subtle amber reflections on dark jade ripples, decorated dark wood pillars and very delicate gilding at the far edges. Premium stylized 3D video game key art, rich and detailed at the sides, atmospheric emerald shadows, warm gold highlights. Edge-to-edge illustration with no text, numbers, interface, slots, panels, divisions, or logos. One continuous environment.
