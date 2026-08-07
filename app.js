(() => {
  'use strict';

  const root = document.documentElement;
  const isSecretPage = document.body.matches('[data-secret-page]');
  const ACCESS_HASH = '#tangent-access';
  const ACCESS_TOKEN = 'tangent-secret-unlocked';
  const SECRET_CODE = '423232323232';

  function getAccessToken() {
    try {
      return sessionStorage.getItem(ACCESS_TOKEN);
    } catch {
      return null;
    }
  }

  function setAccessToken(value) {
    try {
      if (value) sessionStorage.setItem(ACCESS_TOKEN, 'true');
      else sessionStorage.removeItem(ACCESS_TOKEN);
    } catch {
      // The URL hash still provides a graceful fallback for local-file browsing.
    }
  }

  if (isSecretPage) {
    const hasAccess = window.location.hash === ACCESS_HASH || getAccessToken() === 'true';
    if (!hasAccess) {
      window.location.replace('index.html');
      return;
    }
    setAccessToken(true);
    root.classList.remove('secret-pending');
    if (window.location.hash) {
      try {
        history.replaceState(null, '', 'secret.html');
      } catch {
        // Local-file browser policies may keep the harmless access hash visible.
      }
    }
  } else {
    let secretBuffer = '';

    function registerSecretDigit(digit) {
      secretBuffer = `${secretBuffer}${digit}`.slice(-SECRET_CODE.length);
      if (secretBuffer === SECRET_CODE) {
        setAccessToken(true);
        window.location.href = `secret.html${ACCESS_HASH}`;
      }
    }

    document.addEventListener('keydown', (event) => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey && /^\d$/.test(event.key)) {
        registerSecretDigit(event.key);
      }
    });

    document.addEventListener('click', (event) => {
      const digitKey = event.target.closest('[data-action="digit"][data-value]');
      if (digitKey) registerSecretDigit(digitKey.dataset.value);
    });
  }

  const toggle = document.querySelector('[data-theme-toggle]');
  const themeLabel = document.querySelector('[data-theme-label]');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const storedTheme = localStorage.getItem('tangent-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const isDark = theme === 'dark';
    if (themeLabel) themeLabel.textContent = isDark ? 'Light' : 'Dark';
    if (toggle) toggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    if (themeColor) themeColor.setAttribute('content', isDark ? '#111312' : '#ee6c4d');
  }

  applyTheme(storedTheme || (prefersDark ? 'dark' : 'light'));

  toggle?.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem('tangent-theme', nextTheme);
  });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const clock = document.querySelector('[data-clock]');
  const date = document.querySelector('[data-date]');

  function updateClock() {
    const now = new Date();
    if (clock) {
      clock.textContent = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      }).format(now);
    }
    if (date) {
      date.textContent = new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }).format(now);
    }
  }

  updateClock();
  if (clock) window.setInterval(updateClock, 30000);

  const browserFrame = document.querySelector('[data-browser-frame]');
  const browserForm = document.querySelector('[data-browser-form]');
  const browserInput = document.querySelector('[data-browser-input]');
  const externalSearchLinks = document.querySelectorAll('[data-browser-external]');
  const browserLoading = document.querySelector('[data-browser-loading]');

  function googleSearchUrl(query) {
    const trimmed = query.trim();
    return trimmed
      ? `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
      : 'https://www.google.com/';
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

  document.querySelector('[data-secret-exit]')?.addEventListener('click', () => {
    setAccessToken(false);
  });
})();
