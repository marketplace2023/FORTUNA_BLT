# Faraón Dorado — caídas y poder solar

## Alcance

Cuarta entrega de la renovación. Usa el motor existente de pagos en cualquier posición: tablero de 6 columnas y 5 filas, premios con 8 o más símbolos iguales, caídas y soles multiplicadores. Es una interpretación original de temática egipcia, sin afirmar reproducción exacta de un título de otro proveedor.

Escenario original de templo solar con pirámides, oro y lapislázuli; atlas de símbolos propios; sonido sintetizado con percusión grave y parciales metálicos. El escenario y la corona son ilustraciones estáticas. Esta versión no incluye una banda sonora grabada.

Se conservaron probabilidades, tiras, tabla de pagos, calibración, semillas, `configHash`, límite de premio y lógica matemática.

## Reglas y presentación

- Nueve símbolos pagan según tramos de 8–9, 10–11 y 12 o más apariciones en cualquier posición.
- Los ganadores desaparecen y entran nuevos símbolos hasta que no hay más premios.
- Los soles no pagan por sí mismos. Al finalizar las caídas, si existe premio, sus valores se suman y multiplican la ganancia del giro.
- Los valores individuales son ×2 a ×50 en juego base y ×2 a ×100 en giros gratis. El acumulador global puede superar ×100.
- Cuatro o más urnas en el tablero final de caídas activan 10 giros gratis. Tres o más durante el bonus conceden 5 adicionales, con un máximo de 100 giros por ronda.
- En giros gratis solo se añaden soles al acumulador cuando ese giro tiene premio. El valor acumulado se conserva entre giros y se aplica también a un giro ganador sin soles nuevos.
- La interfaz distingue valores visibles, traslado al contador y valor aplicado. Un sol sin premio deja el contador sin activar.
- Premio máximo por ronda: 5.000 veces la apuesta, limitado por el servidor.

## Archivos

- `public/pharaoh.html`: página propia en `/play/faraon-dorado`.
- `public/css/pharaoh.css`: composición egipcia para escritorio y móvil; encabezado compacto en pantallas bajas.
- `public/js/pharaoh.js`: símbolos, rodillos cosméticos, contador solar y traslado visual de soles.
- `public/js/game.js`: mantiene la reproducción de caídas y resultados; invoca callbacks opcionales de presentación en cada frame y antes de aplicar multiplicadores.
- `public/js/sound.js`: perfil sonoro propio.
- `public/js/lobby.js`: tarjeta ilustrada de Faraón.

El cliente no selecciona resultados. El contador se actualiza al mostrar los frames y al completar el traslado visual, a partir de los valores ya resueltos por el servidor.

Arranque: `npm start`, abrir `http://localhost:3000/play/faraon-dorado`. Un servidor antiguo requiere reinicio para cargar la ruta nueva.

## Validación

Ejecutar `node tools/test-koi.mjs faraon-dorado`. El script histórico acepta ahora cuatro títulos renovados. Requiere Playwright y Microsoft Edge; instalación local de herramienta: `npm install --no-save --package-lock=false playwright`.

El servidor de prueba usa el puerto 4318 y un libro temporal, sin modificar los saldos reales. Se comprueban 320×568, 390×844, 768×1024, 844×390 y 1366×768; reglas y pagos; una ronda real, un único cargo ante doble clic, saldo con precisión de 1/10.000 de crédito y reproducción de ronda.

Ocho casos deterministas del motor: pérdida, soles sin premio, premio, cadena de caídas, suma de varios soles, giros gratis, uso del acumulador sin soles nuevos y reactivación. Se compara cada tablero intermedio de la cadena y el tablero final con los frames del servidor. Se verifica que el acumulador del bonus no disminuya, coincida con los valores aplicados y se reinicie al terminar. También se revisan juego automático, sonido persistente, movimiento reducido y recuperación de conexión después de una ronda ya registrada.

Las secuencias especiales se interceptan solo en el navegador de prueba. No existen controles de premios forzados en producción. Las capturas están en `output/pharaoh-qa/`. Se comprueba además la carga de los juegos anteriores y del cliente antiguo de pagos en cualquier posición. Estas pruebas no sustituyen una validación matemática independiente.

## Arte y prompts

Herramienta integrada `image_gen`, sin API externa:

- `public/assets/pharaoh/temple.png`: escenario de templo solar.
- `public/assets/pharaoh/symbols.png`: atlas transparente de cuatro columnas por tres filas; once símbolos usados y un escarabajo decorativo reservado.

Se verificó el canal alfa del atlas mediante lectura de píxeles; el color RGB residual de las zonas transparentes no se dibuja en el juego.

Prompt del escenario (fondo opaco):

> Use case: stylized-concept. Asset type: original production environment for fantasy slot game Faraon Dorado. Wide landscape 1536x1024. A monumental ancient Egyptian solar temple opening onto the Sahara at blue hour, colossal gilded pharaoh bust at the far upper left, tall carved sandstone columns and turquoise inlays framing the outer edges, winged golden sun disk above the central entrance, immense pyramids silhouetted through desert haze. Deep lapis blue evening sky, warm amber fire bowls and dusty light rays, burnished gold and sandstone, dramatic cinematic depth, premium richly illustrated 3D game art with physically believable materials. Central and lower middle 70 percent is uncluttered dark blue temple stone for game UI overlay; ornate details stay near edges and top. Epic and majestic, original artwork. No text, letters, numbers, logos, interfaces or symbols covering the central area. Not an Asian temple, no dragons, no fish, no neon arcade.

Prompt del atlas (fondo transparente):

> Use case: stylized-concept. Asset type: production transparent symbol atlas for original Egyptian fantasy slot Faraon Dorado. Landscape 1536x1152, exactly TWELVE isolated premium 3D symbols in a perfectly regular FOUR COLUMN by THREE ROW grid. Each object including all protrusions must fit within the central 76 percent width and height of its own equal cell; at least 12 percent truly transparent padding on every side. Center each object exactly in its cell. Real alpha transparent background, no background color, no cast shadow beyond object silhouette, no glow in gutters. Cohesive highly polished game-art render, hand-crafted gold, lapis enamel and faceted jewels, warm upper-left highlights, bold readable shapes. Top row left to right: (1) ornate Egyptian canopic urn with falcon lid, turquoise enamel and gold wings, (2) circular radiant gold sun disk with empty dark lapis center, (3) gold and blue striped pharaoh crown with small cobra on forehead, (4) small dignified seated camel statuette carved from sandstone with gold saddle. Middle row left to right: (5) sleek seated black Egyptian cat statuette with gold collar and earrings, (6) golden scorpion with curled tail and turquoise accents, (7) large clear white brilliant diamond, (8) amber orange faceted rhombus jewel in thin gold bezel. Bottom row left to right: (9) vivid sapphire blue faceted diamond-shaped jewel, (10) violet amethyst heart-shaped faceted jewel, (11) emerald green heart-shaped faceted jewel, (12) golden winged scarab with turquoise shell. No text, letters, numbers, labels, frames or watermarks. No checkerboard drawing. Exactly 12 separated original game symbols, not emoji.

