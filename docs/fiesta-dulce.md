# Fiesta Dulce — pastelería y acumulador del bonus

## Alcance

Novena entrega de la renovación. Tablero de seis rodillos y cinco filas, pagos en cualquier posición, caídas y un acumulador exclusivo de los giros gratis. Pastelería original con crema, frambuesa y chocolate, símbolos ilustrados y una presentación clara del bonus inactivo en el juego base.

Se conservaron motor matemático, probabilidades, tiras, pagos, calibración, semillas, `configHash` y límites. No se afirma reproducción exacta de un título de otro proveedor. El escenario es una ilustración estática; las animaciones corresponden a rodillos, caídas, premios y traslado de los bombones. El sonido usa timbres sintetizados de campanillas, sin banda sonora grabada.

## Reglas conservadas

- Ocho o más símbolos iguales pagan en cualquier posición. Los escalones de pago son 8, 10 y 12 símbolos; los ganadores desaparecen y entran nuevos dulces mientras haya premio.
- El juego base no contiene bombones multiplicadores. El contador muestra BONUS y permanece inactivo.
- Cuatro piruletas SCATTER o más al terminar las caídas activan 10 giros gratis.
- En los giros gratis aparecen bombones con valores ×2, ×3, ×5, ×10, ×20, ×50 y ×100. Solo se suman si ese giro tiene un premio. Se usan los bombones presentes al terminar sus caídas.
- La suma se conserva entre giros gratis. Un giro ganador sin bombones nuevos utiliza el acumulador guardado; un giro sin premio no aumenta el acumulador aunque tenga bombones.
- El acumulador puede superar ×100: ese valor es el máximo de un bombón individual. Al terminar el bonus el contador vuelve al estado inactivo.
- Tres piruletas o más en un giro gratis conceden 5 giros adicionales. Máximo de 100 giros gratis por ronda.
- Premio máximo de la ronda: 5.000 veces la apuesta, limitado por el servidor.

## Implementación

- `public/sweet.html`: página dedicada en `/play/fiesta-dulce`.
- `public/css/sweet.css`: tablero de vitrina, controles claros, estado inactivo y estado del bonus; ajustes para teléfono, tableta y escritorio.
- `public/js/sweet.js`: atlas, bombones visibles, traslado al contador y conservación del multiplicador recibido del servidor.
- `public/js/skin-common.js`: rodillos cosméticos y dimensionamiento compartidos.
- `public/js/sound.js`: perfil de campanillas y notas suaves.
- La tarjeta del lobby utiliza el escenario nuevo.

Uso: `npm start`, abrir `http://localhost:3000/play/fiesta-dulce`. Reiniciar un servidor antiguo para cargar la nueva ruta.

## Validación

`node tools/test-koi.mjs fiesta-dulce`. El script histórico admite nueve juegos renovados. Requiere Playwright y Microsoft Edge; instalación local de herramienta: `npm install --no-save --package-lock=false playwright`.

Se utiliza un servidor en 4318 y un libro temporal, sin modificar saldos reales. Se revisan 320×568, 390×844, 768×1024, 844×390 y 1366×768, además de la composición de escritorio a 1440×1000.

Se verifican pagos, reglas, una ronda real, un único cargo ante doble clic, saldo con precisión de 1/10.000 de crédito y reproducción de ronda. Los siete casos deterministas provienen del motor: pérdida, premio, cadena de caídas, giros gratis, premio con multiplicador conservado sin bombones nuevos, reactivación y bombones sin premio durante el bonus.

Las comprobaciones comparan tablero final y premio total con el servidor, verifican cada tablero de la cadena, ausencia de multiplicadores en el juego base, contador inactivo fuera del bonus, crecimiento no decreciente del acumulador, aplicación del valor correcto al tablero correspondiente y ausencia de suma en giros sin premio. También cubren juego automático detenido al entrar al bonus, sonido persistente, movimiento reducido, errores y recuperación del saldo tras una respuesta perdida con la ronda ya registrada.

Las secuencias se interceptan solo en el navegador de pruebas; no existen controles de premios forzados en producción. Las pruebas no sustituyen una validación matemática independiente. Capturas de inspección: `output/sweet-qa/`. Se revisa además la carga de los clientes anteriores, la nueva tarjeta y el canal alfa del atlas.

## Arte y prompts

Herramienta integrada `image_gen`, sin API externa:

- `public/assets/sweet/patisserie.png`: escenario opaco original.
- `public/assets/sweet/symbols.png`: atlas transparente de cuatro columnas por tres filas; once símbolos activos y macarons decorativos reservados.

Se comprueba el canal alfa mediante lectura de píxeles; el RGB residual de las zonas transparentes no se dibuja en el juego.

Prompt del escenario:

> Use case: stylized-concept. Asset type: original production environment for whimsical slot Fiesta Dulce. Wide landscape 1536x1024. A luxurious magical patisserie in warm morning light, rose-pink and cream striped awning at top, ornate curved glass display cabinets, strawberry cakes and delicate pastries along far outer edges, warm cocoa wood and subtle rose-gold details, floating sugar dust and soft clouds outside an arched window. In the RIGHT THIRD a spectacular tiered strawberry-and-vanilla celebration cake on a polished porcelain pedestal, large pink ribbon and strawberries, beautiful playful handcrafted materials. Central and LEFT 70 percent is calm low-detail soft cream and pale cocoa display counter space for an overlaid game board. Premium polished stylized 3D animation-film game art, delightful but refined, tactile frosting, lacquered chocolate and porcelain, coherent palette of cream, muted raspberry pink, warm cocoa and mint accents. No people, characters, text, letters, numbers, logos, board or interface. Not a copy of any existing game.

Prompt del atlas (fondo transparente):

> Use case: stylized-concept. Asset type: transparent production symbol atlas for original patisserie slot Fiesta Dulce. Landscape 1536x1152. EXACTLY twelve isolated objects on an EXACT uniform FOUR COLUMN by THREE ROW grid. Every entire silhouette must fit inside the central 76 percent width and height of its cell; at least 12 percent genuinely transparent padding on ALL four sides. Center every object exactly at its cell center. Real alpha transparency, no glow or cast shadow outside object silhouettes. Cohesive premium polished stylized 3D confectionery game art, soft warm top-left light, tactile frosting, glossy chocolate and glass, elegant cream, raspberry, cocoa and mint palette. Top row left to right: (1) tall round pink-and-cream spiral lollipop on a short ivory stick with a small raspberry ribbon, (2) ornate raspberry-pink wrapped bonbon with glossy gold foil twisted ends, oval pale cream center left EMPTY for a number overlay, (3) small two-tier strawberry celebration cake with vanilla frosting and berries, (4) glossy pink-frosted ring doughnut with colorful small sprinkles. Middle row left to right: (5) beautifully swirled vanilla cupcake in a raspberry wrapper with one strawberry, (6) triangular slice of layered strawberry cream cake on a tiny porcelain plate, (7) bar of dark chocolate partly unwrapped from cream foil, (8) golden caramel flan on a small ivory plate. Bottom row left to right: (9) warm round chocolate-chip cookie with a small bite at one edge, (10) shiny mint-green and pink striped wrapped candy, (11) clear glass honey jar with golden honey and a tiny wooden dipper, (12) pair of delicate pink and mint macarons. No text, labels, letters, numbers, frames, logos, watermark, background color or checkerboard drawing. Exactly twelve separate original game icons, not emoji.
