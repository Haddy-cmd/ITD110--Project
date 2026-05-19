/* ── Auth guard ── */
const token = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
if (!token || !currentUser || currentUser.role !== 'cashier') {
    window.location.href = 'index.html';
}

const API = 'http://localhost:3000/api';
let cart = [];
let products = [];
let orderHistory = [];

/* ── API helper ── */
async function apiFetch(path, opts = {}) {
    const res = await fetch(API + path, {
        ...opts,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    const data = await res.json();
    if (res.status === 401 || res.status === 403) { localStorage.clear(); window.location.href = 'index.html'; }
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

/* ── Toast ── */
let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── Alert helpers ── */
function showAlert(id, msg, type = 'error') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.className = `alert-box ${type}`; el.style.display = 'block';
}
function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; el.className = 'alert-box'; }
}

/* ── Modal helpers ── */
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

/* ── View navigation ── */
const viewTitles = { homeView:'Dashboard', inventoryView:'📦 Products', cartView:'🛍️ Cart', orderHistoryView:'📋 My Orders', profileView:'👤 Profile' };
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.getElementById('topbarTitle').textContent = viewTitles[id] || 'Dashboard';
    document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.view === id));
    if (id === 'homeView') updateStats();
    if (id === 'inventoryView') renderInventory();
    if (id === 'cartView') renderCart();
    if (id === 'orderHistoryView') renderOrderHistory();
    if (id === 'profileView') populateProfileView();
}

document.querySelectorAll('.nav-item[data-view]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showView(a.dataset.view); closeSidebar(); });
});

/* ── Mobile sidebar ── */
const sidebar = document.getElementById('sidebar');
document.getElementById('menuToggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));
function closeSidebar() { sidebar.classList.remove('open'); }

/* ── Populate user info ── */
function populateUserInfo() {
    const name = currentUser.firstName || currentUser.username;
    const initial = name.charAt(0).toUpperCase();
    document.getElementById('welcomeName').textContent = name;
    document.getElementById('sidebarName').textContent = name;
    document.getElementById('sidebarAvatar').textContent = initial;
    document.getElementById('topbarAvatar').textContent = initial;
    document.getElementById('pfFirst').textContent    = currentUser.firstName || '—';
    document.getElementById('pfLast').textContent     = currentUser.lastName  || '—';
    document.getElementById('pfUsername').textContent = currentUser.username;
    document.getElementById('pfEmail').textContent    = currentUser.email || '—';
    document.getElementById('pfAddress').textContent  = '(see Profile tab)';
}

function populateProfileView() {
    document.getElementById('pvFirst').textContent    = currentUser.firstName  || '—';
    document.getElementById('pvMiddle').textContent   = currentUser.middleName || '—';
    document.getElementById('pvLast').textContent     = currentUser.lastName   || '—';
    document.getElementById('pvUsername').textContent = currentUser.username;
    document.getElementById('pvEmail').textContent    = currentUser.email      || '—';
    document.getElementById('pvAddress').textContent  = currentUser.address    || '—';
}

/* ── Stats ── */
function updateStats() {
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statCart').textContent     = cart.reduce((s,i) => s+i.qty, 0);
    document.getElementById('statOrders').textContent   = orderHistory.length;
}

/* ── Cart Badge ── */
function updateCartBadge() {
    const total = cart.reduce((s,i) => s+i.qty, 0);
    const badge = document.getElementById('cartBadge');
    badge.textContent = total;
    badge.style.display = total > 0 ? 'inline-flex' : 'none';
    document.getElementById('statCart').textContent = total;
}

/* ── INVENTORY ── */
function renderInventory() {
    const search   = (document.getElementById('searchInput').value || '').toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const filtered = products.filter(p => {
        const ms = p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search);
        const mc = !category || p.category === category;
        return ms && mc;
    });
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>No products found.</p></div>';
        return;
    }
    filtered.forEach(p => {
        const oos = p.quantity <= 0;
        const isPath = p.image && (p.image.startsWith('img/') || p.image.startsWith('http') || p.image.includes('.'));
        const imgHTML = isPath
            ? `<div class="product-img-wrap"><img class="product-img" src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="product-img-fallback" style="display:none">${p.emoji||'📦'}</div></div>`
            : `<div class="product-img-fallback">${p.emoji||'📦'}</div>`;
        const card = document.createElement('div');
        card.className = 'product-card' + (oos ? ' out-of-stock' : '');
        card.innerHTML = `${imgHTML}
            <span class="product-code">${p.code}</span>
            <div class="product-name">${p.name}</div>
            <div class="product-category">${p.category}</div>
            <div class="product-price">₱${p.price.toFixed(2)}</div>
            <div class="product-qty ${p.quantity<=5&&p.quantity>0?'low-stock':''}">Stock: ${p.quantity}${p.quantity<=5&&p.quantity>0?' ⚠️':''}</div>
            <div class="qty-control">
                <button class="qty-dec" data-id="${p._id}">−</button>
                <input type="number" class="qty-input" data-id="${p._id}" value="1" min="1" max="${p.quantity}">
                <button class="qty-inc" data-id="${p._id}">+</button>
            </div>
            <button class="add-to-cart-btn" data-id="${p._id}" ${oos?'disabled':''}>${oos?'Out of Stock':'🛒 Add to Cart'}</button>`;
        grid.appendChild(card);
    });
    grid.querySelectorAll('.qty-dec').forEach(btn => btn.addEventListener('click', () => {
        const inp = grid.querySelector(`.qty-input[data-id="${btn.dataset.id}"]`);
        inp.value = Math.max(1, parseInt(inp.value)-1);
    }));
    grid.querySelectorAll('.qty-inc').forEach(btn => btn.addEventListener('click', () => {
        const inp = grid.querySelector(`.qty-input[data-id="${btn.dataset.id}"]`);
        const prod = products.find(p => p._id === btn.dataset.id);
        inp.value = Math.min(prod.quantity, parseInt(inp.value)+1);
    }));
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => btn.addEventListener('click', () => {
        const inp = grid.querySelector(`.qty-input[data-id="${btn.dataset.id}"]`);
        addToCart(btn.dataset.id, parseInt(inp.value)||1);
        inp.value = 1;
    }));
}

