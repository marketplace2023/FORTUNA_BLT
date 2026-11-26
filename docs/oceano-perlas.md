# Océano de Perlas — marea y secuencia Fibonacci

## Alcance

Sexta entrega de la renovación. Juego de cinco rodillos y cinco filas, 3.125 combinaciones, cascadas y multiplicadores Fibonacci. Arte propio de un santuario submarino con una gran perla, ruinas de nácar y fauna marina. El comodín mantiene su símbolo de sirena del catálogo original.

No se modificaron motor, probabilidades, tiras, pagos, calibración, semillas, `configHash` ni límites. Es una interpretación original, sin afirmar reproducción exacta de un juego de otro proveedor.

El escenario es una ilustración estática. Los sonidos son tonos acuáticos y campanas sintetizados; no se incluye banda sonora grabada. La primera generación del escenario fue rechazada por la herramienta; el arte definitivo es un santuario sin personaje humanoide. El atlas de símbolos se generó correctamente en su primera versión.

## Reglas conservadas

- Símbolos iguales en al menos tres rodillos consecutivos desde la izquierda pagan por combinaciones. El comodín no aparece en el primer rodillo y sustituye salvo al scatter.
- Los ganadores desaparecen y entran nuevos símbolos mientras haya premio.
- Juego base: ×1, ×1, ×2, ×3, ×5, ×8. Los dos primeros escalones son distintos aunque ambos valen ×1: la primera cascada avanza a la segunda perla sin aumentar el multiplicador.
- Tres conchas SCATTER o más al finalizar las cascadas activan 8 giros gratis, más 2 por cada concha extra.
- Bonus: ×2, ×3, ×5, ×8, ×13, ×21 y ×34. La secuencia se reinicia en ×2 al comenzar cada giro gratis.
- Tres conchas o más durante el bonus dan 4 giros adicionales, más 2 por cada concha extra. Máximo de 100 giros por ronda.
- Premio máximo por ronda: 5.000 veces la apuesta, limitado por el servidor.

Cada perla representa un índice de la secuencia. El índice activo sigue el paso del frame del servidor, no una búsqueda por valor; por eso los dos escalones ×1 se muestran correctamente por separado. Las cascadas posteriores al último escalón conservan el multiplicador máximo.

## Implementación y uso

- `public/ocean.html`: página propia en `/play/oceano-perlas`.
- `public/css/ocean.css`: composición submarina, tablero cuadrado, recorrido de perlas y encabezado compacto en pantallas bajas.
- `public/js/ocean.js`: símbolos, estado de cascadas, índice activo y presentación del bonus.
- `public/js/skin-common.js`: rodillos cosméticos, ajuste a pantalla y botón de sonido reutilizados sin cambiar su comportamiento.
- `public/js/game.js`: reproduce los frames y el monedero; carga el módulo de Océano por su identificador.
- La tarjeta de Océano en el lobby usa el escenario nuevo.

Ejecutar `npm start`, abrir `http://localhost:3000/play/oceano-perlas`. Reiniciar un servidor antiguo para cargar la nueva ruta.

## Validación

Ejecutar `node tools/test-koi.mjs oceano-perlas`. El script histórico admite los seis juegos renovados. Requiere Playwright y Microsoft Edge; instalación local de herramienta: `npm install --no-save --package-lock=false playwright`.

El servidor de pruebas usa 4318 y un libro temporal, sin cambiar los saldos reales. Cubre cinco tamaños (320×568, 390×844, 768×1024, 844×390 y 1366×768), pagos, reglas, una ronda real, un único cargo ante doble clic, saldo con precisión de 1/10.000 de crédito y reproducción de ronda.

Seis casos deterministas del motor: pérdida, cascada, cadena de cascadas, premio a ×8, giros gratis y reactivación. En las cadenas se comparan el paso, índice activo, multiplicador y tablero de cada frame. Se comprueba de forma explícita que los pasos 0 y 1 activan perlas distintas y ambos conservan ×1. El caso ×8 incluye un frame ganador del motor. En bonus se comprueba la secuencia completa de siete escalones hasta ×34, sin afirmar que la muestra produzca un premio pagado a ×34.

También se verifican parada automática al activar la función, sonido persistente, movimiento reducido y recuperación después de perder una respuesta ya registrada. Los casos raros se interceptan solo en el navegador de prueba; no hay controles de premios forzados en producción.

Las capturas de inspección están en `output/ocean-qa/`. Se revisan además la carga de los clientes anteriores, la tarjeta nueva en el lobby y la transparencia del atlas. Estas pruebas no sustituyen una validación matemática independiente.

## Arte y prompts

Herramienta integrada `image_gen`, sin API externa:

- `public/assets/ocean/kingdom.png`: santuario submarino definitivo.
- `public/assets/ocean/symbols.png`: atlas transparente de cuatro columnas y tres filas; diez símbolos usados y dos decorativos reservados.

El canal alfa se comprueba por lectura de píxeles; el RGB residual de las zonas transparentes no se dibuja en el juego.

Prompt definitivo del escenario (fondo opaco):

> Use case: stylized-concept. Asset type: original production environment for fantasy slot Oceano de Perlas. Wide landscape 1536x1024. A breathtaking underwater sanctuary, ancient mother-of-pearl palace arches, ivory ruins, luminous turquoise caustic rays entering from the water surface above, gardens of peach coral and sea anemones near the outer corners, a few distant glowing jellyfish. In the RIGHT THIRD a monumental open iridescent clam shell on a carved coral pedestal, cradling one huge radiant pearl, the focal point of the scene. No people or humanoid characters. Refined premium stylized 3D game environment, beautiful elaborate materials, deep blue marine shadows, soft sea-glass cyan, creamy pearl highlights and warm peach accents. The central and LEFT 70 percent is calm low-detail dark blue open water with no foreground objects, reserved for an overlaid square game board. Intricate details limited to top and outer edges, cinematic underwater depth. No text, numbers, logos, interface or board. Original artwork.

Prompt del atlas (fondo transparente):

> Use case: stylized-concept. Asset type: transparent production sprite atlas for original fantasy slot Oceano de Perlas. Landscape 1536x1152, EXACTLY TWELVE separate objects in a perfectly uniform FOUR COLUMN by THREE ROW grid. Each entire object including every fin, tentacle and leaf must fit within the middle 76 percent of its own equal cell, with at least 12 percent genuinely transparent gutter on every side. Center all objects exactly at cell centers. Consistent high-end polished stylized 3D game art, pearlescent materials, soft turquoise reflected water light and warm upper-left highlights, luminous readable silhouettes. Top row left to right: (1) elegant adult mermaid guardian portrait with silver-blue hair, modest pearl collar and turquoise shell-shaped medallion base, (2) open pink and ivory clam shell cradling a glowing white pearl, (3) friendly purple octopus with curled tentacles, (4) beautiful emerald green sea turtle with detailed shell. Middle row left to right: (5) sleek blue dolphin curving upward, (6) glossy coral-red crab with raised claws, (7) vivid orange and turquoise tropical fish, (8) round golden yellow pufferfish with tiny fins. Bottom row left to right: (9) curled coral pink shrimp with antennae entirely inside its cell, (10) ornate aged silver ship anchor with short blue rope, (11) radiant white pearl resting in a small iridescent shell, (12) elegant small turquoise seahorse. No background, real alpha transparency, no colored glow or shadow outside the object silhouettes, no cast shadow, no labels, text, letters, numbers, frames, logos or checkerboard drawing. Exactly twelve isolated original game icons, not emoji.

