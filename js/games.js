import { state, saveState, markDirty } from './state.js';
import { navigateTo } from './router.js';

// Ensure arcade state
function ensureArcade() {
  if (!state.arcade) state.arcade = { points: 0, bests: {} };
}

export function addArcadePoints(n) {
  ensureArcade();
  state.arcade.points += n;
  saveState(); markDirty();
}

export function arcadeSaveBest(key, value, lowerIsBetter = false) {
  ensureArcade();
  const current = state.arcade.bests[key];
  let isNew = false;
  if (current === undefined) {
    isNew = true;
  } else if (lowerIsBetter) {
    isNew = value < current;
  } else {
    isNew = value > current;
  }
  if (isNew) {
    state.arcade.bests[key] = value;
    saveState(); markDirty();
  }
  return isNew;
}

export function arcadeSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.3;

    switch (type) {
      case 'tick':
        osc.frequency.value = 600;
        osc.start(); osc.stop(ctx.currentTime + 0.04);
        break;
      case 'pop':
        osc.frequency.value = 800;
        osc.start(); osc.stop(ctx.currentTime + 0.06);
        break;
      case 'good':
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
        break;
      case 'bad':
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
        break;
      case 'win':
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
        break;
    }
  } catch (e) {}
}

function arcadeEndScreen(container, opts) {
  container.innerHTML = `
    <div class="arcade-end-screen">
      <div style="font-size:48px;margin-bottom:12px;">${opts.icon || '🎮'}</div>
      <div style="font-size:22px;font-weight:600;color:var(--text);margin-bottom:6px;">${opts.title}</div>
      <div style="font-size:28px;font-weight:700;color:var(--accent);margin-bottom:6px;">${opts.value}</div>
      ${opts.sub ? `<div style="font-size:12px;color:var(--text3);margin-bottom:8px;">${opts.sub}</div>` : ''}
      ${opts.isNewBest ? '<div class="tag tag-green" style="margin-bottom:12px;">New Best! 🏆</div>' : ''}
      ${opts.points ? `<div style="font-size:12px;color:var(--text2);margin-bottom:12px;">+${opts.points} arcade points</div>` : ''}
      <div style="display:flex;gap:8px;justify-content:center;">
        <button class="btn btn-primary" id="arcade-again">Play Again</button>
        <button class="btn" id="arcade-back">Back to Arcade</button>
      </div>
    </div>
  `;

  document.getElementById('arcade-again')?.addEventListener('click', () => {
    if (opts.again) opts.again();
  });
  document.getElementById('arcade-back')?.addEventListener('click', () => renderGameCenter());
}

// GAME CENTER HUB
const GAMES = [
  { id: 'breakout', icon: '🧱', title: 'Breakout Lite', desc: 'Mouse to move paddle · clear all bricks', bestKey: 'breakout' },
  { id: 'minesweeper', icon: '💣', title: 'Minesweeper Lite', desc: 'Avoid all mines', bestKey: 'minesweeper' },
  { id: 'snake', icon: '🐍', title: 'Snake', desc: 'Arrow keys · eat food · grow longer', bestKey: 'snake' },
  { id: 'game2048', icon: '🔢', title: '2048', desc: 'Merge tiles · reach 2048', bestKey: '2048' },
  { id: 'typing', icon: '⌨️', title: 'Typing Speed', desc: 'Test your WPM · writing warm-up', bestKey: 'typing' },
  { id: 'memory', icon: '🧠', title: 'Memory Match', desc: 'Flip cards · find all pairs', bestKey: 'memory' },
  { id: 'tetris', icon: '🟦', title: 'Tetris', desc: 'Classic block stacking · infinite', bestKey: 'tetris' },
  { id: 'flappy', icon: '🐦', title: 'Flappy Bird', desc: 'Tap to fly · dodge pipes', bestKey: 'flappy' },
  { id: 'runner', icon: '🏃', title: 'Dino Runner', desc: 'Jump obstacles · infinite runner', bestKey: 'runner' },
  { id: 'pong', icon: '🏓', title: 'Pong', desc: 'Beat the AI · endless rallies', bestKey: 'pong' },
  { id: 'asteroids', icon: '☄️', title: 'Asteroids', desc: 'Shoot rocks · survive forever', bestKey: 'asteroids' },
  { id: 'color', icon: '🎨', title: 'Color Match', desc: 'Tap the right color · speed up', bestKey: 'colormatch' }
];

export function renderGameCenter() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  if (!container) return;

  const view = state.settings.gamecenterview || 'cards';

  container.innerHTML = `
    <div class="page-pad" style="max-width:900px;margin:0 auto;">
      <div class="db-header">
        <div>
          <h1 style="font-size:22px;font-weight:600;color:var(--text);">Game Center</h1>
          <div class="arcade-chip" style="margin-top:6px;"><span>🎮 Points:</span> <span>${state.arcade.points}</span></div>
        </div>
        <div class="view-toggle">
          <button class="btn btn-sm ${view === 'cards' ? 'active' : ''}" data-v="cards">Cards</button>
          <button class="btn btn-sm ${view === 'list' ? 'active' : ''}" data-v="list">List</button>
        </div>
      </div>
      <div id="game-grid" class="${view === 'cards' ? 'game-center-grid' : ''}"></div>
    </div>
  `;

  const grid = document.getElementById('game-grid');

  if (view === 'cards') {
    grid.innerHTML = GAMES.map(g => `
      <div class="game-card" data-game="${g.id}">
        <div style="font-size:40px;margin-bottom:8px;">${g.icon}</div>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">${g.title}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">${g.desc}</div>
        <div style="font-size:11px;color:var(--text2);">Best: ${state.arcade.bests[g.bestKey] ?? '—'}</div>
      </div>
    `).join('');
  } else {
    grid.innerHTML = GAMES.map(g => `
      <div class="bib-row game-card-list" data-game="${g.id}" style="cursor:pointer;">
        <div class="bib-row-main"><span style="font-size:20px;margin-right:8px;">${g.icon}</span><span style="font-weight:600;color:var(--text);">${g.title}</span><span style="margin-left:8px;font-size:11px;color:var(--text3);">${g.desc}</span></div>
        <span style="font-size:11px;color:var(--text2);">Best: ${state.arcade.bests[g.bestKey] ?? '—'}</span>
      </div>
    `).join('');
  }

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.settings.gamecenterview = btn.getAttribute('data-v');
      saveState();
      renderGameCenter();
    });
  });

  container.querySelectorAll('[data-game]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-game');
      if (id === 'breakout') startBreakoutLite();
      else if (id === 'minesweeper') startMinesweeperLite();
      else if (id === 'snake') startSnake();
      else if (id === 'game2048') start2048();
      else if (id === 'typing') startTypingTest();
      else if (id === 'memory') startMemoryMatch();
      else if (id === 'tetris') startTetris();
      else if (id === 'flappy') startFlappy();
      else if (id === 'runner') startRunner();
      else if (id === 'pong') startPong();
      else if (id === 'asteroids') startAsteroids();
      else if (id === 'color') startColorMatch();
    });
  });
}

