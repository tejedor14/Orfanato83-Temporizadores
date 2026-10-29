/**
 * ORFANATOAPP - LÓGICA DE APLICACIÓN
 * Cronómetro de cambios y rotaciones para fútbol sala
 * Implementación 100% matemática con marcas de tiempo reales (Date.now())
 */

// =============================================================================
// 1. PLANTILLA FIJA PRECARGADA (10 JUGADORES)
// =============================================================================
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

// Constantes de configuración
const MIN_TURN_MINUTES = 1;
const MAX_TURN_MINUTES = 25;
const MATCH_HALF_MS = 25 * 60 * 1000; // 25:00 minutos de parte

// =============================================================================
// 2. MODELO DE ESTADO DE LA APLICACIÓN
// =============================================================================
const state = {
  baseTurnMinutes: 5, // 5 minutos por defecto
  staggeredInitial: false, // Escalonado desactivado por defecto
  staggeredEntriesCount: 0, // Contador de titulares que han entrado con escalonado
  activeView: "setup-view", // 'setup-view' | 'match-view'

  generalTimer: {
    isRunning: false,
    remainingMsAtLastPause: MATCH_HALF_MS,
    lastResumeTimestamp: null,
    hasVibratedZero: false
  },

  players: INITIAL_ROSTER.map((p) => ({
    id: p.id,
    name: p.name,
    convocado: true, // Por defecto convocados para facilitar la selección de descartes
    status: "bench", // 'bench' (banquillo) | 'pitch' (en pista)
    timer: {
      isRunning: false,
      remainingMsAtLastPause: 5 * 60 * 1000,
      lastResumeTimestamp: null,
      hasVibratedZero: false
    }
  }))
};

// =============================================================================
// 3. MODELO MATEMÁTICO DE TIEMPO (ANTI-SUSPENSIÓN DE PANTALLA)
// =============================================================================

/**
 * Obtiene el tiempo restante actual en milisegundos usando Date.now()
 */
function getCurrentRemainingMs(timer) {
  if (!timer.isRunning) {
    return timer.remainingMsAtLastPause;
  }
  const elapsedMs = Date.now() - timer.lastResumeTimestamp;
  return timer.remainingMsAtLastPause - elapsedMs;
}

/**
 * Pausa un cronómetro guardando el tiempo restante exacto
 */
function pauseTimer(timer) {
  if (timer.isRunning) {
    timer.remainingMsAtLastPause = getCurrentRemainingMs(timer);
    timer.isRunning = false;
    timer.lastResumeTimestamp = null;
  }
}

/**
 * Reanuda un cronómetro estableciendo el nuevo timestamp de referencia
 */
function resumeTimer(timer) {
  if (!timer.isRunning) {
    timer.lastResumeTimestamp = Date.now();
    timer.isRunning = true;
  }
}

/**
 * Suma o resta milisegundos al tiempo de un cronómetro
 */
function addMilliseconds(timer, deltaMs) {
  timer.remainingMsAtLastPause += deltaMs;
  // Si el tiempo vuelve a ser > 0, reseteamos el flag de vibración
  if (getCurrentRemainingMs(timer) > 0) {
    timer.hasVibratedZero = false;
  }
}

/**
 * Formato de tiempo para visualización: MM:SS o -MM:SS cuando está en negativo
 */
