// ── Auth Guard ─────────────────────────────────────────────────────────────
const loggedInUser = sessionStorage.getItem('loggedInUser');
if (!loggedInUser) window.location.href = 'MP4.html';

// ── State ──────────────────────────────────────────────────────────────────
let cart = [];           // { product, qty }
let orderHistory = [];   // { id, date, items, total }
let products = [];       // loaded from products.json / session

// ── Load / Save Helpers ────────────────────────────────────────────────────
async function loadUsers() {
    const cached = sessionStorage.getItem('usersData');
    if (cached) return JSON.parse(cached);
    const res = await fetch('users.json');
    return await res.json();
}

async function saveUsers(data) {
    sessionStorage.setItem('usersData', JSON.stringify(data));
    try {
        await fetch('users.json', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data, null, 2)
        });
    } catch (_) {}
}

async function loadProducts() {
    const cached = sessionStorage.getItem('productsData');
    if (cached) return JSON.parse(cached);
    try {
        const res = await fetch('products.json');
        const data = await res.json();
        sessionStorage.setItem('productsData', JSON.stringify(data));
        return data;
    } catch (_) {
        return { products: [] };
    }
}

function saveProducts(data) {
    sessionStorage.setItem('productsData', JSON.stringify(data));
    // persist to file when a server is available
    fetch('products.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2)
    }).catch(() => {});
}

function loadCart() {
    const key = `cart_${loggedInUser}`;
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
}

function saveCart() {
    sessionStorage.setItem(`cart_${loggedInUser}`, JSON.stringify(cart));
}

function loadOrders() {
    const key = `orders_${loggedInUser}`;
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
}

function saveOrders() {
    sessionStorage.setItem(`orders_${loggedInUser}`, JSON.stringify(orderHistory));
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Alert Helpers ──────────────────────────────────────────────────────────
function showAlert(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = `alert ${type}`;
    el.style.display = 'block';
}
function hideAlert(id) {
    const el = document.getElementById(id);
    el.style.display = 'none';
    el.textContent = '';
}

// ── Modal Helpers ──────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

['editProfileModal', 'changePasswordModal', 'checkoutModal', 'receiptModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
        if (e.target === document.getElementById(id)) closeModal(id);
    });
});

// ── View Navigation ────────────────────────────────────────────────────────
const views = ['homeView', 'inventoryView', 'cartView', 'orderHistoryView'];
const titles = {
    homeView: 'Dashboard',
    inventoryView: '📦 Product Inventory',
    cartView: '🛍️ Shopping Cart',
    orderHistoryView: '📋 Order History'
};

function showView(id) {
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.toggle('active', v === id);
    });
    document.getElementById('topbarTitle').textContent = titles[id] || 'Dashboard';
}

document.getElementById('homeNav').addEventListener('click', e => {
    e.preventDefault();
    showView('homeView');
    updateStats();
});
document.getElementById('inventoryMenu').addEventListener('click', () => {
    showView('inventoryView');
    renderInventory();
});
document.getElementById('viewCartMenu').addEventListener('click', () => {
    showView('cartView');
    renderCart();
});
document.getElementById('orderHistoryMenu').addEventListener('click', () => {
    showView('orderHistoryView');
    renderOrderHistory();
});

// ── Populate Dashboard ─────────────────────────────────────────────────────
async function populateDashboard() {
    const data = await loadUsers();
    const user = data.users.find(u => u.username === loggedInUser);
    if (!user) return;

    const firstName = user.firstName || loggedInUser;

    document.getElementById('welcomeName').textContent   = firstName;
    document.getElementById('profileName').textContent   = firstName;
    document.getElementById('avatarInitial').textContent = firstName.charAt(0).toUpperCase();

    document.getElementById('pfFirst').textContent    = user.firstName   || '—';
    document.getElementById('pfMiddle').textContent   = user.middleName  || '—';
    document.getElementById('pfLast').textContent     = user.lastName    || '—';
    document.getElementById('pfUsername').textContent = user.username;
    document.getElementById('pfAddress').textContent  = user.address     || '—';
    document.getElementById('pfEmail').textContent    = user.email       || '—';
}

