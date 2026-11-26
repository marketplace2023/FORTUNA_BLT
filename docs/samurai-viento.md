# Samurái del Viento — cascadas breves y viento de sakura

## Alcance

Séptima entrega de la renovación. Tablero de cinco rodillos y tres filas, 243 combinaciones, cascadas y un ritmo más breve que los juegos anteriores. Dirección artística de Japón otoñal: armadura, tinta, niebla, acero, papel marfil y rojo.

Se conservan motor matemático, probabilidades, tiras, pagos, calibración, semillas, `configHash` y límites. No se afirma reproducción exacta de un título de otro proveedor.

El escenario y el personaje son ilustraciones estáticas. El sonido usa percusión, cuerda y ruido de viento sintetizados, sin banda sonora grabada. El ruido aleatorio del audio es cosmético y no interviene en resultados ni saldos.

## Reglas conservadas

- Símbolos iguales en al menos tres rodillos consecutivos desde la izquierda pagan por combinaciones. El comodín torii no aparece en el primer rodillo y sustituye salvo al scatter.
- Los símbolos ganadores desaparecen y entran nuevos mientras haya premio.
- Juego base: ×1, ×2, ×3; los siguientes pasos mantienen ×3. El valor vuelve a ×1 en cada giro.
- Tres sakuras SCATTER o más al finalizar las cascadas activan 10 giros gratis, más 2 por sakura adicional.
- Bonus: ×3, ×6, ×9 y ×12; los siguientes pasos mantienen ×12. Cada giro gratis vuelve a empezar en ×3.
- Tres sakuras o más dentro del bonus dan 5 giros adicionales, más 2 por sakura extra. Máximo de 100 giros por ronda.
- Premio máximo de la ronda: 3.000 veces la apuesta, limitado por el servidor.

## Presentación y tiempos

`public/samurai.html` sirve la ruta `/play/samurai-viento`, con `public/css/samurai.css` y `public/js/samurai.js`. La tarjeta del lobby utiliza el escenario nuevo.

La presentación de Samurái declara ajustes opcionales: pausa cosmética inicial de 220 ms, revelación por rodillo de 230 ms con separación de 90 ms, y pausa de premios de 620 ms en modo normal. Turbo y movimiento reducido siguen aplicándose. La duración total de una ronda depende también de la respuesta del servidor y del número de cascadas o giros gratis.

El cliente común mantiene sus valores por defecto para los demás juegos: revelación de 330 ms, separación de 170 ms y pausa de premios de 950 ms. El helper compartido mantiene una pausa inicial de 380 ms salvo que el módulo pida otra. Estos ajustes cambian la presentación, no los resultados.

## Uso y validación

Ejecutar `npm start`, abrir `http://localhost:3000/play/samurai-viento`. Reiniciar un servidor antiguo para cargar la nueva ruta.

Prueba: `node tools/test-koi.mjs samurai-viento`. El script histórico admite los siete juegos renovados. Requiere Playwright y Microsoft Edge; instalación local de herramienta: `npm install --no-save --package-lock=false playwright`.

El servidor de prueba utiliza 4318 y un libro temporal, sin modificar saldos reales. Se revisan 320×568, 390×844, 768×1024, 844×390 y 1366×768, pagos, reglas, una ronda real, un único cargo ante doble clic, saldo con precisión de 1/10.000 de crédito y reproducción de la ronda.

Se mide la duración efectiva de las primeras quince animaciones de revelación en modo normal, verificando los 230 ms. Casos deterministas del motor: pérdida, cascada, cadena, giros gratis, reactivación y premio ganador real a ×12. Se comparan los tableros intermedios y finales con los frames del servidor y se verifica que el frame a ×12 se presente con su multiplicador correcto. Se comprueban ambas secuencias, vuelta a ×1, parada automática en bonus, preferencias de sonido, movimiento reducido y recuperación de conexión después de una ronda registrada.

Las secuencias raras se interceptan solo en el navegador de prueba; no hay controles de premios forzados en producción. Se revisa también que los clientes anteriores carguen y mantengan sus tiempos por defecto. Las capturas de inspección quedan en `output/samurai-qa/`. Estas pruebas no sustituyen una validación matemática independiente.

## Arte y prompts

Herramienta integrada `image_gen`, sin API externa:

- `public/assets/samurai/pass.png`: paso de montaña y samurái.
- `public/assets/samurai/symbols.png`: atlas transparente de cuatro columnas por tres filas; diez símbolos usados y casco/hoja decorativos reservados.

El canal alfa se comprueba por lectura de píxeles; el RGB residual de las zonas transparentes no se dibuja en el juego.

Prompt del escenario (fondo opaco):

> Use case: stylized-concept. Asset type: original production environment for Japanese fantasy slot Samurai del Viento. Wide landscape 1536x1024. A cinematic Japanese mountain pass in autumn, weathered pale stone torii gate and a quiet distant castle, silver morning mist, wind-blown crimson maple leaves, charcoal rocks, warm ivory sky with a muted red sun. At FAR LEFT an adult armored samurai stands calmly in profile facing the landscape, face partly concealed by a traditional helmet, elegant black lacquer armor and deep red fabric, hands resting on a sheathed sword. Peaceful poised atmosphere, no combat or injuries. Refined premium painterly 3D game art blended with subtle sumi-e ink textures, incredible material detail. Central and RIGHT 70 percent is a low-detail charcoal mist and pale stone courtyard, reserved for overlaid game UI. Architectural details frame top and outer edges, restrained palette of black ink, ivory, weathered steel and crimson. No text, letters, numbers, logos, board or interface. Original artwork, not a named character.

Prompt del atlas (fondo transparente):

> Use case: stylized-concept. Asset type: transparent production sprite atlas for original Japanese slot Samurai del Viento. Landscape 1536x1152. EXACTLY twelve isolated objects in a uniform FOUR COLUMN by THREE ROW grid. Entire object silhouettes must stay inside the middle 76 percent of their own cell width and height, with genuinely transparent padding at least 12 percent on all four sides. Center each object at exact cell center. No objects touching, no glow or cast shadow outside silhouettes. Real alpha transparency. Consistent premium hand-crafted stylized 3D game icons, detailed lacquer, porcelain, silk and brushed metal, clean strong silhouettes, soft upper-left lighting, restrained crimson, ivory, charcoal and sage. Top row left to right: (1) ornate small vermilion Japanese torii gate, (2) cluster of three delicate pink sakura blossoms with tiny leaves, (3) beautiful ceremonial Japanese sword with a polished steel blade, red and black hilt, angled diagonally, no injury or violence, (4) dignified seated daimyo figurine in elaborate dark traditional robes and headdress on a small lacquer base. Middle row left to right: (5) folded ivory and red embroidered kimono tied with black obi, (6) two pieces of beautifully made salmon nigiri sushi on a tiny black plate, (7) triangular rice ball with nori band, (8) white-and-pink spiral narutomaki fish cake slices on small black saucer. Bottom row left to right: (9) elegant blue glass furin wind chime with red paper strip, (10) rustic green ceramic matcha bowl with foamy green tea, (11) black and red samurai helmet with small gold crest, (12) delicate red maple leaf. No backgrounds, no letters, text, labels, numbers, frames, logos, watermark or checkerboard drawing. Original game icons, not emoji.
