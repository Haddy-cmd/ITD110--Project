/* ── Auth guard ── */
const token = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
if (!token || !currentUser || currentUser.role !== 'admin') {
    window.location.href = 'admin-login.html';
}

const API = 'http://localhost:3000/api';

/* ── API helper ── */
async function apiFetch(path, opts = {}) {
    const res = await fetch(API + path, {
        ...opts,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers||{}) }
    });
    const data = await res.json();
    if (res.status === 401) { localStorage.clear(); window.location.href = 'admin-login.html'; }
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
function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

/* ── View navigation ── */
const viewTitles = {
    overviewView: 'Overview', usersView: '👥 User Accounts',
    inventoryView: '📦 Inventory', analyticsView: '📈 Sales Analytics', salesView: '🧾 All Sales'
};
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.getElementById('topbarTitle').textContent = viewTitles[id] || 'Admin';
    document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.view === id));
    if (id === 'overviewView')  loadOverview();
    if (id === 'usersView')     loadUsers();
    if (id === 'inventoryView') loadInventory();
    if (id === 'analyticsView') loadAnalytics('daily');
    if (id === 'salesView')     loadAllSales();
}
document.querySelectorAll('.nav-item[data-view]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showView(a.dataset.view); document.getElementById('sidebar').classList.remove('open'); });
});
document.getElementById('menuToggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

/* ── Populate admin info ── */
(function populateAdmin() {
    const name = currentUser.firstName || 'Admin';
    const initial = name.charAt(0).toUpperCase();
    document.getElementById('sidebarName').textContent = name;
    document.getElementById('sidebarAvatar').textContent = initial;
    document.getElementById('topbarAvatar').textContent = initial;
})();

/* ════════════════════════════════════════════════════════════════════════════
   OVERVIEW
════════════════════════════════════════════════════════════════════════════ */
async function loadOverview() {
    try {
        const [users, products, analytics] = await Promise.all([
            apiFetch('/users'),
            apiFetch('/products'),
            apiFetch('/sales/analytics?range=daily')
        ]);
        document.getElementById('ovUsers').textContent   = users.length;
        document.getElementById('ovPending').textContent = users.filter(u => u.status === 'pending').length;
        document.getElementById('ovProducts').textContent = products.length;
        document.getElementById('ovRevenue').textContent  = `₱${analytics.totalRevenue.toFixed(2)}`;
    } catch(err) { showToast(`❌ ${err.message}`); }
}

/* ════════════════════════════════════════════════════════════════════════════
   USER MANAGEMENT
════════════════════════════════════════════════════════════════════════════ */
async function loadUsers() {
    try {
        const users = await apiFetch('/users');
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px">No cashier accounts yet.</td></tr>';
            return;
        }
        users.forEach(u => {
            const pillClass = { active:'pill-active', pending:'pill-pending', suspended:'pill-suspended' }[u.status] || '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.firstName} ${u.lastName}</strong></td>
                <td>${u.username}</td>
                <td style="font-size:0.83rem">${u.email}</td>
                <td><span class="pill ${pillClass}">${u.status}</span></td>
                <td style="font-size:0.82rem;color:var(--muted)">${new Date(u.createdAt).toLocaleDateString()}</td>
                <td><div class="action-row">
                    ${u.status==='pending'   ? `<button class="btn-approve"    data-id="${u._id}">✅ Approve</button>`    : ''}
                    ${u.status==='active'    ? `<button class="btn-suspend"    data-id="${u._id}">⏸ Suspend</button>`    : ''}
                    ${u.status==='suspended' ? `<button class="btn-reactivate" data-id="${u._id}">▶ Reactivate</button>` : ''}
                    <button class="btn-delete" data-id="${u._id}" data-name="${u.firstName}">🗑 Delete</button>
                </div></td>`;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-approve').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm('Approve this account?')) return;
            try { await apiFetch(`/users/${btn.dataset.id}/approve`, { method:'PATCH' }); showToast('✅ User approved'); loadUsers(); }
            catch(e) { showToast(`❌ ${e.message}`); }
        }));
        tbody.querySelectorAll('.btn-suspend').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm('Suspend this account?')) return;
            try { await apiFetch(`/users/${btn.dataset.id}/suspend`, { method:'PATCH' }); showToast('⏸ User suspended'); loadUsers(); }
            catch(e) { showToast(`❌ ${e.message}`); }
        }));
        tbody.querySelectorAll('.btn-reactivate').forEach(btn => btn.addEventListener('click', async () => {
            try { await apiFetch(`/users/${btn.dataset.id}/reactivate`, { method:'PATCH' }); showToast('▶ User reactivated'); loadUsers(); }
            catch(e) { showToast(`❌ ${e.message}`); }
        }));
        tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm(`Permanently delete ${btn.dataset.name}'s account? This cannot be undone.`)) return;
            try { await apiFetch(`/users/${btn.dataset.id}`, { method:'DELETE' }); showToast('🗑️ Account deleted'); loadUsers(); }
            catch(e) { showToast(`❌ ${e.message}`); }
        }));
    } catch(err) { showToast(`❌ ${err.message}`); }
}

