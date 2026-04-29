// Switch calculators based on radio button
document.querySelectorAll('input[name="calcType"]').forEach(radio => {
    radio.addEventListener('change', function () {
        document.querySelectorAll('.calc-section').forEach(sec => sec.classList.add('hidden'));
        if (this.value === 'arithmetic') {
            document.getElementById('arithmeticCalc').classList.remove('hidden');
        } else if (this.value === 'scientific') {
            document.getElementById('scientificCalc').classList.remove('hidden');
        } else if (this.value === 'triangle') {
            document.getElementById('triangleCalc').classList.remove('hidden');
        }
    });
});

// Arithmetic Calculator
function appendArith(val) {
    document.getElementById('arithDisplay').value += val;
}
function calculateArith() {
    try {
        document.getElementById('arithDisplay').value = eval(document.getElementById('arithDisplay').value);
    } catch {
        document.getElementById('arithDisplay').value = 'Error';
    }
}
function clearArith() {
    document.getElementById('arithDisplay').value = '';
}

// Scientific Calculator
function appendSci(val) {
    document.getElementById('sciDisplay').value += val;
}
function calculateSci() {
    try {
        document.getElementById('sciDisplay').value = eval(document.getElementById('sciDisplay').value);
    } catch {
        document.getElementById('sciDisplay').value = 'Error';
    }
}
function clearSci() {
    document.getElementById('sciDisplay').value = '';
}

// Triangle Calculator (Pythagoras)
function calculateTriangle() {
    let a = parseFloat(document.getElementById('sideA').value);
    let b = parseFloat(document.getElementById('sideB').value);
    if (isNaN(a) || isNaN(b)) {
        document.getElementById('triangleResult').textContent = "Please enter valid numbers.";
        return;
    }
    let c = Math.sqrt(a * a + b * b);
    document.getElementById('triangleResult').textContent = "Hypotenuse (Side C) = " + c.toFixed(2);
}

// Voice Input Setup
function startVoiceRecognition(callback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        callback(transcript);
    };

    recognition.onerror = (event) => {
        alert("Error: " + event.error);
    };
}

// Voice for Arithmetic
document.getElementById('voiceArith').addEventListener('click', () => {
    startVoiceRecognition(text => {
        document.getElementById('arithDisplay').value = text;
        calculateArith();
    });
});

// Voice for Scientific
document.getElementById('voiceSci').