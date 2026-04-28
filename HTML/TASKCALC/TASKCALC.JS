// 1. Global State
let isDegree = true;

// 2. Main UI Logic
document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('input[name="calc-option"]');
    const displayArea = document.getElementById('output-content');

    // Math Calculator UI
    const mathCalcHTML = `
    <div class="calculator-ui">
        <input type="text" id="calc-screen" readonly value="0">
        <div class="calc-buttons">
            <button class="btn" onclick="clearScreen()">AC</button>
            <button class="btn" onclick="backspace()">Back</button>
            <button class="btn" onclick="press('%')">%</button>
            <button class="btn" onclick="press('/')">/</button>
            
            <button class="btn" onclick="press('7')">7</button>
            <button class="btn" onclick="press('8')">8</button>
            <button class="btn" onclick="press('9')">9</button>
            <button class="btn" onclick="press('*')">*</button>
            
            <button class="btn" onclick="press('4')">4</button>
            <button class="btn" onclick="press('5')">5</button>
            <button class="btn" onclick="press('6')">6</button>
            <button class="btn" onclick="press('-')">-</button>
            
            <button class="btn" onclick="press('1')">1</button>
            <button class="btn" onclick="press('2')">2</button>
            <button class="btn" onclick="press('3')">3</button>
            <button class="btn" onclick="press('+')">+</button>
            
            <button class="btn zero" onclick="press('0')">0</button>
            <button class="btn" onclick="press('.')">.</button>
            <button class="btn equal" onclick="calculate()">=</button>
        </div>
    </div>
`;


    // Scientific Calculator UI
    const scientificCalcHTML = `
        <div class="calculator-ui sci-ui">
            <div class="mode-toggle">
                <button id="toggle-btn" class="btn-mode active" onclick="toggleMode()">DEG</button>
                <button id="rad-btn" class="btn-mode" onclick="toggleMode()">RAD</button>
            </div>
            <input type="text" id="calc-screen" readonly value="0">
            <div class="calc-buttons sci-grid">
                <button class="btn sci-fn" onclick="sciOp('sin')">sin</button>
                <button class="btn sci-fn" onclick="sciOp('cos')">cos</button>
                <button class="btn sci-fn" onclick="sciOp('tan')">tan</button>
                <button class="btn clear" onclick="clearScreen()">C</button>
                <button class="btn sci-fn" onclick="sciOp('sqrt')">√</button>
                <button class="btn sci-fn" onclick="sciOp('log')">log</button>
                <button class="btn sci-fn" onclick="sciOp('exp')">exp</button>
                <button class="btn" onclick="press('/')">÷</button>
                <button class="btn" onclick="press('7')">7</button>
                <button class="btn" onclick="press('8')">8</button>
                <button class="btn" onclick="press('9')">9</button>
                <button class="btn" onclick="press('*')">×</button>
                <button class="btn" onclick="press('4')">4</button>
                <button class="btn" onclick="press('5')">5</button>
                <button class="btn" onclick="press('6')">6</button>
                <button class="btn" onclick="press('-')">−</button>
                <button class="btn" onclick="press('1')">1</button>
                <button class="btn" onclick="press('2')">2</button>
                <button class="btn" onclick="press('3')">3</button>
                <button class="btn" onclick="press('+')">+</button>
                <button class="btn zero" onclick="press('0')">0</button>
                <button class="btn" onclick="press('.')">.</button>
                <button class="btn equal" onclick="calculate()">=</button>
            </div>
        </div>`;

    const contentMap = {
        math: mathCalcHTML,
        scientific: scientificCalcHTML,
        fraction: `
        <div class="calculator-ui">
            <h3>Fraction Calculator</h3>
            <div class="input-row">
                <input type="number" id="f1-num" placeholder="Num"> / <input type="number" id="f1-den" placeholder="Den">
            </div>
            <select id="f-op" class="btn">
                <option value="+">+</option><option value="-">-</option>
                <option value="*">×</option><option value="/">÷</option>
            </select>
            <div class="input-row">
                <input type="number" id="f2-num" placeholder="Num"> / <input type="number" id="f2-den" placeholder="Den">
            </div>
            <button class="btn equal" onclick="calcFraction()">Calculate</button>
            <h2 id="f-result">Result: -</h2>
        </div>`,
        percentage: `
        <div class="calculator-ui">
            <h3>Percentage Calculator</h3>
            <p>What is <input type="number" id="p1" style="width:60px">% of <input type="number" id="p2" style="width:80px">?</p>
            <button class="btn equal" onclick="calcPercent()">Calculate</button>
            <h2 id="p-result">Result: -</h2>
        </div>`,
        random: `
        <div class="calculator-ui">
            <h3>Random Generator</h3>
            <input type="number" id="r-min" placeholder="Min" value="1">
            <input type="number" id="r-max" placeholder="Max" value="100">
            <button class="btn equal" onclick="calcRandom()">Generate</button>
            <h1 id="r-result">--</h1>
        </div>`,
        triangle: `
        <div class="calculator-ui">
            <h3>Triangle (Pythagoras)</h3>
            <input type="number" id="t-a" placeholder="Side A">
            <input type="number" id="t-b" placeholder="Side B">
            <button class="btn equal" onclick="calcTriangle()">Find Hypotenuse (C)</button>
            <h2 id="t-result">C = -</h2>
        </div>`,
        std_dev: `
        <div class="calculator-ui">
            <h3>Standard Deviation</h3>
            <textarea id="sd-input" placeholder="Enter numbers separated by commas (e.g. 10, 2, 38)"></textarea>
            <button class="btn equal" onclick="calcSD()">Calculate</button>
            <h2 id="sd-result">σ = -</h2>
        </div>`
    };


    function updateDisplay(value) {
        displayArea.innerHTML = contentMap[value];
    }

    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => updateDisplay(e.target.value));
    });

    updateDisplay('math');
});

