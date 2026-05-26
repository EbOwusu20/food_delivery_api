// Configuration
const API_BASE_URL = 'http://localhost:8000';

const PAGES = {
    HOME: 'homePage',
    LOGIN: 'loginPage',
    REGISTER: 'registerPage',
    PRODUCTS: 'productsPage',
    CATEGORIES: 'categoriesPage',
    ADMIN: 'adminPage'
};

const ELEMENTS = {
    authNav: 'authNav',
    userNav: 'userNav',
    adminNav: 'adminNav',
    userEmail: 'userEmail'
};

const CACHE_TTL = 5 * 60 * 1000;

// Auth State
let authToken = null;
const cache = { products: null, categories: null, timestamps: {} };
let filterTimeout;
let navbarCache = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    navbarCache = cacheNavbarElements();
    loadToken();
    updateNavbar();
    showPage(PAGES.HOME);
    Promise.all([loadProducts(), loadCategories()]).catch(console.error);
});

// ===== AUTHENTICATION & TOKEN MANAGEMENT =====
function cacheNavbarElements() {
    return {
        authNav: document.getElementById(ELEMENTS.authNav),
        userNav: document.getElementById(ELEMENTS.userNav),
        adminNav: document.getElementById(ELEMENTS.adminNav),
        userEmail: document.getElementById(ELEMENTS.userEmail)
    };
}

function loadToken() {
    authToken = localStorage.getItem('token');
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) throw new Error('Invalid token format');
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('JWT parse error:', error);
        return null;
    }
}

function getCurrentUser() {
    if (!authToken) return null;
    return parseJwt(authToken);
}

function saveToken(token) {
    authToken = token;
    localStorage.setItem('token', token);
    updateNavbar();
}

function clearToken() {
    authToken = null;
    localStorage.removeItem('token');
    updateNavbar();
}

function updateNavbar() {
    const user = getCurrentUser();
    const hasAuth = authToken && user;

    navbarCache.authNav.style.display = hasAuth ? 'none' : 'flex';
    navbarCache.userNav.style.display = hasAuth ? 'flex' : 'none';
    navbarCache.adminNav.style.display = (hasAuth && user.role === 'admin') ? 'block' : 'none';

    if (hasAuth) {
        navbarCache.userEmail.textContent = user.sub || '';
    }
}

