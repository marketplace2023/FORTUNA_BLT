# Noche de Catrinas — festival y multiplicadores dobles

## Alcance

Quinta entrega de la renovación visual. Tablero de seis rodillos y cuatro filas, 4.096 combinaciones posibles, cascadas y multiplicadores que se duplican. La dirección artística es una plaza de Día de Muertos con Catrina, cempasúchil, papel picado y velas, sobre una base de tonos ciruela y luz cálida.

Se conservan el motor matemático, tiras, pesos, pagos, calibración, semillas, `configHash` y límites. No se afirma reproducción exacta de un título de otro proveedor. El personaje del escenario es una ilustración estática; esta entrega no incluye animación esquelética ni banda sonora grabada. El perfil de sonido usa cuerda, percusión y metales sintetizados.

## Reglas conservadas

- Tres o más rodillos consecutivos desde la izquierda con símbolos iguales pagan según las combinaciones. El comodín no aparece en el primer rodillo y sustituye salvo al scatter.
- Los símbolos ganadores desaparecen; los demás caen y entran nuevos.
- Juego base: ×1, ×2, ×4, ×8 y ×16. El valor se reinicia en cada giro.
- Tres velas SCATTER o más al finalizar las cascadas activan 10 giros gratis, más 2 por vela adicional.
- Giros gratis: ×2, ×4, ×8, ×16, ×32 y ×64. El multiplicador vuelve a ×2 en cada giro gratis; no se acumula entre giros.
- Tres velas o más dentro del bonus dan 5 giros adicionales, más 2 por vela extra. Máximo de 100 giros por ronda.
- Premio máximo por ronda: 10.000 veces la apuesta, limitado por el servidor.

El recorrido de velas representa los escalones de las cascadas; no es una función adicional de recolección de scatters. La vela activa y el contador lateral muestran el multiplicador del frame actual.

## Implementación

- `public/catrina.html`: página propia en `/play/noche-catrinas`.
- `public/css/catrina.css`: composición de festival, recorrido vertical de velas en escritorio y horizontal en móvil, y encabezado compacto para pantallas bajas.
- `public/js/catrina.js`: símbolos, progresión, sonidos de ascenso y estados del bonus.
- `public/js/skin-common.js`: rodillos cosméticos, dimensionamiento y botón de sonido reutilizables. Los módulos anteriores conservan sus implementaciones.
- El cliente común reproduce los frames del servidor y el monedero. La animación cosmética no selecciona resultados.
- La tarjeta del lobby usa el nuevo escenario.

Uso: `npm start`, abrir `http://localhost:3000/play/noche-catrinas`. Reiniciar un servidor anterior para cargar la nueva ruta.

## Validación

`node tools/test-koi.mjs noche-catrinas`. El script histórico acepta los cinco juegos renovados. Requiere Playwright y Microsoft Edge; instalación local de herramienta: `npm install --no-save --package-lock=false playwright`.

El servidor de prueba usa 4318 y un libro temporal, sin modificar saldos reales. Se verifican 320×568, 390×844, 768×1024, 844×390 y 1366×768; pagos y reglas; una ronda real, un único cargo ante doble clic, saldo con precisión de 1/10.000 de crédito y reproducción de ronda.

Casos deterministas del motor: pérdida, premio por cascada, cadena de cascadas, premio a ×16, giros gratis y reactivación. Los tableros intermedios de la cadena y el tablero final coinciden con los frames del servidor. Se comprueban progresión, reinicio a ×1, escalera del bonus con el sexto escalón ×64, parada automática al activar la función, sonido persistente, movimiento reducido y recuperación de conexión tras una ronda ya registrada.

El caso ×16 incluye un frame ganador real del motor; la comprobación de ×64 verifica que el escalón se presenta en el bonus, no una muestra de premio pagado a ×64. Las secuencias especiales solo se interceptan dentro del navegador de prueba; no existen controles de premios forzados en producción.

Las capturas de inspección están en `output/catrina-qa/`. Se revisa también la carga de los clientes anteriores y la tarjeta nueva en el lobby. Estas pruebas no sustituyen una validación matemática independiente.

## Arte y prompts

Generado con la herramienta integrada `image_gen`, sin API externa:

- `public/assets/catrina/plaza.png`: escenario y personaje.
- `public/assets/catrina/symbols.png`: atlas transparente de cuatro columnas por tres filas; diez símbolos usados y abanico/sombrero decorativos reservados.

El canal alfa del atlas se comprueba por lectura de píxeles; el RGB residual de las zonas transparentes no se dibuja en el juego.

Prompt del escenario (fondo opaco):

> Use case: stylized-concept. Asset type: original illustrated environment for slot game Noche de Catrinas. Wide landscape 1536x1024. A magical Mexican Dia de Muertos colonial plaza at night, rich dark aubergine and ink-blue architecture, warm candlelight, glowing orange marigold petals, lace-cut papel picado banners overhead, ornate wrought iron arches and distant softly lit stucco buildings. In the LEFT QUARTER, a graceful full-body Catrina woman in an elaborate black plum lace dress, decorated ivory skull face, orange marigold crown, small elegant fan, celebrating rather than frightening. Beautiful expressive stylized 3D character, polished premium animation-film game art, intricate costume. Central and right 70 percent is calm dark plum stone and atmospheric shadows with very low detail for a game board overlay. Marigold bouquets and candles frame the outer lower corners. Refined cinematic lighting, beautiful texture, warm gold-orange highlights, original artwork. No text, numbers, logos, interface, no board, no symbols in the central space. No Egyptian or Asian motifs. Not horror or gore.

Prompt del atlas (fondo transparente):

> Use case: stylized-concept. Asset type: transparent production symbol atlas for original Mexican festival slot Noche de Catrinas. Landscape 1536x1152, EXACTLY twelve individual symbols on a perfectly uniform FOUR COLUMN by THREE ROW grid. Center each object in its cell, keep the ENTIRE silhouette within the middle 76 percent of both cell width and height; at least 12 percent truly transparent padding on ALL sides of EACH cell. No touching or overlap, no glow outside silhouette, real alpha transparent background. Consistent exquisite stylized 3D game art, hand-painted ceramic and lacquer, warm candlelit upper-left highlights, burnt orange, teal enamel, magenta accents and ivory details, bold readable shapes. Top row left to right: (1) ornate friendly ivory sugar skull with floral turquoise and orange face decorations, (2) tall ivory candle with flame in a golden ornate floral candle holder, (3) beautifully decorated small amber acoustic guitar, (4) vivid pink hibiscus blossom with green leaves. Middle row left to right: (5) polished golden trumpet with teal ribbon, (6) appetizing folded taco with green lettuce and tomato filling, (7) green prickly pear nopal cactus with a small pink flower in a terracotta pot, (8) red painted festival drum with cream drumhead and crossed wooden sticks. Bottom row left to right: (9) glossy striped pink and teal wrapped candy, (10) rich orange marigold flower with two small leaves, (11) ivory lace fan decorated with small orange flowers, (12) ornate black sombrero with gold and teal embroidery. No text, labels, letters, numbers, frames or watermark, no checkerboard drawing. Original game icons, not emoji.

