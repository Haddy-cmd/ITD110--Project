/* ─────────────────────────────────────────────────────────────────────────
   auth.js — Handles login, register, admin-login, admin-register
   All pages share this single script file.
───────────────────────────────────────────────────────────────────────── */
const API = 'http://localhost:3000/api';

// ── Helpers ────────────────────────────────────────────────────────────────
function showAlert(id, msg, type = 'error') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `alert-box ${type}`;
    el.style.display = 'block';
}
function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
}
function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.original = btn.dataset.original || btn.textContent;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.original;
}
function getPasswordScore(pw) {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8)          s++;
    if (/[A-Z]/.test(pw))        s++;
    if (/[a-z]/.test(pw))        s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
}
function applyStrengthBar(barId, pw) {
    const bar = document.getElementById(barId);
    if (!bar) return;
    const lvl = [
        { w:'0%',   bg:'#334155' },
        { w:'25%',  bg:'#ef4444' },
        { w:'50%',  bg:'#f59e0b' },
        { w:'75%',  bg:'#3b82f6' },
        { w:'100%', bg:'#10b981' },
    ][getPasswordScore(pw)];
    bar.style.width      = lvl.w;
    bar.style.background = lvl.bg;
}

// ── Show/hide password toggles ─────────────────────────────────────────────
['showLoginPass', 'showAdminPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', function () {
            const target = this.id === 'showLoginPass' ? 'loginPass' : 'adminLoginPass';
            document.getElementById(target).type = this.checked ? 'text' : 'password';
        });
    }
});

// ── Password strength bars ─────────────────────────────────────────────────
['regPass', 'aRegPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', function () {
            applyStrengthBar(id === 'regPass' ? 'regStrengthBar' : 'aRegStrengthBar', this.value);
        });
    }
});

// ── Tab switching (index.html) ─────────────────────────────────────────────
const tabLogin    = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginPanel    = document.getElementById('loginPanel');
const registerPanel = document.getElementById('registerPanel');

if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
        loginPanel.classList.add('active');
        registerPanel.classList.remove('active');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        hideAlert('loginAlert'); hideAlert('registerAlert');
    });
    tabRegister.addEventListener('click', () => {
        registerPanel.classList.add('active');
        loginPanel.classList.remove('active');
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        hideAlert('loginAlert'); hideAlert('registerAlert');
    });
}

// ── LOGIN (index.html) ─────────────────────────────────────────────────────
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && loginPanel?.classList.contains('active')) handleLogin();
    });
}

async function handleLogin() {
    hideAlert('loginAlert');
    const username = document.getElementById('loginUser')?.value.trim();
    const password = document.getElementById('loginPass')?.value;
    if (!username || !password) {
        showAlert('loginAlert', 'Please enter your username and password.'); return;
    }
    setLoading(loginBtn, true);
    try {
        const res  = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) { showAlert('loginAlert', data.message); return; }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));

        window.location.href = data.user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
    } catch {
        showAlert('loginAlert', 'Could not reach the server. Is it running?');
    } finally {
        setLoading(loginBtn, false);
    }
}

// ── REGISTER (index.html) ──────────────────────────────────────────────────
const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.addEventListener('click', handleRegister);
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && registerPanel?.classList.contains('active')) handleRegister();
    });
}

async function handleRegister() {
    hideAlert('registerAlert');
    const firstName  = document.getElementById('regFirst')?.value.trim();
    const middleName = document.getElementById('regMiddle')?.value.trim();
    const lastName   = document.getElementById('regLast')?.value.trim();
    const address    = document.getElementById('regAddress')?.value.trim();
    const email      = document.getElementById('regEmail')?.value.trim();
    const username   = document.getElementById('regUser')?.value.trim();
    const password   = document.getElementById('regPass')?.value;
    const confirm    = document.getElementById('regPassConfirm')?.value;

    if (!firstName || !lastName || !address || !email || !username || !password || !confirm) {
        showAlert('registerAlert', 'Please fill in all required fields.'); return;
    }
    if (password !== confirm) {
        showAlert('registerAlert', 'Passwords do not match.'); return;
    }

    setLoading(registerBtn, true);
    try {
        const res  = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, middleName, lastName, address, email, username, password })
        });
        const data = await res.json();
        if (!res.ok) { showAlert('registerAlert', data.message); return; }
        showAlert('registerAlert', data.message, 'success');
        setTimeout(() => {
            tabLogin?.click();
            document.getElementById('loginUser').value = username;
        }, 2200);
    } catch {
        showAlert('registerAlert', 'Could not reach the server.');
    } finally {
        setLoading(registerBtn, false);
    }
}