// ── Stats ──────────────────────────────────────────────────────────────────
function updateStats() {
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statCart').textContent     = cart.reduce((s, i) => s + i.qty, 0);
    document.getElementById('statOrders').textContent   = orderHistory.length;
}

// ── Cart Badge ─────────────────────────────────────────────────────────────
function updateCartBadge() {
    const total = cart.reduce((s, i) => s + i.qty, 0);
    const badge = document.getElementById('cartBadge');
    badge.textContent = total;
    badge.classList.toggle('visible', total > 0);
    document.getElementById('statCart').textContent = total;
}

// ── INVENTORY ─────────────────────────────────────────────────────────────
function renderInventory() {
    const search   = (document.getElementById('searchInput').value || '').toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search);
        const matchCat    = !category || p.category === category;
        return matchSearch && matchCat;
    });

    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>No products found.</p></div>';
        return;
    }

    filtered.forEach(product => {
        const cartItem   = cart.find(c => c.product.code === product.code);
        const cartQty    = cartItem ? cartItem.qty : 0;
        const outOfStock = product.quantity <= 0;

        const card = document.createElement('div');
        card.className = 'product-card' + (outOfStock ? ' out-of-stock' : '');

        // Detect if image field is a file path or an emoji
        const isPath = product.image && (product.image.startsWith('img/') || product.image.startsWith('http') || product.image.includes('.'));
        const imgHTML = isPath
            ? `<div class="product-img-wrap">
                 <img class="product-img" src="${product.image}" alt="${product.name}"
                      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                 <div class="product-img-fallback" style="display:none">${product.emoji || '📦'}</div>
               </div>`
            : `<div class="product-img-fallback">${product.image}</div>`;

        card.innerHTML = `
            ${imgHTML}
            <span class="product-code">${product.code}</span>
            <div class="product-name">${product.name}</div>
            <div class="product-category">${product.category}</div>
            <div class="product-price">₱${product.price.toFixed(2)}</div>
            <div class="product-qty ${product.quantity <= 5 && product.quantity > 0 ? 'low-stock' : ''}">
                Stock: ${product.quantity}${product.quantity <= 5 && product.quantity > 0 ? ' ⚠️' : ''}
            </div>
            <div class="qty-control">
                <button class="qty-dec" data-code="${product.code}">−</button>
                <input type="number" class="qty-input" data-code="${product.code}" value="1" min="1" max="${product.quantity}">
                <button class="qty-inc" data-code="${product.code}">+</button>
            </div>
            <button class="add-to-cart-btn" data-code="${product.code}" ${outOfStock ? 'disabled' : ''}>
                ${outOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
            </button>
        `;

        grid.appendChild(card);
    });

    // Event delegation for qty controls and add to cart
    grid.querySelectorAll('.qty-dec').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = grid.querySelector(`.qty-input[data-code="${btn.dataset.code}"]`);
            inp.value = Math.max(1, parseInt(inp.value) - 1);
        });
    });
    grid.querySelectorAll('.qty-inc').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = grid.querySelector(`.qty-input[data-code="${btn.dataset.code}"]`);
            const prod = products.find(p => p.code === btn.dataset.code);
            inp.value = Math.min(prod.quantity, parseInt(inp.value) + 1);
        });
    });
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.dataset.code;
            const inp  = grid.querySelector(`.qty-input[data-code="${code}"]`);
            const qty  = parseInt(inp.value) || 1;
            addToCart(code, qty);
            inp.value = 1;
        });
    });
}

// populate category filter
function populateCategoryFilter() {
    const sel = document.getElementById('categoryFilter');
    const cats = [...new Set(products.map(p => p.category))].sort();
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        sel.appendChild(opt);
    });
}

