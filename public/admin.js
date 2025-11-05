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
  setupEventListeners();
  await loadApps();
  await loadUploads();
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
