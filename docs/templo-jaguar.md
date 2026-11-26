# Templo del Jaguar — escalinata y despertar de la selva

## Alcance

Octava entrega de la renovación. Tablero de seis rodillos por cinco filas, 15.625 combinaciones, cascadas y progresión lineal de multiplicadores. Escenario original de templo entre la selva, un jaguar guardián y símbolos de jade, fauna y frutos. La escalinata muestra los diez escalones completos.

Se conservaron motor matemático, probabilidades, tiras, pagos, calibración, semillas, `configHash` y límites. No se afirma reproducción exacta de un título de otro proveedor.

El escenario y el jaguar son ilustraciones estáticas. El sonido usa percusión grave y timbres de madera sintetizados, sin banda sonora grabada ni sonidos reales de animales.

## Reglas conservadas

- Símbolos iguales en al menos tres rodillos consecutivos desde la izquierda pagan por combinaciones. El comodín jaguar no aparece en el primer rodillo y sustituye salvo al scatter.
- Los ganadores desaparecen y entran nuevos símbolos mientras haya premio.
- Juego base: ×1 a ×10, avanzando +1 por cascada. Los pasos posteriores mantienen ×10; cada giro vuelve a ×1.
- Cuatro soles SCATTER o más al terminar las cascadas activan 10 giros gratis, más 2 por sol adicional.
- Bonus: ×2, ×4, ×6, ×8, ×10, ×12, ×14, ×16, ×18 y ×20. Avanza +2 por cascada y cada giro gratis empieza de nuevo en ×2.
- Tres soles o más durante el bonus dan 5 giros adicionales, más 2 por sol extra. Máximo de 100 giros por ronda.
- Premio máximo de la ronda: 10.000 veces la apuesta, limitado por el servidor.

La altura de los diez escalones aumenta de izquierda a derecha. El escalón activo representa el paso del frame actual, no una colección adicional de símbolos ni una función nueva.

## Implementación

- `public/jaguar.html`: página en `/play/templo-jaguar`.
- `public/css/jaguar.css`: composición de ruinas y selva, tablero oscuro y escalinata con alturas ajustadas a pantalla.
- `public/js/jaguar.js`: símbolos, índice de escalón, multiplicador y estados del bonus.
- `public/js/skin-common.js`: rodillos cosméticos y dimensionamiento reutilizados, con sus tiempos por defecto.
- `public/js/sound.js`: perfil de percusión y madera.
- La tarjeta del lobby utiliza el escenario nuevo.

Cada escalón establece su variable CSS de altura con `style.setProperty`. La interfaz general y los módulos anteriores conservan su comportamiento.

Uso: `npm start`, abrir `http://localhost:3000/play/templo-jaguar`. Reiniciar un servidor antiguo para cargar la nueva ruta.

## Validación

`node tools/test-koi.mjs templo-jaguar`. El script histórico admite ocho juegos renovados. Requiere Playwright y Microsoft Edge; instalación local de herramienta: `npm install --no-save --package-lock=false playwright`.

Se utiliza un servidor de prueba en 4318 y un libro temporal, sin modificar saldos reales. Se revisan 320×568, 390×844, 768×1024, 844×390 y 1366×768. Se comprueba que la altura de cada escalón sea mayor que la anterior y que todos permanezcan dentro del banner.

También se verifican pagos, reglas, una ronda real, un único cargo ante doble clic, saldo con precisión de 1/10.000 de crédito y reproducción de ronda. Seis casos deterministas: pérdida, cascada, cadena, premio a ×6, giros gratis sin reactivación y giros gratis reactivados.

En las cadenas base y todos los frames del bonus se compara paso, índice de escalón, multiplicador y tablero con el resultado del servidor. Se comprueban las dos secuencias de diez valores, reinicio a ×1, juego automático, sonido persistente, movimiento reducido y recuperación después de una respuesta perdida con la ronda ya registrada.

El caso ×6 incluye un frame ganador del motor. Las comprobaciones de los máximos ×10 y ×20 verifican su presencia en las secuencias de la interfaz, sin afirmar premios pagados a esos valores en la muestra. Las secuencias raras se interceptan solo en el navegador de pruebas; no existen controles de premios forzados en producción.

Capturas de inspección: `output/jaguar-qa/`. Se revisa además la carga de los clientes anteriores, la nueva tarjeta y la transparencia del atlas. Estas pruebas no sustituyen una validación matemática independiente.

## Arte y prompts

Herramienta integrada `image_gen`, sin API externa:

- `public/assets/jaguar/temple.png`: templo y jaguar.
- `public/assets/jaguar/symbols.png`: atlas transparente de cuatro columnas por tres filas; diez símbolos usados y pirámide/orquídea decorativos reservados.

Se comprueba el canal alfa mediante lectura de píxeles; el RGB residual de las zonas transparentes no se dibuja en el juego.

Prompt del escenario (fondo opaco):

> Use case: stylized-concept. Asset type: original production background for fantasy slot Templo del Jaguar. Wide landscape 1536x1024. A majestic golden jaguar with natural dark rosette markings rests on an ancient moss-covered carved stone platform at the far LEFT, looking calmly toward the viewer. Dense tropical rainforest, towering fantasy Mesoamerican stepped pyramid partly hidden by vines in the upper background, carved jade and sandstone lintels framing top and sides, warm shafts of late afternoon sunlight through the canopy, orchids and broad leaves near the lower edges, drifting golden dust. Premium painterly 3D fantasy game art, exquisite fur, stone and foliage detail, cinematic depth, deep forest green, burnished amber, weathered terracotta and jade. Central and RIGHT 70 percent is calm low-detail dark forest shadow and worn temple stone for an overlaid game board; avoid foreground objects in that area. No text, letters, numbers, logos, board or interface. No modern objects, no Asian or Egyptian motifs. Original artwork.

Prompt del atlas (fondo transparente):

> Use case: stylized-concept. Asset type: transparent production sprite atlas for original rainforest fantasy slot Templo del Jaguar. Landscape 1536x1152, EXACTLY twelve separate icons in an EXACT uniform FOUR COLUMN by THREE ROW grid. Each entire silhouette must fit in the middle 76 percent of its cell width and height, at least 12 percent true transparent padding on all four sides. Center every object at its exact cell center. No overlap, no glow or shadows outside silhouettes, real alpha transparency. Consistent premium polished painterly 3D game art, warm upper-left light, jade stone, weathered gold, vibrant natural feathers and food, clear bold silhouettes. Top row left to right: (1) magnificent golden jaguar head with natural rosettes and calm emerald eyes on a small carved jade medallion base, (2) radiant circular golden sun disk with carved fantasy stone rays, (3) ancient carved green stone idol face with angular features, (4) ornate gold and turquoise feathered crown. Middle row left to right: (5) beautiful red blue and yellow macaw with wings folded, (6) coiled emerald green snake with golden accents, (7) ripe yellow corn cob partly wrapped in green husk, (8) glossy red chili pepper with two green leaves. Bottom row left to right: (9) cut cacao pod with visible pale cacao beans and a few dark brown cacao seeds, (10) halved avocado with brown pit and one whole avocado behind it, (11) small carved stepped stone pyramid with vines, (12) golden tropical orchid blossom. No text, labels, letters, numbers, frames, logos, background or checkerboard drawing. Exactly twelve isolated original game symbols, not emoji.
