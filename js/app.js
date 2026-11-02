/**
 * Main Application Controller for Modern Pro Calculator
 * Connects UI with CalculatorEngine, UnitConverter, ProgrammerEngine,
 * SoundEffects, and HistoryManager.
 */

import { CalculatorEngine } from './calculator-engine.js';
import { UnitConverter, UNIT_CATEGORIES } from './unit-converter.js';
import { ProgrammerEngine, WORD_SIZES } from './programmer-mode.js';
import { SoundEffects } from './sound-effects.js';
import { HistoryManager } from './history-manager.js';

class CalculatorApp {
  constructor() {
    this.engine = new CalculatorEngine();
    this.sound = new SoundEffects();
    this.history = new HistoryManager();
    this.programmer = new ProgrammerEngine();

    this.currentMode = 'standard'; // 'standard', 'scientific', 'converter', 'programmer'
    this.currentTheme = 'dark-slate';
    this.themes = ['dark-slate', 'swiss-light', 'cyberpunk-neon', 'retro-classic'];

    this.currentInput = '0';
    this.expression = '';
    this.hasEvaluated = false;
    this.openParensCount = 0;

    this.initDOM();
    this.initTheme();
    this.initEventListeners();
    this.initKeyboard();
    this.initConverter();
    this.initProgrammer();
    this.initHistory();
    this.updateDisplay();
  }

  initDOM() {
    this.appWrapper = document.getElementById('appWrapper');
    this.mainReadout = document.getElementById('mainReadout');
    this.expressionTrack = document.getElementById('expressionTrack');
    this.angleModeTag = document.getElementById('angleModeTag');
    this.memoryTag = document.getElementById('memoryTag');
    this.btnDegRad = document.getElementById('btnDegRad');
    this.btnMC = document.getElementById('btnMC');
    this.btnMR = document.getElementById('btnMR');
    this.themeBtn = document.getElementById('themeBtn');
    this.soundBtn = document.getElementById('soundBtn');
    this.soundIconOn = document.getElementById('soundIconOn');
    this.soundIconOff = document.getElementById('soundIconOff');
    this.historyToggleBtn = document.getElementById('historyToggleBtn');
    this.historyBadge = document.getElementById('historyBadge');
    this.historyDrawer = document.getElementById('historyDrawer');
    this.historyList = document.getElementById('historyList');
    this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    this.exportHistoryBtn = document.getElementById('exportHistoryBtn');
    this.shortcutsBtn = document.getElementById('shortcutsBtn');
    this.shortcutsModal = document.getElementById('shortcutsModal');
    this.closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
    this.copyResultBtn = document.getElementById('copyResultBtn');
    this.toastContainer = document.getElementById('toastContainer');

    // Keypads & Views
    this.calcKeypadView = document.getElementById('calcKeypadView');
    this.scientificSubgrid = document.getElementById('scientificSubgrid');
    this.converterView = document.getElementById('converterView');
    this.programmerView = document.getElementById('programmerView');
    this.mainDisplaySection = document.getElementById('mainDisplaySection');
    this.memoryBar = document.getElementById('memoryBar');

    // Converter elements
    this.converterCategories = document.getElementById('converterCategories');
    this.converterFromInput = document.getElementById('converterFromInput');
    this.converterFromSelect = document.getElementById('converterFromSelect');
    this.converterToInput = document.getElementById('converterToInput');
    this.converterToSelect = document.getElementById('converterToSelect');
    this.converterSwapBtn = document.getElementById('converterSwapBtn');
    this.clearFromInputBtn = document.getElementById('clearFromInputBtn');
    this.copyConverterBtn = document.getElementById('copyConverterBtn');
    this.conversionFormula = document.getElementById('conversionFormula');

    // Programmer elements
    this.baseRepList = document.getElementById('baseRepList');
    this.valHEX = document.getElementById('valHEX');
    this.valDEC = document.getElementById('valDEC');
    this.valOCT = document.getElementById('valOCT');
    this.valBIN = document.getElementById('valBIN');
    this.bitMatrix = document.getElementById('bitMatrix');
    this.wordSizeSelect = document.getElementById('wordSizeSelect');
  }

