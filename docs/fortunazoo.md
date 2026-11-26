# FortunaZoo — ruleta de 40 animales

Juego nuevo en `/play/fortunazoo`, con giro individual al apostar. La imagen del usuario orientó la composición: rueda vertical con puntero fijo, animales numerados, selva y espectáculo. Marca y arte son originales. No incluye sorteos compartidos ni una cuenta regresiva ficticia.

## Reglas y premios

- Cuarenta animales numerados del 01 al 40, cada uno una sola vez en la rueda. Todos tienen probabilidad 1/40, equivalente al 2,5%.
- El jugador elige una ficha y la coloca en uno o varios animales. Puede apilar fichas, restar una ficha o retirar una apuesta completa antes de confirmar.
- El giro utiliza el total de las fichas, sujeto al mínimo y máximo de la mesa establecidos en administración.
- Solo paga el animal ganador: importe colocado en ese animal ×38,40. El retorno incluye su apuesta; las apuestas a los demás animales pierden.
- Ejemplo: 1 crédito al león devuelve 38,40 si sale el león. Si había también 1 al tigre, el beneficio neto es 38,40 − 2 = 36,40.
- Apostar 1 crédito a cada uno de los 40 animales cuesta 40 y devuelve 38,40 en cualquier resultado: cubrir la rueda no garantiza beneficio.
- Retorno teórico del 96% antes del redondeo a la unidad monetaria mínima. No es una garantía individual ni una certificación independiente.

El pago se calcula en enteros como `floor(unidades × 192 / 5)`, donde un crédito son 10.000 unidades. La presentación redondea los importes a dos decimales. Los redondeos de fracciones de unidad solo pueden reducir el retorno, nunca aumentarlo.

## Motor e integración

`server/games/fortunazoo.js` define animales, orden de rueda y razón de pago. La ruleta animal tiene su propia variante matemática, sin modificar la rueda europea ni sus multiplicadores.

Se reutilizan la normalización de fichas, `POST /api/spin`, identificador único de solicitud, registro contable y reproducción de la plataforma. El resultado contiene número, animal ganador, apuestas individuales y pago total. Las versiones se archivan con `configHash`.

Un mismo `requestId` no puede generar dos cargos para un jugador. Reintentar con las mismas apuestas recupera la ronda; cambiar las apuestas o el juego con el identificador ya utilizado responde 409. El índice se reconstruye leyendo el libro al arrancar.

El cliente conserva una solicitud incierta y bloquea cambios hasta recuperarla al recargar. Una respuesta perdida después de registrar la ronda se reintenta con el mismo identificador. Historial, verificación, repetición sin otra apuesta, saldo y detalle de administración usan el registro existente.

La interfaz usa `public/zoo.html`, `public/css/zoo.css`, `public/js/zoo.js` y `public/js/zoo-wheel.js`. La rueda Canvas tiene 40 sectores iguales y un puntero fijo. Gira siete vueltas adicionales y desacelera hasta el centro del sector registrado por el servidor; no decide el resultado. Se respeta movimiento reducido y se puede omitir la animación.

El arte de cada atlas usa cinco columnas y cuatro filas. Se recortan únicamente los márgenes de visualización en CSS y Canvas para evitar que se dibujen bordes de iconos vecinos. Los PNG originales mantienen su transparencia.

## Revisión visual: animales más simpáticos

La versión activa usa `sanctuary-v2.png`, `animals-a-v2.png` y `animals-b-v2.png`: personajes originales de ilustración 3D con sonrisas, cejas expresivas, ojos grandes y formas redondeadas. Se conserva la versión anterior de los archivos como referencia. La selva, la marca, el centro y los colores de la rueda acompañan el nuevo estilo.

Los números, animales, orden, probabilidad, premios y liquidación permanecen iguales. El hash matemático sigue siendo `98c58bc08016c97134c5a5f1d0456b6d7640ac3d7870300645db5e85a567ba71`.

