/**
 * Dashboard Client-Side JavaScript
 * Handles app display, filtering, sorting, and quick add functionality
 */

let allApps = [];
let currentView = localStorage.getItem('dashboard-view') || 'grid';
let currentSort = 'pinned';
let currentTagFilter = '';
let currentSectionFilter = '';
let currentTheme = 'dark';
let quickAddUploadedIcon = null;

// DOM elements
const appsContainer = document.getElementById('appsContainer');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const tagFilter = document.getElementById('tagFilter');
const sectionFilter = document.getElementById('sectionFilter');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const quickAddModal = document.getElementById('quickAddModal');
const quickAddForm = document.getElementById('quickAddForm');
const themeToggle = document.getElementById('themeToggle');
const securityBanner = document.getElementById('securityBanner');
const securityInfoIcon = document.getElementById('securityInfoIcon');

// View buttons
const viewButtons = document.querySelectorAll('.view-btn');

/**
 * Initialize dashboard
 */
async function init() {
  initTheme();
  initSecurityBanner();
  initView();
  setupEventListeners();
  await loadApps();
}

/**
 * Initialize view from localStorage
 */
function initView() {
  const savedView = localStorage.getItem('dashboard-view') || 'grid';
  currentView = savedView;

  // Set active view button
  document.querySelectorAll('.view-btn').forEach(btn => {
    if (btn.dataset.view === savedView) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
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
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');

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
  const dismissed = localStorage.getItem('dashboard-security-dismissed') === 'true';
  if (dismissed) {
    securityBanner.classList.add('hidden');
    securityInfoIcon.classList.remove('hidden');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', debounce(filterAndRenderApps, 300));

  // Sort
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    filterAndRenderApps();
  });

  // Tag filter
  tagFilter.addEventListener('change', (e) => {
    currentTagFilter = e.target.value;
    filterAndRenderApps();
  });

  // Section filter
  sectionFilter.addEventListener('change', (e) => {
    currentSectionFilter = e.target.value;
    filterAndRenderApps();
  });

  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Security banner
  document.getElementById('dismissSecurityBanner').addEventListener('click', () => {
    localStorage.setItem('dashboard-security-dismissed', 'true');
    securityBanner.classList.add('hidden');
    securityInfoIcon.classList.remove('hidden');
  });

  securityInfoIcon.addEventListener('click', () => {
    localStorage.removeItem('dashboard-security-dismissed');
    securityBanner.classList.remove('hidden');
    securityInfoIcon.classList.add('hidden');
  });

  // View mode buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      localStorage.setItem('dashboard-view', currentView);
      filterAndRenderApps();
    });
  });

  // Quick add modal close buttons
  document.getElementById('closeQuickAdd').addEventListener('click', closeQuickAddModal);
  document.getElementById('cancelQuickAdd').addEventListener('click', closeQuickAddModal);

  quickAddModal.addEventListener('click', (e) => {
    if (e.target === quickAddModal) {
      closeQuickAddModal();
    }
  });

  quickAddForm.addEventListener('submit', handleQuickAdd);

  // Quick add file upload
  const quickAddIconFile = document.getElementById('quickAddIconFile');
  const quickAddRemoveIcon = document.getElementById('quickAddRemoveIcon');

  quickAddIconFile.addEventListener('change', handleQuickAddFileUpload);
  quickAddRemoveIcon.addEventListener('click', clearQuickAddIcon);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !quickAddModal.classList.contains('hidden')) {
      closeQuickAddModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

/**
 * Handle quick add file upload
 */
async function handleQuickAddFileUpload(e) {
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
    quickAddUploadedIcon = result.path;

    // Show preview
    document.getElementById('quickAddIconPreviewImg').src = result.url;
    document.getElementById('quickAddIconPreview').classList.remove('hidden');
    document.getElementById('quickAddIconPath').value = result.path;

    showToast('Icon uploaded successfully', 'success');
  } catch (error) {
    console.error('Error uploading icon:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Clear quick add icon preview
 */
function clearQuickAddIcon() {
  quickAddUploadedIcon = null;
  document.getElementById('quickAddIconPreview').classList.add('hidden');
  document.getElementById('quickAddIconPreviewImg').src = '';
  document.getElementById('quickAddIconPath').value = '';
  document.getElementById('quickAddIconFile').value = '';
}

/**
 * Load apps from API
 */
async function loadApps() {
  try {
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');

    const response = await fetch('/api/apps');
    if (!response.ok) throw new Error('Failed to load apps');

    allApps = await response.json();
    populateTagFilter();
    populateSectionFilter();
    filterAndRenderApps();
  } catch (error) {
    console.error('Error loading apps:', error);
    showToast('Failed to load apps', 'error');
    emptyState.classList.remove('hidden');
  } finally {
    loadingState.classList.add('hidden');
  }
}

/**
 * Populate tag filter dropdown with unique tags
 */
function populateTagFilter() {
  const tags = [...new Set(allApps.map(app => app.tag).filter(Boolean))];

  tagFilter.innerHTML = '<option value="">All Tags</option>';
  tags.sort().forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
}

/**
 * Populate section filter dropdown with unique sections
 */
function populateSectionFilter() {
  const sections = [...new Set(allApps.map(app => app.section).filter(Boolean))];

  sectionFilter.innerHTML = '<option value="">All Sections</option>';
  sections.sort().forEach(section => {
    const option = document.createElement('option');
    option.value = section;
    option.textContent = section;
    sectionFilter.appendChild(option);
  });
}

/**
 * Filter and render apps based on current filters
 */
function filterAndRenderApps() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  let filtered = allApps.filter(app => {
    // Search filter
    const matchesSearch = !searchTerm ||
      app.name.toLowerCase().includes(searchTerm) ||
      (app.description && app.description.toLowerCase().includes(searchTerm)) ||
      (app.tag && app.tag.toLowerCase().includes(searchTerm)) ||
      (app.section && app.section.toLowerCase().includes(searchTerm));

    // Tag filter
    const matchesTag = !currentTagFilter || app.tag === currentTagFilter;

    // Section filter
    const matchesSection = !currentSectionFilter || app.section === currentSectionFilter;

    return matchesSearch && matchesTag && matchesSection;
  });

  // Sort
  filtered = sortApps(filtered, currentSort);

  // Render based on current section filter
  if (currentSectionFilter) {
    renderApps(filtered);
  } else {
    renderAppsBySection(filtered);
  }
}

/**
 * Sort apps based on selected sort method
 */
function sortApps(apps, sortMethod) {
  const sorted = [...apps];

  switch (sortMethod) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'date':
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'tag':
      sorted.sort((a, b) => {
        const tagA = a.tag || 'zzz';
        const tagB = b.tag || 'zzz';
        return tagA.localeCompare(tagB);
      });
      break;
    case 'pinned':
    default:
      sorted.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return b.is_pinned - a.is_pinned;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
      break;
  }

  return sorted;
}

/**
 * Render apps grouped by section
 */
function renderAppsBySection(apps) {
  if (apps.length === 0) {
    appsContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  appsContainer.classList.remove('hidden');
  emptyState.classList.add('hidden');

  // Special handling for table view
  if (currentView === 'table') {
    renderTableView(apps);
    return;
  }

  // Group apps by section
  const grouped = {};
  const noSection = [];

  apps.forEach(app => {
    if (app.section) {
      if (!grouped[app.section]) {
        grouped[app.section] = [];
      }
      grouped[app.section].push(app);
    } else {
      noSection.push(app);
    }
  });

  // Build HTML with section headers
  let html = '';

  // Render sections alphabetically
  const sections = Object.keys(grouped).sort();
  sections.forEach(section => {
    const sectionApps = grouped[section];
    html += `
      <div class="section-divider" data-section="${escapeHtml(section)}">
        <div class="section-header">
          <h2>${escapeHtml(section)}</h2>
          <span class="section-count">${sectionApps.length}</span>
        </div>
        <div class="grid gap-6 view-${currentView} section-drop-zone" data-section="${escapeHtml(section)}">
          ${sectionApps.map(app => createAppCard(app, currentView)).join('')}
        </div>
      </div>
    `;
  });

  // Render apps without section
  if (noSection.length > 0) {
    html += `
      <div class="section-divider" data-section="">
        <div class="section-header">
          <h2>Other</h2>
          <span class="section-count">${noSection.length}</span>
        </div>
        <div class="grid gap-6 view-${currentView} section-drop-zone" data-section="">
          ${noSection.map(app => createAppCard(app, currentView)).join('')}
        </div>
      </div>
    `;
  }

  appsContainer.className = '';
  appsContainer.innerHTML = html;

  // Add event listeners to pin buttons
  apps.forEach(app => {
    const pinBtn = document.getElementById(`pin-${app.id}`);
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(app.id);
      });
    }
  });

  // Setup drag and drop
  setupDragAndDrop();
}