// BREAKOUT LITE
function startBreakoutLite() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.breakout || 0;

  container.innerHTML = `
    <div class="page-pad" style="max-width:500px;margin:0 auto;text-align:center;">
      <div class="arcade-header">
        <button class="arcade-back-btn btn btn-ghost btn-sm" id="bo-back">← Back to Arcade</button>
        <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
          <div class="arcade-chip"><span>Score:</span> <span id="bo-score">0</span></div>
          <div class="arcade-chip"><span>Lives:</span> <span id="bo-lives">3</span></div>
          <div class="arcade-chip"><span>Best:</span> <span id="bo-best">${best}</span></div>
        </div>
      </div>
      <canvas id="bo-c" width="400" height="320" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);display:block;margin:0 auto;max-width:100%;touch-action:none;"></canvas>
    </div>
  `;

  document.getElementById('bo-back')?.addEventListener('click', () => renderGameCenter());

  const canvas = document.getElementById('bo-c');
  const ctx = canvas.getContext('2d');

  const COLS = 8, ROWS = 5, BW = 45, BH = 16, BPAD = 5, BTOP = 30, BLEFT = 15;
  const COLORS = ['#c9a96e', '#e06c75', '#98c379', '#61afef', '#c678dd'];

  let bricks = [];
  let paddleX = 170, paddleW = 60, paddleH = 10;
  let ballX = 200, ballY = 280, ballDX = 2.5, ballDY = -2.5, ballR = 5;
  let score = 0, lives = 3, gameOver = false, won = false;
  let animFrame;

  function initBricks() {
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({ x: BLEFT + c * (BW + BPAD), y: BTOP + r * (BH + BPAD), alive: true, color: COLORS[r % COLORS.length] });
      }
    }
  }
  initBricks();

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    paddleX = (e.clientX - rect.left) * scale - paddleW / 2;
    paddleX = Math.max(0, Math.min(canvas.width - paddleW, paddleX));
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const touch = e.touches[0];
    paddleX = (touch.clientX - rect.left) * scale - paddleW / 2;
    paddleX = Math.max(0, Math.min(canvas.width - paddleW, paddleX));
  }, { passive: false });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, BW, BH, 3);
      ctx.fill();
    });

    // Paddle
    ctx.fillStyle = '#c9a96e';
    ctx.beginPath();
    ctx.roundRect(paddleX, canvas.height - 20, paddleW, paddleH, 4);
    ctx.fill();

    // Ball
    ctx.fillStyle = '#e9e7e2';
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
  }

  function update() {
    if (gameOver) return;
    ballX += ballDX;
    ballY += ballDY;

    // Walls
    if (ballX - ballR <= 0 || ballX + ballR >= canvas.width) ballDX = -ballDX;
    if (ballY - ballR <= 0) ballDY = -ballDY;

    // Paddle
    if (ballY + ballR >= canvas.height - 20 && ballX >= paddleX && ballX <= paddleX + paddleW) {
      ballDY = -Math.abs(ballDY);
      const hit = (ballX - paddleX) / paddleW;
      ballDX = 4 * (hit - 0.5);
      arcadeSound('tick');
    }

    // Bottom
    if (ballY + ballR > canvas.height) {
      lives--;
      document.getElementById('bo-lives').textContent = lives;
      if (lives <= 0) { endGame(false); return; }
      arcadeSound('bad');
      ballX = 200; ballY = 280; ballDX = 2.5; ballDY = -2.5;
    }

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      if (ballX + ballR > b.x && ballX - ballR < b.x + BW && ballY + ballR > b.y && ballY - ballR < b.y + BH) {
        b.alive = false;
        ballDY = -ballDY;
        score += 10;
        document.getElementById('bo-score').textContent = score;
        arcadeSound('pop');
      }
    });

    // Win check
    if (bricks.every(b => !b.alive)) {
      score += 100;
      document.getElementById('bo-score').textContent = score;
      endGame(true);
    }
  }

  function endGame(didWin) {
    gameOver = true;
    won = didWin;
    cancelAnimationFrame(animFrame);
    const pts = score;
    addArcadePoints(pts);
    const isNew = arcadeSaveBest('breakout', pts, false);
    arcadeSound(didWin ? 'win' : 'bad');

    setTimeout(() => {
      arcadeEndScreen(container, {
        icon: didWin ? '🏆' : '💥',
        title: didWin ? 'You Win!' : 'Game Over',
        value: `${pts} points`,
        sub: didWin ? 'All bricks cleared!' : `Score: ${pts}`,
        isNewBest: isNew,
        points: pts,
        again: startBreakoutLite
      });
    }, 500);
  }

  function loop() {
    update();
    draw();
    if (!gameOver) animFrame = requestAnimationFrame(loop);
  }
  loop();
}

// MINESWEEPER LITE
function startMinesweeperLite() {
  ensureArcade();
  const container = document.getElementById('view-game-center');

  container.innerHTML = `
    <div class="page-pad" style="max-width:500px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="ms-back">← Back to Arcade</button>
      <h2 style="margin:12px 0;">Minesweeper</h2>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
        <button class="btn btn-sm" data-diff="easy">Easy 8×8</button>
        <button class="btn btn-sm" data-diff="normal">Normal 10×10</button>
        <button class="btn btn-sm" data-diff="hard">Hard 12×12</button>
      </div>
      <div id="ms-game"></div>
    </div>
  `;

  document.getElementById('ms-back')?.addEventListener('click', () => renderGameCenter());
  container.querySelectorAll('[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => runMinesweeper(btn.getAttribute('data-diff')));
  });
}