  initTheme() {
    try {
      const savedTheme = localStorage.getItem('calc_theme');
      if (savedTheme && this.themes.includes(savedTheme)) {
        this.currentTheme = savedTheme;
      }
    } catch {}
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  cycleTheme() {
    const idx = this.themes.indexOf(this.currentTheme);
    this.currentTheme = this.themes[(idx + 1) % this.themes.length];
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    try {
      localStorage.setItem('calc_theme', this.currentTheme);
    } catch {}
    this.showToast(`Theme: ${this.getThemeDisplayName(this.currentTheme)}`);
    this.sound.playClick();
  }

  getThemeDisplayName(theme) {
    switch (theme) {
      case 'dark-slate': return 'Dark Slate';
      case 'swiss-light': return 'Swiss Light';
      case 'cyberpunk-neon': return 'Cyberpunk Neon';
      case 'retro-classic': return 'Retro Classic';
      default: return theme;
    }
  }

  toggleSound() {
    const enabled = this.sound.toggleSound();
    this.soundIconOn.style.display = enabled ? 'inline-block' : 'none';
    this.soundIconOff.style.display = enabled ? 'none' : 'inline-block';
    this.showToast(`Sound: ${enabled ? 'Enabled' : 'Muted'}`);
  }

  setMode(mode) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    // Update tab pills
    document.querySelectorAll('.tab-btn').forEach(tab => {
      const isSelected = tab.dataset.mode === mode;
      tab.classList.toggle('active', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
    });

    // Reset layout containers
    this.calcKeypadView.style.display = 'none';
    this.converterView.style.display = 'none';
    this.programmerView.style.display = 'none';
    this.scientificSubgrid.style.display = 'none';
    this.appWrapper.classList.remove('wide-mode');
    this.mainDisplaySection.style.display = 'flex';
    this.memoryBar.style.display = 'flex';
    this.angleModeTag.classList.add('hidden');

    if (mode === 'standard') {
      this.calcKeypadView.style.display = 'flex';
    } else if (mode === 'scientific') {
      this.calcKeypadView.style.display = 'flex';
      this.scientificSubgrid.style.display = 'grid';
      this.appWrapper.classList.add('wide-mode');
      this.angleModeTag.classList.remove('hidden');
      this.angleModeTag.textContent = this.engine.angleMode;
      this.btnDegRad.textContent = this.engine.angleMode === 'DEG' ? 'RAD' : 'DEG';
    } else if (mode === 'converter') {
      this.converterView.style.display = 'flex';
      this.mainDisplaySection.style.display = 'none';
      this.memoryBar.style.display = 'none';
      this.updateConverter();
    } else if (mode === 'programmer') {
      this.calcKeypadView.style.display = 'flex';
      this.programmerView.style.display = 'flex';
      this.memoryBar.style.display = 'none';
      this.updateProgrammerUI();
    }

    this.sound.playClick();
  }

  toggleAngleMode() {
    const newMode = this.engine.toggleAngleMode();
    this.angleModeTag.textContent = newMode;
    this.btnDegRad.textContent = newMode === 'DEG' ? 'RAD' : 'DEG';
    this.showToast(`Angle Mode: ${newMode}`);
    this.sound.playClick();
  }

  initEventListeners() {
    // Mode switcher tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // Theme & Sound buttons
    this.themeBtn.addEventListener('click', () => this.cycleTheme());
    this.soundBtn.addEventListener('click', () => this.toggleSound());
    const soundEnabled = this.sound.enabled;
    this.soundIconOn.style.display = soundEnabled ? 'inline-block' : 'none';
    this.soundIconOff.style.display = soundEnabled ? 'none' : 'inline-block';

    // Angle tag toggle
    this.angleModeTag.addEventListener('click', () => this.toggleAngleMode());

    // Shortcuts modal
    this.shortcutsBtn.addEventListener('click', () => this.shortcutsModal.classList.add('active'));
    this.closeShortcutsBtn.addEventListener('click', () => this.shortcutsModal.classList.remove('active'));
    this.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === this.shortcutsModal) this.shortcutsModal.classList.remove('active');
    });

    // History drawer
    this.historyToggleBtn.addEventListener('click', () => this.toggleHistoryDrawer(true));
    this.closeHistoryBtn.addEventListener('click', () => this.toggleHistoryDrawer(false));
    this.clearHistoryBtn.addEventListener('click', () => {
      this.history.clear();
      this.renderHistory();
      this.showToast('History Cleared');
      this.sound.playClear();
    });
    this.exportHistoryBtn.addEventListener('click', () => this.exportHistory());

    // Copy result
    this.copyResultBtn.addEventListener('click', () => this.copyResult());

    // Keypad button clicks (Numbers, Operators, Functions)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-btn');
      if (!btn) return;

      this.createRipple(btn, e);

      // Digits / decimals
      if (btn.dataset.num !== undefined) {
        this.inputDigit(btn.dataset.num);
        return;
      }

      // Operators
      if (btn.dataset.op !== undefined) {
        this.inputOperator(btn.dataset.op);
        return;
      }

      // Scientific Functions
      if (btn.dataset.fn !== undefined) {
        this.inputFunction(btn.dataset.fn);
        return;
      }

      // Actions
      if (btn.dataset.action !== undefined) {
        this.inputAction(btn.dataset.action);
        return;
      }

      // Programmer operations
      if (btn.dataset.progOp !== undefined) {
        this.inputProgrammerOp(btn.dataset.progOp);
        return;
      }
    });

    // Memory bar clicks
    document.querySelectorAll('.mem-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleMemory(btn.dataset.action));
    });
  }

  createRipple(button, event) {
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    const x = (event.clientX || rect.left + radius) - rect.left - radius;
    const y = (event.clientY || rect.top + radius) - rect.top - radius;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.classList.add('ripple');

    const ripple = button.querySelector('.ripple');
    if (ripple) ripple.remove();

    button.appendChild(circle);
    setTimeout(() => circle.remove(), 400);
  }

  // Input Handling
  inputDigit(digit) {
    this.sound.playClick();
    this.mainReadout.classList.remove('error-state');

    if (this.currentMode === 'programmer') {
      this.handleProgrammerDigit(digit);
      return;
    }

    if (this.hasEvaluated) {
      this.currentInput = digit === '.' ? '0.' : digit;
      this.expression = '';
      this.hasEvaluated = false;
    } else {
      if (digit === '.') {
        if (!this.currentInput.includes('.')) {
          this.currentInput += '.';
        }
      } else {
        if (this.currentInput === '0') {
          this.currentInput = digit;
        } else {
          this.currentInput += digit;
        }
      }
    }

    this.updateDisplay();
  }

  inputOperator(op) {
    this.sound.playOperator();
    this.mainReadout.classList.remove('error-state');

    const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+';

    if (this.hasEvaluated) {
      this.expression = `${this.currentInput} ${opSymbol} `;
      this.currentInput = '0';
      this.hasEvaluated = false;
    } else {
      if (this.expression.endsWith(' ') && this.currentInput === '0') {
        // Replace previous trailing operator
        this.expression = this.expression.slice(0, -3) + ` ${opSymbol} `;
      } else {
        this.expression += `${this.currentInput} ${opSymbol} `;
        this.currentInput = '0';
      }
    }

    this.updateDisplay();
  }

  inputFunction(fn) {
    this.sound.playClick();
    this.mainReadout.classList.remove('error-state');

    if (fn === 'deg-rad') {
      this.toggleAngleMode();
      return;
    }

    // Constants
    if (fn === 'pi') {
      this.currentInput = CalculatorEngine.formatResult(Math.PI);
      this.updateDisplay();
      return;
    }
    if (fn === 'e') {
      this.currentInput = CalculatorEngine.formatResult(Math.E);
      this.updateDisplay();
      return;
    }

    // Direct immediate single-argument transforms
    const currentVal = parseFloat(this.currentInput);
    if (!isNaN(currentVal)) {
      try {
        let transformed;
        switch (fn) {
          case 'sqr':
            transformed = this.engine.applyFunction('sqr', currentVal);
            break;
          case 'sqrt':
            transformed = this.engine.applyFunction('sqrt', currentVal);
            break;
          case 'cbrt':
            transformed = this.engine.applyFunction('cbrt', currentVal);
            break;
          case 'inv':
            transformed = this.engine.applyFunction('inv', currentVal);
            break;
          case 'fact':
            transformed = this.engine.factorial(currentVal);
            break;
          case 'abs':
            transformed = this.engine.applyFunction('abs', currentVal);
            break;
          case 'sin':
          case 'cos':
          case 'tan':
          case 'asin':
          case 'acos':
          case 'atan':
          case 'ln':
          case 'log':
          case 'exp':
            transformed = this.engine.applyFunction(fn, currentVal);
            break;
          case 'pow':
            this.expression += `${this.currentInput} ^ `;
            this.currentInput = '0';
            this.updateDisplay();
            return;
          case 'mod':
            this.expression += `${this.currentInput} mod `;
            this.currentInput = '0';
            this.updateDisplay();
            return;
          default:
            return;
        }

        this.history.add(`${fn}(${this.currentInput})`, CalculatorEngine.formatResult(transformed), 'scientific');
        this.currentInput = CalculatorEngine.formatResult(transformed);
        this.hasEvaluated = true;
        this.updateDisplay();
      } catch (err) {
        this.handleError(err.message);
      }
    }
  }

  inputAction(action) {
    this.mainReadout.classList.remove('error-state');

    switch (action) {
      case 'clear':
        this.sound.playClear();
        this.currentInput = '0';
        this.expression = '';
        this.openParensCount = 0;
        this.hasEvaluated = false;
        break;

      case 'backspace':
        this.sound.playClick();
        if (this.currentInput.length > 1) {
          this.currentInput = this.currentInput.slice(0, -1);
        } else {
          this.currentInput = '0';
        }
        break;

      case 'negate':
        this.sound.playClick();
        if (this.currentInput !== '0') {
          if (this.currentInput.startsWith('-')) {
            this.currentInput = this.currentInput.slice(1);
          } else {
            this.currentInput = '-' + this.currentInput;
          }
        }
        break;

      case 'paren':
        this.sound.playClick();
        // Smart toggle between ( and )
        if (this.currentInput === '0' || this.expression.endsWith(' ') || this.openParensCount === 0) {
          this.expression += '(';
          this.openParensCount++;
        } else if (this.openParensCount > 0) {
          this.expression += `${this.currentInput})`;
          this.currentInput = '0';
          this.openParensCount--;
        }
        break;

      case 'evaluate':
        this.evaluate();
        break;
    }

    this.updateDisplay();
  }

  evaluate() {
    let fullExpr = this.expression + (this.currentInput !== '0' || !this.expression ? this.currentInput : '');
    // Auto-close missing parentheses
    while (this.openParensCount > 0) {
      fullExpr += ')';
      this.openParensCount--;
    }

    if (!fullExpr || fullExpr.trim() === '') return;

    try {
      const rawResult = this.engine.calculate(fullExpr);
      const formatted = CalculatorEngine.formatResult(rawResult);

      this.sound.playEquals();
      this.history.add(fullExpr, formatted, this.currentMode);
      this.renderHistory();

      this.expressionTrack.textContent = `${fullExpr} =`;
      this.currentInput = formatted;
      this.expression = '';
      this.hasEvaluated = true;
      this.mainReadout.textContent = formatted;
      this.adjustReadoutFontSize(formatted);
    } catch (err) {
      this.handleError(err.message);
    }
  }

  handleError(msg) {
    this.sound.playError();
    this.mainReadout.textContent = msg || 'Error';
    this.mainReadout.classList.add('error-state');
    this.currentInput = '0';
    this.expression = '';
    this.hasEvaluated = true;
  }

  updateDisplay() {
    this.expressionTrack.textContent = this.expression || '\u00A0';
    this.mainReadout.textContent = this.currentInput;
    this.adjustReadoutFontSize(this.currentInput);
  }

  adjustReadoutFontSize(text) {
    const len = String(text).length;
    if (len > 14) {
      this.mainReadout.style.fontSize = '1.75rem';
    } else if (len > 10) {
      this.mainReadout.style.fontSize = '2.2rem';
    } else {
      this.mainReadout.style.fontSize = '2.75rem';
    }
  }

  // Memory
  handleMemory(action) {
    this.sound.playClick();
    const currentVal = parseFloat(this.currentInput) || 0;

    switch (action) {
      case 'mc':
        this.engine.memoryClear();
        this.showToast('Memory Cleared');
        break;
      case 'mr':
        this.currentInput = CalculatorEngine.formatResult(this.engine.memoryRecall());
        this.hasEvaluated = true;
        this.updateDisplay();
        this.showToast('Memory Recalled');
        break;
      case 'ms':
        this.engine.memoryStore(currentVal);
        this.showToast(`Stored to Memory (${currentVal})`);
        break;
      case 'm-plus':
        this.engine.memoryAdd(currentVal);
        this.showToast(`Memory + ${currentVal}`);
        break;
      case 'm-minus':
        this.engine.memorySubtract(currentVal);
        this.showToast(`Memory − ${currentVal}`);
        break;
    }

    const hasMem = this.engine.hasMemory();
    this.memoryTag.classList.toggle('hidden', !hasMem);
    this.btnMC.disabled = !hasMem;
    this.btnMR.disabled = !hasMem;
    this.btnMR.classList.toggle('active-mem', hasMem);
  }

  // Converter
  initConverter() {
    this.activeCategory = 'length';

    // Populate category tabs
    document.querySelectorAll('.chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeCategory = chip.dataset.cat;
        this.populateConverterUnits();
        this.updateConverter();
      });
    });

    this.populateConverterUnits();

    this.converterFromInput.addEventListener('input', () => this.updateConverter('from'));
    this.converterToInput.addEventListener('input', () => this.updateConverter('to'));
    this.converterFromSelect.addEventListener('change', () => this.updateConverter('from'));
    this.converterToSelect.addEventListener('change', () => this.updateConverter('from'));

    this.converterSwapBtn.addEventListener('click', () => {
      const temp = this.converterFromSelect.value;
      this.converterFromSelect.value = this.converterToSelect.value;
      this.converterToSelect.value = temp;
      this.updateConverter('from');
      this.sound.playClick();
    });

    if (this.clearFromInputBtn) {
      this.clearFromInputBtn.addEventListener('click', () => {
        this.converterFromInput.value = '0';
        this.updateConverter('from');
        this.converterFromInput.focus();
        this.sound.playClear();
      });
    }

    if (this.copyConverterBtn) {
      this.copyConverterBtn.addEventListener('click', () => {
        const val = this.converterToInput.value;
        const toUnitText = this.converterToSelect.options[this.converterToSelect.selectedIndex]?.text || '';
        this.copyResultValue(`${val} ${toUnitText}`);
        this.sound.playClick();
      });
    }
  }

  copyResultValue(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`Copied "${text}"`);
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }

  populateConverterUnits() {
    const cat = UNIT_CATEGORIES[this.activeCategory];
    if (!cat) return;

    const unitKeys = Object.keys(cat.units);

    this.converterFromSelect.innerHTML = unitKeys
      .map(k => `<option value="${k}">${cat.units[k].name}</option>`)
      .join('');

    this.converterToSelect.innerHTML = unitKeys
      .map(k => `<option value="${k}">${cat.units[k].name}</option>`)
      .join('');

    if (unitKeys.length >= 2) {
      this.converterFromSelect.selectedIndex = 0;
      this.converterToSelect.selectedIndex = 1;
    }
  }

  updateConverter(direction = 'from') {
    try {
      const cat = this.activeCategory;
      const catObj = UNIT_CATEGORIES[cat];
      if (direction === 'from') {
        const val = parseFloat(this.converterFromInput.value) || 0;
        const res = UnitConverter.convert(
          val,
          cat,
          this.converterFromSelect.value,
          this.converterToSelect.value
        );
        this.converterToInput.value = res;
      } else {
        const val = parseFloat(this.converterToInput.value) || 0;
        const res = UnitConverter.convert(
          val,
          cat,
          this.converterToSelect.value,
          this.converterFromSelect.value
        );
        this.converterFromInput.value = res;
      }

      if (this.conversionFormula && catObj) {
        const oneUnitRes = UnitConverter.convert(
          1,
          cat,
          this.converterFromSelect.value,
          this.converterToSelect.value
        );
        const fromName = catObj.units[this.converterFromSelect.value]?.name || this.converterFromSelect.value;
        const toName = catObj.units[this.converterToSelect.value]?.name || this.converterToSelect.value;
        this.conversionFormula.textContent = `1 ${fromName} = ${oneUnitRes} ${toName}`;
      }
    } catch {}
  }

  // Programmer Mode
  initProgrammer() {
    this.wordSizeSelect.addEventListener('change', (e) => {
      this.programmer.setWordSize(e.target.value);
      this.updateProgrammerUI();
      this.sound.playClick();
    });

    // Generate 32 interactive bit cells
    this.renderBitMatrix(32);

    // Active base row selection
    document.querySelectorAll('.base-row').forEach(row => {
      row.addEventListener('click', () => {
        document.querySelectorAll('.base-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        this.programmerActiveBase = row.dataset.base;
        this.sound.playClick();
      });
    });

    this.programmerActiveBase = 'DEC';
  }

  renderBitMatrix(totalBits = 32) {
    this.bitMatrix.innerHTML = '';
    for (let i = totalBits - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'bit-cell';
      cell.dataset.bit = String(i);
      cell.textContent = '0';
      cell.title = `Bit ${i} (Weight: 2^${i})`;
      cell.addEventListener('click', () => {
        this.programmer.toggleBit(i);
        this.updateProgrammerUI();
        this.sound.playClick();
      });
      this.bitMatrix.appendChild(cell);
    }
  }

  handleProgrammerDigit(digit) {
    const base = this.programmerActiveBase || 'DEC';
    const currentValStr = this.programmer.value.toString(
      base === 'HEX' ? 16 : base === 'OCT' ? 8 : base === 'BIN' ? 2 : 10
    );

    let nextStr;
    if (this.programmer.value === 0n) {
      nextStr = digit;
    } else {
      nextStr = currentValStr + digit;
    }

    try {
      let parsed;
      if (base === 'HEX') parsed = BigInt('0x' + nextStr);
      else if (base === 'OCT') parsed = BigInt('0o' + nextStr);
      else if (base === 'BIN') parsed = BigInt('0b' + nextStr);
      else parsed = BigInt(nextStr);

      this.programmer.setValue(parsed);
      this.updateProgrammerUI();
    } catch {}
  }

  inputProgrammerOp(op) {
    this.sound.playOperator();
    switch (op) {
      case 'NOT':
        this.programmer.not();
        break;
      case 'LSH':
        this.programmer.lsh(1n);
        break;
      case 'RSH':
        this.programmer.rsh(1n);
        break;
    }
    this.updateProgrammerUI();
  }

  updateProgrammerUI() {
    const rep = this.programmer.getRepresentations();
    this.valHEX.textContent = rep.HEX;
    this.valDEC.textContent = rep.DEC;
    this.valOCT.textContent = rep.OCT;
    this.valBIN.textContent = rep.BIN_FORMATTED;

    // Update main readout to match active base
    this.mainReadout.textContent = rep[this.programmerActiveBase || 'DEC'];

    // Update bit cells
    const binPadded = rep.BIN;
    const cells = this.bitMatrix.querySelectorAll('.bit-cell');
    cells.forEach(cell => {
      const bitIdx = parseInt(cell.dataset.bit, 10);
      const isSet = (this.programmer.value & (1n << BigInt(bitIdx))) !== 0n;
      cell.textContent = isSet ? '1' : '0';
      cell.classList.toggle('bit-on', isSet);
    });
  }

  // History
  initHistory() {
    this.renderHistory();
    this.history.subscribe(() => this.renderHistory());
  }

  toggleHistoryDrawer(open) {
    this.historyDrawer.classList.toggle('open', open);
    this.sound.playClick();
  }

  renderHistory() {
    const items = this.history.getItems();
    this.historyBadge.style.display = items.length > 0 ? 'block' : 'none';

    if (items.length === 0) {
      this.historyList.innerHTML = '<p class="history-empty">No calculations recorded yet.</p>';
      return;
    }

    this.historyList.innerHTML = items
      .map(item => `
        <div class="history-item" data-res="${item.result}" data-expr="${item.expression}">
          <div class="history-time">${item.timestamp} • ${item.mode}</div>
          <div class="history-expr">${item.expression}</div>
          <div class="history-res">= ${item.result}</div>
        </div>
      `)
      .join('');

    this.historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        this.currentInput = el.dataset.res;
        this.expression = '';
        this.hasEvaluated = true;
        this.updateDisplay();
        this.toggleHistoryDrawer(false);
        this.showToast(`Loaded ${el.dataset.res}`);
        this.sound.playClick();
      });
    });
  }

  exportHistory() {
    const csv = this.history.exportAsCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('History exported as CSV');
  }

  // Keyboard navigation & Shortcuts
  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in converter inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        return;
      }

      const key = e.key;

      // Digits
      if (/^[0-9]$/.test(key)) {
        this.inputDigit(key);
        this.highlightButton(`[data-num="${key}"]`);
        e.preventDefault();
        return;
      }

      // Operators
      if (['+', '-', '*', '/'].includes(key)) {
        this.inputOperator(key);
        this.highlightButton(`[data-op="${key}"]`);
        e.preventDefault();
        return;
      }

      // Exponent
      if (key === '^') {
        this.inputFunction('pow');
        e.preventDefault();
        return;
      }

      // Parentheses
      if (key === '(' || key === ')') {
        this.inputAction('paren');
        this.highlightButton('[data-action="paren"]');
        e.preventDefault();
        return;
      }

      // Evaluate
      if (key === 'Enter' || key === '=') {
        this.inputAction('evaluate');
        this.highlightButton('[data-action="evaluate"]');
        e.preventDefault();
        return;
      }

      // Backspace
      if (key === 'Backspace') {
        this.inputAction('backspace');
        this.highlightButton('[data-action="backspace"]');
        e.preventDefault();
        return;
      }

      // Clear
      if (key === 'Escape' || key.toLowerCase() === 'c') {
        this.inputAction('clear');
        this.highlightButton('[data-action="clear"]');
        e.preventDefault();
        return;
      }

      // Decimal point
      if (key === '.') {
        this.inputDigit('.');
        this.highlightButton('[data-num="."]');
        e.preventDefault();
        return;
      }

      // Shortcuts
      if (key.toLowerCase() === 'h') {
        this.toggleHistoryDrawer(!this.historyDrawer.classList.contains('open'));
        e.preventDefault();
        return;
      }

      if (key.toLowerCase() === 'r') {
        this.toggleAngleMode();
        e.preventDefault();
        return;
      }

      if (key === '?') {
        this.shortcutsModal.classList.toggle('active');
        e.preventDefault();
        return;
      }
    });
  }

  highlightButton(selector) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 120);
    }
  }

  copyResult() {
    const text = this.mainReadout.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`Copied "${text}" to clipboard`);
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }

  fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.showToast(`Copied "${text}" to clipboard`);
    } catch {}
    document.body.removeChild(textArea);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }
}

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new CalculatorApp();
});

