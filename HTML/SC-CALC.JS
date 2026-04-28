const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');

function appendToDisplay(input) {
    display.value += input;
}

function clearDisplay() {
    display.value = "";
}

function deleteLast() {
    display.value = display.value.slice(0, -1);
}

function calculate() {
    try {
        // Using JavaScript Math object for evaluation
        display.value = eval(display.value);
    } catch (e) {
        display.value = "Error";
    }
}

// Scientific Logic
function sciFunction(type) {
    const val = parseFloat(display.value) || 0;
    switch (type) {
        case 'sin': display.value = Math.sin(val * Math.PI / 180).toFixed(4); break;
        case 'cos': display.value = Math.cos(val * Math.PI / 180).toFixed(4); break;
        case 'tan': display.value = Math.tan(val * Math.PI / 180).toFixed(4); break;
        case 'log': display.value = Math.log10(val).toFixed(4); break;
        case 'sqrt': display.value = Math.sqrt(val).toFixed(4); break;
        case 'pi': display.value += Math.PI.toFixed(4); break;
    }
}

// JavaScript Glow Effect
buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
        btn.style.boxShadow = "0 0 15px var(--glow)";
        btn.style.background = "rgba(255, 255, 255, 0.2)";
        btn.style.transform = "scale(1.05)";
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.boxShadow = "none";
        btn.style.background = "rgba(255, 255, 255, 0.1)";
        btn.style.transform = "scale(1)";
    });
});
