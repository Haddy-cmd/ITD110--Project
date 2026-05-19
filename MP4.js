// ── Panel Switching ──────────────────────────────────────────────────
function showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    clearAlerts();
}

function clearAlerts() {
    ['loginAlert', 'registerAlert'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
}

function showAlert(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = `alert-box ${type}`;
    el.style.display = 'block';
}

// ── Show / Hide Password ─────────────────────────────────────────────
document.getElementById('showLoginPass').addEventListener('change', function () {
    document.getElementById('loginPass').type = this.checked ? 'text' : 'password';
});

// ── Password Strength ────────────────────────────────────────────────
function getPasswordScore(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)           score++;
    if (/[A-Z]/.test(pw))         score++;
    if (/[a-z]/.test(pw))         score++;
    if (/[^A-Za-z0-9]/.test(pw))  score++;
    return score;
}

function validatePassword(pw) {
    const errors = [];
    if (pw.length < 8)               errors.push('at least 8 characters');
    if (!/[A-Z]/.test(pw))           errors.push('an uppercase letter');
    if (!/[a-z]/.test(pw))           errors.push('a lowercase letter');
    if (!/[^A-Za-z0-9]/.test(pw))   errors.push('a special character');
    return errors;
}

document.getElementById('regPass').addEventListener('input', function () {
    const score = getPasswordScore(this.value);
    const bar = document.getElementById('regStrengthBar');
    const levels = [
        { width: '0%',   bg: '#e0e0e0' },
        { width: '25%',  bg: '#e74c3c' },
        { width: '50%',  bg: '#f39c12' },
        { width: '75%',  bg: '#3498db' },
        { width: '100%', bg: '#2ecc71' },
    ];
    bar.style.width      = levels[score].width;
    bar.style.background = levels[score].bg;
});

// ── Load Users ───────────────────────────────────────────────────────
async function loadUsers() {
    // Check sessionStorage cache first (for password changes)
    const cached = sessionStorage.getItem('usersData');
    if (cached) return JSON.parse(cached);

    const res = await fetch('users.json');
    const data = await res.json();
    return data;
}

async function saveUsers(data) {
    sessionStorage.setItem('usersData', JSON.stringify(data));
    // Try a real PUT (works with json-server)
    try {
        await fetch('users.json', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data, null, 2)
        });
    } catch (_) { /* file server not available – session cache used */ }
}

// ── LOGIN ────────────────────────────────────────────────────────────
async function login() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;

    if (!username || !password) {
        showAlert('loginAlert', '⚠️ Please enter both username and password.', 'error');
        return;
    }

    let data;
    try {
        data = await loadUsers();
    } catch {
        showAlert('loginAlert', '❌ Could not load users.json.', 'error');
        return;
    }

    const user = data.users.find(u => u.username === username && u.password === password);

    if (user) {
        sessionStorage.setItem('loggedInUser', username);
        window.location.href = 'dashboard.html';
    } else {
        showAlert('loginAlert', '❌ Wrong username or password.', 'error');
    }
}

// ── REGISTER ─────────────────────────────────────────────────────────
async function register() {
    const firstName = document.getElementById('regFirst').value.trim();
    const middleName = document.getElementById('regMiddle').value.trim();
    const lastName  = document.getElementById('regLast').value.trim();
    const address   = document.getElementById('regAddress').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const username  = document.getElementById('regUser').value.trim();
    const password  = document.getElementById('regPass').value;
    const confirm   = document.getElementById('regPassConfirm').value;

    if (!firstName || !lastName || !address || !email || !username || !password || !confirm) {
        showAlert('registerAlert', '⚠️ Please fill in all required fields.', 'error');
        return;
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
        showAlert('registerAlert', '⚠️ Please enter a valid email address.', 'error');
        return;
    }

    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
        showAlert('registerAlert', `⚠️ Password must contain: ${pwErrors.join(', ')}.`, 'error');
        return;
    }

    if (password !== confirm) {
        showAlert('registerAlert', '❌ Passwords do not match.', 'error');
        return;
    }

    let data;
    try {
        data = await loadUsers();
    } catch {
        showAlert('registerAlert', '❌ Could not load users.json.', 'error');
        return;
    }

    if (data.users.find(u => u.username === username)) {
        showAlert('registerAlert', '❌ That username is already taken.', 'error');
        return;
    }

    data.users.push({ username, password, firstName, middleName, lastName, address, email });
    await saveUsers(data);

    showAlert('registerAlert', `✅ Account created for ${firstName}! You can now log in.`, 'success');
    setTimeout(() => showPanel('loginPanel'), 1800);
}

// ── Event Bindings ───────────────────────────────────────────────────
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('registerBtn').addEventListener('click', register);
document.getElementById('goRegisterBtn').addEventListener('click', () => showPanel('registerPanel'));
document.getElementById('backToLoginBtn').addEventListener('click', () => showPanel('loginPanel'));
document.getElementById('exitBtn').addEventListener('click', () => {
    document.body.innerHTML = "<h2 style='text-align:center;font-family:Nunito,sans-serif;margin-top:40vh;color:#1a4f82'>Program Ended</h2>";
});

document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const active = document.querySelector('.panel.active');
        if (active && active.id === 'loginPanel') login();
        else if (active && active.id === 'registerPanel') register();
    }
});
