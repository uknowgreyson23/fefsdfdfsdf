(() => {
  'use strict';

  const calculator = document.querySelector('[data-calculator]');
  if (!calculator) return;

  const display = calculator.querySelector('[data-display]');
  const expression = calculator.querySelector('[data-expression]');
  const angleLabel = calculator.querySelector('[data-angle]');
  const memoryIndicator = calculator.querySelector('[data-memory-indicator]');
  const historyLists = document.querySelectorAll('[data-history]');
  const clearHistoryButtons = document.querySelectorAll('[data-clear-history]');
  const HISTORY_KEY = 'tangent-history';
  const MAX_HISTORY = 6;

  function getPreferences() {
    try {
      return { separators: true, history: true, ...JSON.parse(localStorage.getItem('tangent-settings') || '{}') };
    } catch {
      return { separators: true, history: true };
    }
  }

  const preferences = getPreferences();

  let current = '0';
  let storedValue = null;
  let activeOperator = null;
  let waitingForOperand = false;
  let justSolved = false;
  let memory = Number(localStorage.getItem('tangent-memory')) || 0;
  let angleMode = localStorage.getItem('tangent-angle') || 'DEG';

  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' };

  function parseCurrent() {
    return Number(current);
  }

  function precision(value) {
    if (!Number.isFinite(value)) return null;
    if (Object.is(value, -0)) return 0;
    return Number.parseFloat(value.toPrecision(12));
  }

  function plainNumber(value) {
    const normalized = precision(Number(value));
    if (normalized === null) return 'Error';
    const absolute = Math.abs(normalized);
    if ((absolute >= 1e12 || (absolute > 0 && absolute < 1e-9))) {
      return normalized.toExponential(7).replace(/\.0+(?=e)/, '').replace(/(\.\d*?)0+(?=e)/, '$1');
    }
    return String(normalized);
  }

  function displayNumber(value) {
    if (value === 'Error') return value;
    const number = Number(value);
    if (!Number.isFinite(number)) return 'Error';
    const absolute = Math.abs(number);
    if (absolute >= 1e12 || (absolute > 0 && absolute < 1e-9)) {
      return number.toExponential(7);
    }
    if (!preferences.separators) return String(value);
    const [whole, decimal] = String(value).split('.');
    const formattedWhole = Number(whole).toLocaleString('en-US', { maximumFractionDigits: 0 });
    return decimal !== undefined ? `${formattedWhole}.${decimal}` : formattedWhole;
  }

  function updateDisplay() {
    display.textContent = displayNumber(current);
    if (angleLabel) angleLabel.textContent = angleMode;
    memoryIndicator?.classList.toggle('is-visible', memory !== 0);
    calculator.querySelectorAll('[data-action="clear"]').forEach((button) => {
      button.textContent = current !== '0' || storedValue !== null ? 'C' : 'AC';
    });
  }

  function setExpression(text = '') {
    expression.textContent = text || '\u00a0';
  }

  function inputDigit(digit) {
    if (current === 'Error' || waitingForOperand || justSolved) {
      current = digit;
      waitingForOperand = false;
      justSolved = false;
      if (!activeOperator) setExpression();
    } else if (current.replace('-', '').length < 12) {
      current = current === '0' ? digit : current + digit;
    }
  }

  function inputDecimal() {
    if (current === 'Error' || waitingForOperand || justSolved) {
      current = '0.';
      waitingForOperand = false;
      justSolved = false;
    } else if (!current.includes('.')) {
      current += '.';
    }
  }

  function calculate(left, right, operator) {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right === 0 ? NaN : left / right;
      case '^': return Math.pow(left, right);
      default: return right;
    }
  }

  function chooseOperator(nextOperator) {
    if (current === 'Error') return;
    const inputValue = parseCurrent();

    if (activeOperator && waitingForOperand) {
      activeOperator = nextOperator;
      setExpression(`${displayNumber(plainNumber(storedValue))} ${symbols[nextOperator]}`);
      return;
    }

    if (storedValue === null) {
      storedValue = inputValue;
    } else if (activeOperator) {
      const result = calculate(storedValue, inputValue, activeOperator);
      current = plainNumber(result);
      storedValue = current === 'Error' ? null : Number(current);
    }

    activeOperator = current === 'Error' ? null : nextOperator;
    waitingForOperand = true;
    justSolved = false;
    if (activeOperator) setExpression(`${displayNumber(plainNumber(storedValue))} ${symbols[activeOperator]}`);
  }

  function solve() {
    if (!activeOperator || storedValue === null || current === 'Error') return;
    const right = parseCurrent();
    const left = storedValue;
    const operator = activeOperator;
    const result = calculate(left, right, operator);
    const resultString = plainNumber(result);
    const calculation = `${displayNumber(plainNumber(left))} ${symbols[operator]} ${displayNumber(plainNumber(right))}`;

    current = resultString;
    setExpression(`${calculation} =`);
    if (resultString !== 'Error') addHistory(calculation, displayNumber(resultString));
    storedValue = null;
    activeOperator = null;
    waitingForOperand = false;
    justSolved = true;
  }

  function clear() {
    if (current !== '0' && current !== 'Error') {
      current = '0';
    } else {
      current = '0';
      storedValue = null;
      activeOperator = null;
      setExpression();
    }
    waitingForOperand = false;
    justSolved = false;
  }

  function backspace() {
    if (waitingForOperand || justSolved || current === 'Error') return;
    current = current.length > 1 ? current.slice(0, -1) : '0';
    if (current === '-') current = '0';
  }

  function applyUnary(name) {
    if (current === 'Error') return;
    const value = parseCurrent();
    const radians = angleMode === 'DEG' ? value * (Math.PI / 180) : value;
    const functionLabels = {
      sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', ln: 'ln', sqrt: '√',
      square: 'sqr', cube: 'cube', inverse: '1/', factorial: 'fact', abs: 'abs', exp: 'exp'
    };
    let result;

    switch (name) {
      case 'sin': result = Math.sin(radians); break;
      case 'cos': result = Math.cos(radians); break;
      case 'tan': result = Math.cos(radians) === 0 ? NaN : Math.tan(radians); break;
      case 'log': result = value > 0 ? Math.log10(value) : NaN; break;
      case 'ln': result = value > 0 ? Math.log(value) : NaN; break;
      case 'sqrt': result = value >= 0 ? Math.sqrt(value) : NaN; break;
      case 'square': result = value ** 2; break;
      case 'cube': result = value ** 3; break;
      case 'inverse': result = value === 0 ? NaN : 1 / value; break;
      case 'abs': result = Math.abs(value); break;
      case 'exp': result = Math.exp(value); break;
      case 'factorial':
        if (value < 0 || !Number.isInteger(value) || value > 170) {
          result = NaN;
        } else {
          result = 1;
          for (let i = 2; i <= value; i += 1) result *= i;
        }
        break;
      default: return;
    }

    const before = displayNumber(current);
    current = plainNumber(result);
    const notation = name === 'square' ? `${before}²` :
      name === 'cube' ? `${before}³` :
      name === 'inverse' ? `1 ÷ ${before}` :
      name === 'factorial' ? `${before}!` :
      `${functionLabels[name]}(${before})`;
    setExpression(notation);
    if (current !== 'Error') addHistory(notation, displayNumber(current));
    waitingForOperand = false;
    justSolved = true;
  }

  function setConstant(name) {
    current = plainNumber(name === 'pi' ? Math.PI : Math.E);
    waitingForOperand = false;
    justSolved = false;
    setExpression(name === 'pi' ? 'π' : 'e');
  }

  function toggleSign() {
    if (current !== '0' && current !== 'Error') current = current.startsWith('-') ? current.slice(1) : `-${current}`;
  }

  function percent() {
    if (current === 'Error') return;
    const before = current;
    current = plainNumber(parseCurrent() / 100);
    setExpression(`${displayNumber(before)}%`);
    justSolved = true;
  }

  function updateMemory(nextMemory) {
    memory = precision(nextMemory) || 0;
    localStorage.setItem('tangent-memory', String(memory));
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function addHistory(calculation, result) {
    if (!preferences.history) return;
    const history = getHistory();
    history.unshift({ calculation, result });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    historyLists.forEach((list) => {
      list.replaceChildren();
      if (!preferences.history) {
        const disabled = document.createElement('li');
        disabled.className = 'history-empty';
        disabled.textContent = 'History is disabled in Settings.';
        list.append(disabled);
        return;
      }
      if (!history.length) {
        const empty = document.createElement('li');
        empty.className = 'history-empty';
        empty.textContent = 'Your calculations will appear here.';
        list.append(empty);
        return;
      }
      history.forEach((item) => {
        const entry = document.createElement('li');
        const calculation = document.createElement('span');
        const result = document.createElement('button');
        calculation.textContent = item.calculation;
        result.type = 'button';
        result.textContent = `= ${item.result}`;
        result.setAttribute('aria-label', `Use result ${item.result}`);
        result.addEventListener('click', () => {
          current = item.result.replaceAll(',', '');
          storedValue = null;
          activeOperator = null;
          waitingForOperand = false;
          justSolved = true;
          setExpression(item.calculation);
          updateDisplay();
        });
        entry.append(calculation, result);
        list.append(entry);
      });
    });
  }

  function handleAction(action, value) {
    switch (action) {
      case 'digit': inputDigit(value); break;
      case 'decimal': inputDecimal(); break;
      case 'operator': chooseOperator(value); break;
      case 'equals': solve(); break;
      case 'clear': clear(); break;
      case 'backspace': backspace(); break;
      case 'sign': toggleSign(); break;
      case 'percent': percent(); break;
      case 'function': applyUnary(value); break;
      case 'constant': setConstant(value); break;
      case 'angle':
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        localStorage.setItem('tangent-angle', angleMode);
        break;
      case 'memory-clear': updateMemory(0); break;
      case 'memory-recall':
        current = plainNumber(memory);
        waitingForOperand = false;
        justSolved = true;
        break;
      case 'memory-add': updateMemory(memory + (parseCurrent() || 0)); break;
      case 'memory-subtract': updateMemory(memory - (parseCurrent() || 0)); break;
      default: return;
    }
    updateDisplay();
  }

  calculator.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    handleAction(button.dataset.action, button.dataset.value);
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const keyMap = { '/': '/', '*': '*', '-': '-', '+': '+', '^': '^' };
    let action;
    let value;

    if (/^\d$/.test(event.key)) {
      action = 'digit';
      value = event.key;
    } else if (event.key === '.') {
      action = 'decimal';
    } else if (keyMap[event.key]) {
      action = 'operator';
      value = keyMap[event.key];
    } else if (event.key === 'Enter' || event.key === '=') {
      action = 'equals';
    } else if (event.key === 'Escape') {
      action = 'clear';
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      action = 'backspace';
    } else if (event.key === '%') {
      action = 'percent';
    }

    if (action) {
      event.preventDefault();
      handleAction(action, value);
      const matchingButton = calculator.querySelector(`[data-action="${action}"]${value ? `[data-value="${value}"]` : ''}`);
      matchingButton?.classList.add('is-pressed');
      window.setTimeout(() => matchingButton?.classList.remove('is-pressed'), 100);
    }
  });

  clearHistoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
    });
  });

  renderHistory();
  updateDisplay();
})();
