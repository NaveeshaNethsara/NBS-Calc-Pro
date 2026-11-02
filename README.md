# <img src="assets/logo.png" width="36" height="36" style="vertical-align: middle; border-radius: 50%;" /> NBS Calc Pro

**NBS Calc Pro** is a high-precision, beautifully styled calculator application built with vanilla JavaScript, modern CSS3 design tokens, and a robust mathematical parsing engine.

---

## ✨ Features & Capabilities

### 1. Four Powerful Modes
- **Standard Mode**: Everyday arithmetic, instant percentages, square root, powers, reciprocal ($1/x$), change sign ($\pm$), and smart parentheses.
- **Scientific Mode**:
  - Trigonometry: $\sin, \cos, \tan, \sin^{-1}, \cos^{-1}, \tan^{-1}$ with dynamic **DEG / RAD** angle mode toggle.
  - Hyperbolic functions: $\sinh, \cosh, \tanh$.
  - Logarithms & Exponentials: $\ln, \log_{10}, \log_2, e^x, 10^x, x^y$.
  - Roots & Powers: $\sqrt{x}, \sqrt[3]{x}, x^2, x^3, |x|$.
  - Combinatorics: $n!$ (Factorials with integer validation).
  - Mathematical constants: $\pi$ ($3.14159...$), $e$ ($2.71828...$), and $\phi$ golden ratio.
- **Unit Converter**:
  - **7 Core Categories**: Length, Mass & Weight, Temperature, Area, Speed, Digital Storage, and Time.
  - Interactive dual inputs with instantaneous two-way conversion and single-click unit swap ($\rightleftharpoons$).
- **Programmer Mode**:
  - **Simultaneous Base Display**: Live synchronous updates across **HEX** (Hexadecimal), **DEC** (Decimal), **OCT** (Octal), and **BIN** (Binary, grouped in 4-bit nibbles).
  - **Word Sizes**: Support for QWORD (64-bit BigInt), DWORD (32-bit), WORD (16-bit), and BYTE (8-bit).
  - **Bitwise Operations**: `AND`, `OR`, `XOR`, `NOT`, `LSH` ($\ll$), `RSH` ($\gg$).
  - **Interactive 32-Bit Toggler Matrix**: Click any individual bit cell ($0 \dots 31$) to toggle it on/off and watch all bases update in real-time.

---

### 2. Mathematics & Precision Engine
- **Safe Parsing (No `eval`)**: Custom Lexer/Tokenizer + Shunting-Yard algorithm converting infix mathematical expressions into Postfix (Reverse Polish Notation) with strict operator precedence and associativity.
- **Floating-Point Precision Fix**: Automatically eliminates IEEE-754 precision noise (e.g. `0.1 + 0.2 = 0.3` instead of `0.30000000000000004`).
- **Parentheses & Order of Operations**: Full support for nested parentheses, implicit multiplication (e.g. `2(3 + 4) = 14`), and unary operators (`-5 + 10 = 5`).
- **Graceful Error Handling**: Displays clean messages for division by zero, invalid roots, and unmatched parentheses without crashing.

---

### 3. Memory & Calculation History Tape
- **Memory Register**:
  - `MC`: Memory Clear
  - `MR`: Memory Recall
  - `M+`: Add to memory
  - `M-`: Subtract from memory
  - `MS`: Store to memory
  - Visual badge in display when memory contains an active value.
- **Calculation History Tape**:
  - Slide-out drawer tracking every calculation with timestamp and mode.
  - Click any prior calculation to re-insert its result or expression directly into the active display.
  - **Export History**: Download history as a `.csv` spreadsheet file.
  - **Persistent**: History and settings persist in `localStorage` across page reloads.

---