function populateCategoryFilter() {
    const sel = document.getElementById('categoryFilter');
    const cats = [...new Set(products.map(p => p.category))].sort();
    cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
}
document.getElementById('searchInput').addEventListener('input', renderInventory);
document.getElementById('categoryFilter').addEventListener('change', renderInventory);

/* ── CART ── */
function addToCart(id, qty) {
    const prod = products.find(p => p._id === id);
    if (!prod || prod.quantity <= 0) return;
    const existing = cart.find(c => c.product._id === id);
    if (existing) {
        const newQty = existing.qty + qty;
        existing.qty = Math.min(newQty, prod.quantity);
        showToast(`✅ Updated: ${prod.name} (×${existing.qty})`);
    } else {
        cart.push({ product: {...prod}, qty: Math.min(qty, prod.quantity) });
        showToast(`🛒 Added: ${prod.name} (×${Math.min(qty, prod.quantity)})`);
    }
    updateCartBadge();
}

function renderCart() {
    const empty = document.getElementById('cartEmpty');
    const table = document.getElementById('cartTable');
    const footer= document.getElementById('cartFooter');
    const tbody = document.getElementById('cartTableBody');
    const totalEl = document.getElementById('cartTotal');
    if (!cart.length) { empty.style.display='block'; table.style.display='none'; footer.style.display='none'; return; }
    empty.style.display='none'; table.style.display='table'; footer.style.display='flex';
    tbody.innerHTML = '';
    let grand = 0;
    cart.forEach((item, idx) => {
        const sub = item.product.price * item.qty;
        grand += sub;
        const stock = products.find(p=>p._id===item.product._id)?.quantity ?? 0;
        const isPath = item.product.image && (item.product.image.startsWith('img/')||item.product.image.includes('.'));
        const thumb = isPath ? `<img class="cart-thumb" src="${item.product.image}" onerror="this.outerHTML='<span class=cart-emoji>${item.product.emoji||'📦'}</span>'">` : `<span class="cart-emoji">${item.product.emoji||'📦'}</span>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${thumb}</td>
            <td><strong>${item.product.name}</strong><br><small style="color:var(--muted)">${item.product.code}</small></td>
            <td>₱${item.product.price.toFixed(2)}</td>
            <td><div class="cart-qty-ctrl">
                <button class="cart-qty-dec" data-idx="${idx}">−</button>
                <span>${item.qty}</span>
                <button class="cart-qty-inc" data-idx="${idx}" ${item.qty>=stock?'disabled style="opacity:0.4"':''}>+</button>
            </div></td>
            <td><strong>₱${sub.toFixed(2)}</strong></td>
            <td><button class="remove-btn" data-idx="${idx}">Remove</button></td>`;
        tbody.appendChild(tr);
    });
    totalEl.textContent = `₱${grand.toFixed(2)}`;
    tbody.querySelectorAll('.cart-qty-dec').forEach(btn => btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx);
        if (cart[i].qty > 1) cart[i].qty--; else cart.splice(i,1);
        updateCartBadge(); renderCart();
    }));
    tbody.querySelectorAll('.cart-qty-inc').forEach(btn => btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx);
        const stock = products.find(p=>p._id===cart[i].product._id)?.quantity??0;
        if (cart[i].qty < stock) { cart[i].qty++; updateCartBadge(); renderCart(); }
    }));
    tbody.querySelectorAll('.remove-btn').forEach(btn => btn.addEventListener('click', () => {
        cart.splice(parseInt(btn.dataset.idx),1);
        updateCartBadge(); renderCart(); showToast('🗑️ Item removed');
    }));
}