// ── ADMIN LOGIN (admin-login.html) ─────────────────────────────────────────
const adminLoginBtn = document.getElementById('adminLoginBtn');
if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', handleAdminLogin);
    document.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdminLogin(); });
}

async function handleAdminLogin() {
    hideAlert('adminLoginAlert');
    const username = document.getElementById('adminLoginUser')?.value.trim();
    const password = document.getElementById('adminLoginPass')?.value;
    if (!username || !password) {
        showAlert('adminLoginAlert', 'Please enter your credentials.'); return;
    }
    setLoading(adminLoginBtn, true);
    try {
        const res  = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) { showAlert('adminLoginAlert', data.message); return; }
        if (data.user.role !== 'admin') {
            showAlert('adminLoginAlert', 'This account is not an admin. Use the cashier login.'); return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        window.location.href = 'admin-dashboard.html';
    } catch {
        showAlert('adminLoginAlert', 'Could not reach the server.');
    } finally {
        setLoading(adminLoginBtn, false);
    }
}

// Link to admin-register from admin-login page
const goAdminRegisterBtn = document.getElementById('goAdminRegisterBtn');
if (goAdminRegisterBtn) {
    goAdminRegisterBtn.addEventListener('click', () => {
        window.location.href = 'admin-register.html';
    });
}

// ── ADMIN REGISTER (admin-register.html) ───────────────────────────────────
(async function checkAdminLock() {
    const lockedPanel  = document.getElementById('lockedPanel');
    const adminRegPanel = document.getElementById('adminRegPanel');
    if (!lockedPanel || !adminRegPanel) return;
    try {
        const res  = await fetch(`${API}/auth/check-admin`);
        const data = await res.json();
        if (data.adminExists) {
            adminRegPanel.classList.remove('active');
            lockedPanel.classList.add('active');
        }
    } catch { /* server offline — show form, server will reject */ }
})();

const adminRegBtn = document.getElementById('adminRegBtn');
if (adminRegBtn) {
    adminRegBtn.addEventListener('click', handleAdminRegister);
}

async function handleAdminRegister() {
    hideAlert('adminRegAlert');
    const firstName  = document.getElementById('aRegFirst')?.value.trim();
    const middleName = document.getElementById('aRegMiddle')?.value.trim();
    const lastName   = document.getElementById('aRegLast')?.value.trim();
    const address    = document.getElementById('aRegAddress')?.value.trim();
    const email      = document.getElementById('aRegEmail')?.value.trim();
    const username   = document.getElementById('aRegUser')?.value.trim();
    const password   = document.getElementById('aRegPass')?.value;
    const confirm    = document.getElementById('aRegPassConfirm')?.value;

    if (!firstName || !lastName || !address || !email || !username || !password || !confirm) {
        showAlert('adminRegAlert', 'Please fill in all required fields.'); return;
    }
    if (password !== confirm) {
        showAlert('adminRegAlert', 'Passwords do not match.'); return;
    }

    setLoading(adminRegBtn, true);
    try {
        const res  = await fetch(`${API}/auth/admin-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, middleName, lastName, address, email, username, password })
        });
        const data = await res.json();
        if (!res.ok) { showAlert('adminRegAlert', data.message); return; }
        showAlert('adminRegAlert', data.message, 'success');
        setTimeout(() => window.location.href = 'admin-login.html', 2000);
    } catch {
        showAlert('adminRegAlert', 'Could not reach the server.');
    } finally {
        setLoading(adminRegBtn, false);
    }
}
