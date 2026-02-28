const API_BASE_URL = 'http://localhost:8000';

// Setup Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(255, 0, 122, 0.9)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Particle Background Logic (for index.html)
const canvas = document.getElementById('particles-bg');
if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray = [];
    const colors = ['#ff007a', '#7a00ff', '#a5b4fc'];

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.size > 0.2) this.size -= 0.01;

            // Re-spawn
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height || this.size <= 0.2) {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 3 + 1;
            }
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particlesArray = [];
        for (let i = 0; i < 100; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
        }
        requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    });
}

// Authentication Logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const resp = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (resp.ok) {
                localStorage.setItem('redmind_user', username);
                window.location.href = 'dashboard.html';
            } else {
                const data = await resp.json();
                showToast(data.detail || 'Login failed', 'error');
            }
        } catch (err) {
            showToast('Connection to server failed', 'error');
        }
    });
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const resp = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (resp.ok) {
                showToast('Account initialized! Please login.');
                setTimeout(() => window.location.href = 'login.html', 1500);
            } else {
                const data = await resp.json();
                showToast(data.detail || 'Signup failed', 'error');
            }
        } catch (err) {
            showToast('Connection to server failed', 'error');
        }
    });
}

// Dashboard Logic
const analyzeBtn = document.getElementById('analyze-btn');
if (analyzeBtn) {
    const currentUser = localStorage.getItem('redmind_user');
    if (!currentUser) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('user-greeting').textContent = `Agent: ${currentUser}`;
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('redmind_user');
        window.location.href = 'login.html';
    });

    analyzeBtn.addEventListener('click', async () => {
        const code = document.getElementById('code-input').value;
        const simulateAttack = document.getElementById('simulate-attack').checked;

        if (!code.trim()) {
            showToast('Provide source code to scan', 'error');
            return;
        }

        analyzeBtn.textContent = 'Scanning...';
        analyzeBtn.disabled = true;

        try {
            const resp = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, simulate_attack: simulateAttack })
            });

            if (resp.ok) {
                const data = await resp.json();
                displayResults(data);
                showToast('Scan Complete');
            } else {
                showToast('Analysis error', 'error');
            }
        } catch (err) {
            showToast('Connection to analyzer engine failed', 'error');
        } finally {
            analyzeBtn.textContent = 'Initialize Scan';
            analyzeBtn.disabled = false;
        }
    });
}

function displayResults(data) {
    const resultsPanel = document.getElementById('results-panel');
    resultsPanel.classList.add('active');

    // Score
    const scoreCard = document.getElementById('score-card');
    const scoreVal = document.getElementById('risk-score-val');
    scoreCard.className = `score-card ${data.risk_score}`;
    scoreVal.textContent = data.risk_score;
    // Set colors
    if (data.risk_score === 'Low') scoreVal.style.color = '#10b981';
    else if (data.risk_score === 'Medium') scoreVal.style.color = '#f59e0b';
    else if (data.risk_score === 'High') scoreVal.style.color = '#ef4444';

    // Issues
    const issuesList = document.getElementById('issues-list');
    issuesList.innerHTML = '';
    if (data.issues.length === 0) {
        issuesList.innerHTML = '<li>No significant vulnerabilities detected by primary scan.</li>';
    } else {
        data.issues.forEach(issue => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="badge badge-${issue.type}">${issue.type}</span> ${issue.message}`;
            issuesList.appendChild(li);
        });
    }

    // AI Suggestions & Code
    const aiSection = document.getElementById('ai-section');
    aiSection.style.display = 'block';

    document.getElementById('ai-code').textContent = data.ai_optimized_code;

    const aiSugList = document.getElementById('ai-suggestions-list');
    aiSugList.innerHTML = '';
    data.ai_suggestions.forEach(sug => {
        const li = document.createElement('li');
        li.textContent = sug;
        aiSugList.appendChild(li);
    });

    // Attack Simulation
    const attackSection = document.getElementById('attack-section');
    if (data.attack_simulation) {
        attackSection.style.display = 'block';
        document.getElementById('attack-log').textContent = data.attack_simulation;
    } else {
        attackSection.style.display = 'none';
    }
}
