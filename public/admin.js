/**
 * Admin Panel Client-Side JavaScript
 * Handles CRUD operations, bulk add, and upload management
 *
 * SECURITY WARNING: This interface has no authentication.
 * All operations are public to anyone who can access the server.
 */

let apps = [];
let uploads = [];
let currentEditId = null;
let currentDeleteId = null;
let currentTheme = 'dark';
let editUploadedIcon = null;

// DOM elements
const appsTableBody = document.getElementById('appsTableBody');
const editAppModal = document.getElementById('editAppModal');
const deleteModal = document.getElementById('deleteModal');
const editAppForm = document.getElementById('editAppForm');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadsGrid = document.getElementById('uploadsGrid');
const bulkJsonInput = document.getElementById('bulkJsonInput');
const bulkResults = document.getElementById('bulkResults');
const bulkResultsContent = document.getElementById('bulkResultsContent');
const adminThemeToggle = document.getElementById('adminThemeToggle');
const adminSecurityBanner = document.getElementById('adminSecurityBanner');
const adminSecurityInfoIcon = document.getElementById('adminSecurityInfoIcon');

// Tab buttons
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

/**
 * Initialize admin panel
 */
async function init() {
  initTheme();
  initSecurityBanner();
  initSidebar();
  setupEventListeners();
  await loadApps();
  await loadUploads();
  await loadWidgetSettings();
}

/**
 * Initialize theme from localStorage
 */
function initTheme() {
  const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
  currentTheme = savedTheme;
  applyTheme(savedTheme);
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  const sunIcon = document.getElementById('adminSunIcon');
  const moonIcon = document.getElementById('adminMoonIcon');

  if (theme === 'light') {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
}

/**
 * Toggle theme
 */
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
  localStorage.setItem('dashboard-theme', currentTheme);
}

/**
 * Initialize security banner state
 */
function initSecurityBanner() {
  const dismissed = localStorage.getItem('admin-security-dismissed') === 'true';
  if (dismissed) {
    adminSecurityBanner.classList.add('hidden');
    adminSecurityInfoIcon.classList.remove('hidden');
  }
}

/**
 * Initialize sidebar state
 */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');

  if (!sidebar || !sidebarToggle) return;

  // Get saved state from localStorage (default to closed/collapsed)
  const sidebarState = localStorage.getItem('sidebar-state') || 'collapsed';

  if (sidebarState === 'open') {
    sidebar.classList.remove('sidebar-collapsed');
    sidebar.classList.add('sidebar-open');
  } else {
    sidebar.classList.add('sidebar-collapsed');
    sidebar.classList.remove('sidebar-open');
  }
}

/**
 * Toggle sidebar open/closed
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const isCurrentlyOpen = sidebar.classList.contains('sidebar-open');

  if (isCurrentlyOpen) {
    sidebar.classList.remove('sidebar-open');
    sidebar.classList.add('sidebar-collapsed');
    localStorage.setItem('sidebar-state', 'collapsed');
  } else {
    sidebar.classList.remove('sidebar-collapsed');
    sidebar.classList.add('sidebar-open');
    localStorage.setItem('sidebar-state', 'open');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Add app button
  document.getElementById('addAppBtn').addEventListener('click', () => {
    openEditModal();
  });

  // Edit modal
  document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
  document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
  editAppForm.addEventListener('submit', handleSaveApp);

  // Delete modal
  document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDelete').addEventListener('click', handleDeleteApp);

  // Upload area
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', handleFileDrop);

  // Bulk add
  document.getElementById('bulkAddBtn').addEventListener('click', handleBulkAdd);
  document.getElementById('bulkValidateBtn').addEventListener('click', validateBulkJson);

  // Theme toggle
  adminThemeToggle.addEventListener('click', toggleTheme);

  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }

  // Security banner
  document.getElementById('dismissAdminSecurityBanner').addEventListener('click', () => {
    localStorage.setItem('admin-security-dismissed', 'true');
    adminSecurityBanner.classList.add('hidden');
    adminSecurityInfoIcon.classList.remove('hidden');
  });

  adminSecurityInfoIcon.addEventListener('click', () => {
    localStorage.removeItem('admin-security-dismissed');
    adminSecurityBanner.classList.remove('hidden');
    adminSecurityInfoIcon.classList.add('hidden');
  });

  // Edit modal file upload
  const editIconFile = document.getElementById('editIconFile');
  const editRemoveIcon = document.getElementById('editRemoveIcon');

  editIconFile.addEventListener('change', handleEditFileUpload);
  editRemoveIcon.addEventListener('click', clearEditIcon);

  // Close modals on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeDeleteModal();
    }
  });
}

/**
 * Handle edit modal file upload
 */
