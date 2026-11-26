# Dragón de Jade — cascadas y despertar del santuario

## Alcance

Tercera entrega de la renovación de los juegos. A diferencia de Koi Dorado y Frutas Neón, este juego usa el motor `ways`: cinco rodillos y cuatro filas, 1.024 combinaciones posibles, premios desde el primer rodillo y nuevas caídas después de retirar los símbolos ganadores.

La presentación tiene su propio santuario de montaña, arte de jade y porcelana, escalera de multiplicadores, sonidos de cuerda y campana sintetizados, y un cambio de iluminación durante giros gratis. El dragón es una ilustración estática, no una animación esquelética. No se incluye una banda sonora grabada.

No se cambiaron probabilidades, tiras, pagos, calibración, `configHash`, límites ni lógica de resultados del servidor. No se presenta esta versión como una reproducción de un juego específico de un proveedor.

## Reglas conservadas y estados visibles

- Combinaciones de al menos tres rodillos consecutivos desde la izquierda; los comodines sustituyen salvo al scatter y no aparecen en el primer rodillo.
- Los símbolos ganadores desaparecen, sobreviven los demás y entran nuevos desde arriba. El tablero de cada caída procede del frame del servidor.
- El multiplicador del juego base progresa ×1, ×2, ×3, ×4 y ×5. Se reinicia en cada giro.
- Tres o más pagodas en el tablero final de cascadas activan 10 giros gratis, más 2 por cada pagoda extra.
- En giros gratis la escalera es ×2, ×4, ×6, ×8 y ×10; vuelve al primer escalón en cada giro gratis.
- Tres o más pagodas durante el bonus dan 5 giros adicionales, más 2 por pagoda extra; límite de 100 giros por ronda.
- El contador indica el giro actual y total concedido. Al salir del bonus se restablecen la presentación base y la escalera.
- Premio máximo de la ronda: 5.000 veces la apuesta, limitado por el servidor.

## Archivos y uso

`/play/dragon-jade` sirve `public/dragon.html`. El módulo `public/js/dragon.js` controla símbolos, rodillos cosméticos, escalera y estados propios; `public/css/dragon.css` controla la composición. El cliente común conserva la reproducción de cascadas y del monedero.

Arranque: `npm start`, abrir `http://localhost:3000/play/dragon-jade`. Reiniciar un servidor que estuviera ejecutándose antes de incorporar la ruta.

La tarjeta de Dragón en el lobby también usa el arte nuevo. Las otras rutas conservan sus páginas correspondientes.

## Validación

Prueba: `node tools/test-koi.mjs dragon-jade`. El script histórico acepta ahora los tres títulos renovados; usar sin argumento para Koi o con `frutas-neon` para Neón. Requiere Playwright y Microsoft Edge; instalación de la herramienta local: `npm install --no-save --package-lock=false playwright`.

Usa un servidor de prueba en 4318 y un libro temporal, sin modificar los saldos reales. Comprueba cinco tamaños de pantalla, tabla de pagos, reglas, una ronda real, un único cargo ante doble clic, saldo con precisión de 1/10.000 de crédito y reproducción de la ronda.

Los casos deterministas de Dragón cubren pérdida, premio por cascada, cadena de al menos tres cascadas, giros gratis y reactivación de giros. Se comparan los tableros intermedios de la cadena y el tablero final con los frames del servidor; se comprueba la progresión de multiplicadores y la vuelta a ×1. También se revisan juego automático, preferencias de sonido, movimiento reducido y recuperación después de perder una respuesta ya registrada.

Las secuencias especiales se obtienen del motor con semillas fijas y se interceptan solo en el navegador de pruebas; no hay mecanismos para forzar premios en producción. Las capturas de inspección quedan en `output/dragon-qa/`. Las pruebas de cliente no sustituyen una validación matemática independiente.

## Arte y prompts

Generado con la herramienta integrada `image_gen`:

- `public/assets/dragon/sanctuary.png`: escenario.
- `public/assets/dragon/symbols-v2.png`: atlas final de cuatro columnas y tres filas; diez símbolos usados y dos decorativos reservados.
- `public/assets/dragon/symbols.png`: primera versión conservada como fuente de la revisión.

Se verificó la transparencia del atlas final mediante lectura de píxeles del canal alfa; el color RGB residual de las zonas transparentes no se dibuja en el juego.

Prompt del escenario, fondo opaco:

> Use case: stylized-concept. Asset type: production background for original fantasy slot game Dragon de Jade, landscape 1536x1024. An ancient Chinese mountain sanctuary carved from celadon jade and weathered bronze, on the edge of immense waterfalls. A majestic serpentine jade dragon with translucent green scales and delicate gold horns coils around an ornate circular portal in the upper right quadrant, looking toward the center. Dawn sunlight through pale clouds, hanging silk banners, distant misty karst peaks, warm ivory and jade palette, weathered stone steps, gold dust suspended in air. Wide straight-on cinematic composition, elaborate temple framing along outer edges and top, central and lower-middle 70% calm dark moss stone and mist, unobstructed for an overlaid game board. Premium painterly 3D game environment, refined rich materials, luminous magical atmosphere, soft golden morning light, deep detailed foreground. Not a koi pond, not red lantern decor, no fish, no text, no letters, no numbers, no logos, no interface. Original artwork.

Prompt inicial del atlas, fondo transparente:

> Use case: stylized-concept. Asset type: transparent production game sprite atlas for original fantasy slot Dragon de Jade. Landscape 1536x1152, EXACTLY TWELVE isolated symbols arranged on an EXACT 4-column by 3-row uniform grid. Each symbol centered in its equal cell, each entire symbol INCLUDING any leaves or extensions must remain within the middle 76 percent of the cell, with completely transparent 12 percent gutters on all four sides. No touching or overlap between cells, no glow or shadow outside object silhouette, genuine alpha transparency. Consistent premium stylized painterly 3D render, luminous celadon jade, rich glazed porcelain and burnished gold trim, warm top left light, refined readable large silhouettes. Top row left to right: (1) coiled jade-and-gold Chinese dragon medallion, (2) miniature ornate Chinese pagoda with ivory roof and glowing gold entrance, (3) fierce emerald dragon head bust with gold horns, (4) deep cobalt blue porcelain vase with golden rim. Middle row left to right: (5) paired ornate red and ivory traditional festival dolls on one small base, (6) ivory sake carafe with small matching cup and bronze detail, (7) vertical ivory playing card with red floral illustration, (8) red envelope with circular embossed gold ornament. Bottom row left to right: (9) two dark lacquer chopsticks with gold ends crossed on a tiny jade rest, (10) triangular rice ball with textured white rice and a dark seaweed band, (11) round ivory pearl in gold lotus setting, (12) ancient round bronze coin with square hole. No text, labels, letters, numbers, frames, backgrounds, or watermarks. All 12 symbols equally sized, original fantasy game artwork, not emoji.

Prompt de revisión del atlas, fondo transparente:

> Background extraction and sprite atlas cleanup. Remove the entire brown/green blurred background from this image, replacing it with genuine alpha transparency. Keep EXACTLY the same twelve objects and their order in a uniform FOUR COLUMN by THREE ROW atlas. Each cell must contain ONE isolated object with completely transparent padding on all four sides. Scale each object down to fit in the middle 76% of its cell width and height (at least 12% transparent padding on all sides), center each at exact cell centers. Preserve each object's detailed illustration, materials, colors and silhouette. Remove background inside gaps too, especially dragon medallion, pagoda, chopsticks and handles. No background tint, no checkerboard graphic, no shadow backplates, no rectangular tiles, no new objects. Real transparent PNG, not an image of transparency.

