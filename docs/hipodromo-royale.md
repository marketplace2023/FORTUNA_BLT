# Hipódromo Royale

Carreras virtuales individuales de ocho participantes y apuesta a ganador. Cada apuesta inicia su propia carrera; no hay rondas compartidas ni datos de carreras reales. La referencia aportada orientó la presentación deportiva, los dorsales y la llegada. Se utilizó arte original, sin copiar marca, interfaz ni vídeos del proveedor de la referencia.

## Experiencia

El programa muestra distancia, pista, ocho caballos, probabilidad y cuota fija. Cada ficha abre seis atributos: velocidad, resistencia, salida, jinete, forma del día y adaptación. El boleto muestra apuesta, cuota, retorno total y beneficio neto si gana. El retorno incluye la apuesta.

Al confirmar, el servidor registra y liquida la ronda antes de la animación. La salida lleva una breve cuenta atrás individual; la carrera se reproduce acelerada y puede omitirse sin cambiar el premio. El movimiento reducido muestra directamente la llegada. Hay resultados, clasificación, historial, verificación y recuperación tras recargar.

La presentación principal utiliza WebGL/Three.js con ocho caballos animados por esqueleto, distintas capas, jinetes originales, mantillas numeradas, barandillas, sombras y gradas en 3D. La realización automática alterna salida, seguimiento lateral, frontal y meta. También permite elegir cámara y ampliar la retransmisión. El trazado representa una recta de la carrera; las distancias no se reproducen a escala real. En dispositivos sin WebGL o si falla el modelo se utiliza la vista Canvas anterior. No se reproduce un vídeo como sustituto del resultado.

## Modelo de probabilidades v1

El programa sortea una distancia (1.200, 1.600 o 2.000 metros), una pista (seca, húmeda o pesada) y una forma del día entre 65 y 95 para cada caballo. El resto de sus cualidades y preferencias son propias de cada participante y están versionadas.

La adaptación es 100 menos 8 por cada paso de diferencia entre la pista actual y la preferida, menos 4 por cada 400 metros de diferencia con la distancia preferida.

Para 1.200 y 1.600 metros se pondera velocidad 40%, resistencia 16%, salida 12%, jinete 20% y forma 12%. Para 2.000 metros: velocidad 18%, resistencia 38%, salida 12%, jinete 20% y forma 12%. Se añade adaptación menos 100 y se redondea a entero para obtener la valoración.

`peso = max(1, valoración − 20)²`

La probabilidad exacta de victoria es `peso / suma de pesos`. El servidor sortea el ganador sobre esos pesos enteros y después extrae las otras posiciones sin reemplazo. El importe, la cuenta, el saldo y el historial no intervienen en la selección. La animación no decide ni cambia la llegada.

`cuota = floor(0,96 / probabilidad × 100) / 100`

La cuota queda fijada en el programa firmado y no se acepta una cuota enviada por el navegador. Su redondeo implica que el retorno teórico de una elección es ligeramente inferior o igual al 96%; no es una garantía de retorno personal. En los 500 programas de la prueba, el mínimo observado fue 95,7855% y la cuota máxima observada 17,97. Son observaciones de esa muestra, no los extremos absolutos del modelo.

El dinero se registra como enteros de 1/10.000 de crédito; los pagos se redondean hacia abajo a esa unidad. El formato de pantalla usa dos decimales. La distribución y las cuotas tienen una base matemática explícita, pero esto no constituye certificación independiente.

## Integración y recuperación

- Se añade `hipodromo-royale` al catálogo con motor `race`, conservando las diez matemáticas existentes.
- `GET /api/racing/card` entrega un programa firmado por HMAC con vigencia de cinco minutos, condiciones, cuotas y apuestas permitidas. Cambiar de programa no cobra.
- `POST /api/racing/bet` recibe `{ token, horseId, bet }`, exige sesión válida, juego habilitado, caballo válido, apuesta permitida y saldo suficiente. Recalcula el programa y sus cuotas en el servidor.
- Un token solo puede liquidarse una vez por jugador. Repetirlo con la misma selección e importe devuelve el recibo existente; con otros datos responde 409. La consulta de duplicados precede a la caducidad, permitiendo recuperar una ronda ya liquidada incluso tras reiniciar el servidor.
- El secreto de firma es efímero: al reiniciar vencen los programas no apostados. Los recibos registrados siguen recuperables con su token, porque su identificador se conserva en el libro.
- El cobro y el abono forman un solo asiento `round`. El índice de programas utilizados se reconstruye desde el libro al arrancar.
- Un fallo de red se reintenta con el mismo token. Si ambas respuestas se pierden, el navegador conserva la solicitud y bloquea nuevas apuestas hasta recuperarla al recargar. El saldo se reconcilia con `/api/me`.
- `GET /api/racing/rounds/:id` devuelve el recibo solo a su propietario. Historial y verificación usan también las rutas generales existentes.
- Se archiva la configuración del modelo y se guardan semilla, programa, selección y hash del resultado. El verificador independiente reproduce tanto carreras como tragamonedas.
- El panel de administración presenta clasificación, cuota y tiempo de cada caballo en el detalle de ronda.

## Archivos y validación

Motor: `server/games/racing.js`. API: `server/index.js`. Cliente: `public/racing.html`, `public/css/racing.css`, `public/js/racing.js` y `public/js/race-track.js`.

`node tools/test-racing.mjs` usa Playwright/Microsoft Edge, un servidor en 4319 y un libro temporal. Comprueba 500 programas, suma de probabilidades, cuotas, reproducción determinista, llegada y 30.000 carreras muestreadas frente a las probabilidades publicadas. La tolerancia muestral es 1,2 puntos porcentuales por caballo; la fórmula exacta se comprueba por separado.

