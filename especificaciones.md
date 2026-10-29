# SYSTEM PROMPT & ESPECIFICACIÓN TÉCNICA PARA AGENTE CLI (GEMINI FLASH HIGH)

> **INSTRUCCIÓN DIRECTA PARA EL AGENTE DE IA:**
> Actúa como un Ingeniero de Software Senior especialista en aplicaciones móviles ligeras y Android. Tu objetivo es construir el 100% del código funcional descrito en este documento de forma autónoma, sin omitir código (prohibido usar `// TODO` o `...`), sin añadir funciones no solicitadas y tomando todas las decisiones técnicas para que el usuario **no tenga que configurar ni instalar entornos pesados manualmente**.

---

## 1. RESUMEN DEL PROYECTO

Aplicación móvil para **Android** (orientación vertical, tema claro, 100% local/offline y en español) diseñada para gestionar los tiempos de cambio de los jugadores de un equipo de fútbol sala entre amigos.

### Reglas de Oro del Producto (Restricciones Estrictas)
1. **Ultra-sencilla y al grano:** Sin marcadores de goles, sin contador de faltas, sin historial de partidos, sin estadísticas acumuladas, sin exportación de datos, sin login y sin base de datos externa.
2. **Plantilla fija precargada:** No hace falta pantalla de crear/editar/borrar jugadores. Los 10 jugadores del equipo vienen integrados en el código.
3. **Precisión con pantalla apagada (CRÍTICO):** Los cronómetros **NO** deben depender de restar `1` segundo en un `setInterval` simple, porque Android congela los procesos en segundo plano cuando se apaga la pantalla. Todos los relojes deben calcularse mediante marcas de tiempo reales (`Date.now()`), de modo que si el móvil se bloquea durante 3 minutos y se vuelve a encender, el tiempo restante sea 100% exacto al instante.

---

## 2. ESTRATEGIA DE ARQUITECTURA Y GENERACIÓN DE `.APK` SIN INSTALAR NADA

Para que el usuario obtenga un archivo `.apk` instalable en Android con cero fricción:

1. **Núcleo de la App (`www/index.html`, `www/styles.css`, `www/app.js`):**
   - Desarrolla la aplicación en **Vanilla HTML5 + CSS3 + JavaScript (ES6+)** puro, sin frameworks pesados ni pasos de transpilación complejos.
2. **Empaquetado Android (`Capacitor` + `GitHub Actions`):**
   - Configura el proyecto con `@capacitor/core`, `@capacitor/cli` y `@capacitor/android` (o proyecto WebView nativo ligero con Gradle Wrapper incluido).
   - **Generación automática de APK en la nube:** Crea el archivo `.github/workflows/build-apk.yml` configurado para que, al subir el repositorio a GitHub, los servidores de GitHub compilen automáticamente el `app-debug.apk` y lo dejen listo para descargar en la pestaña *Actions / Releases*, evitando que el usuario tenga que instalar Android Studio o el SDK de Android en su ordenador.
   - Si el entorno local donde se ejecuta el CLI ya dispone de Java/Android SDK, ejecuta también el comando de compilación local (`./gradlew assembleDebug`) para dejar el `.apk` directamente en la carpeta raíz.

---

## 3. DATOS PRECARGADOS (PLANTILLA FIJA)

La aplicación debe inicializar siempre esta lista exacta de 10 jugadores:

```javascript
const INITIAL_ROSTER = [
  { id: "p1", name: "Mario Tejedor" },
  { id: "p2", name: "Iñaki Uche" },
  { id: "p3", name: "Javier Uche" },
  { id: "p4", name: "Darius Rus" },
  { id: "p5", name: "Pablo Josa" },
  { id: "p6", name: "Pablo Martín" },
  { id: "p7", name: "Rubén Morera" },
  { id: "p8", name: "Alberto Obón" },
  { id: "p9", name: "Sergio Frisa" },
  { id: "p10", name: "Tomás Conde" }
];
```

---

## 4. DISEÑO VISUAL (UI/UX)

