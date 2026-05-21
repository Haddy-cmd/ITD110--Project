/* ── Auth guard ── */
const token = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
if (!token || !currentUser || currentUser.role !== 'admin') {
    window.location.href = 'admin-login.html';
}

const API = 'http://localhost:3000/api';

/* ── Product avatar helpers ── */
function getInitials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function getAvatarColor(name) {
    const colors = ['#16a34a','#15803d','#166534','#14532d','#1a7a42',
                    '#0f766e','#0e7490','#1d4ed8','#6d28d9','#7c3aed'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

/* ── API helper ── */
async function apiFetch(path, opts = {}) {
    const res = await fetch(API + path, {
        ...opts,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
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
    overviewView:  'Overview',
    usersView:     'User Accounts',
    inventoryView: 'Inventory',
    analyticsView: 'Sales Analytics',
    salesView:     'All Sales'
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
    a.addEventListener('click', e => {
        e.preventDefault();
        showView(a.dataset.view);
        document.getElementById('sidebar').classList.remove('open');
    });
});
document.getElementById('menuToggle')?.addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open')
);

async function loadAdminProfile() {
    try {
        const latestUser = await apiFetch('/auth/profile');
        Object.assign(currentUser, latestUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (e) {
        console.error('Failed to sync admin profile', e);
    }
    const name    = currentUser.firstName || 'Admin';
    const initial = name.charAt(0).toUpperCase();
    document.getElementById('sidebarName').textContent   = name;
    document.getElementById('sidebarAvatar').textContent = initial;
    document.getElementById('topbarAvatar').textContent  = initial;
    const welcomeEl = document.getElementById('welcomeName');
    if (welcomeEl) welcomeEl.textContent = name;
}
loadAdminProfile();

/* ════════════════════════════════════════════════════════════════════
   OVERVIEW
════════════════════════════════════════════════════════════════════ */
async function loadOverview() {
    try {
        const [users, products, analytics] = await Promise.all([
            apiFetch('/users'),
            apiFetch('/products'),
            apiFetch('/sales/analytics?range=daily')
        ]);
        const pendingCount = users.filter(u => u.status === 'pending').length;
        document.getElementById('ovUsers').textContent    = users.length;
        document.getElementById('ovPending').textContent  = pendingCount;
        document.getElementById('ovProducts').textContent = products.length;
        document.getElementById('ovRevenue').textContent  = `₱${analytics.totalRevenue.toFixed(2)}`;
        
        // Update pending badge
        const badge = document.getElementById('pendingBadge');
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    } catch (err) { showToast(err.message); }
}

/* ════════════════════════════════════════════════════════════════════
   USER MANAGEMENT
════════════════════════════════════════════════════════════════════ */
async function loadUsers() {
    try {
        const users = await apiFetch('/users');
        const pendingCount = users.filter(u => u.status === 'pending').length;
        
        // Update pending badge
        const badge = document.getElementById('pendingBadge');
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
        
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px">No cashier accounts yet.</td></tr>';
            return;
        }
        users.forEach(u => {
            const pillClass = { active: 'pill-active', pending: 'pill-pending', suspended: 'pill-suspended' }[u.status] || '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.firstName} ${u.lastName}</strong></td>
                <td style="color:var(--text-2)">${u.username}</td>
                <td style="font-size:0.82rem;color:var(--muted)">${u.email}</td>
                <td><span class="pill ${pillClass}">${u.status}</span></td>
                <td style="font-size:0.8rem;color:var(--muted)">${new Date(u.createdAt).toLocaleDateString()}</td>
                <td><div class="action-row">
                    ${u.status === 'pending'   ? `<button class="btn-approve"    data-id="${u._id}">Approve</button>`    : ''}
                    ${u.status === 'active'    ? `<button class="btn-suspend"    data-id="${u._id}">Suspend</button>`    : ''}
                    ${u.status === 'suspended' ? `<button class="btn-reactivate" data-id="${u._id}">Reactivate</button>` : ''}
                    <button class="btn-delete" data-id="${u._id}" data-name="${u.firstName}">Delete</button>
                </div></td>`;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-approve').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm('Approve this account?')) return;
            try { await apiFetch(`/users/${btn.dataset.id}/approve`, { method: 'PATCH' }); showToast('Account approved'); loadUsers(); }
            catch (e) { showToast(e.message); }
        }));
        tbody.querySelectorAll('.btn-suspend').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm('Suspend this account?')) return;
            try { await apiFetch(`/users/${btn.dataset.id}/suspend`, { method: 'PATCH' }); showToast('Account suspended'); loadUsers(); }
            catch (e) { showToast(e.message); }
        }));
        tbody.querySelectorAll('.btn-reactivate').forEach(btn => btn.addEventListener('click', async () => {
            try { await apiFetch(`/users/${btn.dataset.id}/reactivate`, { method: 'PATCH' }); showToast('Account reactivated'); loadUsers(); }
            catch (e) { showToast(e.message); }
        }));
        tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm(`Permanently delete ${btn.dataset.name}'s account? This cannot be undone.`)) return;
            try { await apiFetch(`/users/${btn.dataset.id}`, { method: 'DELETE' }); showToast('Account deleted'); loadUsers(); }
            catch (e) { showToast(e.message); }
        }));
    } catch (err) { showToast(err.message); }
}

/* ════════════════════════════════════════════════════════════════════
   INVENTORY MANAGEMENT
════════════════════════════════════════════════════════════════════ */
let adminProducts = [];

async function loadInventory() {
    try {
        adminProducts = await apiFetch('/products');
        renderAdminInventory();
        populateAdminCategoryFilter();
    } catch (err) { showToast(err.message); }
}

function renderAdminInventory() {
    const search   = (document.getElementById('adminSearchInput')?.value || '').toLowerCase();
    const category = document.getElementById('adminCategoryFilter')?.value || '';
    
    const filtered = adminProducts.filter(p => {
        const ms = p.name.toLowerCase().includes(search);
        const mc = !category || p.category === category;
        return ms && mc;
    });
    
    const tbody = document.getElementById('adminProductBody');
    tbody.innerHTML = '';
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px">No products found.</td></tr>';
        return;
    }
    
    filtered.forEach(p => {
        const rowClass = p.quantity === 0 ? 'out-stock-row' : p.quantity <= 5 ? 'low-stock-row' : '';
        const initials = getInitials(p.name);
        const color    = getAvatarColor(p.name);
        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="product-initial-sm" style="background:${color}">${initials}</span>
                    <strong>${p.name}</strong>
                </div>
            </td>
            <td style="color:var(--muted);font-size:0.82rem">${p.category}</td>
            <td><strong style="color:var(--success)">₱${p.price.toFixed(2)}</strong></td>
            <td><span style="color:${p.quantity === 0 ? 'var(--danger)' : p.quantity <= 5 ? 'var(--warning)' : 'var(--text-2)'};font-weight:600">
                ${p.quantity}${p.quantity === 0 ? ' — out' : p.quantity <= 5 ? ' — low' : ''}
            </span></td>
            <td><div class="action-row">
                <button class="btn-edit"   data-id="${p._id}">Edit</button>
                <button class="btn-delete" data-id="${p._id}" data-name="${p.name}">Delete</button>
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
        
        // Set up image preview
        editProductImageBase64 = p.image || '';
        document.getElementById('epImageFile').value = '';
        if (p.image) {
            document.getElementById('epFileName').textContent = 'Current Product Image';
            document.getElementById('epImagePreview').src = p.image;
            document.getElementById('epImagePreviewWrap').style.display = 'flex';
        } else {
            document.getElementById('epFileName').textContent = 'No file chosen';
            document.getElementById('epImagePreviewWrap').style.display = 'none';
            document.getElementById('epImagePreview').src = '';
        }
        
        hideAlert('editProductAlert'); openModal('editProductModal');
    }));
    tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm(`Delete "${btn.dataset.name}"? This cannot be undone.`)) return;
        try { await apiFetch(`/products/${btn.dataset.id}`, { method: 'DELETE' }); showToast('Product deleted'); loadInventory(); }
        catch (e) { showToast(e.message); }
    }));
}