/**
 * Render apps to the container (without sections)
 */
function renderApps(apps) {
  if (apps.length === 0) {
    appsContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  appsContainer.classList.remove('hidden');
  emptyState.classList.add('hidden');

  // Special handling for table view
  if (currentView === 'table') {
    renderTableView(apps);
    return;
  }

  // Set grid layout based on view mode
  appsContainer.className = `grid gap-6 view-${currentView}`;

  appsContainer.innerHTML = apps.map(app => createAppCard(app, currentView)).join('');

  // Add event listeners to pin buttons
  apps.forEach(app => {
    const pinBtn = document.getElementById(`pin-${app.id}`);
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(app.id);
      });
    }
  });
}

/**
 * Render table view
 */
function renderTableView(apps) {
  appsContainer.className = 'table-view-container';

  // If section filter is active, render single table
  if (currentSectionFilter) {
    appsContainer.innerHTML = `
      <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
        <table class="admin-table w-full">
          <thead>
            <tr class="bg-slate-900">
              <th class="px-4 py-3 text-left text-sm font-semibold"></th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Icon</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Name</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Description</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">URL</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Tag</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Section</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="section-drop-zone" data-section="${escapeHtml(currentSectionFilter)}">
            ${apps.map(app => createAppCard(app, currentView)).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // Group apps by section
    const grouped = {};
    const noSection = [];

    apps.forEach(app => {
      if (app.section) {
        if (!grouped[app.section]) {
          grouped[app.section] = [];
        }
        grouped[app.section].push(app);
      } else {
        noSection.push(app);
      }
    });

    // Build HTML with section tables
    let html = '';

    // Render sections alphabetically
    const sections = Object.keys(grouped).sort();
    sections.forEach(section => {
      const sectionApps = grouped[section];
      html += `
        <div class="section-divider mb-6" data-section="${escapeHtml(section)}">
          <div class="section-header mb-3">
            <h2>${escapeHtml(section)}</h2>
            <span class="section-count">${sectionApps.length}</span>
          </div>
          <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
            <table class="admin-table w-full">
              <thead>
                <tr class="bg-slate-900">
                  <th class="px-4 py-3 text-left text-sm font-semibold"></th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Icon</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Description</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">URL</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Tag</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody class="section-drop-zone" data-section="${escapeHtml(section)}">
                ${sectionApps.map(app => createAppCard(app, currentView)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    // Render apps without section
    if (noSection.length > 0) {
      html += `
        <div class="section-divider" data-section="">
          <div class="section-header mb-3">
            <h2>Other</h2>
            <span class="section-count">${noSection.length}</span>
          </div>
          <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
            <table class="admin-table w-full">
              <thead>
                <tr class="bg-slate-900">
                  <th class="px-4 py-3 text-left text-sm font-semibold"></th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Icon</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Description</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">URL</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Tag</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody class="section-drop-zone" data-section="">
                ${noSection.map(app => createAppCard(app, currentView)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    appsContainer.innerHTML = html;
  }

  // Add event listeners to pin buttons
  apps.forEach(app => {
    const pinBtn = document.getElementById(`pin-${app.id}`);
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(app.id);
      });
    }
  });

  // Setup drag and drop
  setupDragAndDrop();
}

/**
 * Create HTML for app card
 */
function createAppCard(app, view) {
  const icon = getAppIcon(app);
  const isPinned = app.is_pinned === 1;

  // List View
  if (view === 'list') {
    return `
      <div class="app-card bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-4 relative" data-app-id="${app.id}" data-app-section="${escapeHtml(app.section || '')}">
        ${isPinned ? '<div class="pinned-indicator"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path></svg></div>' : ''}
        <div class="drag-handle" title="Drag to move" draggable="true">
          <svg class="w-5 h-5 text-slate-400 cursor-move" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
          </svg>
        </div>
        <div class="app-icon flex-shrink-0">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-white truncate">${escapeHtml(app.name)}</h3>
          <p class="text-slate-400 text-sm truncate">${escapeHtml(app.description || 'No description')}</p>
          ${app.tag ? `<span class="tag-badge mt-1">${escapeHtml(app.tag)}</span>` : ''}
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button id="pin-${app.id}" class="pin-icon p-2 hover:bg-slate-700 rounded-lg transition-colors" title="${isPinned ? 'Unpin' : 'Pin'}">
            <svg class="w-5 h-5 ${isPinned ? 'text-amber-400' : 'text-slate-400'}" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path>
            </svg>
          </button>
          <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium text-white">
            Open
          </a>
        </div>
      </div>
    `;
  }

  // Table View
  if (view === 'table') {
    return `
      <tr class="app-card-table border-b border-slate-700 hover:bg-slate-700/50 transition-colors" data-app-id="${app.id}" data-app-section="${escapeHtml(app.section || '')}">
        <td class="px-4 py-3">
          <div class="drag-handle inline-block" title="Drag to move" draggable="true">
            <svg class="w-4 h-4 text-slate-400 cursor-move" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </div>
        </td>
        <td class="px-4 py-3">
          <div class="app-icon-small">
            ${icon}
          </div>
        </td>
        <td class="px-4 py-3">
          <div class="font-semibold text-white">${escapeHtml(app.name)}</div>
        </td>
        <td class="px-4 py-3 text-slate-400 text-sm max-w-xs truncate">${escapeHtml(app.description || '-')}</td>
        <td class="px-4 py-3">
          <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 text-sm truncate block max-w-xs" title="${escapeHtml(app.url)}">
            ${escapeHtml(app.url)}
          </a>
        </td>
        <td class="px-4 py-3">${app.tag ? `<span class="tag-badge-sm">${escapeHtml(app.tag)}</span>` : '-'}</td>
        <td class="px-4 py-3 text-slate-400 text-sm">${escapeHtml(app.section || '-')}</td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <button id="pin-${app.id}" class="pin-icon p-1.5 hover:bg-slate-600 rounded transition-colors" title="${isPinned ? 'Unpin' : 'Pin'}">
              <svg class="w-4 h-4 ${isPinned ? 'text-amber-400' : 'text-slate-400'}" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path>
              </svg>
            </button>
            <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white text-xs font-medium">
              Open
            </a>
          </div>
        </td>
      </tr>
    `;
  }

  // Compact View
  if (view === 'compact') {
    return `
      <div class="app-card-compact bg-slate-800 rounded-lg border border-slate-700 p-3 hover:border-slate-600 relative text-center group" data-app-id="${app.id}" data-app-section="${escapeHtml(app.section || '')}">
        ${isPinned ? '<div class="pinned-indicator-sm"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path></svg></div>' : ''}
        <div class="drag-handle-compact absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Drag to move" draggable="true">
          <svg class="w-3 h-3 text-slate-400 cursor-move" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
          </svg>
        </div>
        <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="block">
          <div class="app-icon-compact mx-auto mb-2">
            ${icon}
          </div>
          <h3 class="text-sm font-semibold text-white truncate mb-1" title="${escapeHtml(app.name)}">${escapeHtml(app.name)}</h3>
          ${app.tag ? `<span class="tag-badge-xs">${escapeHtml(app.tag)}</span>` : ''}
        </a>
        <button id="pin-${app.id}" class="pin-icon-compact absolute top-1 right-1 p-1 hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100" title="${isPinned ? 'Unpin' : 'Pin'}">
          <svg class="w-3 h-3 ${isPinned ? 'text-amber-400' : 'text-slate-400'}" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path>
          </svg>
        </button>
      </div>
    `;
  }

  // Comfortable View
  if (view === 'comfortable') {
    return `
      <div class="app-card-comfortable bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-8 hover:border-slate-600 relative" data-app-id="${app.id}" data-app-section="${escapeHtml(app.section || '')}">
        ${isPinned ? '<div class="pinned-indicator"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path></svg></div>' : ''}
        <div class="flex items-start justify-between mb-6">
          <div class="app-icon-large">
            ${icon}
          </div>
          <div class="flex items-center gap-2">
            <div class="drag-handle" title="Drag to move" draggable="true">
              <svg class="w-5 h-5 text-slate-400 cursor-move" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </div>
            <button id="pin-${app.id}" class="pin-icon p-2 hover:bg-slate-700 rounded-lg transition-colors" title="${isPinned ? 'Unpin' : 'Pin'}">
              <svg class="w-5 h-5 ${isPinned ? 'text-amber-400' : 'text-slate-400'}" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path>
              </svg>
            </button>
          </div>
        </div>
        <h3 class="text-2xl font-semibold text-white mb-3">${escapeHtml(app.name)}</h3>
        <p class="text-slate-400 text-base mb-6 min-h-[3rem]">${escapeHtml(app.description || 'No description')}</p>
        <div class="flex items-center justify-between">
          ${app.tag ? `<span class="tag-badge">${escapeHtml(app.tag)}</span>` : '<span></span>'}
          <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium text-white">
            Open
          </a>
        </div>
      </div>
    `;
  }

  // Grid View (default)
  return `
    <div class="app-card bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6 hover:border-slate-600 relative" data-app-id="${app.id}" data-app-section="${escapeHtml(app.section || '')}">
      ${isPinned ? '<div class="pinned-indicator"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path></svg></div>' : ''}
      <div class="flex items-start justify-between mb-4">
        <div class="app-icon">
          ${icon}
        </div>
        <div class="flex items-center gap-2">
          <div class="drag-handle" title="Drag to move" draggable="true">
            <svg class="w-5 h-5 text-slate-400 cursor-move" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </div>
          <button id="pin-${app.id}" class="pin-icon p-2 hover:bg-slate-700 rounded-lg transition-colors" title="${isPinned ? 'Unpin' : 'Pin'}">
            <svg class="w-5 h-5 ${isPinned ? 'text-amber-400' : 'text-slate-400'}" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2z"></path>
            </svg>
          </button>
        </div>
      </div>
      <h3 class="text-xl font-semibold text-white mb-2 truncate">${escapeHtml(app.name)}</h3>
      <p class="text-slate-400 text-sm mb-4 truncate-2-lines min-h-[2.5rem]">${escapeHtml(app.description || 'No description')}</p>
      <div class="flex items-center justify-between">
        ${app.tag ? `<span class="tag-badge">${escapeHtml(app.tag)}</span>` : '<span></span>'}
        <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium text-white text-sm">
          Open
        </a>
      </div>
    </div>
  `;
}

/**
 * Get app icon HTML
 */
function getAppIcon(app) {
  if (app.icon && app.icon.startsWith('/uploads/')) {
    return `<img src="${escapeHtml(app.icon)}" alt="${escapeHtml(app.name)}" onerror="this.parentElement.innerHTML='${getInitials(app.name)}'">`;
  }
  return getInitials(app.name);
}

/**
 * Get initials from app name
 */
function getInitials(name) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return escapeHtml(words[0][0] + words[1][0]).toUpperCase();
  }
  return escapeHtml(name.substring(0, 2)).toUpperCase();
}

/**
 * Toggle pin status
 */
async function togglePin(appId) {
  try {
    const response = await fetch(`/api/apps/${appId}/pin`, {
      method: 'PATCH'
    });

    if (!response.ok) throw new Error('Failed to toggle pin');

    const updatedApp = await response.json();

    // Update local data
    const index = allApps.findIndex(app => app.id === appId);
    if (index !== -1) {
      allApps[index] = updatedApp;
    }

    filterAndRenderApps();
  } catch (error) {
    console.error('Error toggling pin:', error);
    showToast('Failed to toggle pin', 'error');
  }
}

/**
 * Handle quick add form submission
 */
async function handleQuickAdd(e) {
  e.preventDefault();

  const formData = new FormData(quickAddForm);
  const data = {
    name: formData.get('name'),
    url: formData.get('url'),
    description: formData.get('description'),
    tag: formData.get('tag'),
    section: formData.get('section'),
    icon: formData.get('icon') || quickAddUploadedIcon,
    is_pinned: 0
  };

  try {
    const response = await fetch('/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create app');
    }

    const newApp = await response.json();
    allApps.unshift(newApp);
    populateTagFilter();
    populateSectionFilter();
    filterAndRenderApps();
    closeQuickAddModal();
    showToast('App added successfully', 'success');
  } catch (error) {
    console.error('Error adding app:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Close quick add modal
 */
function closeQuickAddModal() {
  quickAddModal.classList.add('hidden');
  quickAddForm.reset();
  clearQuickAddIcon();
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
 * Debounce function for search
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
  // Select all drag handles (including compact variant)
  const dragHandles = document.querySelectorAll('.drag-handle[draggable="true"], .drag-handle-compact[draggable="true"]');
  const dropZones = document.querySelectorAll('.section-drop-zone');

  let draggedElement = null;
  let draggedAppId = null;
  let draggedFromSection = null;

  // Add drag event listeners to drag handles
  dragHandles.forEach(handle => {
    handle.addEventListener('dragstart', handleDragStart);
    handle.addEventListener('dragend', handleDragEnd);
  });

  // Add drop zone event listeners
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragenter', handleDragEnter);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
  });

  function handleDragStart(e) {
    // Find the parent app card (supports all view types)
    const appCard = this.closest('.app-card') ||
                    this.closest('.app-card-comfortable') ||
                    this.closest('.app-card-compact') ||
                    this.closest('.app-card-table');

    if (!appCard) return;

    draggedElement = appCard;
    draggedAppId = parseInt(appCard.getAttribute('data-app-id'));
    draggedFromSection = appCard.getAttribute('data-app-section');

    appCard.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', appCard.innerHTML);
  }

  function handleDragEnd(e) {
    // Find the parent app card (supports all view types)
    const appCard = this.closest('.app-card') ||
                    this.closest('.app-card-comfortable') ||
                    this.closest('.app-card-compact') ||
                    this.closest('.app-card-table');

    if (appCard) {
      appCard.style.opacity = '1';
    }

    // Remove all drag-over classes
    dropZones.forEach(zone => {
      zone.classList.remove('drag-over');
    });
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    this.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    // Only remove class if we're actually leaving the drop zone
    if (e.target === this) {
      this.classList.remove('drag-over');
    }
  }

  async function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();

    this.classList.remove('drag-over');

    const targetSection = this.getAttribute('data-section');

    // Check if we're dropping in a different section
    if (targetSection !== draggedFromSection) {
      await moveAppToSection(draggedAppId, targetSection);
    }

    draggedElement = null;
    draggedAppId = null;
    draggedFromSection = null;

    return false;
  }
}

/**
 * Move app to a different section
 */
async function moveAppToSection(appId, newSection) {
  try {
    const app = allApps.find(a => a.id === appId);
    if (!app) return;

    const oldSection = app.section || 'Other';
    const displayNewSection = newSection || 'Other';

    // Update the app's section
    const response = await fetch(`/api/apps/${appId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...app,
        section: newSection || null
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update app section');
    }

    const updatedApp = await response.json();

    // Update local data
    const index = allApps.findIndex(a => a.id === appId);
    if (index !== -1) {
      allApps[index] = updatedApp;
    }

    // Re-render
    filterAndRenderApps();

    showToast(`Moved "${app.name}" from "${oldSection}" to "${displayNewSection}"`, 'success');
  } catch (error) {
    console.error('Error moving app:', error);
    showToast('Failed to move app to new section', 'error');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
