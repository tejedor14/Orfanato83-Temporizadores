# ⚽ Futsal Crono - Guía de Instalación y Uso

Aplicación móvil para Android optimizada para gestionar los tiempos de cambio y rotaciones de jugadores de fútbol sala entre amigos.

---

## 🚀 Cómo obtener el `.APK` para tu móvil (Sin instalar nada en tu PC)

El proyecto incluye un flujo de compilación automática en la nube mediante **GitHub Actions** (`.github/workflows/build-apk.yml`). No necesitas instalar Android Studio ni Java en tu ordenador:

### Paso 1: Subir el proyecto a tu repositorio de GitHub
1. Crea un repositorio en GitHub (público o privado).
2. Sube estos archivos a la rama `main` o `master`:
   ```bash
   git init
   git add .
   git commit -m "Inicializar Futsal Crono"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

### Paso 2: Descargar el APK compilado
1. En tu repositorio de GitHub, haz clic en la pestaña **"Actions"**.
2. Verás ejecutándose el flujo de trabajo **"Compilar APK Android"**. Tarda entre 2 y 3 minutos.
3. Una vez terminado con éxito (icono verde ✅), entra en la ejecución.
4. En la sección inferior **"Artifacts"**, descarga el archivo **`Futsal-Crono-APK`**.
5. Descomprime el archivo descargado para obtener `app-debug.apk` y envíatelo al móvil (vía WhatsApp, Telegram, Google Drive o cable USB).
6. En tu móvil Android, abre el archivo `app-debug.apk` y pulsa **Instalar** (permite instalar apps de fuentes desconocidas si te lo solicita).

---

## 💻 Prueba Rápida en el Navegador (Local)

Puedes probar la aplicación inmediatamente en cualquier navegador web moderno:
1. Abre el archivo `www/index.html` directamente haciendo doble clic sobre él.
2. O ejecuta un servidor local rápido con Node:
   ```bash
   npx serve www
   ```
3. Para simular la pantalla vertical de un móvil, abre las **Herramientas de Desarrollador** de Chrome/Edge (`F12`), pulsa el icono de dispositivo móvil (`Ctrl + Shift + M`) y selecciona un modelo como Pixel 7 o iPhone 14.

---

## 📱 Reglas y Funcionamiento de la Aplicación

### 1. Lista de Jugadores Precargada
La plantilla incluye siempre los 10 jugadores oficiales del equipo:
- Mario Tejedor
- Iñaki Uche
- Javier Uche
- Darius Rus
- Pablo Josa
- Pablo Martín
- Rubén Morera
- Alberto Obón
- Sergio Frisa
- Tomás Conde

### 2. Configuración de Convocatoria (Vista 1)
- **Duración del Turno:** Ajustable con `[ -1 min ]` y `[ +1 min ]` (por defecto `05:00` min).
- **Escalonar primeros cambios:** Si se activa, descuenta 2 minutos a los 2 primeros titulares que entren a pista para evitar que los 4 pidan el cambio al mismo tiempo.
- **Convocatoria del día:** Toca sobre cualquier jugador para alternar entre `✅ Asiste` y `❌ No asiste`.
- **Botón `[ IR AL PARTIDO ]`:** Pasa a la pantalla en vivo en cuanto haya al menos 1 convocado.

### 3. Pantalla de Partido en Vivo (Vista 2)
- **Reloj General:** Comienza en `25:00` y cuenta hacia atrás. Permite pausar/iniciar de forma independiente o reiniciar para la `🔄 2ª Parte`.
- **Botón Gigante `[ ⏸️ PAUSAR TODO ]` / `[ ▶️ REANUDAR TODO ]`:** Detiene o reanuda simultáneamente el reloj general y los relojes de todos los jugadores que estén en pista.
- **Zona EN PISTA (Prioridad visual y semáforo):**
  - **Reordenación automática en tiempo real:** El jugador al que menos tiempo le queda (o que más tiempo lleva en negativo) se sitúa **siempre arriba del todo** de la lista.
  - **Semáforo:**
    - 🟢 **Verde (> 60s):** En tiempo normal de turno.
    - 🟡 **Ámbar (60s a 1s):** Aviso para preparar el cambio.
    - 🔴 **Rojo parpadeante (<= 0s):** Tiempo cumplido. El reloj **continúa contando en negativo** (`-00:01`, `-00:02`...) para medir con exactitud el tiempo extra jugado.
  - **Vibración:** El móvil vibra automáticamente (`[500ms, 200ms, 500ms]`) en el instante exacto en que un jugador llega a `00:00`.
  - **Botones individuales en cada tarjeta:**
    - `[ ⏸️ / ▶️ ]`: Pausa o reanuda a este jugador.
    - `[ +1m ]` / `[ -1m ]`: Añade o resta 1 minuto al turno actual de este jugador.
    - `[ ⬇️ Banquillo ]`: Retira al jugador de la pista y resetea su reloj para el próximo turno.
- **Zona BANQUILLO:**
  - Muestra los suplentes convocados disponibles.
  - Al pulsar `[ ▶️ Empezar ]`, el jugador sube a la pista y su cuenta atrás **arranca sola al instante** con el tiempo de turno asignado.
- **Pie de página `[ ⚙️ Modificar Convocatoria ]`:**
  - Permite volver a la pantalla de convocatoria sin perder el tiempo ni el estado de los jugadores que ya están disputando el partido.

### 4. Precisión con Pantalla Apagada (Garantía Técnica)
La aplicación calcula todos los tiempos basándose en marcas de tiempo reales del sistema (`Date.now()`). Si el teléfono móvil entra en suspensión o se apaga la pantalla durante varios minutos en el banquillo, al desbloquearlo el tiempo restante se calcula de manera matemática instantánea y 100% exacta.
