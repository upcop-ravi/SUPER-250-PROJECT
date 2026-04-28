document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const emailError = document.getElementById('emailError');
    const messageDiv = document.getElementById('message');

    // Reset messages
    emailError.textContent = '';
    messageDiv.classList.add('hidden');

    // Email Domain Validation
    if (!email.toLowerCase().endsWith('@uppolice.in')) {
        emailError.textContent = 'Email must end with @uppolice.in';
        return;
    }

    try {
        // Simulating a dummy API call that fails
        const response = await fetch('https://typicode.com', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
            headers: { 'Content-type': 'application/json; charset=UTF-8' }
        });

        if (!response.ok) {
            throw new Error('API Request Failed');
        }
    } catch (error) {
        console.log("API Simulation:", error.message);

        // Showing success message even after API failure as requested
        messageDiv.textContent = `Success! Welcome, ${name}.`;
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');

        // Optional: Clear form
        document.getElementById('loginForm').reset();
    }
});