/* ════════════════════════════════════════════════════════════════════════════
   INVENTORY MANAGEMENT
════════════════════════════════════════════════════════════════════════════ */
let adminProducts = [];

async function loadInventory() {
    try {
        adminProducts = await apiFetch('/products');
        const tbody = document.getElementById('adminProductBody');
        tbody.innerHTML = '';
        adminProducts.forEach(p => {
            const rowClass = p.quantity === 0 ? 'out-stock-row' : p.quantity <= 5 ? 'low-stock-row' : '';
            const tr = document.createElement('tr');
            tr.className = rowClass;
            tr.innerHTML = `
                <td><span style="font-size:0.72rem;font-weight:800;color:var(--muted)">${p.code}</span></td>
                <td><strong>${p.emoji || '📦'} ${p.name}</strong></td>
                <td style="color:var(--accent2);font-size:0.83rem">${p.category}</td>
                <td><strong style="color:var(--success)">₱${p.price.toFixed(2)}</strong></td>
                <td><span style="color:${p.quantity===0?'var(--danger)':p.quantity<=5?'var(--warning)':'var(--text)'};font-weight:700">
                    ${p.quantity}${p.quantity===0?' ❌':p.quantity<=5?' ⚠️':''}
                </span></td>
                <td><div class="action-row">
                    <button class="btn-edit"   data-id="${p._id}">✏️ Edit</button>
                    <button class="btn-delete" data-id="${p._id}" data-name="${p.name}">🗑 Delete</button>
                </div></td>`;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => {
            const p = adminProducts.find(x => x._id === btn.dataset.id);
            if (!p) return;
            document.getElementById('epId').value       = p._id;
            document.getElementById('epName').value     = p.name;
            document.getElementById('epCategory').value = p.category;
            document.getElementById('epPrice').value    = p.price;
            document.getElementById('epQty').value      = p.quantity;
            document.getElementById('epEmoji').value    = p.emoji || '';
            hideAlert('editProductAlert'); openModal('editProductModal');
        }));
        tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm(`Delete "${btn.dataset.name}"? This cannot be undone.`)) return;
            try { await apiFetch(`/products/${btn.dataset.id}`, { method:'DELETE' }); showToast('🗑️ Product deleted'); loadInventory(); }
            catch(e) { showToast(`❌ ${e.message}`); }
        }));
    } catch(err) { showToast(`❌ ${err.message}`); }
}

/* Add Product */
document.getElementById('openAddProductBtn').addEventListener('click', () => {
    ['apCode','apName','apCategory','apPrice','apQty','apEmoji','apImage'].forEach(id => document.getElementById(id).value = '');
    hideAlert('addProductAlert'); openModal('addProductModal');
});
document.getElementById('cancelAddProductBtn').addEventListener('click', () => closeModal('addProductModal'));
document.getElementById('closeAddProductModal').addEventListener('click', () => closeModal('addProductModal'));
document.getElementById('saveAddProductBtn').addEventListener('click', async () => {
    hideAlert('addProductAlert');
    const code     = document.getElementById('apCode').value.trim();
    const name     = document.getElementById('apName').value.trim();
    const category = document.getElementById('apCategory').value.trim();
    const price    = parseFloat(document.getElementById('apPrice').value);
    const quantity = parseInt(document.getElementById('apQty').value);
    const emoji    = document.getElementById('apEmoji').value.trim() || '📦';
    const image    = document.getElementById('apImage').value.trim();
    if (!code||!name||!category||isNaN(price)||isNaN(quantity)) {
        showAlert('addProductAlert','⚠️ All required fields must be filled.'); return;
    }
    try {
        await apiFetch('/products', { method:'POST', body: JSON.stringify({ code, name, category, price, quantity, emoji, image }) });
        showToast(`✅ "${name}" added`); closeModal('addProductModal'); loadInventory();
    } catch(e) { showAlert('addProductAlert', `❌ ${e.message}`); }
});

/* Edit Product */
document.getElementById('cancelEditProductBtn').addEventListener('click', () => closeModal('editProductModal'));
document.getElementById('closeEditProductModal').addEventListener('click', () => closeModal('editProductModal'));
document.getElementById('saveEditProductBtn').addEventListener('click', async () => {
    hideAlert('editProductAlert');
    const id       = document.getElementById('epId').value;
    const name     = document.getElementById('epName').value.trim();
    const category = document.getElementById('epCategory').value.trim();
    const price    = parseFloat(document.getElementById('epPrice').value);
    const quantity = parseInt(document.getElementById('epQty').value);
    const emoji    = document.getElementById('epEmoji').value.trim();
    if (!name||!category||isNaN(price)||isNaN(quantity)) {
        showAlert('editProductAlert','⚠️ All required fields must be filled.'); return;
    }
    try {
        await apiFetch(`/products/${id}`, { method:'PUT', body: JSON.stringify({ name, category, price, quantity, emoji }) });
        showToast(`✅ "${name}" updated`); closeModal('editProductModal'); loadInventory();
    } catch(e) { showAlert('editProductAlert', `❌ ${e.message}`); }
});