document.getElementById('searchInput').addEventListener('input', renderInventory);
document.getElementById('categoryFilter').addEventListener('change', renderInventory);

// ── ADD TO CART ────────────────────────────────────────────────────────────
function addToCart(code, qty) {
    const product = products.find(p => p.code === code);
    if (!product || product.quantity <= 0) return;

    const existing = cart.find(c => c.product.code === code);
    const allowed  = product.quantity;

    if (existing) {
        const newQty = existing.qty + qty;
        if (newQty > allowed) {
            showToast(`⚠️ Only ${allowed} units available for ${product.name}`);
            existing.qty = allowed;
        } else {
            existing.qty = newQty;
            showToast(`✅ Updated: ${product.name} (×${existing.qty})`);
        }
    } else {
        const actualQty = Math.min(qty, allowed);
        cart.push({ product: { ...product }, qty: actualQty });
        showToast(`🛒 Added: ${product.name} (×${actualQty})`);
    }

    saveCart();
    updateCartBadge();
}

// ── RENDER CART ────────────────────────────────────────────────────────────
function renderCart() {
    const empty    = document.getElementById('cartEmpty');
    const table    = document.getElementById('cartTable');
    const footer   = document.getElementById('cartFooter');
    const tbody    = document.getElementById('cartTableBody');
    const totalEl  = document.getElementById('cartTotal');

    if (cart.length === 0) {
        empty.style.display  = 'block';
        table.style.display  = 'none';
        footer.style.display = 'none';
        return;
    }

    empty.style.display  = 'none';
    table.style.display  = 'table';
    footer.style.display = 'flex';

    tbody.innerHTML = '';
    let grand = 0;

    cart.forEach((item, idx) => {
        const sub = item.product.price * item.qty;
        grand += sub;
        const stock = products.find(p => p.code === item.product.code)?.quantity ?? 0;

        const isCartPath = item.product.image && (item.product.image.startsWith('img/') || item.product.image.startsWith('http') || item.product.image.includes('.'));
        const cartThumb = isCartPath
            ? `<img class="cart-thumb" src="${item.product.image}" alt="${item.product.name}" onerror="this.outerHTML='<span class=cart-emoji>${item.product.emoji||'📦'}</span>'">`
            : `<span class="cart-emoji">${item.product.image}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cartThumb}</td>
            <td>
                <strong>${item.product.name}</strong><br>
                <small style="color:var(--muted)">${item.product.code}</small>
            </td>
            <td>₱${item.product.price.toFixed(2)}</td>
            <td>
                <div class="cart-qty-ctrl">
                    <button data-idx="${idx}" class="cart-qty-dec">−</button>
                    <span>${item.qty}</span>
                    <button data-idx="${idx}" class="cart-qty-inc" ${item.qty >= stock ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>+</button>
                </div>
            </td>
            <td><strong>₱${sub.toFixed(2)}</strong></td>
            <td><button class="remove-btn" data-idx="${idx}">Remove</button></td>
        `;
        tbody.appendChild(tr);
    });

    totalEl.textContent = `₱${grand.toFixed(2)}`;

    // Qty controls
    tbody.querySelectorAll('.cart-qty-dec').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx);
            if (cart[i].qty > 1) { cart[i].qty--; } else { cart.splice(i, 1); }
            saveCart(); updateCartBadge(); renderCart();
        });
    });
    tbody.querySelectorAll('.cart-qty-inc').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx);
            const stock = products.find(p => p.code === cart[i].product.code)?.quantity ?? 0;
            if (cart[i].qty < stock) { cart[i].qty++; saveCart(); updateCartBadge(); renderCart(); }
        });
    });
    tbody.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cart.splice(parseInt(btn.dataset.idx), 1);
            saveCart(); updateCartBadge(); renderCart();
            showToast('🗑️ Item removed from cart');
        });
    });
}