function runMinesweeper(diff) {
  const configs = { easy: { w: 8, h: 8, mines: 10 }, normal: { w: 10, h: 10, mines: 20 }, hard: { w: 12, h: 12, mines: 35 } };
  const cfg = configs[diff];
  const { w, h, mines } = cfg;
  const container = document.getElementById('view-game-center');
  const gameDiv = document.getElementById('ms-game') || container;

  let board = [], revealed = [], flagged = [], gameOver = false, firstClick = true;
  let startTime = 0, timerInt = null, flagCount = 0;

  function init() {
    board = Array(h).fill(null).map(() => Array(w).fill(0));
    revealed = Array(h).fill(null).map(() => Array(w).fill(false));
    flagged = Array(h).fill(null).map(() => Array(w).fill(false));
    gameOver = false; firstClick = true; flagCount = 0;
    render();
  }

  function placeMines(excludeR, excludeC) {
    let placed = 0;
    while (placed < mines) {
      const r = Math.floor(Math.random() * h);
      const c = Math.floor(Math.random() * w);
      if (board[r][c] === -1 || (r === excludeR && c === excludeC)) continue;
      board[r][c] = -1;
      placed++;
    }
    // Compute numbers
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (board[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < h && nc >= 0 && nc < w && board[nr][nc] === -1) count++;
        }
        board[r][c] = count;
      }
    }
  }

  function reveal(r, c) {
    if (r < 0 || r >= h || c < 0 || c >= w) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) reveal(r + dr, c + dc);
    }
  }

  function checkWin() {
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if (board[r][c] !== -1 && !revealed[r][c]) return false;
    }
    return true;
  }

  function render() {
    const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    let html = `
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:10px;">
        <div class="arcade-chip"><span>💣</span> <span>${mines - flagCount}</span></div>
        <div class="arcade-chip"><span>⏱</span> <span id="ms-timer">${elapsed}s</span></div>
      </div>
      <div class="ms-board" style="display:inline-grid;grid-template-columns:repeat(${w},28px);gap:2px;">
    `;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        let cls = 'ms-cell';
        let content = '';
        if (revealed[r][c]) {
          cls += ' revealed';
          if (board[r][c] === -1) { content = '💣'; cls += ' mine'; }
          else if (board[r][c] > 0) { content = board[r][c]; cls += ` n${board[r][c]}`; }
        } else if (flagged[r][c]) {
          content = '🚩';
        }
        html += `<button class="${cls}" data-r="${r}" data-c="${c}">${content}</button>`;
      }
    }

    html += '</div>';
    gameDiv.innerHTML = html;

    gameDiv.querySelectorAll('.ms-cell').forEach(cell => {
      const r = parseInt(cell.getAttribute('data-r'));
      const c = parseInt(cell.getAttribute('data-c'));

      cell.addEventListener('click', () => {
        if (gameOver || flagged[r][c]) return;
        if (firstClick) {
          firstClick = false;
          placeMines(r, c);
          startTime = Date.now();
          timerInt = setInterval(() => {
            const el = document.getElementById('ms-timer');
            if (el) el.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
          }, 1000);
        }
        if (board[r][c] === -1) { loseGame(); return; }
        reveal(r, c);
        arcadeSound('tick');
        if (checkWin()) winGame();
        else render();
      });

      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (gameOver || revealed[r][c]) return;
        flagged[r][c] = !flagged[r][c];
        flagCount += flagged[r][c] ? 1 : -1;
        render();
      });

      // Long press for mobile
      let longTimer;
      cell.addEventListener('touchstart', () => {
        longTimer = setTimeout(() => {
          if (gameOver || revealed[r][c]) return;
          flagged[r][c] = !flagged[r][c];
          flagCount += flagged[r][c] ? 1 : -1;
          render();
        }, 400);
      });
      cell.addEventListener('touchend', () => clearTimeout(longTimer));
      cell.addEventListener('touchmove', () => clearTimeout(longTimer));
    });
  }

  function loseGame() {
    gameOver = true;
    clearInterval(timerInt);
    arcadeSound('bad');
    // Reveal all mines
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if (board[r][c] === -1) revealed[r][c] = true;
    }
    render();
    setTimeout(() => {
      arcadeEndScreen(container, {
        icon: '💥', title: 'Game Over', value: 'BOOM!',
        sub: 'You hit a mine', points: 0, again: () => startMinesweeperLite()
      });
    }, 800);
  }

  function winGame() {
    gameOver = true;
    clearInterval(timerInt);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const basePoints = { easy: 50, normal: 100, hard: 200 }[diff];
    const timeBonus = Math.max(0, 60 - elapsed);
    const pts = basePoints + timeBonus;
    addArcadePoints(pts);
    const isNew = arcadeSaveBest('minesweeper', elapsed, true);
    arcadeSound('win');
    setTimeout(() => {
      arcadeEndScreen(container, {
        icon: '🏆', title: 'You Win!', value: `${elapsed}s`,
        sub: `${pts} points (${basePoints} base + ${timeBonus} time bonus)`,
        isNewBest: isNew, points: pts, again: () => startMinesweeperLite()
      });
    }, 500);
  }

  init();
}


// ==================== SNAKE ====================
function startSnake() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.snake || 0;

  container.innerHTML = `
    <div class="page-pad" style="max-width:500px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="sn-back">← Back to Arcade</button>
      <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
        <div class="arcade-chip"><span>Score:</span> <span id="sn-score">0</span></div>
        <div class="arcade-chip"><span>Best:</span> <span>${best}</span></div>
      </div>
      <canvas id="sn-c" width="320" height="320" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);display:block;margin:0 auto;"></canvas>
      <p style="font-size:11px;color:var(--text3);margin-top:8px;">Arrow keys or swipe to move</p>
    </div>
  `;

  document.getElementById('sn-back')?.addEventListener('click', () => renderGameCenter());

  const canvas = document.getElementById('sn-c');
  const ctx = canvas.getContext('2d');
  const GRID = 16, SIZE = canvas.width / GRID;

  let snake = [{ x: 8, y: 8 }];
  let dir = { x: 1, y: 0 };
  let food = spawnFood();
  let score = 0;
  let gameOver = false;
  let interval;

  function spawnFood() {
    let pos;
    do { pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
    while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function draw() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg3').trim() || '#101010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Food
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#98c379';
    ctx.beginPath();
    ctx.arc(food.x * SIZE + SIZE / 2, food.y * SIZE + SIZE / 2, SIZE / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#e8e8e8' : '#a0a0a0';
      ctx.fillRect(seg.x * SIZE + 1, seg.y * SIZE + 1, SIZE - 2, SIZE - 2);
    });
  }

  function update() {
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) { endGame(); return; }
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) { endGame(); return; }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      document.getElementById('sn-score').textContent = score;
      food = spawnFood();
      arcadeSound('pop');
    } else {
      snake.pop();
    }
    draw();
  }

  function endGame() {
    gameOver = true;
    clearInterval(interval);
    const pts = score;
    addArcadePoints(pts);
    const isNew = arcadeSaveBest('snake', pts, false);
    arcadeSound(pts > 50 ? 'win' : 'bad');
    setTimeout(() => {
      arcadeEndScreen(container, {
        icon: '🐍', title: 'Game Over', value: `${pts} points`,
        sub: `Snake length: ${snake.length}`, isNewBest: isNew, points: pts, again: startSnake
      });
    }, 300);
  }

  document.addEventListener('keydown', function snakeKey(e) {
    if (gameOver) { document.removeEventListener('keydown', snakeKey); return; }
    if (e.key === 'ArrowUp' && dir.y !== 1) dir = { x: 0, y: -1 };
    else if (e.key === 'ArrowDown' && dir.y !== -1) dir = { x: 0, y: 1 };
    else if (e.key === 'ArrowLeft' && dir.x !== 1) dir = { x: -1, y: 0 };
    else if (e.key === 'ArrowRight' && dir.x !== -1) dir = { x: 1, y: 0 };
  });

  // Touch/swipe support
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart || gameOver) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && dir.x !== -1) dir = { x: 1, y: 0 };
      else if (dx < -20 && dir.x !== 1) dir = { x: -1, y: 0 };
    } else {
      if (dy > 20 && dir.y !== -1) dir = { x: 0, y: 1 };
      else if (dy < -20 && dir.y !== 1) dir = { x: 0, y: -1 };
    }
  });

  draw();
  interval = setInterval(update, 120);
}