function populateAdminCategoryFilter() {
    const sel  = document.getElementById('adminCategoryFilter');
    const cats = [...new Set(adminProducts.map(p => p.category))].sort();
    // Remove existing options except the first one (All Categories)
    while (sel.options.length > 1) {
        sel.remove(1);
    }
    cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
}

document.getElementById('adminSearchInput')?.addEventListener('input', renderAdminInventory);
document.getElementById('adminCategoryFilter')?.addEventListener('change', renderAdminInventory);

/* Image upload states */
let addProductImageBase64 = '';
let editProductImageBase64 = '';

// Add Product Image Handlers
document.getElementById('apUploadBtn').addEventListener('click', () => {
    document.getElementById('apImageFile').click();
});
document.getElementById('apImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showAlert('addProductAlert', 'Please select a valid image file.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showAlert('addProductAlert', 'Image size must be less than 5MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        addProductImageBase64 = event.target.result;
        document.getElementById('apFileName').textContent = file.name;
        document.getElementById('apImagePreview').src = addProductImageBase64;
        document.getElementById('apImagePreviewWrap').style.display = 'flex';
    };
    reader.readAsDataURL(file);
});
document.getElementById('apRemoveImageBtn').addEventListener('click', () => {
    addProductImageBase64 = '';
    document.getElementById('apImageFile').value = '';
    document.getElementById('apFileName').textContent = 'No file chosen';
    document.getElementById('apImagePreviewWrap').style.display = 'none';
    document.getElementById('apImagePreview').src = '';
});