function formatTimeMs(ms) {
  const isNegative = ms < 0;
  const totalSeconds = isNegative
    ? Math.floor(Math.abs(ms) / 1000)
    : Math.ceil(ms / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return isNegative && totalSeconds > 0 ? `-${formatted}` : formatted;
}

/**
 * Dispara la vibración en Android si el dispositivo lo soporta
 */
function triggerVibration() {
  try {
    if (navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([500, 200, 500]);
    }
  } catch (err) {
    console.warn("Vibration not supported or denied:", err);
  }
}

// =============================================================================
// 4. ELEMENTOS DEL DOM
// =============================================================================
const dom = {
  // Vistas
  setupView: document.getElementById("setup-view"),
  matchView: document.getElementById("match-view"),

  // Vista 1: Setup
  baseTurnDisplay: document.getElementById("base-turn-display"),
  btnBaseMinus: document.getElementById("btn-base-minus"),
  btnBasePlus: document.getElementById("btn-base-plus"),
  toggleStaggered: document.getElementById("toggle-staggered"),
  convocadosCount: document.getElementById("convocadosCount") || document.getElementById("convocados-count"),
  btnSelectAll: document.getElementById("btn-select-all"),
  btnDeselectAll: document.getElementById("btn-deselect-all"),
  rosterList: document.getElementById("roster-list"),
  btnStartMatch: document.getElementById("btn-start-match"),

  // Vista 2: Partido
  generalTimerDisplay: document.getElementById("general-timer-display"),
  btnGeneralToggle: document.getElementById("btn-general-toggle"),
  btnGeneralIcon: document.getElementById("btn-general-icon"),
  btnGeneralReset: document.getElementById("btn-general-reset"),
  matchTurnDisplay: document.getElementById("match-turn-display"),
  btnMatchTurnMinus: document.getElementById("btn-match-turn-minus"),
  btnMatchTurnPlus: document.getElementById("btn-match-turn-plus"),
  btnGlobalToggle: document.getElementById("btn-global-toggle"),
  globalToggleIcon: document.getElementById("global-toggle-icon"),
  globalToggleText: document.getElementById("global-toggle-text"),
  pitchCountBadge: document.getElementById("pitch-count-badge"),
  pitchPlayersList: document.getElementById("pitch-players-list"),
  pitchEmptyMsg: document.getElementById("pitch-empty-msg"),
  benchCountBadge: document.getElementById("bench-count-badge"),
  benchPlayersList: document.getElementById("bench-players-list"),
  benchEmptyMsg: document.getElementById("bench-empty-msg"),
  btnBackSetup: document.getElementById("btn-back-setup")
};

// =============================================================================
// 5. MANEJO DE NAVEGACIÓN Y VISTAS
// =============================================================================
function switchView(viewName) {
  state.activeView = viewName;
  if (viewName === "setup-view") {
    dom.setupView.classList.add("active");
    dom.matchView.classList.remove("active");
    renderRosterList();
  } else {
    dom.setupView.classList.remove("active");
    dom.matchView.classList.add("active");
    renderMatchView();
  }
}

// =============================================================================
// 6. RENDERIZADO: VISTA 1 (CONFIGURACIÓN)
// =============================================================================

function updateBaseTurnDisplays() {
  const formatted = `${String(state.baseTurnMinutes).padStart(2, "0")}:00`;
  dom.baseTurnDisplay.textContent = formatted;
  dom.matchTurnDisplay.textContent = `${formatted} min`;
}

function updateConvocadosCounter() {
  const totalSelected = state.players.filter((p) => p.convocado).length;
  dom.convocadosCount.textContent = `${totalSelected} de ${state.players.length} seleccionados`;
  dom.btnStartMatch.disabled = totalSelected === 0;
}

function renderRosterList() {
  dom.rosterList.innerHTML = "";

  state.players.forEach((player, index) => {
    const item = document.createElement("div");
    item.className = `roster-item ${player.convocado ? "selected" : ""}`;
    item.dataset.id = player.id;

    item.innerHTML = `
      <div class="player-info">
        <span class="player-number">${index + 1}</span>
        <span class="player-name">${player.name}</span>
      </div>
      <span class="player-status-badge ${player.convocado ? "badge-convocado" : "badge-ausente"}">
        ${player.convocado ? "✅ Asiste" : "❌ No asiste"}
      </span>
    `;

    item.addEventListener("click", () => {
      player.convocado = !player.convocado;
      // Si se desconvoca a un jugador que estaba en pista, se retira al banquillo
      if (!player.convocado && player.status === "pitch") {
        sendPlayerToBench(player);
      }
      renderRosterList();
      updateConvocadosCounter();
    });

    dom.rosterList.appendChild(item);
  });

  updateConvocadosCounter();
}

// =============================================================================
// 7. CONTROL DE ACCIONES DE JUGADORES
// =============================================================================

/**
 * Traslada un jugador del banquillo a la pista e inicia su cronómetro inmediatamente
 */
function sendPlayerToPitch(player) {
  let initialTurnMs = state.baseTurnMinutes * 60 * 1000;

  // Lógica de escalonado inicial:
  // Si está activado, a los 2 primeros titulares se les descuentan 2 minutos (o 50% si el turno es menor a 2 min)
  if (state.staggeredInitial && state.staggeredEntriesCount < 2) {
    const discountMs = 2 * 60 * 1000;
    initialTurnMs = Math.max(60 * 1000, initialTurnMs - discountMs);
    state.staggeredEntriesCount++;
  } else if (state.staggeredInitial && state.staggeredEntriesCount < 4) {
    state.staggeredEntriesCount++;
  }

  player.status = "pitch";
  player.timer.remainingMsAtLastPause = initialTurnMs;
  player.timer.isRunning = true;
  player.timer.lastResumeTimestamp = Date.now();
  player.timer.hasVibratedZero = false;

  renderMatchView();
}

/**
 * Saca a un jugador de la pista, lo devuelve al banquillo y detiene/resetea su reloj
 */
function sendPlayerToBench(player) {
  player.status = "bench";
  player.timer.isRunning = false;
  player.timer.remainingMsAtLastPause = state.baseTurnMinutes * 60 * 1000;
  player.timer.lastResumeTimestamp = null;
  player.timer.hasVibratedZero = false;

  renderMatchView();
}

// =============================================================================
// 8. RENDERIZADO: VISTA 2 (PARTIDO EN VIVO)
// =============================================================================

function renderBenchList() {
  const benchPlayers = state.players.filter((p) => p.convocado && p.status === "bench");

  dom.benchCountBadge.textContent = String(benchPlayers.length);

  if (benchPlayers.length === 0) {
    dom.benchPlayersList.innerHTML = "";
    dom.benchEmptyMsg.style.display = "flex";
    return;
  }

  dom.benchEmptyMsg.style.display = "none";
  dom.benchPlayersList.innerHTML = "";

  benchPlayers.forEach((player) => {
    const row = document.createElement("div");
    row.className = "bench-item";
    row.innerHTML = `
      <span class="bench-name">${player.name}</span>
      <button class="btn btn-bench-start" type="button" data-action="start" data-id="${player.id}">
        ▶️ Empezar
      </button>
    `;

    const btnStart = row.querySelector('[data-action="start"]');
    btnStart.addEventListener("click", () => {
      sendPlayerToPitch(player);
    });

    dom.benchPlayersList.appendChild(row);
  });
}

/**
 * Renderizado de la zona EN PISTA
 * Con ordenación automática por remainingMs ASC en tiempo real
 */
function renderPitchList() {
  const pitchPlayers = state.players.filter((p) => p.convocado && p.status === "pitch");

  dom.pitchCountBadge.textContent = String(pitchPlayers.length);

  if (pitchPlayers.length === 0) {
    dom.pitchPlayersList.innerHTML = "";
    dom.pitchEmptyMsg.style.display = "flex";
    return;
  }

  dom.pitchEmptyMsg.style.display = "none";

  // ORDENACIÓN AUTOMÁTICA EN TIEMPO REAL (CRÍTICA):
  // Menor a mayor tiempo restante (los más urgentes o con más tiempo en negativo arriba del todo)
  pitchPlayers.sort((a, b) => {
    return getCurrentRemainingMs(a.timer) - getCurrentRemainingMs(b.timer);
  });

  // Reconciliación suave del DOM para evitar parpadeos o pérdida de interacción
  const existingCards = new Map();
  dom.pitchPlayersList.querySelectorAll(".player-card").forEach((el) => {
    existingCards.set(el.dataset.id, el);
  });

  pitchPlayers.forEach((player) => {
    let card = existingCards.get(player.id);

    if (!card) {
      card = createPitchPlayerCard(player);
    }

    // Asegurar orden en el contenedor padre
    dom.pitchPlayersList.appendChild(card);
    updatePitchPlayerCard(card, player);
  });

  // Eliminar tarjetas de jugadores que ya no estén en pista
  existingCards.forEach((card, id) => {
    if (!pitchPlayers.some((p) => p.id === id)) {
      card.remove();
    }
  });
}

function createPitchPlayerCard(player) {
  const card = document.createElement("article");
  card.className = "player-card";
  card.dataset.id = player.id;

  card.innerHTML = `
    <div class="player-card-header">
      <span class="player-card-name">${player.name}</span>
      <span class="player-card-status-label">En tiempo</span>
    </div>
    <div class="player-timer-row">
      <span class="player-timer-digits">05:00</span>
      <span class="player-card-paused-badge" style="display: none;">PAUSADO</span>
    </div>
    <div class="player-actions-row">
      <button class="btn btn-card-action btn-card-toggle" type="button" title="Pausar/Reanudar">
        ⏸️
      </button>
      <button class="btn btn-card-action btn-card-plus" type="button" title="+1 minuto">
        +1m
      </button>
      <button class="btn btn-card-action btn-card-minus" type="button" title="-1 minuto">
        −1m
      </button>
      <button class="btn btn-card-action btn-card-sub" type="button" title="Mandar al banquillo">
        ⬇️ Banquillo
      </button>
    </div>
  `;

  // Asignación de eventos de los botones individuales
  const btnToggle = card.querySelector(".btn-card-toggle");
  const btnPlus = card.querySelector(".btn-card-plus");
  const btnMinus = card.querySelector(".btn-card-minus");
  const btnSub = card.querySelector(".btn-card-sub");

  btnToggle.addEventListener("click", () => {
    if (player.timer.isRunning) {
      pauseTimer(player.timer);
    } else {
      resumeTimer(player.timer);
    }
    updatePitchPlayerCard(card, player);
    updateGlobalPauseButton();
  });

  btnPlus.addEventListener("click", () => {
    addMilliseconds(player.timer, 60 * 1000);
    updatePitchPlayerCard(card, player);
  });

  btnMinus.addEventListener("click", () => {
    addMilliseconds(player.timer, -60 * 1000);
    updatePitchPlayerCard(card, player);
  });

  btnSub.addEventListener("click", () => {
    sendPlayerToBench(player);
  });

  return card;
}

function updatePitchPlayerCard(card, player) {
  const remainingMs = getCurrentRemainingMs(player.timer);
  const digitsEl = card.querySelector(".player-timer-digits");
  const statusLabelEl = card.querySelector(".player-card-status-label");
  const pausedBadgeEl = card.querySelector(".player-card-paused-badge");
  const toggleBtnEl = card.querySelector(".btn-card-toggle");

  digitsEl.textContent = formatTimeMs(remainingMs);
  toggleBtnEl.textContent = player.timer.isRunning ? "⏸️" : "▶️";
  pausedBadgeEl.style.display = player.timer.isRunning ? "none" : "inline-block";

  // Comprobación de vibración al llegar a 00:00 (exactamente una vez por turno)
  if (remainingMs <= 0 && !player.timer.hasVibratedZero) {
    player.timer.hasVibratedZero = true;
    triggerVibration();
  }

  // Semáforo Visual
  card.classList.remove("status-normal", "status-warning", "status-expired");

  if (remainingMs > 60 * 1000) {
    // Normal (> 60 segundos)
    card.classList.add("status-normal");
    statusLabelEl.textContent = "En pista";
  } else if (remainingMs > 0 && remainingMs <= 60 * 1000) {
    // Aviso (entre 60s y 1s)
    card.classList.add("status-warning");
    statusLabelEl.textContent = "¡Aviso cambio!";
  } else {
    // Tiempo cumplido / Negativo (<= 0s)
    card.classList.add("status-expired");
    statusLabelEl.textContent = "¡CAMBIO!";
  }
}

function renderMatchView() {
  updateBaseTurnDisplays();
  renderBenchList();
  renderPitchList();
  updateGlobalPauseButton();
  updateGeneralTimerDisplay();
}

// =============================================================================
// 9. CONTROLES DEL RELOJ GENERAL Y BOTÓN GLOBAL
// =============================================================================

function updateGeneralTimerDisplay() {
  const remainingMs = getCurrentRemainingMs(state.generalTimer);
  const clampedMs = Math.max(0, remainingMs);
  dom.generalTimerDisplay.textContent = formatTimeMs(clampedMs);
  dom.btnGeneralIcon.textContent = state.generalTimer.isRunning ? "⏸️" : "▶️";

  if (remainingMs <= 0 && state.generalTimer.isRunning) {
    state.generalTimer.remainingMsAtLastPause = 0;
    state.generalTimer.isRunning = false;
    state.generalTimer.lastResumeTimestamp = null;
    dom.btnGeneralIcon.textContent = "▶️";
  }
}

/**
 * Actualiza el texto, icono y estilo del Botón Gigante de Acción Global
 */
function updateGlobalPauseButton() {
  const pitchPlayers = state.players.filter((p) => p.convocado && p.status === "pitch");
  const isAnyRunning = state.generalTimer.isRunning || pitchPlayers.some((p) => p.timer.isRunning);

  if (isAnyRunning) {
    dom.btnGlobalToggle.className = "btn btn-global btn-pause";
    dom.globalToggleIcon.textContent = "⏸️";
    dom.globalToggleText.textContent = "PAUSAR TODO";
  } else {
    dom.btnGlobalToggle.className = "btn btn-global btn-resume";
    dom.globalToggleIcon.textContent = "▶️";
    dom.globalToggleText.textContent = "REANUDAR TODO";
  }
}

function toggleGlobalPause() {
  const pitchPlayers = state.players.filter((p) => p.convocado && p.status === "pitch");
  const isAnyRunning = state.generalTimer.isRunning || pitchPlayers.some((p) => p.timer.isRunning);

  if (isAnyRunning) {
    // Pausar reloj general y todos los cronómetros en pista
    pauseTimer(state.generalTimer);
    pitchPlayers.forEach((p) => pauseTimer(p.timer));
  } else {
    // Reanudar reloj general y todos los cronómetros en pista
    resumeTimer(state.generalTimer);
    pitchPlayers.forEach((p) => resumeTimer(p.timer));
  }

  updateGlobalPauseButton();
  renderPitchList();
  updateGeneralTimerDisplay();
}

// =============================================================================
// 10. CICLO PRINCIPAL DE ACTUALIZACIÓN EN TIEMPO REAL (TICK)
// =============================================================================
function startTickLoop() {
  // Ejecución continua a 10 Hz (cada 100ms) para garantizar precisión y reactividad
  setInterval(() => {
    if (state.activeView !== "match-view") return;

    if (state.generalTimer.isRunning) {
      updateGeneralTimerDisplay();
    }

    const pitchPlayers = state.players.filter((p) => p.convocado && p.status === "pitch");
    if (pitchPlayers.length > 0) {
      renderPitchList();
    }
  }, 100);
}

// =============================================================================
// 11. INICIALIZACIÓN Y VINCULACIÓN DE EVENTOS
// =============================================================================
function initEventListeners() {
  // Configuración de Turno Base (Setup)
  dom.btnBaseMinus.addEventListener("click", () => {
    if (state.baseTurnMinutes > MIN_TURN_MINUTES) {
      state.baseTurnMinutes--;
      updateBaseTurnDisplays();
    }
  });

  dom.btnBasePlus.addEventListener("click", () => {
    if (state.baseTurnMinutes < MAX_TURN_MINUTES) {
      state.baseTurnMinutes++;
      updateBaseTurnDisplays();
    }
  });

  // Interruptor Escalonado Inicial
  dom.toggleStaggered.addEventListener("change", (e) => {
    state.staggeredInitial = e.target.checked;
  });

  // Convocatoria Rápida
  dom.btnSelectAll.addEventListener("click", () => {
    state.players.forEach((p) => (p.convocado = true));
    renderRosterList();
  });

  dom.btnDeselectAll.addEventListener("click", () => {
    state.players.forEach((p) => {
      p.convocado = false;
      if (p.status === "pitch") {
        sendPlayerToBench(p);
      }
    });
    renderRosterList();
  });

  // Navegación: Ir al Partido
  dom.btnStartMatch.addEventListener("click", () => {
    switchView("match-view");
  });

  // Navegación: Volver a Configurar Convocatoria
  dom.btnBackSetup.addEventListener("click", () => {
    switchView("setup-view");
  });

  // Reloj General: Iniciar / Pausar
  dom.btnGeneralToggle.addEventListener("click", () => {
    if (state.generalTimer.isRunning) {
      pauseTimer(state.generalTimer);
    } else {
      resumeTimer(state.generalTimer);
    }
    updateGeneralTimerDisplay();
    updateGlobalPauseButton();
  });

  // Reloj General: Reiniciar 2ª Parte
  dom.btnGeneralReset.addEventListener("click", () => {
    state.generalTimer.isRunning = false;
    state.generalTimer.remainingMsAtLastPause = MATCH_HALF_MS;
    state.generalTimer.lastResumeTimestamp = null;
    state.generalTimer.hasVibratedZero = false;
    updateGeneralTimerDisplay();
    updateGlobalPauseButton();
  });

  // Ajuste rápido de turno en mitad de partido
  dom.btnMatchTurnMinus.addEventListener("click", () => {
    if (state.baseTurnMinutes > MIN_TURN_MINUTES) {
      state.baseTurnMinutes--;
      updateBaseTurnDisplays();
    }
  });

  dom.btnMatchTurnPlus.addEventListener("click", () => {
    if (state.baseTurnMinutes < MAX_TURN_MINUTES) {
      state.baseTurnMinutes++;
      updateBaseTurnDisplays();
    }
  });

  // Botón Gigante de Pausar/Reanudar Todo
  dom.btnGlobalToggle.addEventListener("click", () => {
    toggleGlobalPause();
  });
}

// Inicialización de la aplicación
function init() {
  updateBaseTurnDisplays();
  renderRosterList();
  initEventListeners();
  startTickLoop();
}

// Arrancar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