// ==================== 2048 ====================
function start2048() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests['2048'] || 0;
  let grid = Array(4).fill(null).map(() => Array(4).fill(0));
  let score = 0;
  let gameOver = false;

  addTile(); addTile();

  function render() {
    container.innerHTML = `
      <div class="page-pad" style="max-width:400px;margin:0 auto;text-align:center;">
        <button class="arcade-back-btn btn btn-ghost btn-sm" id="g2-back">← Back to Arcade</button>
        <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
          <div class="arcade-chip"><span>Score:</span> <span>${score}</span></div>
          <div class="arcade-chip"><span>Best:</span> <span>${Math.max(best, score)}</span></div>
        </div>
        <div class="g2048-board">${grid.map(row => row.map(v => `<div class="g2048-cell g2048-v${v}">${v || ''}</div>`).join('')).join('')}</div>
        <p style="font-size:11px;color:var(--text3);margin-top:8px;">Arrow keys or swipe</p>
      </div>
    `;
    document.getElementById('g2-back')?.addEventListener('click', () => renderGameCenter());
  }

  function addTile() {
    const empty = [];
    grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empty.push({ r, c }); }));
    if (empty.length === 0) return;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slide(row) {
    let arr = row.filter(v => v !== 0);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr.splice(i + 1, 1); }
    }
    while (arr.length < 4) arr.push(0);
    return arr;
  }

  function move(direction) {
    if (gameOver) return;
    const old = JSON.stringify(grid);
    if (direction === 'left') grid = grid.map(row => slide(row));
    else if (direction === 'right') grid = grid.map(row => slide(row.reverse()).reverse());
    else if (direction === 'up') {
      for (let c = 0; c < 4; c++) {
        let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        col = slide(col);
        for (let r = 0; r < 4; r++) grid[r][c] = col[r];
      }
    } else if (direction === 'down') {
      for (let c = 0; c < 4; c++) {
        let col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
        col = slide(col);
        for (let r = 0; r < 4; r++) grid[3 - r][c] = col[r];
      }
    }
    if (JSON.stringify(grid) !== old) {
      addTile();
      arcadeSound('tick');
      if (grid.flat().includes(2048)) { winGame(); return; }
      if (isStuck()) { loseGame(); return; }
    }
    render();
  }

  function isStuck() {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return false;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
    }
    return true;
  }

  function winGame() {
    gameOver = true;
    addArcadePoints(score);
    const isNew = arcadeSaveBest('2048', score, false);
    arcadeSound('win');
    arcadeEndScreen(container, { icon: '🏆', title: 'You reached 2048!', value: `${score} points`, isNewBest: isNew, points: score, again: start2048 });
  }

  function loseGame() {
    gameOver = true;
    addArcadePoints(Math.floor(score / 2));
    const isNew = arcadeSaveBest('2048', score, false);
    arcadeSound('bad');
    arcadeEndScreen(container, { icon: '🔢', title: 'No moves left', value: `${score} points`, isNewBest: isNew, points: Math.floor(score / 2), again: start2048 });
  }

  document.addEventListener('keydown', function g2Key(e) {
    if (gameOver) { document.removeEventListener('keydown', g2Key); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); move('left'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move('right'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move('up'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move('down'); }
  });

  // Touch
  let ts = null;
  document.addEventListener('touchstart', (e) => { ts = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
  document.addEventListener('touchend', (e) => {
    if (!ts || gameOver) return;
    const dx = e.changedTouches[0].clientX - ts.x;
    const dy = e.changedTouches[0].clientY - ts.y;
    if (Math.abs(dx) > Math.abs(dy)) { move(dx > 20 ? 'right' : dx < -20 ? 'left' : ''); }
    else { move(dy > 20 ? 'down' : dy < -20 ? 'up' : ''); }
    ts = null;
  });

  render();
}

// ==================== TYPING SPEED TEST ====================
function startTypingTest() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.typing || 0;

  const SENTENCES = [
    "The quick brown fox jumps over the lazy dog near the riverbank.",
    "She sells seashells by the seashore while the sun sets slowly.",
    "A journey of a thousand miles begins with a single step forward.",
    "To be or not to be that is the question pondered by many.",
    "All that glitters is not gold but something far more valuable.",
    "The rain in Spain falls mainly on the plain during autumn months.",
    "Knowledge is power and wisdom is the ability to use it well.",
    "In the middle of difficulty lies opportunity waiting to be found.",
    "Writing is easy just open a vein and bleed onto the page.",
    "The only way to do great work is to love what you do daily."
  ];

  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  let startTime = 0;
  let finished = false;

  container.innerHTML = `
    <div class="page-pad" style="max-width:600px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="tp-back">← Back to Arcade</button>
      <h2 style="margin:16px 0 8px;">Typing Speed Test</h2>
      <div class="arcade-chip" style="margin-bottom:16px;"><span>Best:</span> <span>${best} WPM</span></div>
      <div id="tp-text" style="font-size:16px;line-height:1.8;color:var(--text);background:var(--bg3);padding:20px;border-radius:var(--radius);text-align:left;margin-bottom:16px;font-family:var(--font-mono);letter-spacing:0.02em;">${sentence}</div>
      <textarea id="tp-input" class="modal-input" rows="3" placeholder="Start typing here..." style="font-size:15px;font-family:var(--font-mono);text-align:left;resize:none;"></textarea>
      <div id="tp-result" style="margin-top:16px;"></div>
    </div>
  `;

  document.getElementById('tp-back')?.addEventListener('click', () => renderGameCenter());

  const input = document.getElementById('tp-input');
  const textEl = document.getElementById('tp-text');
  input?.focus();

  input?.addEventListener('input', () => {
    if (finished) return;
    if (!startTime) startTime = Date.now();

    const typed = input.value;
    // Highlight correct/incorrect chars
    let html = '';
    for (let i = 0; i < sentence.length; i++) {
      if (i < typed.length) {
        html += typed[i] === sentence[i]
          ? `<span style="color:var(--green);">${escChar(sentence[i])}</span>`
          : `<span style="color:var(--red);text-decoration:underline;">${escChar(sentence[i])}</span>`;
      } else {
        html += `<span>${escChar(sentence[i])}</span>`;
      }
    }
    textEl.innerHTML = html;

    // Check if done
    if (typed.length >= sentence.length) {
      finished = true;
      const elapsed = (Date.now() - startTime) / 1000;
      const words = sentence.split(' ').length;
      const wpm = Math.round((words / elapsed) * 60);
      const correct = typed.split('').filter((c, i) => c === sentence[i]).length;
      const accuracy = Math.round((correct / sentence.length) * 100);
      const pts = wpm + accuracy;

      addArcadePoints(pts);
      const isNew = arcadeSaveBest('typing', wpm, false);
      arcadeSound(wpm > 40 ? 'win' : 'good');

      document.getElementById('tp-result').innerHTML = `
        <div style="font-size:28px;font-weight:700;color:var(--accent);">${wpm} WPM</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px;">Accuracy: ${accuracy}% · Time: ${elapsed.toFixed(1)}s</div>
        ${isNew ? '<div class="tag tag-green" style="margin-top:8px;">New Best! 🏆</div>' : ''}
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
          <button class="btn btn-primary" id="tp-again">Try Again</button>
          <button class="btn" id="tp-back2">Back</button>
        </div>
      `;
      document.getElementById('tp-again')?.addEventListener('click', startTypingTest);
      document.getElementById('tp-back2')?.addEventListener('click', renderGameCenter);
    }
  });

  function escChar(c) { return c === ' ' ? '&nbsp;' : c.replace(/[<>&]/g, m => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[m]); }
}

// ==================== MEMORY MATCH ====================
function startMemoryMatch() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.memory || 0;

  const EMOJIS = ['🎨', '🎵', '📚', '🌟', '🔮', '🎭', '🧩', '🎲'];
  const cards = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);
  let flipped = [];
  let matched = [];
  let moves = 0;
  let startTime = Date.now();
  let locked = false;

  function render() {
    container.innerHTML = `
      <div class="page-pad" style="max-width:420px;margin:0 auto;text-align:center;">
        <button class="arcade-back-btn btn btn-ghost btn-sm" id="mm-back">← Back to Arcade</button>
        <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
          <div class="arcade-chip"><span>Moves:</span> <span>${moves}</span></div>
          <div class="arcade-chip"><span>Pairs:</span> <span>${matched.length / 2}/8</span></div>
          <div class="arcade-chip"><span>Best:</span> <span>${best || '—'}</span></div>
        </div>
        <div class="memory-board">${cards.map((emoji, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(i);
          return `<div class="memory-card ${isFlipped ? 'flipped' : ''}" data-idx="${i}">${isFlipped ? emoji : '?'}</div>`;
        }).join('')}</div>
      </div>
    `;

    document.getElementById('mm-back')?.addEventListener('click', () => renderGameCenter());
    container.querySelectorAll('.memory-card:not(.flipped)').forEach(card => {
      card.addEventListener('click', () => flipCard(parseInt(card.getAttribute('data-idx'))));
    });
  }

  function flipCard(idx) {
    if (locked || flipped.includes(idx) || matched.includes(idx)) return;
    flipped.push(idx);
    arcadeSound('tick');
    render();

    if (flipped.length === 2) {
      moves++;
      locked = true;
      const [a, b] = flipped;
      if (cards[a] === cards[b]) {
        matched.push(a, b);
        flipped = [];
        locked = false;
        arcadeSound('good');
        render();
        if (matched.length === cards.length) winMemory();
      } else {
        setTimeout(() => { flipped = []; locked = false; render(); }, 800);
      }
    }
  }

  function winMemory() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const pts = Math.max(10, 100 - moves - elapsed);
    addArcadePoints(pts);
    const isNew = arcadeSaveBest('memory', moves, true);
    arcadeSound('win');
    setTimeout(() => {
      arcadeEndScreen(container, {
        icon: '🧠', title: 'All pairs found!', value: `${moves} moves`,
        sub: `Time: ${elapsed}s`, isNewBest: isNew, points: pts, again: startMemoryMatch
      });
    }, 500);
  }

  render();
}