La integración cubre autenticación, tipos de apuesta inválidos, firma alterada, cargo único, solicitudes simultáneas, recuperación de respuesta perdida y de recarga, aislamiento entre jugadores, llegada exacta, movimiento reducido, omisión de animación, boletos ganadores y perdedores, detalle de administrador, reconstrucción del índice y auditoría independiente. Los boletos visuales deterministas se interceptan solo en el navegador de pruebas; no hay controles de resultados forzados en producción.

Se inspeccionan 320×568, 390×844, 768×1024, 844×390, 1366×768 y 1440×1000. Capturas en `output/racing-qa/`. La regresión de Koi se ejecuta con `node tools/test-koi.mjs koi-dorado` en un libro temporal distinto.

`tools/simulate.js` continúa simulando y calibrando únicamente tragamonedas; el hipódromo utiliza sus probabilidades exactas y sus propias pruebas. No se atribuye una PAR de tragamonedas a las carreras.

## Arte y prompts

Herramienta integrada `image_gen`, sin CLI ni API externa. Los originales se copiaron al proyecto:

- `public/assets/racing/grounds.png`: entorno de hipódromo al atardecer.
- `public/assets/racing/gallop.png`: atlas transparente de ocho poses, cuatro columnas por dos filas.

Prompt del entorno:

> Use case: stylized-concept. Production environment for original virtual horse racing game Hipódromo Royale, wide landscape 1536x1024. Premium cinematic realistic 3D sports game environment, elegant modern racecourse grandstand in the far upper background, slender floodlight poles, hazy distant mountains, warm late afternoon sunlight, freshly mown emerald green turf filling the central and lower seventy percent. View looking slightly downward across the infield from a raised camera. Central and lower area deliberately calm uninterrupted grass, to overlay a programmatically drawn oval dirt racetrack and animated horses. Subtle beige rail fence only at far background. Deep evergreen, warm cream and soft brass palette, refined sports broadcast atmosphere. No horses, people in foreground, no text, logos, numbers, interface or watermarks. Original environment, not copying any provider.

Prompt del atlas (transparente):

> Use case: stylized-concept. Production transparent sprite animation sheet for an original premium horse racing game. EXACTLY EIGHT poses of THE SAME athletic bay thoroughbred racehorse with black mane and tail, carrying THE SAME adult jockey in ivory racing silks and a deep green helmet, saddle and reins. Every pose faces strictly RIGHT in clean full side profile, no camera angle changes. EXACT FOUR COLUMNS by TWO ROWS regular equal cells across a landscape1536x1024 canvas. Each full horse-and-jockey silhouette centered in its cell, identical scale, entirely within the middle76percent of cell width and height with generous genuinely transparent padding; no overlap or clipped legs. Sequential smooth gallop cycle in reading order: gathered suspension, forelegs reaching, leading foreleg contact, body passing foreleg, hindlegs coming under, hindleg push, extended suspension, legs gathering. Anatomically credible thoroughbred and jockey, consistent body proportions, tactile polished realistic3D sports game render, warm upper-left lighting, crisp silhouette. NO ground plane, cast shadows, text, labels, numbers, frames, background color, checkerboard, logo or watermark. Real alpha transparency. Eight separate full horse and rider silhouettes only.

## Revisión visual tras la referencia en vídeo

Se inspeccionaron doce momentos de `public/video/dashing_derby___product_video (1080p).mp4`, de 94 segundos, para estudiar encuadres de salida, seguimiento y llegada. El vídeo permanece como referencia local y no se utiliza en la carrera ni se recorta para simular premios.

La capa 3D está en `public/js/race-track-3d.js`; `race-track.js` selecciona el motor visual y conserva `race-track-2d.js` como alternativa. La duración visual pasa a 24 segundos, con movimiento reducido y omisión disponibles. Las cuotas, probabilidades, semillas y liquidación no cambian.

El resultado incluye **Ver repetición**, que vuelve a presentar el recibo existente sin enviar otra apuesta ni modificar el saldo. La prueba de integración confirma que el historial no crece al repetir una carrera.

`node tools/test-racing-visual.mjs` comprueba ocho caballos con esqueleto animado, planos automáticos y manuales, tamaño visible en los encuadres, llegada idéntica a la del motor, anchos móviles y recuperación visual si WebGL o el archivo del caballo no están disponibles. Usa un servidor y un libro temporales y no realiza apuestas locales. Capturas en `output/racing-3d/`.

El caballo animado es **Horse de Quaternius (CC0 1.0)**. Three.js r180 y sus cargadores se alojan localmente bajo MIT. Fuentes, atribuciones y licencia en `public/assets/racing/THIRD-PARTY-NOTICES.md` y `public/vendor/three/LICENSE`. Los jinetes, mantillas, gradas y vallado se construyen en código. Se añade `public/assets/racing/woodland.png`, paisaje original generado con image_gen.

Prompt del paisaje original de fondo:

> Use case: photorealistic-natural. Original production distant environment plate for a realistic horse racing videogame. Wide landscape 1536x1024. A continuous panoramic treeline of mature lush green oak, chestnut and cypress trees, softly rolling verdant hills in the far distance, gentle clear pale blue sky with fine wisps of cloud above. Lower third is a calm continuous strip of green grass at the base of the woodland, no foreground objects. Natural mid-afternoon sunshine from upper left, photographic realistic foliage and atmospheric depth, restrained natural greens, detailed but no visual clutter. View from eye level of someone standing on a racecourse grass infield. No horses, people, buildings, fences, track, text, logos, interface or watermarks. This image will be placed behind a separately rendered 3D stadium and racecourse. No dramatic sunsets, no cartoon or painted look.