// Edit Product Image Handlers
document.getElementById('epUploadBtn').addEventListener('click', () => {
    document.getElementById('epImageFile').click();
});
document.getElementById('epImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showAlert('editProductAlert', 'Please select a valid image file.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showAlert('editProductAlert', 'Image size must be less than 5MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        editProductImageBase64 = event.target.result;
        document.getElementById('epFileName').textContent = file.name;
        document.getElementById('epImagePreview').src = editProductImageBase64;
        document.getElementById('epImagePreviewWrap').style.display = 'flex';
    };
    reader.readAsDataURL(file);
});
document.getElementById('epRemoveImageBtn').addEventListener('click', () => {
    editProductImageBase64 = '';
    document.getElementById('epImageFile').value = '';
    document.getElementById('epFileName').textContent = 'No file chosen';
    document.getElementById('epImagePreviewWrap').style.display = 'none';
    document.getElementById('epImagePreview').src = '';
});

// ── Camera Handlers ──
let currentCameraTarget = null; // 'add' or 'edit'
let cameraStreamObject = null;

async function openCamera(target) {
    currentCameraTarget = target;
    hideAlert('cameraAlert');
    try {
        cameraStreamObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const videoEl = document.getElementById('cameraStream');
        videoEl.srcObject = cameraStreamObject;
        openModal('cameraModal');
    } catch (err) {
        // Fallback or error
        showAlert(target === 'add' ? 'addProductAlert' : 'editProductAlert', 'Camera access denied or unavailable.');
    }
}

function stopCamera() {
    if (cameraStreamObject) {
        cameraStreamObject.getTracks().forEach(track => track.stop());
        cameraStreamObject = null;
    }
    closeModal('cameraModal');
}

document.getElementById('apCameraBtn').addEventListener('click', () => openCamera('add'));
document.getElementById('epCameraBtn').addEventListener('click', () => openCamera('edit'));

document.getElementById('closeCameraModal').addEventListener('click', stopCamera);
document.getElementById('cancelCameraBtn').addEventListener('click', stopCamera);

document.getElementById('captureCameraBtn').addEventListener('click', () => {
    const video = document.getElementById('cameraStream');
    const canvas = document.getElementById('cameraCanvas');
    
    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/png');
    
    if (currentCameraTarget === 'add') {
        addProductImageBase64 = dataUrl;
        document.getElementById('apFileName').textContent = 'camera-snapshot.png';
        document.getElementById('apImagePreview').src = addProductImageBase64;
        document.getElementById('apImagePreviewWrap').style.display = 'flex';
    } else if (currentCameraTarget === 'edit') {
        editProductImageBase64 = dataUrl;
        document.getElementById('epFileName').textContent = 'camera-snapshot.png';
        document.getElementById('epImagePreview').src = editProductImageBase64;
        document.getElementById('epImagePreviewWrap').style.display = 'flex';
    }
    
    stopCamera();
});

/* Add Product */
document.getElementById('openAddProductBtn').addEventListener('click', () => {
    ['apName', 'apCategory', 'apPrice', 'apQty'].forEach(id => document.getElementById(id).value = '');
    addProductImageBase64 = '';
    document.getElementById('apImageFile').value = '';
    document.getElementById('apFileName').textContent = 'No file chosen';
    document.getElementById('apImagePreviewWrap').style.display = 'none';
    document.getElementById('apImagePreview').src = '';
    hideAlert('addProductAlert'); openModal('addProductModal');
});
document.getElementById('cancelAddProductBtn').addEventListener('click', () => closeModal('addProductModal'));
document.getElementById('closeAddProductModal').addEventListener('click', () => closeModal('addProductModal'));
document.getElementById('saveAddProductBtn').addEventListener('click', async () => {
    hideAlert('addProductAlert');
    const name     = document.getElementById('apName').value.trim();
    const category = document.getElementById('apCategory').value.trim();
    const price    = parseFloat(document.getElementById('apPrice').value);
    const quantity = parseInt(document.getElementById('apQty').value);
    const image    = addProductImageBase64;
    if (!name || !category || isNaN(price) || isNaN(quantity)) {
        showAlert('addProductAlert', 'All required fields must be filled.'); return;
    }
    try {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify({ name, category, price, quantity, image }) });
        showToast(`"${name}" added`); closeModal('addProductModal'); loadInventory();
    } catch (e) { showAlert('addProductAlert', e.message); }
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
    const image    = editProductImageBase64;
    if (!name || !category || isNaN(price) || isNaN(quantity)) {
        showAlert('editProductAlert', 'All required fields must be filled.'); return;
    }
    try {
        await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ name, category, price, quantity, image }) });
        showToast(`"${name}" updated`); closeModal('editProductModal'); loadInventory();
    } catch (e) { showAlert('editProductAlert', e.message); }
});