// ── CLEAR CART ────────────────────────────────────────────────────────────
document.getElementById('clearCartBtn').addEventListener('click', () => {
    if (cart.length === 0) return;
    if (!confirm('Clear all items from your cart?')) return;
    cart = [];
    saveCart(); updateCartBadge(); renderCart();
    showToast('🗑️ Cart cleared');
});

// ── CHECKOUT ──────────────────────────────────────────────────────────────
document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (cart.length === 0) return;
    buildReceipt('receiptBody', 'receiptTotal');
    hideAlert('checkoutAlert');
    openModal('checkoutModal');
});

document.getElementById('cancelCheckoutBtn').addEventListener('click', () => closeModal('checkoutModal'));

function buildReceipt(bodyId, totalId) {
    const tbody = document.getElementById(bodyId);
    const totalEl = document.getElementById(totalId);
    tbody.innerHTML = '';
    let grand = 0;
    cart.forEach(item => {
        const sub = item.product.price * item.qty;
        grand += sub;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.product.image} ${item.product.name}</td>
            <td>${item.qty}</td>
            <td>₱${item.product.price.toFixed(2)}</td>
            <td>₱${sub.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
    totalEl.textContent = `₱${grand.toFixed(2)}`;
    return grand;
}

document.getElementById('confirmCheckoutBtn').addEventListener('click', () => {
    hideAlert('checkoutAlert');

    // Validate stock
    for (const item of cart) {
        const prod = products.find(p => p.code === item.product.code);
        if (!prod || prod.quantity < item.qty) {
            showAlert('checkoutAlert', `❌ Insufficient stock for "${item.product.name}". Available: ${prod?.quantity ?? 0}`, 'error');
            return;
        }
    }

    // Deduct stock
    cart.forEach(item => {
        const prod = products.find(p => p.code === item.product.code);
        if (prod) prod.quantity -= item.qty;
    });
    saveProducts({ products });

    // Save order
    const grand = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
    const order = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        items: cart.map(i => ({ ...i.product, qty: i.qty })),
        total: grand
    };
    orderHistory.unshift(order);
    saveOrders();

    // Build final receipt before clearing cart
    buildReceipt('finalReceiptBody', 'finalReceiptTotal');
    document.getElementById('receiptDate').textContent = `Order placed: ${order.date}`;

    // Clear cart
    cart = [];
    saveCart(); updateCartBadge(); updateStats();

    closeModal('checkoutModal');
    openModal('receiptModal');
    showToast('🎉 Order placed successfully!');
});

document.getElementById('closeReceiptBtn').addEventListener('click', () => {
    closeModal('receiptModal');
    showView('orderHistoryView');
    renderOrderHistory();
});

// ── ORDER HISTORY ─────────────────────────────────────────────────────────
function renderOrderHistory() {
    const empty  = document.getElementById('ordersEmpty');
    const table  = document.getElementById('ordersTable');
    const tbody  = document.getElementById('ordersTableBody');

    if (orderHistory.length === 0) {
        empty.style.display  = 'block';
        table.style.display  = 'none';
        return;
    }

    empty.style.display  = 'none';
    table.style.display  = 'table';
    tbody.innerHTML = '';

    orderHistory.forEach((order, idx) => {
        const itemsSummary = order.items.map(i => {
            const icon = (i.image && i.image.includes('.')) ? (i.emoji || '📦') : i.image;
            return `${icon} ${i.name} ×${i.qty}`;
        }).join(', ');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${orderHistory.length - idx}</strong></td>
            <td>${order.date}</td>
            <td style="max-width:320px;white-space:normal;font-size:0.82rem">${itemsSummary}</td>
            <td><strong style="color:var(--accent)">₱${order.total.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('statOrders').textContent = orderHistory.length;
}

// ── PROFILE ───────────────────────────────────────────────────────────────
document.getElementById('viewProfileMenu').addEventListener('click', () => {
    showView('homeView');
    setTimeout(() => document.getElementById('profileSummaryCard').scrollIntoView({ behavior: 'smooth' }), 50);
});

document.getElementById('editProfileMenu').addEventListener('click', async () => {
    hideAlert('editAlert');
    const data = await loadUsers();
    const user = data.users.find(u => u.username === loggedInUser);
    if (user) {
        document.getElementById('editFirst').value   = user.firstName  || '';
        document.getElementById('editMiddle').value  = user.middleName || '';
        document.getElementById('editLast').value    = user.lastName   || '';
        document.getElementById('editAddress').value = user.address    || '';
        document.getElementById('editEmail').value   = user.email      || '';
    }
    openModal('editProfileModal');
});

document.getElementById('cancelEditBtn').addEventListener('click', () => closeModal('editProfileModal'));

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    hideAlert('editAlert');
    const firstName  = document.getElementById('editFirst').value.trim();
    const middleName = document.getElementById('editMiddle').value.trim();
    const lastName   = document.getElementById('editLast').value.trim();
    const address    = document.getElementById('editAddress').value.trim();
    const email      = document.getElementById('editEmail').value.trim();

    if (!firstName || !lastName || !address || !email) {
        showAlert('editAlert', '⚠️ First name, last name, address, and email are required.', 'error');
        return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
        showAlert('editAlert', '⚠️ Please enter a valid email address.', 'error');
        return;
    }

    const data = await loadUsers();
    const idx  = data.users.findIndex(u => u.username === loggedInUser);
    if (idx === -1) return;
    data.users[idx] = { ...data.users[idx], firstName, middleName, lastName, address, email };
    await saveUsers(data);

    showAlert('editAlert', '✅ Profile updated successfully!', 'success');
    await populateDashboard();
    setTimeout(() => closeModal('editProfileModal'), 1200);
});

// ── CHANGE PASSWORD ────────────────────────────────────────────────────────
document.getElementById('changePasswordMenu').addEventListener('click', () => {
    resetPasswordModal();
    openModal('changePasswordModal');
});

document.getElementById('cancelPasswordBtn').addEventListener('click', () => closeModal('changePasswordModal'));

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

document.getElementById('newPassword').addEventListener('input', function () {
    const score = getPasswordScore(this.value);
    const bar   = document.getElementById('strengthBar');
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

function resetPasswordModal() {
    ['oldPassword', 'newPassword', 'retypePassword'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('strengthBar').style.width = '0%';
    hideAlert('pwAlert');
}

document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    hideAlert('pwAlert');
    const oldPw  = document.getElementById('oldPassword').value;
    const newPw  = document.getElementById('newPassword').value;
    const retype = document.getElementById('retypePassword').value;

    if (!oldPw || !newPw || !retype) {
        showAlert('pwAlert', '⚠️ All fields are required.', 'error');
        return;
    }

    const data = await loadUsers();
    const idx  = data.users.findIndex(u => u.username === loggedInUser && u.password === oldPw);
    if (idx === -1) { showAlert('pwAlert', '❌ Current password is incorrect.', 'error'); return; }

    const errors = validatePassword(newPw);
    if (errors.length > 0) { showAlert('pwAlert', `⚠️ New password must contain: ${errors.join(', ')}.`, 'error'); return; }
    if (newPw === oldPw)   { showAlert('pwAlert', '⚠️ New password must differ from the current one.', 'error'); return; }
    if (newPw !== retype)  { showAlert('pwAlert', '❌ New passwords do not match.', 'error'); return; }

    data.users[idx].password = newPw;
    await saveUsers(data);
    showAlert('pwAlert', '✅ Password changed successfully!', 'success');
    setTimeout(() => { resetPasswordModal(); closeModal('changePasswordModal'); }, 1400);
});

// ── LOGOUT ─────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'MP4.html';
});

// ── INIT ──────────────────────────────────────────────────────────────────
(async function init() {
    await populateDashboard();
    const data = await loadProducts();
    products = data.products || [];
    cart = loadCart();
    orderHistory = loadOrders();

    populateCategoryFilter();
    updateCartBadge();
    updateStats();
})();
