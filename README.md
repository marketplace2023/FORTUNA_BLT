# VLT Royale — sala de juegos VLT auditables

Sitio con 10 tragamonedas originales, una ruleta europea, FortunaZoo y un hipódromo virtual de carreras individuales, servidor de resultados auditable y panel de administración. Node 20+, **sin dependencias de ejecución**.

```bash
npm start            # http://localhost:3000  ·  panel en /admin
```

En el primer arranque se crea el usuario `admin` con una contraseña aleatoria. Se muestra en consola y se guarda en `data/admin-credentials.txt`. Cámbiala desde **Configuración** y borra ese archivo. También puedes fijarla con `ADMIN_PASSWORD=...` antes del primer arranque.

Variables de entorno: `PORT`, `DATA_DIR` (por defecto `./data`), `SITE_NAME`, `ADMIN_PASSWORD`.

## Las 10 tragamonedas

| Juego | Mecánica | RTP (PAR, 5M giros) | Volatilidad |
|---|---|---|---|
| Koi Dorado | 3×3, 5 líneas, respin con bloqueo, pantalla llena x10 | 96,59 % ± 0,98 | Alta |
| Panda Zen | 3×3, 5 líneas, respin con bloqueo, pantalla llena x10 | 95,70 % ± 1,21 | Alta |
| Frutas Neón | 3×3, 5 líneas, rodillos salvajes aleatorios | 95,67 % ± 1,57 | Muy alta |
| Dragón de Jade | 5×4, 1.024 ways, cascadas x1→x5 / FS x2→x10 | 96,70 % ± 0,31 | Media |
| Templo del Jaguar | 6×5, 15.625 ways, cascadas +1 hasta x10 / FS hasta x20 | 96,26 % ± 0,55 | Media |
| Océano de Perlas | 5×5, 3.125 ways, cascadas Fibonacci / FS hasta x34 | 96,47 % ± 0,44 | Media |
| Noche de Catrinas | 6×4, 4.096 ways, multiplicador que se duplica / FS hasta x64 | 96,12 % ± 0,68 | Alta |
| Samurái del Viento | 5×3, 243 ways, cascadas x1→x3 / FS x3→x12 | 96,61 % ± 0,39 | Media |
| Faraón Dorado | 6×5, paga en cualquier lugar (8+), multiplicadores | 96,43 % ± 0,72 | Alta |
| Fiesta Dulce | 6×5, paga en cualquier lugar (8+), multiplicadores en FS | 95,80 % ± 1,19 | Alta |

Temas, símbolos, tablas de pago y tiras son originales. Las mecánicas (cascadas, ways, respin, pago en cualquier lugar) son genéricas del género.

## Ruleta del Eclipse

**Ruleta del Eclipse** se juega en `/play/ruleta-eclipse`. Tiene rueda de un cero, apuestas internas, externas y de vecindad. Tres números distintos reciben un multiplicador por giro, aplicable solo a los plenos. El RTP exacto de cada apuesta es `36/37` (97,2973 %).

## FortunaZoo

`/play/fortunazoo`: ruleta individual de 40 animales. Permite colocar fichas en varios animales; el ganador devuelve ×38,40 sobre su apuesta, incluida la cantidad apostada. Todos tienen la misma probabilidad (2,5%) y el retorno teórico es 96% antes del redondeo de unidades. Incluye arte original, historial, verificación, repetición y protección contra cargos duplicados.

Pruebas: `node tools/test-zoo.mjs`. [Reglas, modelo y prompts](docs/fortunazoo.md).

## Hipódromo Royale

`http://localhost:3000/play/hipodromo-royale`: ocho caballos, apuestas Ganador, Place y Show y una carrera individual por apuesta. Velocidad, resistencia, salida, jinete, forma y adaptación a la pista determinan las probabilidades. Las cuotas fijas corresponden a un retorno teórico de hasta el 96% por redondeo. El hipódromo emplea su propio modelo de probabilidades.

Incluye pista 3D con cámaras de retransmisión (Canvas alternativo en dispositivos sin WebGL), boleto con retorno total y beneficio neto, historial, auditoría y protección contra cargos duplicados. [Modelo, API y arte](docs/hipodromo-royale.md).

Pruebas: `node tools/test-racing.mjs` (requiere Playwright y Microsoft Edge; instalar herramienta con `npm install --no-save --package-lock=false playwright`). Usa un libro temporal y no modifica saldos locales.

## Por qué es auditable