// ==================== TETRIS ====================
function startTetris() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.tetris || 0;
  const W = 10, H = 20, SZ = 18;

  const SHAPES = [
    [[1,1,1,1]],
    [[1,1],[1,1]],
    [[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1]],
    [[0,0,1],[1,1,1]],
    [[1,1,0],[0,1,1]],
    [[0,1,1],[1,1,0]]
  ];
  const COLORS = ['#56b6c2','#d19a66','#c678dd','#61afef','#e06c75','#98c379','#e8c88a'];

  let board = Array(H).fill(null).map(() => Array(W).fill(0));
  let colorBoard = Array(H).fill(null).map(() => Array(W).fill(''));
  let piece, pieceColor, px, py, score = 0, lines = 0, level = 1, gameOver = false, interval;

  function newPiece() {
    const idx = Math.floor(Math.random() * SHAPES.length);
    piece = SHAPES[idx].map(r => [...r]);
    pieceColor = COLORS[idx];
    px = Math.floor((W - piece[0].length) / 2);
    py = 0;
    if (collides(px, py, piece)) { gameOver = true; endTetris(); }
  }

  function collides(cx, cy, p) {
    for (let r = 0; r < p.length; r++) for (let c = 0; c < p[r].length; c++) {
      if (!p[r][c]) continue;
      const nx = cx + c, ny = cy + r;
      if (nx < 0 || nx >= W || ny >= H) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
    return false;
  }

  function lock() {
    for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
      if (!piece[r][c]) continue;
      const ny = py + r;
      if (ny < 0) continue;
      board[ny][px + c] = 1;
      colorBoard[ny][px + c] = pieceColor;
    }
    clearLines();
    newPiece();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = H - 1; r >= 0; r--) {
      if (board[r].every(v => v)) {
        board.splice(r, 1);
        colorBoard.splice(r, 1);
        board.unshift(Array(W).fill(0));
        colorBoard.unshift(Array(W).fill(''));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += [0, 40, 100, 300, 1200][cleared] * level;
      level = Math.floor(lines / 10) + 1;
      arcadeSound('good');
    }
  }

  function rotate() {
    const rotated = piece[0].map((_, c) => piece.map(row => row[c]).reverse());
    if (!collides(px, py, rotated)) piece = rotated;
  }

  function drop() {
    if (gameOver) return;
    if (!collides(px, py + 1, piece)) py++;
    else { lock(); }
    draw();
  }

  function draw() {
    const canvas = document.getElementById('tt-c');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Board
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (board[r][c]) {
        ctx.fillStyle = colorBoard[r][c] || '#888';
        ctx.fillRect(c * SZ, r * SZ, SZ - 1, SZ - 1);
      }
    }

    // Current piece
    if (piece) {
      ctx.fillStyle = pieceColor;
      for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
        if (piece[r][c]) ctx.fillRect((px + c) * SZ, (py + r) * SZ, SZ - 1, SZ - 1);
      }
    }

    // Update score display
    const se = document.getElementById('tt-score');
    const le = document.getElementById('tt-lines');
    if (se) se.textContent = score;
    if (le) le.textContent = lines;
  }

  function endTetris() {
    clearInterval(interval);
    addArcadePoints(score);
    const isNew = arcadeSaveBest('tetris', score, false);
    arcadeSound(score > 500 ? 'win' : 'bad');
    setTimeout(() => {
      arcadeEndScreen(container, { icon: '🟦', title: 'Game Over', value: `${score} pts`, sub: `${lines} lines · Level ${level}`, isNewBest: isNew, points: score, again: startTetris });
    }, 300);
  }

  container.innerHTML = `
    <div class="page-pad" style="max-width:400px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="tt-back">← Back to Arcade</button>
      <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
        <div class="arcade-chip"><span>Score:</span> <span id="tt-score">0</span></div>
        <div class="arcade-chip"><span>Lines:</span> <span id="tt-lines">0</span></div>
        <div class="arcade-chip"><span>Best:</span> <span>${best}</span></div>
      </div>
      <canvas id="tt-c" width="${W*SZ}" height="${H*SZ}" style="background:#080808;border:1px solid var(--border);border-radius:var(--radius);display:block;margin:0 auto;"></canvas>
      <p style="font-size:11px;color:var(--text3);margin-top:8px;">←→ move · ↑ rotate · ↓ fast drop · Space hard drop</p>
    </div>
  `;

  document.getElementById('tt-back')?.addEventListener('click', () => { clearInterval(interval); renderGameCenter(); });

  document.addEventListener('keydown', function ttKey(e) {
    if (gameOver) { document.removeEventListener('keydown', ttKey); return; }
    if (e.key === 'ArrowLeft') { if (!collides(px - 1, py, piece)) px--; draw(); }
    else if (e.key === 'ArrowRight') { if (!collides(px + 1, py, piece)) px++; draw(); }
    else if (e.key === 'ArrowDown') { drop(); }
    else if (e.key === 'ArrowUp') { rotate(); draw(); }
    else if (e.key === ' ') { e.preventDefault(); while (!collides(px, py + 1, piece)) py++; lock(); draw(); }
  });

  // Touch controls
  let tx = null;
  const canvas = document.getElementById('tt-c');
  canvas?.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; });
  canvas?.addEventListener('touchend', (e) => {
    if (tx === null || gameOver) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) < 20) { rotate(); draw(); }
    else if (dx > 20) { if (!collides(px + 1, py, piece)) px++; draw(); }
    else if (dx < -20) { if (!collides(px - 1, py, piece)) px--; draw(); }
    tx = null;
  });
  canvas?.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

  newPiece();
  draw();
  interval = setInterval(() => { drop(); }, Math.max(100, 500 - level * 40));
}

