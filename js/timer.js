import { state } from './state.js';

let mode = 'timer'; // timer | stopwatch | pomodoro
let seconds = 25 * 60;
let running = false;
let interval = null;
let pomodoroPhase = 'focus'; // focus | break
let pomodoroCycles = 0;
let originalTitle = 'nawaz.ink';

export function initTimer() {
  const panel = document.getElementById('timer-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="timer-header">
      <span class="timer-header-title">Timer</span>
      <button class="timer-close" id="timer-close">✕</button>
    </div>
    <div class="timer-tabs">
      <button class="timer-tab ${mode === 'timer' ? 'active' : ''}" data-mode="timer">Timer</button>
      <button class="timer-tab ${mode === 'stopwatch' ? 'active' : ''}" data-mode="stopwatch">Stopwatch</button>
      <button class="timer-tab ${mode === 'pomodoro' ? 'active' : ''}" data-mode="pomodoro">Pomodoro</button>
    </div>
    <div class="timer-label" id="timer-label">${getLabel()}</div>
    <div class="timer-display" id="timer-display">${formatTime(seconds)}</div>
    <div class="timer-presets" id="timer-presets" style="${mode === 'timer' ? '' : 'display:none'}">
      <button class="btn btn-sm" data-mins="5">5m</button>
      <button class="btn btn-sm" data-mins="15">15m</button>
      <button class="btn btn-sm" data-mins="25">25m</button>
      <button class="btn btn-sm" data-mins="45">45m</button>
      <button class="btn btn-sm" data-mins="60">60m</button>
    </div>
    <div class="timer-controls">
      <button class="timer-btn primary" id="timer-toggle">${running ? 'Pause' : 'Start'}</button>
      <button class="timer-btn" id="timer-reset">Reset</button>
    </div>
    ${mode === 'pomodoro' ? `<div class="timer-cycles">Cycles: ${pomodoroCycles}</div>` : ''}
  `;

  panel.querySelector('#timer-close').addEventListener('click', () => timerPanelToggle());
  panel.querySelector('#timer-toggle').addEventListener('click', timerToggle);
  panel.querySelector('#timer-reset').addEventListener('click', timerReset);

  panel.querySelectorAll('.timer-tab').forEach(tab => {
    tab.addEventListener('click', () => setTimerMode(tab.getAttribute('data-mode')));
  });

  panel.querySelectorAll('#timer-presets .btn').forEach(btn => {
    btn.addEventListener('click', () => setTimerPreset(parseInt(btn.getAttribute('data-mins'))));
  });
}

export function timerPanelToggle() {
  const panel = document.getElementById('timer-panel');
  if (panel) panel.classList.toggle('open');
}

export function timerToggle() {
  if (running) {
    clearInterval(interval);
    running = false;
    document.title = originalTitle;
  } else {
    running = true;
    interval = setInterval(tick, 1000);
  }
  initTimer();
}

export function timerReset() {
  clearInterval(interval);
  running = false;
  document.title = originalTitle;
  if (mode === 'timer') seconds = 25 * 60;
  else if (mode === 'stopwatch') seconds = 0;
  else { seconds = 25 * 60; pomodoroPhase = 'focus'; pomodoroCycles = 0; }
  initTimer();
}

export function setTimerMode(m) {
  clearInterval(interval);
  running = false;
  document.title = originalTitle;
  mode = m;
  if (mode === 'timer') seconds = 25 * 60;
  else if (mode === 'stopwatch') seconds = 0;
  else { seconds = 25 * 60; pomodoroPhase = 'focus'; pomodoroCycles = 0; }
  initTimer();
}

export function setTimerPreset(minutes) {
  seconds = minutes * 60;
  initTimer();
}

function tick() {
  if (mode === 'stopwatch') {
    seconds++;
  } else {
    seconds--;
    if (seconds <= 0) {
      playBeep();
      if (mode === 'pomodoro') {
        if (pomodoroPhase === 'focus') {
          pomodoroPhase = 'break';
          seconds = 5 * 60;
          pomodoroCycles++;
        } else {
          pomodoroPhase = 'focus';
          seconds = 25 * 60;
        }
      } else {
        clearInterval(interval);
        running = false;
        seconds = 0;
      }
    }
  }

  updateDisplay();
  if (running) {
    document.title = `⏱ ${formatTime(seconds)} — nawaz.ink`;
  }
}

function updateDisplay() {
  const display = document.getElementById('timer-display');
  const label = document.getElementById('timer-label');
  if (display) display.textContent = formatTime(seconds);
  if (label) label.textContent = getLabel();
}

function getLabel() {
  if (mode === 'pomodoro') return pomodoroPhase === 'focus' ? 'FOCUS' : 'BREAK';
  if (mode === 'stopwatch') return 'STOPWATCH';
  return 'FOCUS TIMER';
}

function formatTime(s) {
  const m = Math.floor(Math.abs(s) / 60);
  const sec = Math.abs(s) % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = 440;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}
