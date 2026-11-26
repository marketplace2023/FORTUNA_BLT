# Panda Zen — jardín de los nueve sellos

## Alcance

Décima entrega de la renovación: jardín de bambú original, panda ilustrado, tablero de piedra marfil, jade y controles verdes. La función existente de respins tiene un mapa de nueve posiciones que refleja los símbolos bloqueados, el número de respin y el símbolo elegido. El escenario es estático; rodillos, entrada de símbolos, bloqueos y premios tienen animación.

Se conservaron motor, probabilidades, tiras, pagos, calibración, semillas, `configHash` y límites. Panda Zen pertenece a la misma familia de líneas y respins que Koi Dorado; esta entrega no inventa una mecánica matemática distinta ni reproduce un juego privado de otro proveedor.

## Reglas conservadas

- Tablero 3×3 con cinco líneas. Tres símbolos compatibles de izquierda a derecha pagan; el panda es comodín.
- Una pantalla llena con un mismo símbolo y comodines multiplica el premio de las líneas por diez.
- El respin se activa al azar. El servidor elige un símbolo y solo pueden aparecer ese símbolo, pandas comodín o casillas vacías.
- Los símbolos que caen quedan bloqueados. Solo se renuevan las casillas vacías; la función termina cuando no aparece ningún símbolo nuevo, se llena el tablero o se alcanza el límite de 20 respins.
- Se paga el tablero final. El mapa de nueve posiciones representa el bloqueo actual, sin añadir premios por colección.
- Premio máximo de la ronda: 2.500 veces la apuesta, limitado por el servidor.

## Implementación

- `public/panda.html`: página dedicada en `/play/panda-zen`.
- `public/css/panda.css`: jardín, tablero, estados de bloqueo, mapa y composiciones para móvil y escritorio.
- `public/js/panda.js`: atlas, rodillos cosméticos y presentación de cada frame de respin.
- `public/js/game.js`: registro del cliente y callback opcional para presentar el frame después de actualizar los símbolos bloqueados. Panda deja un breve tiempo de lectura antes de continuar.
- `public/js/sound.js`: sonidos suaves de bambú y campanillas sintetizados con Web Audio; sin banda sonora grabada.
- La tarjeta del lobby utiliza el escenario nuevo y elimina los emojis de portada.

Uso: `npm start`, abrir `http://localhost:3000/play/panda-zen`. Un servidor anterior necesita reiniciarse para cargar la ruta.

## Validación

`node tools/test-koi.mjs panda-zen`. El script histórico admite los diez clientes ilustrados. Usa Playwright y Microsoft Edge con servidor en 4318 y libro temporal, sin modificar saldos reales.

Se revisan 320×568, 390×844, 768×1024, 844×390 y 1366×768, además de 1440×1000. Se comprueban carga de arte, pagos, reglas, una ronda real, cargo único ante doble clic, saldo y reproducción verificable. Los casos deterministas del motor incluyen pérdida, premio, respin y pantalla llena ×10.

Cada frame del respin se compara con el tablero del servidor, número de respin, cantidad de casillas bloqueadas y mapa. Se comprueban premio final, salida del estado de bloqueo, detención del juego automático en una función, sonido persistente, movimiento reducido, recuperación ante errores y reconciliación del saldo tras una respuesta perdida con la ronda ya registrada.

Las secuencias raras se interceptan únicamente en el navegador de prueba; no hay controles de premios forzados en producción. Capturas en `output/panda-qa/`. También se revisan Koi Dorado y las diez rutas ilustradas, las diez tarjetas del lobby y la transparencia real del atlas. Estas pruebas no sustituyen una validación matemática independiente.

## Arte y prompts

Herramienta integrada `image_gen`, sin CLI ni API externa:

- `public/assets/panda/garden.png`: escenario original opaco.
- `public/assets/panda/symbols.png`: atlas transparente de tres columnas y tres filas; siete símbolos activos y dos motivos decorativos reservados. Las casillas vacías no dibujan un símbolo.

Prompt del escenario:

> Use case: stylized-concept. Original premium game environment Panda Zen. Landscape 1536x1024. A serene bamboo garden at dawn, misty jade-green mountains, warm ivory stone terrace, paper lanterns and elegant pale wood pavilion beams. At the far LEFT a beautiful friendly adult giant panda with realistic soft fur sits calmly on a mossy stone, holding a bamboo sprig, no clothes. Central and RIGHT seventy percent quiet low-detail mist and shaded jade stone to accommodate an overlaid game board. Painterly polished 3D fantasy game art, exquisite bamboo, stone and fur, soft morning shafts, sage, ivory, muted persimmon and dark jade palette. Refined peaceful atmosphere. No text, letters, logos, numbers, board or interface. Original composition.

Prompt del atlas (fondo transparente):

> Use case: stylized-concept. Transparent production symbol atlas for original game Panda Zen. EXACT uniform THREE COLUMN by THREE ROW grid, nine isolated original icons centered exactly in their equal-sized cells. Every silhouette inside central 76 percent width and height, genuinely transparent padding at all edges, no overlap or glow. Landscape 1536x1024. Cohesive polished painterly 3D game art, soft top-left light, tactile ceramics, jade and food, bold readable silhouettes. Row one left to right: (1) adorable adult giant panda head with fluffy white fur and black ears, calm green bamboo leaves behind, (2) large luminous faceted pale green jade gemstone on a tiny carved dark jade base, (3) elegant three-cut-bamboo and pine arrangement tied with muted persimmon cord. Row two left to right: (4) small bamboo steamer holding three plump steamed dumplings, (5) ivory ceramic cup of green matcha tea on a sage saucer, (6) translucent pale blue glass wind chime with dark jade rim and a short ivory paper tassel. Row three left to right: (7) skewer of three pastel pink white green dango dumplings, (8) single beautiful ivory lotus blossom with sage leaves, (9) small smooth stacked dark river pebbles with a tiny bamboo leaf. No text, labels, letters, numbers, frames, logos, background or checkerboard drawing. True alpha transparency. Exactly nine icons, not emoji.