document.getElementById('clearCartBtn').addEventListener('click', () => {
    if (!cart.length) return;
    if (!confirm('Clear all items?')) return;
    cart = []; updateCartBadge(); renderCart(); showToast('🗑️ Cart cleared');
});

/* ── CHECKOUT ── */
function buildReceipt(bodyId, totalId) {
    const tbody = document.getElementById(bodyId);
    const totalEl = document.getElementById(totalId);
    tbody.innerHTML = '';
    let grand = 0;
    cart.forEach(item => {
        const sub = item.product.price * item.qty; grand += sub;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.product.emoji||'📦'} ${item.product.name}</td><td>${item.qty}</td><td>₱${item.product.price.toFixed(2)}</td><td>₱${sub.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });
    totalEl.textContent = `₱${grand.toFixed(2)}`;
    return grand;
}

document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!cart.length) return;
    buildReceipt('receiptBody','receiptTotal');
    hideAlert('checkoutAlert'); openModal('checkoutModal');
});
document.getElementById('cancelCheckoutBtn').addEventListener('click', () => closeModal('checkoutModal'));
document.getElementById('closeCheckoutModal').addEventListener('click', () => closeModal('checkoutModal'));

document.getElementById('confirmCheckoutBtn').addEventListener('click', async () => {
    hideAlert('checkoutAlert');
    const btn = document.getElementById('confirmCheckoutBtn');
    btn.disabled = true; btn.textContent = '⏳ Processing…';
    try {
        const items = cart.map(i => ({ productId: i.product._id, quantity: i.qty }));
        const data = await apiFetch('/sales', { method:'POST', body: JSON.stringify({ items }) });
        buildReceipt('finalReceiptBody','finalReceiptTotal');
        document.getElementById('receiptDate').textContent = `Order placed: ${new Date().toLocaleString()}`;
        // Update local product quantities
        data.sale.items.forEach(si => {
            const lp = products.find(p=>p._id===si.productId);
            if (lp) lp.quantity -= si.quantity;
        });
        cart = []; updateCartBadge(); updateStats();
        closeModal('checkoutModal'); openModal('receiptModal'); showToast('🎉 Order placed!');
    } catch(err) {
        showAlert('checkoutAlert', `❌ ${err.message}`);
    } finally {
        btn.disabled = false; btn.textContent = '✅ Confirm Purchase';
    }
});

document.getElementById('closeReceiptBtn').addEventListener('click', () => {
    closeModal('receiptModal'); showView('orderHistoryView');
});