- **Orientación:** Vertical (Portrait), optimizada para usar con una sola mano en el banquillo.
- **Tema Visual:** **Fondo Claro (Light Mode)** con alto contraste para lectura rápida.
  - Fondo general de la app: `#F8FAFC` (Gris muy claro)
  - Tarjetas por defecto: `#FFFFFF` con borde `#E2E8F0`
  - Texto principal: `#0F172A` (Casi negro, fuente `system-ui, -apple-system, sans-serif`, pesos `600` y `700` para números)
- **Semáforo Visual de Jugadores en Pista:**
  - **Estado Normal (> 60 segundos restantes):** Fondo `#ECFDF5` (verde suave), borde `#10B981`, texto del reloj `#065F46`.
  - **Estado Aviso (entre 60s y 1s restantes):** Fondo `#FFFBEB` (ámbar suave), borde `#F59E0B`, texto del reloj `#92400E`.
  - **Estado Tiempo Cumplido / Negativo (<= 0 segundos):** Fondo `#FEF2F2` con animación CSS de parpadeo suave (`#FEE2E2` <-> `#FECACA`), borde `#EF4444`, texto del reloj `#B91C1C` en negrita gigante.

---

## 5. FLUJO DE PANTALLAS Y FUNCIONALIDADES DETALLADAS

La app consta únicamente de **2 vistas** intercambiables sin recargar la página:

### VISTA 1: Configuración de Convocatoria (`#setup-view`)

1. **Configurador del Tiempo de Cambio (Turno Base):**
   - Muestra el tiempo de rotación por defecto: **`05:00` min** (300 segundos).
   - Botones grandes a los lados: **`[ -1 min ]`** y **`[ +1 min ]`** (rango permitido: mínimo `1:00`, máximo `25:00`).
2. **Interruptor de "Escalonado Inicial" (Opcional):**
   - Un checkbox o botón activable: *"Escalonar los primeros cambios"* (por defecto desactivado).
   - *Lógica si se activa:* A los 4 primeros jugadores que entren a pista al inicio del partido se les asigna un tiempo escalonado automático (ej. a los 2 primeros se les asigna la mitad o 2 minutos menos del turno base, y a los otros 2 el turno completo) para evitar que los 4 pidan el cambio exactamente en el mismo segundo cuando hay pocos suplentes.
3. **Lista de los 10 Jugadores (Convocatoria del día):**
   - Lista vertical con los 10 nombres.
   - Cada fila es un botón grande seleccionable (`Convocado` / `No ha venido`).
   - Al tocar un jugador, cambia su estado a **Convocado** (fondo azul claro `#EFF6FF`, borde `#3B82F6`, icono `✅ Asiste`).
4. **Botón Principal Inferior:**
   - **`[ IR AL PARTIDO ]`** (habilitado en cuanto haya al menos 1 jugador marcado como convocado).

---

### VISTA 2: Pantalla de Partido en Vivo (`#match-view`)

#### A. Cabecera Fija: Reloj General del Partido y Controles Globales
1. **Reloj General (25:00 hacia atrás):**
   - Empieza en **`25:00`** (1500 segundos).
   - Cuenta hacia atrás hasta `00:00`.
   - Botones junto al reloj general:
     - **`[ ▶️ / ⏸️ ]`**: Inicia o pausa solo el reloj general.
     - **`[ 🔄 2ª Parte (25:00) ]`**: Reinicia el reloj general a `25:00` en pausa (con confirmación simple o pulsación directa).
2. **Control Rápido de Duración de Turno:**
   - Indicador pequeño: `Turno: X min` con botones `[ -1m ]` y `[ +1m ]` por si quieren ajustar la duración de los próximos turnos a mitad de partido.
3. **Botón Gigante de Acción Global:**
   - **`[ ⏸️ PAUSAR TODO ]` / `[ ▶️ REANUDAR TODO ]`**:
   - Pausa o reanuda simultáneamente el reloj general del partido y los cronómetros de todos los jugadores que estén actualmente en pista.

---