1. **RNG en el servidor.** Cada ronda usa una semilla nueva de 256 bits del CSPRNG del sistema. La secuencia sale de un HMAC-SHA256 en modo contador (`server/rng.js`) con muestreo por rechazo, sin sesgo de módulo. El navegador solo anima el resultado.
2. **Resultado determinista.** `juego.play(new Drbg(semilla))` siempre produce el mismo resultado, así que cualquier ronda se puede reproducir.
3. **RTP fijo.** El resultado no depende del jugador, del historial ni de la caja del día. El panel **no** permite cambiar el RTP ni sustituir resultados.
4. **Versión de la matemática.** Tiras, pagos, funciones y límites forman `math`. Su SHA-256 (`configHash`) se guarda en cada ronda. Cada versión queda archivada en `data/state.json`, de modo que las rondas antiguas se reproducen aunque se recalibre.
5. **Libro mayor encadenado** (`data/ledger.jsonl`). Rondas, abonos y retiros, altas y acciones de administración son asientos solo-anexar, cada uno con el hash del anterior. Saldos y contadores no se guardan aparte: se reconstruyen desde el libro al arrancar.
6. **Verificación independiente:**
   ```bash
   npm run verify   # cadena de hashes + reproducción de TODAS las rondas + saldos
   ```
   El jugador puede verificar sus jugadas desde el historial del juego, y el administrador desde **Auditoría** o desde el detalle de cada ronda.

## Matemática: simulación y calibración

```bash
npm run sim                              # hojas PAR (1M giros por juego) → par/*.json
npm run sim -- --spins 10000000          # más precisión
npm run sim -- --game dragon-jade
npm run sim -- --game ruleta-eclipse  # PAR exacta por tipo de apuesta
npm run calibrate -- --spins 5000000     # ajusta la escala de pagos al RTP objetivo
```

En las tragamonedas, la calibración escala la tabla de pagos y redondea a 3 cifras significativas. La escala queda en `server/games/calibration.json`, y la PAR final se mide con otra secuencia de semillas, con su intervalo de confianza del 95 %. Calibrar cambia `configHash`: es una versión nueva. El panel calcula la PAR de cada ruleta directamente a partir de su configuración.

## Estructura

```
server/
  index.js            servidor HTTP, API pública y de administración
  rng.js              HMAC-DRBG
  ledger.js           libro mayor con cadena de hash
  store.js            estado + saldos/contadores derivados del libro
  engine/             motores: lines, ways, anywhere y roulette
  games/catalog.js    catálogo de juegos (temas, pagos y reglas)
  games/index.js      construcción de tiras, calibración, hash de versión
tools/
  simulate.js         simulador PAR / calibración (multihilo)
  verify-ledger.js    verificación independiente del libro
public/
  index.html          lobby
  play.html           cliente de juego (vertical, móvil)
  admin/              panel de administración
par/                  hojas PAR generadas
data/                 estado y libro mayor (no versionar)
docs/                 documentación de la API de codejackpot (referencia)
```

## Añadir un juego

1. Añade una entrada en `server/games/catalog.js` con un motor existente (`lines`, `ways`, `anywhere`).
2. `npm run calibrate -- --game <id> --spins 5000000`
3. Reinicia el servidor. El juego aparece en el lobby y en el panel.

Para añadir una ruleta europea, registra una entrada con `engine: 'roulette'`, un `id` propio, tema y portada. Usa `EUROPEAN_WHEEL` y `EUROPEAN_PAYOUTS` para la mesa clásica, o declara tus pagos brutos y un `boost` con la cantidad de números y los pesos por multiplicador. El cliente compartido de `/play/<id>` toma la rueda, las apuestas, los límites y el arte de la entrada del catálogo.

Para girar vía API, envía `{ gameId, requestId, bets: [{ id, amount }] }` a `POST /api/spin`. Los identificadores de apuesta salen de `GET /api/games/<id>`, en `roulette.bets`. Envía un importe en créditos por posición y conserva el mismo `requestId` y las mismas apuestas al reintentar. El servidor valida la apuesta mínima y el saldo disponible. Las fichas son denominaciones y se pueden acumular. El asiento guarda apuestas en unidades enteras, resultado y semilla para su reproducción.

`node --test tools/test-roulette.mjs` comprueba pagos, reutilización del motor, idempotencia y auditoría con un libro temporal.

## Lo que falta para una certificación real (GLI-11 / GLI-19)

- Hoja PAR **exacta** por enumeración completa (ahora es por simulación con IC) y pruebas estadísticas del RNG (p. ej. Diehard o NIST SP 800-22) hechas por el laboratorio.
- Almacenamiento con integridad física (base de datos con WAL y réplica, firma del libro con clave HSM o anclaje periódico de la cabeza de la cadena).
- Recuperación ante cortes a mitad de ronda: ahora la ronda se decide y registra de forma atómica antes de la animación.
- Control de versiones firmado del software y de `configHash` aprobado por el regulador.
- Integración con el monedero del operador. El contrato de codejackpot (`Cash/Get` y `Cash/TransferInOut` con HMAC-SHA256) está en `docs/codejackpot-api.md` y se puede implementar como adaptador en lugar del saldo interno.