async function handleEditFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    showToast('Invalid file type. Please upload an image.', 'error');
    return;
  }

  // Validate file size (8 MB)
  if (file.size > 8 * 1024 * 1024) {
    showToast('File too large. Maximum size is 8 MB.', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    const result = await response.json();
    editUploadedIcon = result.path;

    // Show preview
    document.getElementById('editIconPreviewImg').src = result.url;
    document.getElementById('editIconPreview').classList.remove('hidden');
    document.getElementById('editIcon').value = result.path;

    showToast('Icon uploaded successfully', 'success');

    // Reload uploads tab if visible
    await loadUploads();
  } catch (error) {
    console.error('Error uploading icon:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Clear edit icon preview
 */
function clearEditIcon() {
  editUploadedIcon = null;
  document.getElementById('editIconPreview').classList.add('hidden');
  document.getElementById('editIconPreviewImg').src = '';
  document.getElementById('editIcon').value = '';
  document.getElementById('editIconFile').value = '';
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabContents.forEach(content => {
    content.classList.add('hidden');
  });

  document.getElementById(`${tabName}Tab`).classList.remove('hidden');
}

/**
 * Load apps from API
 */
async function loadApps() {
  try {
    const response = await fetch('/api/apps');
    if (!response.ok) throw new Error('Failed to load apps');

    apps = await response.json();
    renderAppsTable();
  } catch (error) {
    console.error('Error loading apps:', error);
    showToast('Failed to load apps', 'error');
    appsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-400">Failed to load apps</td></tr>';
  }
}

/**
 * Render apps table
 */
function renderAppsTable() {
  if (apps.length === 0) {
    appsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">No apps found. Click "Add New App" to get started.</td></tr>';
    return;
  }

  appsTableBody.innerHTML = apps.map(app => `
    <tr>
      <td class="font-medium">${escapeHtml(app.name)}</td>
      <td class="text-slate-400 text-sm truncate max-w-xs">
        <a href="${escapeHtml(app.url)}" target="_blank" class="hover:text-blue-400 transition-colors">${escapeHtml(app.url)}</a>
      </td>
      <td class="hidden md:table-cell">
        ${app.section ? `<span class="text-slate-300">${escapeHtml(app.section)}</span>` : '<span class="text-slate-500">-</span>'}
      </td>
      <td class="hidden md:table-cell">
        ${app.tag ? `<span class="tag-badge">${escapeHtml(app.tag)}</span>` : '<span class="text-slate-500">-</span>'}
      </td>
      <td class="hidden lg:table-cell text-slate-400 text-sm">
        ${new Date(app.created_at).toLocaleDateString()}
      </td>
      <td>
        ${app.is_pinned ? '<span class="text-amber-400">&#9733;</span>' : '<span class="text-slate-600">&#9734;</span>'}
      </td>
      <td>
        <div class="flex gap-2">
          <button onclick="openEditModal(${app.id})" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm">
            Edit
          </button>
          <button onclick="openDeleteModal(${app.id})" class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Open edit modal (add or edit mode)
 */
function openEditModal(appId = null) {
  currentEditId = appId;

  if (appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    document.getElementById('editModalTitle').textContent = 'Edit Application';
    document.getElementById('editAppId').value = app.id;
    document.getElementById('editName').value = app.name;
    document.getElementById('editUrl').value = app.url;
    document.getElementById('editIp').value = app.ip || '';
    document.getElementById('editSection').value = app.section || '';
    document.getElementById('editTag').value = app.tag || '';
    document.getElementById('editDescription').value = app.description || '';
    document.getElementById('editIcon').value = app.icon || '';
    document.getElementById('editPinned').checked = app.is_pinned === 1;

    // Show icon preview if exists
    if (app.icon) {
      document.getElementById('editIconPreviewImg').src = app.icon;
      document.getElementById('editIconPreview').classList.remove('hidden');
    } else {
      clearEditIcon();
    }
  } else {
    document.getElementById('editModalTitle').textContent = 'Add New Application';
    editAppForm.reset();
    clearEditIcon();
  }

  editAppModal.classList.remove('hidden');
  document.getElementById('editName').focus();
}

/**
 * Close edit modal
 */
function closeEditModal() {
  editAppModal.classList.add('hidden');
  editAppForm.reset();
  currentEditId = null;
  clearEditIcon();
}

/**
 * Handle save app (create or update)
 */
async function handleSaveApp(e) {
  e.preventDefault();

  const data = {
    name: document.getElementById('editName').value,
    url: document.getElementById('editUrl').value,
    ip: document.getElementById('editIp').value || null,
    section: document.getElementById('editSection').value || null,
    tag: document.getElementById('editTag').value || null,
    description: document.getElementById('editDescription').value || null,
    icon: document.getElementById('editIcon').value || editUploadedIcon || null,
    is_pinned: document.getElementById('editPinned').checked ? 1 : 0
  };

  try {
    let response;
    if (currentEditId) {
      // Update existing app
      response = await fetch(`/api/apps/${currentEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      // Create new app
      response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save app');
    }

    await loadApps();
    closeEditModal();
    showToast(currentEditId ? 'App updated successfully' : 'App created successfully', 'success');
  } catch (error) {
    console.error('Error saving app:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(appId) {
  currentDeleteId = appId;
  deleteModal.classList.remove('hidden');
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  currentDeleteId = null;
}

/**
 * Handle delete app
 */
async function handleDeleteApp() {
  if (!currentDeleteId) return;

  try {
    const response = await fetch(`/api/apps/${currentDeleteId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete app');
    }

    await loadApps();
    closeDeleteModal();
    showToast('App deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting app:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Load uploads from API
 */
async function loadUploads() {
  try {
    const response = await fetch('/api/uploads?limit=20');
    if (!response.ok) throw new Error('Failed to load uploads');

    uploads = await response.json();
    renderUploadsGrid();
  } catch (error) {
    console.error('Error loading uploads:', error);
    showToast('Failed to load uploads', 'error');
    uploadsGrid.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">Failed to load uploads</div>';
  }
}

/**
 * Render uploads grid
 */
function renderUploadsGrid() {
  if (uploads.length === 0) {
    uploadsGrid.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">No uploads yet. Upload some images to get started.</div>';
    return;
  }

  uploadsGrid.innerHTML = uploads.map(upload => `
    <div class="bg-slate-900 rounded-lg border border-slate-700 p-3 hover:border-slate-600 transition-colors">
      <div class="aspect-square rounded-lg overflow-hidden mb-2 bg-slate-800 flex items-center justify-center">
        <img src="${escapeHtml(upload.url)}" alt="${escapeHtml(upload.original_name)}" class="w-full h-full object-cover">
      </div>
      <p class="text-xs text-slate-400 truncate mb-2" title="${escapeHtml(upload.original_name)}">
        ${escapeHtml(upload.original_name)}
      </p>
      <div class="flex items-center gap-1">
        <input type="text" value="${escapeHtml(upload.path)}" readonly class="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-blue-500" onclick="this.select()">
        <button onclick="copyToClipboard('${escapeHtml(upload.path)}')" class="p-1 hover:bg-slate-800 rounded transition-colors" title="Copy path">
          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Handle file selection
 */
async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  await uploadFiles(files);
  fileInput.value = '';
}

/**
 * Handle file drop
 */
async function handleFileDrop(e) {
  e.preventDefault();
  uploadArea.classList.remove('dragover');

  const files = Array.from(e.dataTransfer.files);
  await uploadFiles(files);
}

/**
 * Upload files to server
 */
async function uploadFiles(files) {
  if (files.length === 0) return;

  const formData = new FormData();

  if (files.length === 1) {
    formData.append('file', files[0]);
    await uploadSingleFile(formData);
  } else {
    files.forEach(file => formData.append('files', file));
    await uploadMultipleFiles(formData);
  }
}

/**
 * Upload single file
 */
async function uploadSingleFile(formData) {
  try {
    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    await loadUploads();
    showToast('File uploaded successfully', 'success');
  } catch (error) {
    console.error('Error uploading file:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Upload multiple files
 */
async function uploadMultipleFiles(formData) {
  try {
    const response = await fetch('/api/uploads/multiple', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload files');
    }

    const result = await response.json();
    await loadUploads();
    showToast(`${result.length} file(s) uploaded successfully`, 'success');
  } catch (error) {
    console.error('Error uploading files:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Validate bulk JSON
 */
function validateBulkJson() {
  try {
    const json = bulkJsonInput.value.trim();
    if (!json) {
      showToast('Please enter JSON data', 'error');
      return;
    }

    const data = JSON.parse(json);

    if (!Array.isArray(data)) {
      showToast('JSON must be an array', 'error');
      return;
    }

    showToast(`Valid JSON with ${data.length} item(s)`, 'success');
  } catch (error) {
    showToast('Invalid JSON: ' + error.message, 'error');
  }
}

/**
 * Handle bulk add
 */
async function handleBulkAdd() {
  try {
    const json = bulkJsonInput.value.trim();
    if (!json) {
      showToast('Please enter JSON data', 'error');
      return;
    }

    const data = JSON.parse(json);

    if (!Array.isArray(data)) {
      showToast('JSON must be an array', 'error');
      return;
    }

    const response = await fetch('/api/apps/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk add apps');
    }

    const result = await response.json();

    // Show results
    bulkResults.classList.remove('hidden');
    bulkResultsContent.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center gap-2 text-green-400">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span class="font-medium">${result.created.length} app(s) created successfully</span>
        </div>
        ${result.errors.length > 0 ? `
          <div class="flex items-start gap-2 text-red-400">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            <div>
              <span class="font-medium">${result.errors.length} error(s):</span>
              <ul class="mt-2 space-y-1 text-sm">
                ${result.errors.map(err => `<li>Index ${err.index}: ${Array.isArray(err.errors) ? err.errors.join(', ') : err.error}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    await loadApps();

    if (result.created.length > 0) {
      showToast(`Successfully imported ${result.created.length} app(s)`, 'success');
    }
  } catch (error) {
    console.error('Error bulk adding apps:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy', 'error');
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Load widget settings
 */
async function loadWidgetSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) throw new Error('Failed to load settings');

    const settings = await response.json();

    // Update toggles
    const timeToggle = document.getElementById('timeWidgetToggle');
    const weatherToggle = document.getElementById('weatherWidgetToggle');
    const appHealthToggle = document.getElementById('appHealthWidgetToggle');

    if (timeToggle) {
      timeToggle.checked = settings.timeWidgetEnabled === true || settings.timeWidgetEnabled === 'true';
    }

    if (weatherToggle) {
      weatherToggle.checked = settings.weatherWidgetEnabled === true || settings.weatherWidgetEnabled === 'true';
    }

    if (appHealthToggle) {
      appHealthToggle.checked = settings.appHealthWidgetEnabled === true || settings.appHealthWidgetEnabled === 'true';
    }

    // Set temperature unit
    const tempUnit = settings.weatherTempUnit || 'fahrenheit';
    if (tempUnit === 'celsius') {
      document.getElementById('tempUnitC').checked = true;
    } else {
      document.getElementById('tempUnitF').checked = true;
    }

    // Set app health interval inputs
    setAppHealthIntervalInputs(settings.appHealthCheckInterval);

    // Show current weather location if set
    if (settings.weatherLocation && settings.weatherLat && settings.weatherLon) {
      document.getElementById('currentWeatherLocation').classList.remove('hidden');
      document.getElementById('currentLocationName').textContent = settings.weatherLocation;
      document.getElementById('currentLocationCoords').textContent = `${settings.weatherLat}, ${settings.weatherLon}`;
    }

    // Setup event listeners
    setupWidgetEventListeners();
  } catch (error) {
    console.error('Error loading widget settings:', error);
  }
}

/**
 * Setup widget event listeners
 */
function setupWidgetEventListeners() {
  // Search location button
  const searchBtn = document.getElementById('searchLocationBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchLocation);
  }

  // Save settings button
  const saveBtn = document.getElementById('saveWidgetSettings');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveWidgetSettings);
  }

  // Clear location button
  const clearBtn = document.getElementById('clearLocationBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearWeatherLocation);
  }

  // Enter key in search input
  const locationInput = document.getElementById('weatherLocationInput');
  if (locationInput) {
    locationInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchLocation();
      }
    });
  }
}

/**
 * Search for location using Open-Meteo Geocoding API
 */
async function searchLocation() {
  const input = document.getElementById('weatherLocationInput');
  const query = input.value.trim();

  if (!query) {
    showToast('Please enter a location', 'error');
    return;
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    if (!response.ok) throw new Error('Failed to search location');

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      showToast('No locations found', 'error');
      return;
    }

    displayLocationResults(data.results);
  } catch (error) {
    console.error('Error searching location:', error);
    showToast('Failed to search location', 'error');
  }
}

/**
 * Display location search results
 */
function displayLocationResults(results) {
  const resultsContainer = document.getElementById('locationResults');
  const resultsList = document.getElementById('locationResultsList');

  resultsList.innerHTML = '';

  results.forEach(result => {
    const locationName = [
      result.name,
      result.admin1,
      result.country
    ].filter(Boolean).join(', ');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors';
    button.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-white">${escapeHtml(locationName)}</p>
          <p class="text-xs text-slate-400 mt-1">${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}</p>
        </div>
        <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    `;

    button.addEventListener('click', () => {
      selectLocation(locationName, result.latitude, result.longitude);
    });

    resultsList.appendChild(button);
  });

  resultsContainer.classList.remove('hidden');
}

/**
 * Select a location from search results
 */
function selectLocation(name, lat, lon) {
  document.getElementById('currentWeatherLocation').classList.remove('hidden');
  document.getElementById('currentLocationName').textContent = name;
  document.getElementById('currentLocationCoords').textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  // Hide search results
  document.getElementById('locationResults').classList.add('hidden');

  // Clear search input
  document.getElementById('weatherLocationInput').value = '';

  showToast('Location selected', 'success');
}

/**
 * Clear weather location
 */
function clearWeatherLocation() {
  document.getElementById('currentWeatherLocation').classList.add('hidden');
  document.getElementById('currentLocationName').textContent = '--';
  document.getElementById('currentLocationCoords').textContent = '--';
}

/**
 * Save widget settings
 */
async function saveWidgetSettings() {
  try {
    const timeEnabled = document.getElementById('timeWidgetToggle').checked;
    const weatherEnabled = document.getElementById('weatherWidgetToggle').checked;
    const appHealthEnabled = document.getElementById('appHealthWidgetToggle').checked;

    // Get temperature unit selection
    const tempUnit = document.getElementById('tempUnitC').checked ? 'celsius' : 'fahrenheit';

    const currentLocationName = document.getElementById('currentLocationName').textContent;
    const currentLocationCoords = document.getElementById('currentLocationCoords').textContent;

    let weatherLocation = '';
    let weatherLat = '';
    let weatherLon = '';

    if (currentLocationName !== '--' && currentLocationCoords !== '--') {
      weatherLocation = currentLocationName;
      const coords = currentLocationCoords.split(', ');
      weatherLat = coords[0];
      weatherLon = coords[1];
    }

    const intervalValue = parseInt(document.getElementById('appHealthIntervalValue').value, 10);
    const intervalUnit = document.getElementById('appHealthIntervalUnit').value;
    const intervalMs = convertIntervalToMs(intervalValue, intervalUnit);

    const settings = {
      timeWidgetEnabled: timeEnabled,
      weatherWidgetEnabled: weatherEnabled,
      weatherTempUnit: tempUnit,
      weatherLocation,
      weatherLat,
      weatherLon,
      appHealthWidgetEnabled: appHealthEnabled,
      appHealthCheckInterval: intervalMs
    };

    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (!response.ok) throw new Error('Failed to save settings');

    showToast('Widget settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving widget settings:', error);
    showToast('Failed to save widget settings', 'error');
  }
}

/**
 * Populate the interval inputs for the app health widget
 */
function setAppHealthIntervalInputs(rawInterval) {
  const valueInput = document.getElementById('appHealthIntervalValue');
  const unitSelect = document.getElementById('appHealthIntervalUnit');
  if (!valueInput || !unitSelect) return;

  const intervalMs = parseInt(rawInterval, 10) || 60000;
  const { value, unit } = deriveIntervalParts(intervalMs);
  valueInput.value = value;
  unitSelect.value = unit;
}

/**
 * Convert interval milliseconds into value/unit parts for the UI
 */
function deriveIntervalParts(intervalMs) {
  if (intervalMs % 3600000 === 0) {
    return { value: intervalMs / 3600000, unit: 'hours' };
  }

  if (intervalMs % 60000 === 0) {
    return { value: intervalMs / 60000, unit: 'minutes' };
  }

  return {
    value: Math.max(5, Math.round(intervalMs / 1000)),
    unit: 'seconds'
  };
}

/**
 * Normalize UI input into milliseconds (minimum 5 seconds)
 */
function convertIntervalToMs(value, unit) {
  const multipliers = {
    seconds: 1000,
    minutes: 60000,
    hours: 3600000
  };

  const sanitizedValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.max(5, sanitizedValue);

  return clampedValue * (multipliers[unit] || 1000);
}

/**
 * CSS for tab buttons
 */
const style = document.createElement('style');
style.textContent = `
  .tab-btn {
    border-bottom: 2px solid transparent;
    color: #94a3b8;
  }
  .tab-btn.active {
    border-bottom-color: #3b82f6;
    color: white;
  }
  .tab-btn:hover:not(.active) {
    color: #cbd5e1;
  }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