/* ════════════════════════════════════════════════════════════════════
   SALES ANALYTICS
════════════════════════════════════════════════════════════════════ */
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

        /* Top Products */
        const tpBody = document.getElementById('topProductsBody');
        tpBody.innerHTML = '';
        if (!data.topProducts.length) {
            tpBody.innerHTML = '<tr><td colspan="3" class="no-data">No data for this period.</td></tr>';
        } else {
            data.topProducts.forEach((p, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><span style="color:var(--muted);font-size:0.75rem;margin-right:6px">${i + 1}.</span>${p.name}</td>
                    <td><strong>${p.totalQty}</strong></td>
                    <td style="color:var(--success)">₱${p.totalRevenue.toFixed(2)}</td>`;
                tpBody.appendChild(tr);
            });
        }

        /* Sales by Cashier */
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

        /* Revenue Timeline */
        const container = document.getElementById('timelineContainer');
        container.innerHTML = '';
        if (!data.revenueTimeline.length) {
            container.innerHTML = '<p class="no-data">No sales in this period.</p>';
        } else {
            const maxRev = Math.max(...data.revenueTimeline.map(d => d.revenue));
            const wrap   = document.createElement('div');
            wrap.className = 'timeline-bar-wrap';
            data.revenueTimeline.forEach(d => {
                const heightPct = maxRev > 0 ? Math.max(4, (d.revenue / maxRev) * 100) : 4;
                const col = document.createElement('div');
                col.className = 'timeline-bar-col';
                col.innerHTML = `<span class="timeline-val">₱${d.revenue.toFixed(0)}</span>
                    <div class="timeline-bar" style="height:${heightPct}px"></div>
                    <span class="timeline-date">${d.date.slice(5)}</span>`;
                wrap.appendChild(col);
            });
            container.appendChild(wrap);
        }
    } catch (err) { showToast(err.message); }
}

/* ════════════════════════════════════════════════════════════════════
   ALL SALES
════════════════════════════════════════════════════════════════════ */
let allSalesData = [];

async function loadAllSales() {
    try {
        allSalesData = await apiFetch('/sales');
        renderAllSales();
    } catch (err) { showToast(err.message); }
}

function renderAllSales() {
    const search = (document.getElementById('salesSearchInput')?.value || '').toLowerCase();
    
    const filtered = allSalesData.filter(s => {
        const cashierMatch = (s.soldBy.fullName + ' ' + s.soldBy.username).toLowerCase().includes(search);
        const itemsMatch = s.items.some(i => i.name.toLowerCase().includes(search));
        const totalMatch = s.grandTotal.toString().includes(search);
        return cashierMatch || itemsMatch || totalMatch;
    });
    
    const tbody = document.getElementById('allSalesBody');
    tbody.innerHTML = '';
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px">No sales found.</td></tr>';
        return;
    }
    filtered.forEach((s, idx) => {
        const summary = s.items.map(i => `${i.name} ×${i.quantity}`).join(', ');
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>#${allSalesData.length - allSalesData.indexOf(s)}</strong></td>
            <td style="font-size:0.8rem;color:var(--muted)">${new Date(s.saleDate).toLocaleString()}</td>
            <td><strong>${s.soldBy.fullName}</strong><br><small style="color:var(--muted)">${s.soldBy.username}</small></td>
            <td style="max-width:260px;white-space:normal;font-size:0.78rem;color:var(--text-2)">${summary}</td>
            <td><strong style="color:var(--success)">₱${s.grandTotal.toFixed(2)}</strong></td>`;
        tbody.appendChild(tr);
    });
}

document.getElementById('salesSearchInput')?.addEventListener('input', renderAllSales);

/* ── Logout ── */
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear(); window.location.href = 'admin-login.html';
});

// ── Theme Toggler ──────────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

/* ── Init ── */
loadOverview();