Arte generado con la herramienta integrada `image_gen`. Nuevos prompts:

Escenario expresivo (`public/assets/zoo/sanctuary-v2.png`):

> Use case: stylized-concept. Original premium production background for adult casino wildlife roulette FortunaZoo. Landscape1536x1024. A vibrant magical jungle stage with an elegant warm carved wooden arch across upper edge, emerald vines and broad glossy leaves, orange tropical blossoms, golden stage lanterns among foliage. Charming stylized3D animated-film art, rounded tactile materials, lively warm color, cinematic polished lighting, distinctly CARTOON not photorealism. At far LEFT edge a charismatic adult male lion with rich rounded sculpted golden mane, LARGE expressive amber eyes, lifted eyebrows and a warm confident friendly smile, resting on a mossy rock and looking toward center. At far RIGHT edge an endearing adult gray elephant with LARGE expressive eyes, rounded ears, short tusks and trunk curved playfully upward, friendly gentle smile. A witty adult brown capuchin with cream face and warm smile peeks from foliage near bottom-right edge without filling central area. Distant turquoise waterfall, soft blue sky visible through canopy, warm sunbeams. Central70percent remains calm low-detail dark jade foliage for an overlaid large roulette wheel. Appealing original character design, sophisticated theatrical game presentation. No text, lettering, numbers, logos, actual wheel, interfaces, copied characters, or watermarks. No photographic animal faces. Animals belong to the same coherent stylized3D cartoon world.

Personajes 01–20 (`public/assets/zoo/animals-a-v2.png`):

> Use case: stylized-concept. ORIGINAL production character icon atlas for adult casino wildlife roulette FortunaZoo. EXACT TWENTY separate appealing animated-film animal characters on EXACT FIVE COLUMNS by FOUR ROWS, equal cells, landscape1536x1024. Art direction: CHARISMATIC STYLIZED3D CARTOON mascots with expressive large glossy eyes, raised eyebrows, gently smiling faces, chunky rounded shapes, velvety sculpted fur and polished colorful materials. Warm, funny, appealing personalities, adult animals, NOT photographic wildlife and NOT realistic taxidermy portraits. Original high quality animation-film rendering. Strong clear silhouettes and lively expressions even as small icons. Each COMPLETE head-and-shoulders silhouette fully inside central72percent of cell width and height, at least14percent true transparent padding on EVERY edge; silhouettes end naturally with rounded fur, NO straight horizontal crop edge. Same art style and scale for all20. Row1 left to right: (1) golden male lion with magnificent stylized mane and warm confident grin, (2) bright orange tiger with dark stripes and charming friendly smile, (3) golden broad-headed jaguar with rosettes and mischievous friendly expression, (4) pale golden slender leopard with small spots and cheerful expression, (5) midnight blue-black panther with emerald eyes and relaxed amused smile. Row2: (6) warm gray elephant with oversized expressive ears, curled trunk and tiny tusks, (7) cheerful giraffe with long neck and funny ossicones, (8) smiling black-white zebra with lively mane, (9) affable chunky gray rhino with small horn, (10) jovial purple-gray hippo. Row3: (11) kind silverback gorilla with expressive eyebrows, (12) playful brown chimpanzee with smile, (13) genial orange orangutan with cheek pads, (14) witty cream-brown capuchin with curled tail beside head, (15) wide-eyed ring-tailed lemur with striped tail. Row4: (16) relaxed smiling sloth with rounded long arms, (17) amusing long-snouted giant anteater, (18) endearing gray-brown tapir with short trunk, (19) content golden-brown capybara, (20) friendly rounded armadillo with amber shell. True alpha transparency. Exactly these20 in this order. No text, numbers, labels, emblems, frames, logos, background color, checkerboard, realistic photos, or shadows beyond silhouettes.

Personajes 21–40 (`public/assets/zoo/animals-b-v2.png`):