// 3. Calculation Logic
function press(val) {
    const screen = document.getElementById('calc-screen');
    if (screen.value === "0") screen.value = val;
    else screen.value += val;
}

function clearScreen() {
    document.getElementById('calc-screen').value = "0";
}

function calculate() {
    const screen = document.getElementById('calc-screen');
    try {
        let expression = screen.value.replace('×', '*').replace('÷', '/');
        screen.value = eval(expression);
    } catch {
        screen.value = "Error";
    }
}

// 4. Scientific Mode Logic
function toggleMode() {
    isDegree = !isDegree;
    document.getElementById('toggle-btn').classList.toggle('active');
    document.getElementById('rad-btn').classList.toggle('active');
}

function sciOp(type) {
    const screen = document.getElementById('calc-screen');
    let val = parseFloat(screen.value);
    let input = val;

    // Convert degrees to radians for trig functions if DEG is active
    if (isDegree && ['sin', 'cos', 'tan'].includes(type)) {
        input = val * (Math.PI / 180);
    }

    switch (type) {
        case 'sin': screen.value = Math.sin(input).toFixed(4); break;
        case 'cos': screen.value = Math.cos(input).toFixed(4); break;
        case 'tan': screen.value = Math.tan(input).toFixed(4); break;
        case 'log': screen.value = Math.log10(val).toFixed(4); break;
        case 'sqrt': screen.value = Math.sqrt(val).toFixed(4); break;
        case 'exp': screen.value = Math.exp(val).toFixed(4); break;
    }
}
// --- Fraction Logic ---
function calcFraction() {
    const n1 = parseInt(document.getElementById('f1-num').value);
    const d1 = parseInt(document.getElementById('f1-den').value);
    const n2 = parseInt(document.getElementById('f2-num').value);
    const d2 = parseInt(document.getElementById('f2-den').value);
    const op = document.getElementById('f-op').value;

    let resNum, resDen;
    if (op === '+') { resNum = n1 * d2 + n2 * d1; resDen = d1 * d2; }
    else if (op === '-') { resNum = n1 * d2 - n2 * d1; resDen = d1 * d2; }
    else if (op === '*') { resNum = n1 * n2; resDen = d1 * d2; }
    else if (op === '/') { resNum = n1 * d2; resDen = d1 * n2; }

    const common = (a, b) => b ? common(b, a % b) : a;
    const divisor = Math.abs(common(resNum, resDen));
    document.getElementById('f-result').innerText = `Result: ${resNum / divisor} / ${resDen / divisor}`;
}

// --- Percentage Logic ---
function calcPercent() {
    const p = document.getElementById('p1').value;
    const total = document.getElementById('p2').value;
    const res = (p / 100) * total;
    document.getElementById('p-result').innerText = `Result: ${res.toFixed(2)}`;
}

// --- Random Number Logic ---
function calcRandom() {
    const min = Math.ceil(document.getElementById('r-min').value);
    const max = Math.floor(document.getElementById('r-max').value);
    const res = Math.floor(Math.random() * (max - min + 1)) + min;
    document.getElementById('r-result').innerText = res;
}

// --- Triangle Logic ---
function calcTriangle() {
    const a = document.getElementById('t-a').value;
    const b = document.getElementById('t-b').value;
    const c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    document.getElementById('t-result').innerText = `C = ${c.toFixed(2)}`;
}

// --- Standard Deviation Logic ---
function calcSD() {
    const input = document.getElementById('sd-input').value;
    const array = input.split(',').map(Number).filter(n => !isNaN(n));
    const n = array.length;
    if (n < 1) return;
    const mean = array.reduce((a, b) => a + b) / n;
    const deviation = Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
    document.getElementById('sd-result').innerText = `σ = ${deviation.toFixed(4)}`;
}
function backspace() {
    const screen = document.getElementById('calc-screen');
    if (screen.value.length > 1) {
        screen.value = screen.value.slice(0, -1);
    } else {
        screen.value = "0";
    }
}