#### B. Zona Superior: `EN PISTA` (Jugadores Activos)
- Muestra únicamente las tarjetas de los jugadores que están jugando en este momento.
- **REGLA DE ORDENACIÓN AUTOMÁTICA (CRÍTICA):**
  - La lista de jugadores `EN PISTA` debe **reordenarse automáticamente en tiempo real** de menor a mayor tiempo restante (`remainingMs ASC`).
  - **El jugador al que menos tiempo le quede (o que lleve más tiempo en negativo) debe estar SIEMPRE arriba del todo de la lista.**
- **Contenido de cada tarjeta de jugador `EN PISTA`:**
  1. **Nombre del jugador** (grande y claro).
  2. **Cronómetro individual de cuenta atrás (`MM:SS` o `-MM:SS`):**
     - Al llegar a `00:00`, **NO se detiene**: sigue contando en **negativo** (`-00:01`, `-00:02`, `-00:03`...) para saber exactamente cuánto tiempo extra lleva de más en pista.
     - Justo en el instante en que cruza de `00:01` a `00:00`, dispara una **vibración** en el dispositivo (`navigator.vibrate([500, 200, 500])`) una única vez por turno.
  3. **Botones de control individual dentro de la tarjeta:**
     - **`[ ⏸️ / ▶️ ]`**: Pausa o reanuda únicamente el reloj de este jugador.
     - **`[ +1m ]`**: Suma 60 segundos inmediatamente al reloj actual de este jugador.
     - **`[ -1m ]`**: Resta 60 segundos inmediatamente al reloj actual de este jugador.
     - **`[ ⬇️ Banquillo ]`**: Saca al jugador de la pista, lo pasa a la lista de `BANQUILLO` y detiene/resetea su reloj individual.

---

#### C. Zona Inferior: `BANQUILLO` (Suplentes Convocados Hoy)
- Muestra todos los jugadores convocados hoy que no están en pista.
- Al empezar el partido desde la Vista 1, todos los convocados aparecen inicialmente aquí para que el usuario pulse **`[ ▶️ Empezar ]`** en los 4 titulares (o los que estén en pista).
- **Contenido de cada fila de jugador en `BANQUILLO`:**
  1. **Nombre del jugador.**
  2. **Botón `[ ▶️ Empezar ]`** (verde y fácil de pulsar):
     - Al pulsarlo:
       1. El jugador sube inmediatamente a la zona **`EN PISTA`**.
       2. Su cronómetro se inicializa desde cero con el tiempo de turno completo configurado (ej. `05:00`) —o el tiempo escalonado si es el inicio del partido y estaba activado el escalonado—.
       3. **Su cuenta atrás empieza a correr automáticamente al instante**, sin tener que darle a otro botón de play.

#### D. Pie de Página
- Botón discreto **`[ ⚙️ Cambiar Convocatoria ]`** para volver a la Vista 1 por si llega un amigo tarde y quieren marcarlo como asistente sin perder el estado de los que ya están jugando.

---

## 6. MODELO MATEMÁTICO DE TIEMPO (ANTI-SUSPENSIÓN DE PANTALLA)

**PROHIBIDO** hacer `player.remainingSeconds -= 1` dentro de un `setInterval`.
Debes implementar el cálculo basado en timestamps reales del sistema (`Date.now()`):

```javascript
// Estructura de estado de cada cronómetro (tanto general como de cada jugador en pista)
/*
  timerState = {
    isRunning: true,
    remainingMsAtLastPause: 300000, // 5 min en ms
    lastResumeTimestamp: Date.now(), // Momento exacto en que se le dio a Play/Empezar
    hasVibratedZero: false
  }
*/

function getCurrentRemainingMs(timer) {
  if (!timer.isRunning) {
    return timer.remainingMsAtLastPause;
  }
  const elapsedMs = Date.now() - timer.lastResumeTimestamp;
  return timer.remainingMsAtLastPause - elapsedMs;
}

function pauseTimer(timer) {
  if (timer.isRunning) {
    timer.remainingMsAtLastPause = getCurrentRemainingMs(timer);
    timer.isRunning = false;
    timer.lastResumeTimestamp = null;
  }
}

function resumeTimer(timer) {
  if (!timer.isRunning) {
    timer.lastResumeTimestamp = Date.now();
    timer.isRunning = true;
  }
}

function addMilliseconds(timer, deltaMs) {
  timer.remainingMsAtLastPause += deltaMs;
  // Si el tiempo vuelve a ser > 0 (por ejemplo, al pulsar +1m cuando estaba en negativo),
  // reseteamos el flag de vibración para que vuelva a vibrar cuando llegue a 00:00 otra vez.
  if (getCurrentRemainingMs(timer) > 0) {
    timer.hasVibratedZero = false;
  }
}
```