> Use case: stylized-concept. ORIGINAL production character icon atlas for adult casino wildlife roulette FortunaZoo. EXACT TWENTY appealing animated-film animal characters on EXACT FIVE COLUMNS by FOUR ROWS, equal cells, landscape1536x1024. Art direction: CHARISMATIC STYLIZED3D CARTOON mascots with expressive large glossy eyes, gently smiling faces, chunky rounded shapes, colorful polished materials and warm funny personalities. Adult animals, NOT photographic wildlife. High quality original animation-film game rendering, matching a smiling cartoon lion and elephant. Strong distinct silhouettes readable as tiny icons. Each COMPLETE silhouette centered exactly within central72percent of cell width and height, minimum14percent true transparent padding on every side, NO straight crop edges, no overlap or halos. Row1 left to right: (1) cheerful black toucan with big yellow-orange beak, (2) lively red blue yellow macaw with expressive brows, (3) smiling emerald green parrot, (4) proud friendly gray harpy eagle with feathery crest, (5) elegant bright pink flamingo with gently curved neck and amused smile. Row2: (6) charismatic blue peacock with compact colorful spread tail, (7) jovial black-and-cream hornbill with large golden casque, (8) scarlet ibis with long curved beak and expressive eyes, (9) friendly green crocodile with rounded snout and amused closed-mouth smile, (10) charming coiled olive anaconda with big kind eyes and smile. Row3: (11) golden cobra with spread hood and confident welcoming face, (12) funny emerald iguana with orange spines, (13) vivid green turquoise chameleon with curled tail and big expressive eyes, (14) chunky cobalt-blue poison dart frog with grin, (15) lime-green red-eyed tree frog with warm smile. Row4: (16) cheerful tortoise with amber shell, (17) amusing brown fruit bat with compact spread wings and bright eyes, (18) vivid blue morpho butterfly with expressive eyes and elegant open wings, (19) smiling golden ocelot with dark spots and pointed ears, (20) witty brown coati with long pointed snout and curved striped tail. True alpha transparency, exactly these20 in this order. No text, numbers, labels, emblems, frames, logos, background color, checkerboard, realistic photos, or shadows beyond silhouettes.

## Validación

`node tools/test-zoo.mjs` requiere Playwright y Microsoft Edge. Usa un servidor con puerto libre y un libro temporal, sin modificar jugadores ni saldos locales.

Se comprueban las 40 posiciones como ganadoras, pago correcto y redondeo de unidades, apuestas múltiples, cobertura completa con pérdida del 4%, validación de posiciones y reproducción determinista. En el navegador se comprueba que el sector bajo el puntero coincida con el resultado para los 40 animales.

Se revisan 320×568, 390×844, 768×1024, 844×390, 1366×768 y 1440×1000, sin desbordamiento horizontal y manteniendo una rueda circular. Las pruebas cubren fichas, saldo, doble clic, repetición sin nuevo cargo, verificación, historial, pérdida de respuesta, recuperación al recargar y al reiniciar, transparencia de ambos atlas, auditoría independiente, lobby y clientes anteriores.

El boleto ganador determinista se intercepta solo en el navegador de prueba; no existe un control de premios forzados en producción. Capturas: `output/zoo-qa/`. Se ejecuta también `node tools/test-roulette.mjs` para conservar la ruleta europea. `npm run sim -- --game fortunazoo` muestra la PAR exacta de la apuesta a animal.

## Arte y prompts

Herramienta integrada `image_gen`, sin CLI ni API externa:

- `public/assets/zoo/sanctuary.png`: escenario original opaco con león, elefante y selva.
- `public/assets/zoo/animals-a.png`: atlas transparente de los animales 01 a 20.
- `public/assets/zoo/animals-b.png`: atlas transparente de los animales 21 a 40.

Prompt del escenario:

> Use case: stylized-concept. Original premium wildlife roulette game FortunaZoo production background. Landscape1536x1024. A lush theatrical tropical jungle clearing at golden hour, elegant carved dark wooden arch and vines along top edges, warm amber stage lights subtly concealed among leaves, distant waterfall and atmospheric emerald forest. Far LEFT edge a magnificent calm mature lion with rich mane rests on a mossy rock; far RIGHT edge a beautiful adult elephant partly framed by broad leaves, natural elegant proportions. Central seventy percent deliberately quiet low-detail deep jade shadow and soft foliage for a large overlaid roulette wheel and interface. Polished painterly3D wildlife game illustration, exquisite fur and foliage, rich jade, burnished brass and warm timber, cinematic but tasteful. No children, people, text, numbers, logos, wheel, interface or watermarks. Original design, no copied provider branding.

Prompt del atlas 01–20:

> Use case: stylized-concept. Production wildlife icon atlas for original premium roulette FortunaZoo. Landscape1536x1024. EXACT TWENTY separate animal bust icons in EXACT FIVE COLUMNS by FOUR ROWS uniform grid. Each animal face and upper body centered exactly in its equal cell, fully contained in central76percent of cell with generous genuinely transparent padding. Consistent polished painterly3D realistic wildlife art, warm upper-left light, natural colors and readable distinct silhouettes, mature graceful animals, not emoji or chibi. Row1 left to right: (1) male lion with magnificent golden mane, (2) orange Bengal tiger with black stripes, (3) golden jaguar with dark rosettes and broad head, (4) slender pale golden leopard with small spots, (5) black panther with green eyes. Row2: (6) gray African elephant with ears and short tusks, (7) giraffe head and long neck, (8) black and white zebra, (9) gray rhinoceros with horn, (10) gray-brown hippopotamus. Row3: (11) silverback gorilla, (12) chimpanzee, (13) rust-orange orangutan, (14) small brown-and-cream capuchin monkey, (15) ring-tailed lemur with striped tail curved beside head. Row4: (16) brown sloth hanging from tiny branch, (17) giant anteater with long narrow snout, (18) dark tapir with short trunk, (19) capybara with rounded ears, (20) armored armadillo. Exactly these20 animals in this order. No text, labels, numbers, frames, letters, logos, shadows outside silhouettes, background color or drawn checkerboard. True alpha transparency.

Prompt del atlas 21–40:

> Use case: stylized-concept. Production wildlife icon atlas for original premium roulette FortunaZoo. Landscape1536x1024. EXACT TWENTY separate animal icons in EXACT FIVE COLUMNS by FOUR ROWS uniform grid. Each animal centered exactly in its equal cell, fully contained in central76percent of cell, generous genuinely transparent padding at all edges. Consistent polished painterly3D realistic wildlife art, warm upper-left light, natural rich colors and clear distinct silhouettes. Mature animals, not emoji or chibi. Row1 left to right: (1) black toucan with large yellow-orange beak, (2) scarlet macaw with red blue and yellow feathers, (3) emerald green parrot, (4) gray harpy eagle with feathered crest, (5) pink flamingo head and curved neck. Row2: (6) blue peacock with compact spread tail, (7) black-and-cream hornbill with large yellow beak and casque, (8) scarlet ibis with long curved beak, (9) green crocodile with closed long snout, (10) coiled olive anaconda. Row3: (11) golden cobra with raised hood, (12) green iguana with spines, (13) colorful green chameleon with curled tail, (14) vivid cobalt blue poison dart frog, (15) lime-green red-eyed tree frog. Row4: (16) tortoise with domed amber shell, (17) brown fruit bat with compact spread wings, (18) blue morpho butterfly with spread wings, (19) tawny ocelot with dark spots and large ears, (20) brown coati with long pointed snout and curved striped tail. Exactly these20 animals in this order. No text, labels, numbers, frames, letters, logos, shadows outside silhouettes, background color or drawn checkerboard. True alpha transparency.