/* ════════════════════════════════════════════════════════════════════════════
   SALES ANALYTICS
════════════════════════════════════════════════════════════════════════════ */
document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadAnalytics(btn.dataset.range);
    });
});

async function loadAnalytics(range = 'daily') {
    try {
        const data = await apiFetch(`/sales/analytics?range=${range}`);

        document.getElementById('kpiRevenue').textContent = `₱${data.totalRevenue.toFixed(2)}`;
        document.getElementById('kpiTx').textContent      = data.totalTransactions;
        const avg = data.totalTransactions > 0 ? data.totalRevenue / data.totalTransactions : 0;
        document.getElementById('kpiAvg').textContent     = `₱${avg.toFixed(2)}`;

        /* Top Products table */
        const tpBody = document.getElementById('topProductsBody');
        tpBody.innerHTML = '';
        if (!data.topProducts.length) {
            tpBody.innerHTML = '<tr><td colspan="3" class="no-data">No data for this period.</td></tr>';
        } else {
            data.topProducts.forEach((p, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'  '} ${p.emoji||'📦'} ${p.name}</td>
                    <td><strong>${p.totalQty}</strong></td>
                    <td style="color:var(--success)">₱${p.totalRevenue.toFixed(2)}</td>`;
                tpBody.appendChild(tr);
            });
        }

        /* Sales by cashier */
        const cbBody = document.getElementById('cashierBody');
        cbBody.innerHTML = '';
        if (!data.salesByCashier.length) {
            cbBody.innerHTML = '<tr><td colspan="3" class="no-data">No data.</td></tr>';
        } else {
            data.salesByCashier.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><strong>${c.fullName}</strong><br><small style="color:var(--muted)">${c.username}</small></td>
                    <td>${c.totalSales}</td>
                    <td style="color:var(--success)">₱${c.totalRevenue.toFixed(2)}</td>`;
                cbBody.appendChild(tr);
            });
        }

        /* Revenue timeline bar chart */
        const container = document.getElementById('timelineContainer');
        container.innerHTML = '';
        if (!data.revenueTimeline.length) {
            container.innerHTML = '<p class="no-data">No sales in this period.</p>';
        } else {
            const maxRev = Math.max(...data.revenueTimeline.map(d => d.revenue));
            const wrap = document.createElement('div');
            wrap.className = 'timeline-bar-wrap';
            data.revenueTimeline.forEach(d => {
                const heightPct = maxRev > 0 ? Math.max(4, (d.revenue/maxRev)*100) : 4;
                const col = document.createElement('div');
                col.className = 'timeline-bar-col';
                col.innerHTML = `<span class="timeline-val">₱${d.revenue.toFixed(0)}</span>
                    <div class="timeline-bar" style="height:${heightPct}px"></div>
                    <span class="timeline-date">${d.date.slice(5)}</span>`;
                wrap.appendChild(col);
            });
            container.appendChild(wrap);
        }
    } catch(err) { showToast(`❌ ${err.message}`); }
}

/* ════════════════════════════════════════════════════════════════════════════
   ALL SALES
════════════════════════════════════════════════════════════════════════════ */
async function loadAllSales() {
    try {
        const sales = await apiFetch('/sales');
        const tbody = document.getElementById('allSalesBody');
        tbody.innerHTML = '';
        if (!sales.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px">No sales recorded yet.</td></tr>';
            return;
        }
        sales.forEach((s, idx) => {
            const summary = s.items.map(i => `${i.emoji||'📦'} ${i.name} ×${i.quantity}`).join(', ');
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>#${sales.length - idx}</strong></td>
                <td style="font-size:0.82rem">${new Date(s.saleDate).toLocaleString()}</td>
                <td><strong>${s.soldBy.fullName}</strong><br><small style="color:var(--muted)">${s.soldBy.username}</small></td>
                <td style="max-width:280px;white-space:normal;font-size:0.8rem">${summary}</td>
                <td><strong style="color:var(--success)">₱${s.grandTotal.toFixed(2)}</strong></td>`;
            tbody.appendChild(tr);
        });
    } catch(err) { showToast(`❌ ${err.message}`); }
}

/* ── Logout ── */
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear(); window.location.href = 'admin-login.html';
});

/* ── Init ── */
loadOverview();