// ==================== FLAPPY BIRD ====================
function startFlappy() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.flappy || 0;

  container.innerHTML = `
    <div class="page-pad" style="max-width:400px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="fl-back">← Back to Arcade</button>
      <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
        <div class="arcade-chip"><span>Score:</span> <span id="fl-score">0</span></div>
        <div class="arcade-chip"><span>Best:</span> <span>${best}</span></div>
      </div>
      <canvas id="fl-c" width="280" height="400" style="background:#0a1a0a;border:1px solid var(--border);border-radius:var(--radius);display:block;margin:0 auto;cursor:pointer;"></canvas>
      <p style="font-size:11px;color:var(--text3);margin-top:8px;">Click / tap / space to flap</p>
    </div>
  `;

  document.getElementById('fl-back')?.addEventListener('click', () => { gameOver = true; renderGameCenter(); });

  const canvas = document.getElementById('fl-c');
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;

  let bird = { x: 60, y: 200, vy: 0, r: 10 };
  let pipes = [];
  let score = 0, frame = 0, gameOver = false, started = false;
  let animFrame;

  const GAP = 110, PIPE_W = 40, PIPE_SPEED = 2, GRAVITY = 0.4, FLAP = -6.5;

  function flap() {
    if (gameOver) return;
    if (!started) started = true;
    bird.vy = FLAP;
    arcadeSound('tick');
  }

  canvas.addEventListener('click', flap);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); });
  document.addEventListener('keydown', function flKey(e) {
    if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap(); }
    if (gameOver) document.removeEventListener('keydown', flKey);
  });

  function update() {
    if (!started || gameOver) return;
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Spawn pipes
    if (frame % 90 === 0) {
      const topH = 50 + Math.random() * (CH - GAP - 100);
      pipes.push({ x: CW, top: topH, passed: false });
    }

    // Move pipes
    pipes.forEach(p => { p.x -= PIPE_SPEED; });
    pipes = pipes.filter(p => p.x + PIPE_W > -10);

    // Collision
    pipes.forEach(p => {
      if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
        if (bird.y - bird.r < p.top || bird.y + bird.r > p.top + GAP) {
          gameOver = true;
        }
      }
      if (!p.passed && p.x + PIPE_W < bird.x) {
        p.passed = true;
        score++;
        document.getElementById('fl-score').textContent = score;
        arcadeSound('pop');
      }
    });

    // Floor/ceiling
    if (bird.y + bird.r > CH || bird.y - bird.r < 0) gameOver = true;

    frame++;
  }

  function draw() {
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, 0, CW, CH);

    // Pipes
    ctx.fillStyle = '#2a5a2a';
    pipes.forEach(p => {
      ctx.fillRect(p.x, 0, PIPE_W, p.top);
      ctx.fillRect(p.x, p.top + GAP, PIPE_W, CH - p.top - GAP);
    });

    // Bird
    ctx.fillStyle = '#98c379';
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
    ctx.fill();

    // Score on screen
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(score, CW / 2, 40);

    if (!started) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px monospace';
      ctx.fillText('Tap to start', CW / 2, CH / 2);
    }
  }

  function loop() {
    update();
    draw();
    if (gameOver) {
      endFlappy();
      return;
    }
    animFrame = requestAnimationFrame(loop);
  }

  function endFlappy() {
    const pts = score * 10;
    addArcadePoints(pts);
    const isNew = arcadeSaveBest('flappy', score, false);
    arcadeSound(score > 10 ? 'win' : 'bad');
    setTimeout(() => {
      arcadeEndScreen(container, { icon: '🐦', title: 'Game Over', value: `${score} pipes`, sub: `+${pts} points`, isNewBest: isNew, points: pts, again: startFlappy });
    }, 400);
  }

  draw();
  loop();
}

// ==================== DINO RUNNER ====================
function startRunner() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.runner || 0;

  container.innerHTML = `
    <div class="page-pad" style="max-width:500px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="rn-back">← Back to Arcade</button>
      <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
        <div class="arcade-chip"><span>Score:</span> <span id="rn-score">0</span></div>
        <div class="arcade-chip"><span>Best:</span> <span>${best}</span></div>
      </div>
      <canvas id="rn-c" width="480" height="160" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);display:block;margin:0 auto;max-width:100%;cursor:pointer;"></canvas>
      <p style="font-size:11px;color:var(--text3);margin-top:8px;">Space / tap to jump · ↓ to duck</p>
    </div>
  `;

  document.getElementById('rn-back')?.addEventListener('click', () => { gameOver = true; renderGameCenter(); });

  const canvas = document.getElementById('rn-c');
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  const GROUND = CH - 30;

  let dino = { x: 50, y: GROUND, vy: 0, h: 30, w: 20, ducking: false };
  let obstacles = [];
  let score = 0, speed = 4, frame = 0, gameOver = false;
  let animFrame;

  const GRAVITY = 0.8, JUMP = -12;

  function jump() {
    if (gameOver) return;
    if (dino.y >= GROUND) {
      dino.vy = JUMP;
      arcadeSound('tick');
    }
  }

  canvas.addEventListener('click', jump);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); });
  document.addEventListener('keydown', function rnKey(e) {
    if (gameOver) { document.removeEventListener('keydown', rnKey); return; }
    if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump(); }
    if (e.key === 'ArrowDown') { dino.ducking = true; }
  });
  document.addEventListener('keyup', function rnKeyUp(e) {
    if (e.key === 'ArrowDown') dino.ducking = false;
    if (gameOver) document.removeEventListener('keyup', rnKeyUp);
  });

  function update() {
    if (gameOver) return;

    // Dino physics
    dino.vy += GRAVITY;
    dino.y += dino.vy;
    if (dino.y > GROUND) { dino.y = GROUND; dino.vy = 0; }
    dino.h = dino.ducking ? 15 : 30;

    // Spawn obstacles
    if (frame % Math.floor(60 / (speed / 4)) === 0 && frame > 30) {
      const h = 15 + Math.random() * 25;
      const type = Math.random() > 0.7 ? 'tall' : 'short';
      obstacles.push({ x: CW, h: type === 'tall' ? 35 : h, w: 15 + Math.random() * 10 });
    }

    // Move obstacles
    obstacles.forEach(o => { o.x -= speed; });
    obstacles = obstacles.filter(o => o.x + o.w > 0);

    // Collision
    const dinoBox = { x: dino.x, y: dino.y - dino.h, w: dino.w, h: dino.h };
    obstacles.forEach(o => {
      const oBox = { x: o.x, y: GROUND - o.h, w: o.w, h: o.h };
      if (dinoBox.x + dinoBox.w > oBox.x && dinoBox.x < oBox.x + oBox.w &&
          dinoBox.y + dinoBox.h > oBox.y && dinoBox.y < oBox.y + oBox.h) {
        gameOver = true;
      }
    });

    // Score
    score = Math.floor(frame / 6);
    speed = 4 + Math.floor(frame / 300) * 0.5;
    document.getElementById('rn-score').textContent = score;
    frame++;
  }

  function draw() {
    ctx.clearRect(0, 0, CW, CH);

    // Ground line
    ctx.strokeStyle = 'var(--border2)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    ctx.lineTo(CW, GROUND);
    ctx.stroke();

    // Dino
    ctx.fillStyle = '#98c379';
    ctx.fillRect(dino.x, dino.y - dino.h, dino.w, dino.h);

    // Obstacles
    ctx.fillStyle = '#e06c75';
    obstacles.forEach(o => {
      ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
    });

    // Score
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(score, CW - 10, 20);
  }

  function loop() {
    update();
    draw();
    if (gameOver) { endRunner(); return; }
    animFrame = requestAnimationFrame(loop);
  }

  function endRunner() {
    const pts = score;
    addArcadePoints(pts);
    const isNew = arcadeSaveBest('runner', score, false);
    arcadeSound(score > 100 ? 'win' : 'bad');
    setTimeout(() => {
      arcadeEndScreen(container, { icon: '🏃', title: 'Game Over', value: `${score} meters`, isNewBest: isNew, points: pts, again: startRunner });
    }, 300);
  }

  loop();
}


