# Frutas Neón — recreativa y rodillos salvajes

## Alcance

Segunda entrega de la renovación visual, elegida por su función distinta del respin de Koi Dorado. La mecánica ya existente transforma uno, dos o tres rodillos completos en comodines. La presentación ahora muestra primero el giro, después una descarga por columna y finalmente las líneas premiadas. No se añadieron funciones nuevas al motor ni se cambiaron pesos, tiras, pagos, calibración, `configHash`, límite de premio ni condición de pantalla completa ×5.

Arte original: recreativa nocturna, metal cromado, cristal oscuro, acentos coral y hielo, símbolos 3D de frutas y estrella WILD. Sonido sintetizado de arpegios y barrido electrónico. No contiene banda sonora grabada.

## Implementación

- `/play/frutas-neon` sirve `public/neon.html`, con estilos independientes en `public/css/neon.css`.
- `public/js/neon.js` proporciona símbolos, rodillos cosméticos, estados de descarga e indicadores de las columnas transformadas.
- El cliente común carga el módulo de presentación según el juego. Koi conserva su propio módulo y tema.
- La transformación actualiza tanto el símbolo visible como el símbolo interno de cada celda; el tablero final corresponde al frame recibido del servidor.
- El movimiento reducido acorta la animación y desactiva los efectos CSS repetidos.
- La tarjeta de Frutas Neón en el lobby muestra el nuevo arte.
- En orientación horizontal de poca altura se permite desplazar para mantener accesibles los controles.

## Uso y comprobaciones

Ejecutar `npm start` y abrir `http://localhost:3000/play/frutas-neon`. Reiniciar un servidor antiguo para que cargue la nueva ruta.

Pruebas: `node tools/test-koi.mjs frutas-neon` para Neón y `node tools/test-koi.mjs` para Koi. Requiere Playwright y Microsoft Edge; instalación local de la herramienta: `npm install --no-save --package-lock=false playwright`. El nombre histórico del script se conserva; su argumento selecciona el juego.

El script usa un servidor en 4318 con un libro temporal, nunca los saldos de `data/`. Cubre cinco tamaños, pagos, reglas, una ronda real, doble clic, saldo y reproducción, pérdidas y premios, transformación de 1/2/3 rodillos (Neón), respin y pantalla completa (Koi), coincidencia de todos los símbolos con el último frame, juego automático, sonido persistente, movimiento reducido y recuperación ante fallos o pérdida de respuesta después de registrar la ronda. Los casos raros son resultados del motor con semillas fijas interceptados solo en el navegador de prueba. No hay controles de premios forzados en producción.

Capturas para inspección: `output/neon-qa/`. Estas pruebas de cliente no sustituyen una validación matemática independiente.

## Recursos y prompts

Herramienta integrada `image_gen`, sin API externa ni recursos de terceros:

- `public/assets/neon/arcade.png`: escenario de recreativa.
- `public/assets/neon/symbols-v2.png`: atlas transparente de nueve símbolos, siete usados en el juego.
- El atlas final incorpora una revisión para separar los símbolos dentro de sus celdas.

Prompt del escenario (fondo opaco):

> Use case: stylized-concept. Asset type: original production background for a neon fruit slot arcade game, landscape 1536x1024. A cinematic night arcade interior with a monumental art-deco chrome slot cabinet, electric coral red and ice blue illuminated tubes, smoked black glass and brushed gunmetal, subtle hazy light shafts, a few retro arcade machines softly out of focus near outer edges, wet dark floor reflections. The central 70 percent is EMPTY near-black smoked glass space for a game board overlay. Top header and bottom corners have precise illuminated chrome trim, a tiny disco ball high in the background. Sophisticated retro-futurist arcade mood, realistic physically rendered materials, restrained colored glow, deep charcoal and red dominant with blue secondary accents. Straight-on symmetrical camera, no perspective skew of the central empty area. No text, no letters, no numbers, no logos, no fruits, no UI, no buttons. NOT purple gradients, NOT cartoon, NOT casino photograph. High-end original game environment.

Prompt inicial de símbolos (fondo transparente):

> Use case: stylized-concept. Asset type: transparent production sprite atlas for original game Frutas Neon. A perfectly square image with EXACTLY NINE individual glossy 3D slot symbols in an exact uniform 3 by 3 grid. Each symbol centered within its one-third square, no clipping, separated with at least 12 percent empty transparent padding within each cell. Actual transparent background. Matching premium stylized 3D product rendering, luminous detailed candy resin surfaces, white studio highlights, subtle coral red rim light on left and cyan rim light on right, readable bold silhouettes. Top row left to right: (1) a thick five-pointed glowing chrome star with red luminous inset and no text, (2) a faceted brilliant cyan diamond gem, (3) a highly polished golden classic bell. Middle row left to right: (4) juicy triangular watermelon wedge with shiny green rind, (5) bunch of glossy deep violet grapes with fresh leaf, (6) bright yellow whole lemon with small leaf. Bottom row left to right: (7) pair of vibrant red cherries joined by green stems, (8) round ruby red casino token with silver rim and blank center, (9) three-dimensional silver lightning bolt with cyan illuminated edge. All objects consistently sized, no objects touching across cells, no floor, no cast shadows beyond object, no labels, no numbers, no text, no logos. Original game sprites, not emoji, not flat illustrations.

Edición de separación del atlas (fondo transparente, conservando diseños):

> Edit this production sprite atlas ONLY to fix spacing and cell isolation. Preserve the nine exact objects, order, designs, materials, and colors. The output is a square transparent PNG with a perfectly uniform 3x3 grid. Each individual object INCLUDING its leaves and glow must fit entirely within the middle 76% width and 76% height of its own one-third cell, leaving a completely transparent gutter of at least 12% on all four sides of EVERY cell. Reduce each object's size inside its own cell as needed. All nine objects centered at exact grid cell centers. Remove colored glow outside the object edges and any stray pixels in gutters. No fragments from neighboring symbols, no clipping. Keep everything else unchanged. No text or frames. Genuine transparent background.