### 4. Interactive UX, Sound & Design
- **Synthesized Click Feedback**: Built-in **Web Audio API** sound engine producing satisfying, zero-latency mechanical click and chime audio feedback without loading external audio files (toggleable on/off).
- **Four Curated Themes**:
  1. **Dark Slate** (Default): Sleek obsidian blues, glowing cyan accents, and glassmorphism.
  2. **Swiss Light**: Clean, high-contrast, minimalist design inspired by Swiss typography.
  3. **Cyberpunk Neon**: Deep purple/black palette with neon pink and cyan electric glow.
  4. **Retro Classic**: Nostalgic warm beige and Braun/Dieter Rams-inspired calculator aesthetics.
- **One-Click Copy**: Copy result to clipboard with visual toast notification.
- **Accessibility & Responsive**: Full ARIA labels, semantic markup, visible focus indicators, and smooth layouts across mobile, tablet, and desktop screens.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `0` - `9`, `.` | Enter digits and decimals |
| `+`, `-`, `*`, `/` | Add, Subtract, Multiply, Divide |
| `^` | Exponentiation ($x^y$) |
| `%` | Percent / Modulo |
| `(` `)` | Smart Parentheses |
| `Enter` or `=` | Calculate / Evaluate |
| `Backspace` | Delete last entered character |
| `Escape` or `c` | All Clear (AC) |
| `h` | Toggle History Tape drawer |
| `r` | Toggle Angle Mode (DEG $\leftrightarrow$ RAD) |
| `?` | Show Keyboard Shortcuts cheat sheet |
| `Ctrl + C` | Copy current readout |

---

## 🚀 How to Run

### Method 1: Instant Launch (Zero Setup)
Simply double-click **`index.html`** or open it in any modern browser (Google Chrome, Microsoft Edge, Firefox, Safari, Brave). It runs completely standalone and offline!

### Method 2: Local Node.js Server
If you prefer running via a local web server:
```bash
npm start
```
Then navigate to:
```
http://localhost:3000
```

---

## 🧪 Automated Testing

The project includes unit test suites verifying math precision, operator precedence, trigonometry, unit conversions, and bitwise logic using Node's built-in test runner:

```bash
npm test
```

### Test Suite Results:
- `✔ Basic Arithmetic`
- `✔ Precision Formatting (Fix 0.1 + 0.2)`
- `✔ Operator Precedence and Associativity`
- `✔ Unary Operations and Implicit Multiplication`
- `✔ Postfix Operations (Factorial and Percent)`
- `✔ Trigonometry in DEG and RAD Modes`
- `✔ Logarithms, Roots, and Powers`
- `✔ Constants`
- `✔ Memory Operations`
- `✔ Error Handling`
- `✔ Unit Converter - Length`
- `✔ Unit Converter - Temperature`
- `✔ Unit Converter - Data Storage`
- `✔ Programmer Engine - Base representations`
- `✔ Programmer Engine - Bitwise operations`
- `✔ Programmer Engine - Bit toggle`

---

## 📂 Project Architecture

```
Calculator/
├── index.html              # Main HTML markup, semantic & accessible
├── package.json            # Scripts: start, test
├── server.js               # Zero-dependency local Node.js HTTP server
├── README.md               # Documentation & usage guide
├── css/
│   ├── style.css           # Glassmorphism, animations, responsive grid layout
│   └── themes.css          # Theme variable definitions (Dark, Light, Cyberpunk, Retro)
├── js/
│   ├── bundle.js           # Standalone bundle (supports both file:// and http://)
│   ├── calculator-engine.js# Expression parser, Shunting-yard algorithm, precision math
│   ├── unit-converter.js   # Unit conversion logic (Length, Mass, Temp, Area, Speed, Data, Time)
│   ├── programmer-mode.js  # Bitwise math & base conversions (HEX, DEC, OCT, BIN)
│   ├── sound-effects.js    # Synthesized Web Audio click & chime feedback
│   ├── history-manager.js  # Persistent calculation history with localStorage & CSV export
│   └── app.js              # Modular UI controller & keyboard events
└── test/
    ├── engine.test.js      # Core math & expression tests
    └── features.test.js    # Converter & programmer mode tests
```