// ===== API HELPER & UI STATE MANAGEMENT =====
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();

        if (response.status === 401) {
            clearToken();
            showPage(PAGES.LOGIN);
        }

        if (!response.ok) {
            throw new Error(data.detail || `Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        throw error;
    }
}

function setUIState(errorId, successId, loadingId, state) {
    const states = {
        loading: { error: false, success: false, loading: true },
        success: { error: false, success: true, loading: false },
        error: { error: true, success: false, loading: false },
        hidden: { error: false, success: false, loading: false }
    };

    const stateMap = states[state] || states.hidden;

    if (errorId) {
        document.getElementById(errorId).classList.toggle('hidden', !stateMap.error);
    }
    if (successId) {
        document.getElementById(successId).classList.toggle('hidden', !stateMap.success);
    }
    if (loadingId) {
        document.getElementById(loadingId).classList.toggle('hidden', !stateMap.loading);
    }
}

function getUIElements(prefix) {
    return {
        errorId: prefix + 'Error',
        successId: prefix + 'Success',
        loadingId: prefix + 'Loading'
    };
}

// ===== FORM HANDLERS =====
async function handleGenericForm(event, config) {
    event.preventDefault();
    const { endpoint, method = 'POST', fields, uiElements, onSuccess, redirectTo } = config;
    const { errorId, successId, loadingId } = uiElements;

    const formData = {};
    fields.forEach(field => {
        formData[field] = document.getElementById(field).value;
    });

    setUIState(errorId, successId, loadingId, 'loading');

    try {
        const result = await apiCall(endpoint, method, formData);
        setUIState(errorId, successId, loadingId, 'success');
        fields.forEach(f => document.getElementById(f).value = '');

        if (onSuccess) onSuccess(result);
        if (redirectTo) setTimeout(() => showPage(redirectTo), 1500);
    } catch (error) {
        document.getElementById(errorId).textContent = error.message || 'An error occurred';
        setUIState(errorId, successId, loadingId, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const { errorId, successId, loadingId } = getUIElements('login');
    
    const formData = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };

    setUIState(errorId, successId, loadingId, 'loading');

    try {
        const result = await apiCall('/auth/login', 'POST', formData);
        authToken = result.access_token;
        localStorage.setItem('token', authToken);
        updateNavbar();
        setUIState(errorId, successId, loadingId, 'success');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        setTimeout(() => showPage(PAGES.HOME), 1500);
    } catch (error) {
        document.getElementById(errorId).textContent = error.message || 'An error occurred';
        setUIState(errorId, successId, loadingId, 'error');
    }
}

function handleRegister(event) {
    handleGenericForm(event, {
        endpoint: '/register',
        fields: ['registerUsername', 'registerEmail', 'registerPassword'],
        uiElements: getUIElements('register'),
        redirectTo: PAGES.LOGIN
    });
}

function handleCreateProduct(event) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        alert('Only admins can create products');
        return;
    }

    handleGenericForm(event, {
        endpoint: '/products/',
        fields: ['productName', 'productDescription', 'productPrice', 'productCategoryId'],
        uiElements: getUIElements('createProduct'),
        onSuccess: loadAdminProducts
    });
}

function handleCreateCategory(event) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        alert('Only admins can create categories');
        return;
    }

    handleGenericForm(event, {
        endpoint: '/categories/',
        fields: ['categoryName'],
        uiElements: getUIElements('createCategory'),
        onSuccess: loadCategories
    });
}

function logout() {
    clearToken();
    showPage(PAGES.HOME);
}

// ===== PAGE NAVIGATION =====
function showPage(pageKey) {
    const pageId = typeof pageKey === 'string' && pageKey.endsWith('Page') ? pageKey : PAGES[pageKey] || pageKey;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
}

// ===== PRODUCTS =====
async function loadProducts() {
    const search = document.getElementById('searchInput')?.value || '';
    const minPrice = document.getElementById('minPrice')?.value || 0;
    const maxPrice = document.getElementById('maxPrice')?.value || 100000;
    const cacheKey = `${search}-${minPrice}-${maxPrice}`;

    if (cache.products && cache.timestamps[cacheKey] && Date.now() - cache.timestamps[cacheKey] < CACHE_TTL) {
        renderProducts(cache.products);
        return;
    }

    const { loadingId, errorId } = getUIElements('products');
    setUIState(errorId, null, loadingId, 'loading');

    try {
        const endpoint = `/products/?search=${search}&min_price=${minPrice}&max_price=${maxPrice}&limit=50`;
        const products = await apiCall(endpoint);
        cache.products = products;
        cache.timestamps[cacheKey] = Date.now();
        renderProducts(products);
        setUIState(errorId, null, loadingId, 'hidden');
    } catch (error) {
        document.getElementById(errorId).textContent = error.message || 'Failed to load products';
        setUIState(errorId, null, loadingId, 'error');
    }
}

function renderProducts(products) {
    const list = document.getElementById('productsList');
    list.innerHTML = '';

    if (products.length === 0) {
        list.innerHTML = '<p class="empty-state">No products found</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        fragment.appendChild(createProductCard(product));
    });
    list.appendChild(fragment);
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.innerHTML = `
        <div class="product-category">Category ${product.category_id}</div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
        <small>Product ID: ${product.id}</small>
    `;
    card.addEventListener('click', () => showProductDetail(product));
    return card;
}

function showProductDetail(product) {
    const detail = document.getElementById('productDetail');
    detail.innerHTML = `
        <h2>${product.name}</h2>
        <p><strong>Description:</strong> ${product.description}</p>
        <p><strong>Price:</strong> $${(product.price || 0).toFixed(2)}</p>
        <p><strong>Category ID:</strong> ${product.category_id}</p>
        <p><strong>Store ID:</strong> ${product.store_id || 'N/A'}</p>
        <p><strong>Product ID:</strong> ${product.id}</p>
    `;
    document.getElementById('productModal').classList.add('show');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
}

function filterProducts() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => loadProducts(), 300);
}

// ===== CATEGORIES =====
async function loadCategories() {
    if (cache.categories && cache.timestamps.categories && Date.now() - cache.timestamps.categories < CACHE_TTL) {
        renderCategories(cache.categories);
        return;
    }

    const { loadingId, errorId } = getUIElements('categories');
    setUIState(errorId, null, loadingId, 'loading');

    try {
        const categories = await apiCall('/categories/');
        cache.categories = categories;
        cache.timestamps.categories = Date.now();
        renderCategories(categories);
        setUIState(errorId, null, loadingId, 'hidden');
    } catch (error) {
        document.getElementById(errorId).textContent = error.message || 'Failed to load categories';
        setUIState(errorId, null, loadingId, 'error');
    }
}

function renderCategories(categories) {
    const list = document.getElementById('categoriesList');
    list.innerHTML = '';

    if (categories.length === 0) {
        list.innerHTML = '<p class="empty-state">No categories found</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    categories.forEach(category => {
        fragment.appendChild(createCategoryCard(category));
    });
    list.appendChild(fragment);
}

function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';
    const productCount = category.products ? category.products.length : 0;
    card.innerHTML = `
        <h3>${category.name}</h3>
        <p>${productCount} products</p>
    `;
    return card;
}

// ===== ADMIN PANEL =====
async function loadAdminProducts() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        return;
    }

    const loadingId = 'adminProductsLoading';
    document.getElementById(loadingId).style.display = 'block';
    const list = document.getElementById('adminProductsList');
    list.innerHTML = '';

    try {
        const products = await apiCall('/products/?limit=100');
        renderAdminProducts(products, list);
        document.getElementById(loadingId).style.display = 'none';
    } catch (error) {
        list.innerHTML = `<p class="alert alert-error">${error.message || 'Failed to load products'}</p>`;
        document.getElementById(loadingId).style.display = 'none';
    }
}

function renderAdminProducts(products, list) {
    if (products.length === 0) {
        list.innerHTML = '<p>No products found</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        fragment.appendChild(createAdminProductItem(product));
    });
    list.appendChild(fragment);

    list.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const productId = e.target.dataset.productId;
            deleteProduct(productId);
        }
    });
}

function createAdminProductItem(product) {
    const item = document.createElement('div');
    item.className = 'product-admin-item';
    item.dataset.productId = product.id;

    item.innerHTML = `
        <div class="product-admin-info">
            <h4>${product.name}</h4>
            <p>Price: $${(product.price || 0).toFixed(2)} | Category: ${product.category_id}</p>
        </div>
        <div class="product-admin-actions">
            <button class="btn btn-danger btn-delete" data-product-id="${product.id}">Delete</button>
        </div>
    `;

    return item;
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        await apiCall(`/products/${productId}`, 'DELETE');
        document.querySelector(`[data-product-id="${productId}"]`)?.remove();
    } catch (error) {
        alert(`Error deleting product: ${error.message}`);
    }
}

// ===== MODAL HANDLING =====
document.getElementById('productModal')?.addEventListener('click', function(event) {
    if (event.target === this) {
        this.classList.remove('show');
    }
});