### Formato de Visualización (`MM:SS` y Negativos `-MM:SS`)
```javascript
function formatTimeMs(ms) {
  const isNegative = ms < 0;
  // Usamos Math.ceil para positivos (para que 4:59.2 se vea como 05:00 o Math.floor según estándar)
  // y Math.floor(Math.abs(ms) / 1000) cuando es <= 0 para contar -00:01, -00:02...
  const totalSeconds = isNegative
    ? Math.floor(Math.abs(ms) / 1000)
    : Math.ceil(ms / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return isNegative && totalSeconds > 0 ? `-${formatted}` : formatted;
}
```

---

## 7. VIBRACIÓN EN ANDROID

1. En la capa web, ejecuta `if (navigator.vibrate) navigator.vibrate([500, 200, 500]);` cuando `getCurrentRemainingMs(player) <= 0` y `player.hasVibratedZero === false`, marcando inmediatamente `player.hasVibratedZero = true`.
2. En el `AndroidManifest.xml` del proyecto Android, añade el permiso obligatorio:
   ```xml
   <uses-permission android:name="android.permission.VIBRATE" />
   ```

---

## 8. ESTRUCTURA DE ARCHIVOS A GENERAR POR EL AGENTE

Genera todos los archivos listos para usar:

```text
.
├── package.json
├── capacitor.config.json
├── www/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .github/
│   └── workflows/
│       └── build-apk.yml
└── README_INSTALACION.md
```

### Requisitos para `.github/workflows/build-apk.yml`
El workflow de GitHub Actions debe:
1. Ejecutar en `ubuntu-latest` al hacer `push` a `main` o `master` (y permitir ejecución manual con `workflow_dispatch`).
2. Configurar Node.js 20 y Java JDK 17 (`temurin`).
3. Instalar dependencias (`npm install`), sincronizar Capacitor Android (`npx cap add android || npx cap sync android`) y asegurar el permiso `VIBRATE` en `AndroidManifest.xml`.
4. Compilar el APK con `cd android && chmod +x gradlew && ./gradlew assembleDebug`.
5. Subir el archivo `android/app/build/outputs/apk/debug/app-debug.apk` usando `actions/upload-artifact@v4` con el nombre `OrfanatoApp-APK`.

---

## 9. CRITERIOS DE ACEPTACIÓN (AUTOVERIFICACIÓN DEL AGENTE)

Antes de dar por terminada tu tarea, verifica que se cumplen todos estos puntos:
- [ ] Están los 10 nombres exactos precargados (`Mario Tejedor`, `Iñaki Uche`, `Javier Uche`, `Darius Rus`, `Pablo Josa`, `Pablo Martín`, `Rubén Morera`, `Alberto Obón`, `Sergio Frisa`, `Tomás Conde`).
- [ ] El tema es **claro** (fondo blanco/gris claro) y está 100% en español.
- [ ] El reloj general empieza en `25:00`, cuenta hacia atrás y se puede pausar y reiniciar para la 2ª parte.
- [ ] Al pulsar `Empezar` en un jugador del banquillo, pasa a `EN PISTA` y su cuenta atrás arranca sola automáticamente con el turno completo.
- [ ] Al pulsar `Banquillo` en un jugador de pista, baja a `BANQUILLO` y su reloj se resetea.
- [ ] La lista `EN PISTA` mantiene siempre arriba del todo al jugador con menos tiempo restante (o más tiempo negativo).
- [ ] Cuando un jugador pasa de `00:00`, su reloj sigue contando en negativo (`-00:01`, `-00:02`...) y la tarjeta parpadea en rojo.
- [ ] Todos los relojes usan diferencias con `Date.now()` para no perder ni un segundo cuando se apaga la pantalla del móvil.