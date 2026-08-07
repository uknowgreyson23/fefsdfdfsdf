(() => {
  'use strict';

  const root = document.documentElement;
  const WORKSPACE_HASH = '#workspace';
  const SECRET_CODE = '423232323232';
  const SETTINGS_KEY = 'tangent-settings';
  const DEFAULT_SETTINGS = {
    accent: 'coral',
    glass: true,
    motion: true,
    sounds: false,
    separators: true,
    history: true
  };

  function storageGet(key, fallback = null, session = false) {
    try {
      const value = (session ? sessionStorage : localStorage).getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value, session = false) {
    try {
      const store = session ? sessionStorage : localStorage;
      if (value === null) store.removeItem(key);
      else store.setItem(key, value);
    } catch {
      // Tangent remains functional when storage is unavailable.
    }
  }

  function readSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(storageGet(SETTINGS_KEY, '{}')) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  let settings = readSettings();
  const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
  let themeChoice = storageGet('tangent-theme', 'system');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function resolvedTheme(choice = themeChoice) {
    return choice === 'system' ? (mediaDark.matches ? 'dark' : 'light') : choice;
  }

  function refreshThemeButtons() {
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.dataset.themeChoice === themeChoice;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyTheme(choice = themeChoice) {
    themeChoice = choice;
    const theme = resolvedTheme(choice);
    root.dataset.theme = theme;
    const toggle = document.querySelector('[data-theme-toggle]');
    const label = document.querySelector('[data-theme-label]');
    if (label) label.textContent = theme === 'dark' ? 'Light' : 'Dark';
    if (toggle) toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    if (themeColor) {
      const accent = getComputedStyle(root).getPropertyValue('--accent').trim();
      themeColor.setAttribute('content', theme === 'dark' ? '#0c0f0e' : accent || '#ee6c4d');
    }
    refreshThemeButtons();
  }

  function applySettings() {
    root.dataset.accent = settings.accent;
    root.dataset.glass = settings.glass ? 'on' : 'off';
    root.dataset.motion = settings.motion ? 'on' : 'off';
  }

  function saveSettings() {
    storageSet(SETTINGS_KEY, JSON.stringify(settings));
    applySettings();
    applyTheme();
  }

  applySettings();
  applyTheme();

  mediaDark.addEventListener?.('change', () => {
    if (themeChoice === 'system') applyTheme('system');
  });

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    storageSet('tangent-theme', next);
    applyTheme(next);
  });

  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      storageSet('tangent-theme', button.dataset.themeChoice);
      applyTheme(button.dataset.themeChoice);
      playTone(520, 0.045);
    });
  });

  const workspace = document.querySelector('[data-workspace]');
  let secretBuffer = '';

  function openWorkspace() {
    if (!workspace) {
      window.location.href = `index.html${WORKSPACE_HASH}`;
      return;
    }
    workspace.hidden = false;
    workspace.setAttribute('aria-hidden', 'false');
    document.body.classList.add('workspace-open');
    document.querySelector('[data-workspace-close]')?.focus();
    try {
      history.replaceState(null, '', 'index.html');
    } catch {
      // Local-file browser policies may keep the harmless workspace hash visible.
    }
  }

  function closeWorkspace() {
    if (!workspace) return;
    workspace.hidden = true;
    workspace.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('workspace-open', 'ultra-glass');
    document.querySelector('[data-display]')?.focus?.();
  }

  function registerSecretDigit(digit) {
    secretBuffer = `${secretBuffer}${digit}`.slice(-SECRET_CODE.length);
    if (secretBuffer === SECRET_CODE) {
      secretBuffer = '';
      openWorkspace();
    }
  }

  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey && /^\d$/.test(event.key)) {
      registerSecretDigit(event.key);
    }
    if (event.key === 'Escape' && workspace && !workspace.hidden) closeWorkspace();
  });

  document.addEventListener('click', (event) => {
    const digitKey = event.target.closest('[data-action="digit"][data-value]');
    if (digitKey) registerSecretDigit(digitKey.dataset.value);
  });

  document.querySelectorAll('[data-workspace-close]').forEach((button) => {
    button.addEventListener('click', closeWorkspace);
  });

  if (workspace && window.location.hash === WORKSPACE_HASH) openWorkspace();

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const clock = document.querySelector('[data-clock]');
  const date = document.querySelector('[data-date]');

  function updateClock() {
    const now = new Date();
    if (clock) {
      clock.textContent = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric', minute: '2-digit'
      }).format(now);
    }
    if (date) {
      date.textContent = new Intl.DateTimeFormat(undefined, {
        weekday: 'long', month: 'long', day: 'numeric'
      }).format(now);
    }
  }

  updateClock();
  if (clock) window.setInterval(updateClock, 30000);

  let audioContext;

  function playTone(frequency = 420, duration = 0.035) {
    if (!settings.sounds) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Audio feedback is an optional enhancement.
    }
  }

  document.addEventListener('click', (event) => {
    const interactive = event.target.closest('button, .key, .button');
    if (interactive && !interactive.matches('[data-reaction-stage]')) playTone(420, 0.035);
  });

  function showToast(message) {
    let toast = document.querySelector('[data-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.dataset.toast = '';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  // Settings page
  document.querySelectorAll('[data-setting]').forEach((control) => {
    const key = control.dataset.setting;
    if (control.type === 'radio') control.checked = settings[key] === control.value;
    else if (control.type === 'checkbox') control.checked = Boolean(settings[key]);
    else control.value = settings[key];

    control.addEventListener('change', () => {
      if (control.type === 'radio' && !control.checked) return;
      settings[key] = control.type === 'checkbox' ? control.checked : control.value;
      saveSettings();
    });
  });

  function historyCount() {
    try {
      return JSON.parse(storageGet('tangent-history', '[]')).length;
    } catch {
      return 0;
    }
  }

  function updateHistoryCount() {
    document.querySelectorAll('[data-history-count]').forEach((node) => {
      node.textContent = historyCount();
    });
  }

  updateHistoryCount();

  document.querySelector('[data-settings-clear-history]')?.addEventListener('click', () => {
    storageSet('tangent-history', null);
    updateHistoryCount();
    showToast('Calculation history cleared');
  });

  const resetButton = document.querySelector('[data-reset-tangent]');
  let resetArmed = false;
  resetButton?.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      resetButton.textContent = 'Click again to confirm reset';
      window.setTimeout(() => {
        resetArmed = false;
        resetButton.textContent = 'Reset all Tangent data';
      }, 3500);
      return;
    }
    ['tangent-settings', 'tangent-theme', 'tangent-history', 'tangent-memory', 'tangent-angle', 'tangent-vault-notes', 'tangent-workspace-notes', 'tangent-reaction-best'].forEach((key) => storageSet(key, null));
    window.location.reload();
  });

  // Google browser
  const browserFrame = document.querySelector('[data-browser-frame]');
  const browserForm = document.querySelector('[data-browser-form]');
  const browserInput = document.querySelector('[data-browser-input]');
  const externalSearchLinks = document.querySelectorAll('[data-browser-external]');
  const browserLoading = document.querySelector('[data-browser-loading]');

  function googleSearchUrl(query = '') {
    const trimmed = query.trim();
    return trimmed ? `https://www.google.com/search?q=${encodeURIComponent(trimmed)}` : 'https://www.google.com/';
  }

  function updateExternalSearch() {
    if (!browserInput) return;
    externalSearchLinks.forEach((link) => {
      link.href = googleSearchUrl(browserInput.value);
    });
  }

  if (browserForm && browserInput) {
    browserInput.addEventListener('input', updateExternalSearch);
    browserForm.addEventListener('submit', () => {
      browserLoading?.classList.add('is-visible');
      updateExternalSearch();
    });
    updateExternalSearch();
  }

  browserFrame?.addEventListener('load', () => browserLoading?.classList.remove('is-visible'));

  document.querySelector('[data-browser-home]')?.addEventListener('click', () => {
    if (browserInput) browserInput.value = '';
    if (browserFrame) browserFrame.src = 'https://www.google.com/webhp?igu=1';
    updateExternalSearch();
  });

  document.querySelector('[data-browser-reload]')?.addEventListener('click', () => {
    if (browserInput?.value.trim()) browserForm?.requestSubmit();
    else if (browserFrame) browserFrame.src = 'https://www.google.com/webhp?igu=1';
  });

  // In-page workspace tabs
  const workspaceTabs = [...document.querySelectorAll('[data-workspace-tab]')];
  const workspacePanels = [...document.querySelectorAll('[data-workspace-panel]')];

  function openWorkspacePanel(name) {
    workspaceTabs.forEach((tab) => {
      const active = tab.dataset.workspaceTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    workspacePanels.forEach((panel) => {
      panel.hidden = panel.dataset.workspacePanel !== name;
    });
    if (name === 'play') drawSnake();
  }

  workspaceTabs.forEach((tab) => tab.addEventListener('click', () => openWorkspacePanel(tab.dataset.workspaceTab)));

  // Signal Snake
  const snakeCanvas = document.querySelector('[data-snake-canvas]');
  const snakeContext = snakeCanvas?.getContext('2d');
  const snakeScore = document.querySelector('[data-snake-score]');
  const snakeOverlay = document.querySelector('[data-snake-overlay]');
  const snakeStart = document.querySelector('[data-snake-start]');
  const CELL = 20;
  let snake = [{ x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }];
  let food = { x: 18, y: 8 };
  let direction = { x: 1, y: 0 };
  let queuedDirection = direction;
  let snakeTimer = null;
  let score = 0;

  function snakeAccent() {
    return getComputedStyle(root).getPropertyValue('--accent').trim() || '#ee6c4d';
  }

  function drawSnake() {
    if (!snakeContext || !snakeCanvas) return;
    snakeContext.fillStyle = '#0b1110';
    snakeContext.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
    snakeContext.strokeStyle = 'rgba(255,255,255,.035)';
    snakeContext.lineWidth = 1;
    for (let x = 0; x <= snakeCanvas.width; x += CELL) {
      snakeContext.beginPath(); snakeContext.moveTo(x, 0); snakeContext.lineTo(x, snakeCanvas.height); snakeContext.stroke();
    }
    for (let y = 0; y <= snakeCanvas.height; y += CELL) {
      snakeContext.beginPath(); snakeContext.moveTo(0, y); snakeContext.lineTo(snakeCanvas.width, y); snakeContext.stroke();
    }
    snake.forEach((segment, index) => {
      snakeContext.fillStyle = index === 0 ? '#ffffff' : snakeAccent();
      snakeContext.beginPath();
      snakeContext.roundRect(segment.x * CELL + 2, segment.y * CELL + 2, CELL - 4, CELL - 4, 5);
      snakeContext.fill();
    });
    snakeContext.fillStyle = '#f7cb5b';
    snakeContext.beginPath();
    snakeContext.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, 6, 0, Math.PI * 2);
    snakeContext.fill();
  }

  function placeFood() {
    do {
      food = {
        x: Math.floor(Math.random() * (snakeCanvas.width / CELL)),
        y: Math.floor(Math.random() * (snakeCanvas.height / CELL))
      };
    } while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
  }

  function endSnake() {
    window.clearInterval(snakeTimer);
    snakeTimer = null;
    if (snakeOverlay) {
      snakeOverlay.innerHTML = `<strong>Signal lost</strong><span>Final score: ${score}. Tap restart to reconnect.</span>`;
      snakeOverlay.classList.remove('is-hidden');
    }
    if (snakeStart) snakeStart.textContent = 'Restart game';
    playTone(120, 0.16);
  }

  function snakeTick() {
    direction = queuedDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= snakeCanvas.width / CELL || head.y >= snakeCanvas.height / CELL;
    const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);
    if (hitWall || hitSelf) {
      endSnake();
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      if (snakeScore) snakeScore.textContent = score;
      placeFood();
      playTone(760, 0.05);
    } else {
      snake.pop();
    }
    drawSnake();
  }

  function startSnake() {
    window.clearInterval(snakeTimer);
    snake = [{ x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }];
    direction = { x: 1, y: 0 };
    queuedDirection = direction;
    score = 0;
    if (snakeScore) snakeScore.textContent = '0';
    if (snakeOverlay) snakeOverlay.classList.add('is-hidden');
    if (snakeStart) snakeStart.textContent = 'Restart game';
    placeFood();
    drawSnake();
    snakeTimer = window.setInterval(snakeTick, 115);
  }

  function steerSnake(name) {
    const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const next = directions[name];
    if (!next || (next.x === -direction.x && next.y === -direction.y)) return;
    queuedDirection = next;
  }

  snakeStart?.addEventListener('click', startSnake);
  document.querySelectorAll('[data-snake-direction]').forEach((button) => {
    button.addEventListener('click', () => steerSnake(button.dataset.snakeDirection));
  });
  document.addEventListener('keydown', (event) => {
    if (!document.querySelector('[data-workspace-panel="play"]:not([hidden])') || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
    const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (keyMap[event.key]) {
      event.preventDefault();
      steerSnake(keyMap[event.key]);
    }
  });
  drawSnake();

  // Pulse Check reaction game
  const reactionStage = document.querySelector('[data-reaction-stage]');
  const reactionTitle = document.querySelector('[data-reaction-title]');
  const reactionCopy = document.querySelector('[data-reaction-copy]');
  const reactionBest = document.querySelector('[data-reaction-best]');
  let reactionState = 'idle';
  let reactionTimer;
  let reactionStarted = 0;
  let bestReaction = Number(storageGet('tangent-reaction-best', '0')) || 0;

  if (reactionBest && bestReaction) reactionBest.textContent = `${bestReaction}ms`;

  function resetReaction(title = 'Tap to arm', copy = 'Wait for the signal. Then move fast.') {
    reactionState = 'idle';
    reactionStage?.classList.remove('is-waiting', 'is-ready', 'is-early', 'is-result');
    if (reactionTitle) reactionTitle.textContent = title;
    if (reactionCopy) reactionCopy.textContent = copy;
  }

  reactionStage?.addEventListener('click', () => {
    if (reactionState === 'idle' || reactionState === 'result') {
      reactionState = 'waiting';
      reactionStage.className = 'reaction-stage is-waiting';
      reactionTitle.textContent = 'Hold…';
      reactionCopy.textContent = 'Wait for the orb to flash.';
      reactionTimer = window.setTimeout(() => {
        reactionState = 'ready';
        reactionStarted = performance.now();
        reactionStage.className = 'reaction-stage is-ready';
        reactionTitle.textContent = 'NOW';
        reactionCopy.textContent = 'Tap!';
        playTone(880, 0.06);
      }, 900 + Math.random() * 2200);
    } else if (reactionState === 'waiting') {
      window.clearTimeout(reactionTimer);
      reactionState = 'idle';
      reactionStage.className = 'reaction-stage is-early';
      reactionTitle.textContent = 'Too early';
      reactionCopy.textContent = 'The signal was not ready.';
      window.setTimeout(() => resetReaction(), 900);
    } else if (reactionState === 'ready') {
      const time = Math.round(performance.now() - reactionStarted);
      reactionState = 'result';
      reactionStage.className = 'reaction-stage is-result';
      reactionTitle.textContent = `${time} ms`;
      reactionCopy.textContent = time < 220 ? 'Lightning reflexes.' : time < 320 ? 'Sharp response.' : 'Try once more.';
      if (!bestReaction || time < bestReaction) {
        bestReaction = time;
        storageSet('tangent-reaction-best', String(time));
        if (reactionBest) reactionBest.textContent = `${time}ms`;
      }
      playTone(620, 0.08);
    }
  });

  // Hidden stash
  const notes = document.querySelector('[data-workspace-notes]');
  const noteCount = document.querySelector('[data-note-count]');
  const noteStatus = document.querySelector('[data-note-status]');

  function updateNotes() {
    if (!notes) return;
    storageSet('tangent-workspace-notes', notes.value);
    if (noteCount) noteCount.textContent = notes.value.length;
    if (noteStatus) {
      noteStatus.textContent = 'Saved';
      window.clearTimeout(updateNotes.timer);
      updateNotes.timer = window.setTimeout(() => { noteStatus.textContent = 'Saved locally'; }, 900);
    }
  }

  if (notes) {
    notes.value = storageGet('tangent-workspace-notes', storageGet('tangent-vault-notes', ''));
    if (noteCount) noteCount.textContent = notes.value.length;
    notes.addEventListener('input', updateNotes);
  }

  const cipherInput = document.querySelector('[data-cipher-input]');
  const cipherOutput = document.querySelector('[data-cipher-output]');

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  document.querySelectorAll('[data-cipher]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = cipherInput?.value || '';
      let output = '';
      if (button.dataset.cipher === 'reverse') output = [...input].reverse().join('');
      if (button.dataset.cipher === 'rot13') {
        output = input.replace(/[a-z]/gi, (letter) => String.fromCharCode((letter.charCodeAt(0) - (letter <= 'Z' ? 65 : 97) + 13) % 26 + (letter <= 'Z' ? 65 : 97)));
      }
      if (button.dataset.cipher === 'base64') output = encodeBase64(input);
      if (cipherOutput) cipherOutput.textContent = output || 'Nothing to scramble yet.';
    });
  });

  const fortunes = [
    'The shortest route is not always the clearest one.',
    'A small number will unlock a much larger idea.',
    'Your next good decision arrives after one quiet minute.',
    'Precision is a form of kindness to your future self.',
    'The signal is strongest where curiosity meets patience.'
  ];
  const accents = ['coral', 'violet', 'aqua', 'lime'];
  const mysteryMessage = document.querySelector('[data-mystery-message]');

  document.querySelectorAll('[data-mystery]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mystery;
      if (mode === 'fortune') {
        mysteryMessage.textContent = fortunes[Math.floor(Math.random() * fortunes.length)];
      } else if (mode === 'palette') {
        const currentIndex = accents.indexOf(settings.accent);
        settings.accent = accents[(currentIndex + 1) % accents.length];
        saveSettings();
        mysteryMessage.textContent = `Chromatic shift complete: ${settings.accent}.`;
      } else if (mode === 'matrix') {
        root.dataset.easter = root.dataset.easter === 'on' ? 'off' : 'on';
        mysteryMessage.textContent = root.dataset.easter === 'on' ? 'Focus grid active. The background is moving.' : 'Focus grid returned to normal.';
      } else if (mode === 'glass') {
        document.body.classList.toggle('ultra-glass');
        showToast(document.body.classList.contains('ultra-glass') ? 'Reality distortion enabled' : 'Reality restored');
      }
    });
  });

  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;
  document.addEventListener('keydown', (event) => {
    if (!workspace || workspace.hidden || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
    if (event.key === konami[konamiIndex]) {
      konamiIndex += 1;
      if (konamiIndex === konami.length) {
        root.dataset.easter = root.dataset.easter === 'on' ? 'off' : 'on';
        showToast('Focus grid unlocked');
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });
})();