// ==================== PONG ====================
function startPong() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.pong || 0;

  container.innerHTML = `
    <div class="page-pad" style="max-width:400px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="pg-back">← Back to Arcade</button>
      <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
        <div class="arcade-chip"><span>You:</span> <span id="pg-player">0</span></div>
        <div class="arcade-chip"><span>AI:</span> <span id="pg-ai">0</span></div>
        <div class="arcade-chip"><span>Best rally:</span> <span>${best}</span></div>
      </div>
      <canvas id="pg-c" width="300" height="400" style="background:#080808;border:1px solid var(--border);border-radius:var(--radius);display:block;margin:0 auto;"></canvas>
      <p style="font-size:11px;color:var(--text3);margin-top:8px;">Mouse / touch to move paddle</p>
    </div>
  `;

  document.getElementById('pg-back')?.addEventListener('click', () => { running = false; renderGameCenter(); });

  const canvas = document.getElementById('pg-c');
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;

  const PW = 60, PH = 8;
  let playerX = CW / 2 - PW / 2;
  let aiX = CW / 2 - PW / 2;
  let ball = { x: CW / 2, y: CH / 2, vx: 3, vy: 3, r: 6 };
  let playerScore = 0, aiScore = 0, rally = 0, maxRally = 0, running = true;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    playerX = ((e.clientX - rect.left) / rect.width) * CW - PW / 2;
    playerX = Math.max(0, Math.min(CW - PW, playerX));
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    playerX = ((e.touches[0].clientX - rect.left) / rect.width) * CW - PW / 2;
    playerX = Math.max(0, Math.min(CW - PW, playerX));
  }, { passive: false });

  function update() {
    // Ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Walls
    if (ball.x - ball.r <= 0 || ball.x + ball.r >= CW) ball.vx = -ball.vx;

    // Player paddle (bottom)
    if (ball.y + ball.r >= CH - 20 && ball.x >= playerX && ball.x <= playerX + PW) {
      ball.vy = -Math.abs(ball.vy) - 0.2;
      ball.vx += (ball.x - (playerX + PW / 2)) * 0.1;
      rally++;
      maxRally = Math.max(maxRally, rally);
      arcadeSound('tick');
    }

    // AI paddle (top)
    if (ball.y - ball.r <= 20 && ball.x >= aiX && ball.x <= aiX + PW) {
      ball.vy = Math.abs(ball.vy) + 0.1;
      rally++;
      arcadeSound('tick');
    }

    // AI movement
    const aiCenter = aiX + PW / 2;
    const aiSpeed = 3 + Math.min(rally * 0.1, 4);
    if (ball.x < aiCenter - 10) aiX -= aiSpeed;
    else if (ball.x > aiCenter + 10) aiX += aiSpeed;
    aiX = Math.max(0, Math.min(CW - PW, aiX));

    // Score
    if (ball.y + ball.r > CH) {
      aiScore++;
      document.getElementById('pg-ai').textContent = aiScore;
      resetBall();
    }
    if (ball.y - ball.r < 0) {
      playerScore++;
      document.getElementById('pg-player').textContent = playerScore;
      resetBall();
    }
  }

  function resetBall() {
    ball.x = CW / 2; ball.y = CH / 2;
    ball.vx = (Math.random() > 0.5 ? 3 : -3);
    ball.vy = (Math.random() > 0.5 ? 3 : -3);
    if (maxRally > 0) {
      addArcadePoints(maxRally);
      arcadeSaveBest('pong', maxRally, false);
    }
    rally = 0;
  }

  function draw() {
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, CW, CH);

    // Center line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(0, CH / 2); ctx.lineTo(CW, CH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#98c379';
    ctx.fillRect(playerX, CH - 20, PW, PH);
    ctx.fillStyle = '#e06c75';
    ctx.fillRect(aiX, 12, PW, PH);

    // Ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    // Rally counter
    ctx.fillStyle = '#555';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Rally: ${rally}`, CW / 2, CH / 2 + 20);
  }

  function loop() {
    if (!running) return;
    update(); draw();
    requestAnimationFrame(loop);
  }
  loop();
}

// ==================== ASTEROIDS ====================
function startAsteroids() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.asteroids || 0;

  container.innerHTML = `
    <div class="page-pad" style="max-width:420px;margin:0 auto;text-align:center;">
      <button class="arcade-back-btn btn btn-ghost btn-sm" id="as-back">← Back to Arcade</button>
      <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
        <div class="arcade-chip"><span>Score:</span> <span id="as-score">0</span></div>
        <div class="arcade-chip"><span>Best:</span> <span>${best}</span></div>
      </div>
      <canvas id="as-c" width="360" height="360" style="background:#050505;border:1px solid var(--border);border-radius:var(--radius);display:block;margin:0 auto;"></canvas>
      <p style="font-size:11px;color:var(--text3);margin-top:8px;">← → rotate · ↑ thrust · Space shoot · Tap to shoot</p>
    </div>
  `;

  document.getElementById('as-back')?.addEventListener('click', () => { gameOver = true; renderGameCenter(); });

  const canvas = document.getElementById('as-c');
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;

  let ship = { x: CW / 2, y: CH / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
  let bullets = [];
  let asteroids = [];
  let score = 0, gameOver = false, keys = {};

  function spawnAsteroid(x, y, size) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 1.5;
    asteroids.push({ x: x ?? Math.random() * CW, y: y ?? Math.random() * CH, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: size || 30 });
  }

  for (let i = 0; i < 4; i++) spawnAsteroid();

  document.addEventListener('keydown', function asKD(e) { keys[e.key] = true; if (gameOver) document.removeEventListener('keydown', asKD); });
  document.addEventListener('keyup', function asKU(e) { keys[e.key] = false; if (gameOver) document.removeEventListener('keyup', asKU); });

  canvas.addEventListener('click', () => shoot());
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); shoot(); });

  let shootCooldown = 0;
  function shoot() {
    if (gameOver || shootCooldown > 0) return;
    bullets.push({ x: ship.x + Math.cos(ship.angle) * 14, y: ship.y + Math.sin(ship.angle) * 14, vx: Math.cos(ship.angle) * 7, vy: Math.sin(ship.angle) * 7, life: 50 });
    shootCooldown = 8;
    arcadeSound('tick');
  }

  function update() {
    if (gameOver) return;
    if (shootCooldown > 0) shootCooldown--;

    // Ship controls
    if (keys['ArrowLeft']) ship.angle -= 0.06;
    if (keys['ArrowRight']) ship.angle += 0.06;
    if (keys['ArrowUp']) { ship.vx += Math.cos(ship.angle) * 0.15; ship.vy += Math.sin(ship.angle) * 0.15; }
    if (keys[' ']) shoot();

    // Ship movement
    ship.x += ship.vx; ship.y += ship.vy;
    ship.vx *= 0.99; ship.vy *= 0.99;
    // Wrap
    if (ship.x < 0) ship.x = CW; if (ship.x > CW) ship.x = 0;
    if (ship.y < 0) ship.y = CH; if (ship.y > CH) ship.y = 0;

    // Bullets
    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    bullets = bullets.filter(b => b.life > 0 && b.x >= 0 && b.x <= CW && b.y >= 0 && b.y <= CH);

    // Asteroids
    asteroids.forEach(a => {
      a.x += a.vx; a.y += a.vy;
      if (a.x < -a.size) a.x = CW + a.size;
      if (a.x > CW + a.size) a.x = -a.size;
      if (a.y < -a.size) a.y = CH + a.size;
      if (a.y > CH + a.size) a.y = -a.size;
    });

    // Bullet-asteroid collision
    bullets.forEach(b => {
      asteroids.forEach(a => {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < a.size) {
          b.life = 0;
          a.size = 0; // Mark for removal
          score += 10;
          document.getElementById('as-score').textContent = score;
          arcadeSound('pop');
          // Split
          if (a.size === 0 && arguments[1] !== true) {
            // Already marked, but let's check original size
          }
        }
      });
    });

    // Remove destroyed, split large ones
    const toSplit = asteroids.filter(a => a.size === 0);
    asteroids = asteroids.filter(a => a.size > 0);
    toSplit.forEach(a => {
      if (a._origSize > 15) {
        spawnAsteroid(a.x, a.y, a._origSize / 2);
        spawnAsteroid(a.x, a.y, a._origSize / 2);
      }
    });

    // Spawn more asteroids over time
    if (asteroids.length < 3 + Math.floor(score / 50)) {
      spawnAsteroid();
    }

    // Ship-asteroid collision
    asteroids.forEach(a => {
      const dx = ship.x - a.x, dy = ship.y - a.y;
      if (Math.sqrt(dx * dx + dy * dy) < a.size + 8) {
        gameOver = true;
      }
    });
  }

  // Fix: track original size for splitting
  const origSpawn = spawnAsteroid;

  function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CW, CH);

    // Ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = '#98c379';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(-8, -7); ctx.lineTo(-5, 0); ctx.lineTo(-8, 7); ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Bullets
    ctx.fillStyle = '#fff';
    bullets.forEach(b => { ctx.fillRect(b.x - 1, b.y - 1, 3, 3); });

    // Asteroids
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    asteroids.forEach(a => {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function loop() {
    update(); draw();
    if (gameOver) {
      addArcadePoints(score);
      const isNew = arcadeSaveBest('asteroids', score, false);
      arcadeSound(score > 100 ? 'win' : 'bad');
      setTimeout(() => {
        arcadeEndScreen(container, { icon: '☄️', title: 'Destroyed!', value: `${score} points`, isNewBest: isNew, points: score, again: startAsteroids });
      }, 300);
      return;
    }
    requestAnimationFrame(loop);
  }
  loop();
}

// ==================== COLOR MATCH ====================
function startColorMatch() {
  ensureArcade();
  const container = document.getElementById('view-game-center');
  const best = state.arcade.bests.colormatch || 0;

  const COLORS = [
    { name: 'Red', hex: '#e06c75' },
    { name: 'Green', hex: '#98c379' },
    { name: 'Blue', hex: '#61afef' },
    { name: 'Purple', hex: '#c678dd' },
    { name: 'Orange', hex: '#d19a66' },
    { name: 'Teal', hex: '#56b6c2' }
  ];

  let score = 0, lives = 3, speed = 2500, gameOver = false;
  let currentColor, displayedName, timer;

  function newRound() {
    if (gameOver) return;
    currentColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Display a DIFFERENT color name (tricky) sometimes
    const isTricky = Math.random() > 0.4;
    if (isTricky) {
      const others = COLORS.filter(c => c.name !== currentColor.name);
      displayedName = others[Math.floor(Math.random() * others.length)].name;
    } else {
      displayedName = currentColor.name;
    }
    render();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { loseLife(); }, speed);
  }

  function loseLife() {
    lives--;
    arcadeSound('bad');
    if (lives <= 0) { endColorMatch(); return; }
    newRound();
  }

  function checkAnswer(answer) {
    if (gameOver) return;
    clearTimeout(timer);
    // Correct if you tap the COLOR shown (not the text)
    if (answer === currentColor.name) {
      score++;
      speed = Math.max(800, speed - 50);
      arcadeSound('pop');
      newRound();
    } else {
      loseLife();
    }
  }

  function endColorMatch() {
    gameOver = true;
    clearTimeout(timer);
    addArcadePoints(score * 5);
    const isNew = arcadeSaveBest('colormatch', score, false);
    arcadeSound(score > 20 ? 'win' : 'bad');
    arcadeEndScreen(container, { icon: '🎨', title: 'Game Over', value: `${score} correct`, sub: 'Tap the COLOR, not the word!', isNewBest: isNew, points: score * 5, again: startColorMatch });
  }

  function render() {
    container.innerHTML = `
      <div class="page-pad" style="max-width:400px;margin:0 auto;text-align:center;">
        <button class="arcade-back-btn btn btn-ghost btn-sm" id="cm-back">← Back to Arcade</button>
        <div style="display:flex;gap:10px;justify-content:center;margin:12px 0;">
          <div class="arcade-chip"><span>Score:</span> <span>${score}</span></div>
          <div class="arcade-chip"><span>Lives:</span> <span>${'❤️'.repeat(lives)}</span></div>
          <div class="arcade-chip"><span>Best:</span> <span>${best}</span></div>
        </div>
        <div style="margin:30px 0;">
          <p style="font-size:12px;color:var(--text3);margin-bottom:8px;">What COLOR is this text?</p>
          <div style="font-size:42px;font-weight:700;color:${currentColor.hex};">${displayedName}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:300px;margin:0 auto;">
          ${COLORS.map(c => `<button class="btn cm-answer" data-color="${c.name}" style="background:${c.hex};color:#000;font-weight:600;padding:12px;">${c.name}</button>`).join('')}
        </div>
        <p style="font-size:11px;color:var(--text3);margin-top:16px;">Tap the button matching the TEXT COLOR, not what it says!</p>
      </div>
    `;

    document.getElementById('cm-back')?.addEventListener('click', () => { gameOver = true; clearTimeout(timer); renderGameCenter(); });
    container.querySelectorAll('.cm-answer').forEach(btn => {
      btn.addEventListener('click', () => checkAnswer(btn.getAttribute('data-color')));
    });
  }

  newRound();
}