/* ── ORDER HISTORY ── */
async function renderOrderHistory() {
    try {
        const orders = await apiFetch('/sales/my');
        orderHistory = orders;
        const empty = document.getElementById('ordersEmpty');
        const table = document.getElementById('ordersTable');
        const tbody = document.getElementById('ordersTableBody');
        if (!orders.length) { empty.style.display='block'; table.style.display='none'; return; }
        empty.style.display='none'; table.style.display='table'; tbody.innerHTML='';
        orders.forEach((o,idx) => {
            const summary = o.items.map(i=>`${i.emoji||'📦'} ${i.name} ×${i.quantity}`).join(', ');
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>#${orders.length-idx}</strong></td>
                <td>${new Date(o.saleDate).toLocaleString()}</td>
                <td style="max-width:300px;white-space:normal;font-size:0.82rem">${summary}</td>
                <td><strong style="color:var(--success)">₱${o.grandTotal.toFixed(2)}</strong></td>`;
            tbody.appendChild(tr);
        });
        document.getElementById('statOrders').textContent = orders.length;
    } catch(err) { showToast(`❌ ${err.message}`); }
}

/* ── PROFILE EDIT ── */
document.getElementById('openEditProfileBtn').addEventListener('click', () => {
    document.getElementById('editFirst').value   = currentUser.firstName  || '';
    document.getElementById('editMiddle').value  = currentUser.middleName || '';
    document.getElementById('editLast').value    = currentUser.lastName   || '';
    document.getElementById('editAddress').value = currentUser.address    || '';
    document.getElementById('editEmail').value   = currentUser.email      || '';
    hideAlert('editAlert'); openModal('editProfileModal');
});
document.getElementById('cancelEditBtn').addEventListener('click', () => closeModal('editProfileModal'));
document.getElementById('closeEditModal').addEventListener('click', () => closeModal('editProfileModal'));

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    hideAlert('editAlert');
    const firstName  = document.getElementById('editFirst').value.trim();
    const middleName = document.getElementById('editMiddle').value.trim();
    const lastName   = document.getElementById('editLast').value.trim();
    const address    = document.getElementById('editAddress').value.trim();
    const email      = document.getElementById('editEmail').value.trim();
    if (!firstName||!lastName||!address||!email) { showAlert('editAlert','⚠️ Required fields missing.'); return; }
    try {
        // Note: Profile update endpoint not yet added — extend users route if needed
        showAlert('editAlert','✅ Profile updated locally. (Add PATCH /api/me route for persistence.)','success');
        Object.assign(currentUser, {firstName,middleName,lastName,address,email});
        localStorage.setItem('user', JSON.stringify(currentUser));
        populateUserInfo(); populateProfileView();
        setTimeout(() => closeModal('editProfileModal'), 1400);
    } catch(err) { showAlert('editAlert',`❌ ${err.message}`); }
});

/* ── CHANGE PASSWORD ── */
document.getElementById('openChangePassBtn').addEventListener('click', () => {
    ['oldPassword','newPassword','retypePassword'].forEach(id => document.getElementById(id).value='');
    document.getElementById('passStrengthBar').style.width='0%';
    hideAlert('passAlert'); openModal('changePassModal');
});
document.getElementById('cancelPassBtn').addEventListener('click', () => closeModal('changePassModal'));
document.getElementById('closePassModal').addEventListener('click', () => closeModal('changePassModal'));
document.getElementById('newPassword').addEventListener('input', function() {
    const s=[{w:'0%',bg:'#e0e0e0'},{w:'25%',bg:'#ef4444'},{w:'50%',bg:'#f59e0b'},{w:'75%',bg:'#3b82f6'},{w:'100%',bg:'#22c55e'}];
    let sc=0; const pw=this.value;
    if(pw.length>=8)sc++;if(/[A-Z]/.test(pw))sc++;if(/[a-z]/.test(pw))sc++;if(/[^A-Za-z0-9]/.test(pw))sc++;
    const bar=document.getElementById('passStrengthBar'); bar.style.width=s[sc].w; bar.style.background=s[sc].bg;
});
document.getElementById('savePassBtn').addEventListener('click', async () => {
    hideAlert('passAlert');
    const oldPw=document.getElementById('oldPassword').value;
    const newPw=document.getElementById('newPassword').value;
    const retype=document.getElementById('retypePassword').value;
    if(!oldPw||!newPw||!retype){showAlert('passAlert','⚠️ All fields required.');return;}
    if(newPw!==retype){showAlert('passAlert','❌ Passwords do not match.');return;}
    showAlert('passAlert','✅ Password change endpoint — add PATCH /api/auth/change-password to backend.','info');
});

/* ── LOGOUT ── */
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear(); window.location.href='index.html';
});

/* ── INIT ── */
(async function init() {
    populateUserInfo();
    try {
        products = await apiFetch('/products');
        populateCategoryFilter();
        updateCartBadge();
        updateStats();
    } catch(err) { showToast(`❌ ${err.message}`); }
})();
