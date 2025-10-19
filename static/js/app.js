/*
 * Fichier JavaScript externe pour le Gestionnaire de Fichiers.
 * Version améliorée avec ergonomie optimisée
 */

const API_BASE = '/api';
const ROOT_PATH = '/';

// État global
let currentPath = ROOT_PATH;
let selectedFile = null;
let isModalOpen = false;
let sortColumn = 'name'; // 'name', 'size', 'modified'
let sortDirection = 'asc'; // 'asc', 'desc'
let isSearchMode = false; // Indique si on est en mode recherche
let lastSearchQuery = ''; // Stocke la dernière requête de recherche

// Références DOM (initialisation au chargement de la fenêtre)
let fileListBody;
let pathDisplay;
let modalOverlay;
let modalTitle;
let modalContent;
let contextMenu;
let mobileSearchModal;
let notificationContainer;

// --- GESTION DES CHEMINS ---

/**
 * Construit l'URL d'une API pour un chemin donné.
 */
function buildApiUrl(endpoint, path) {
    const url = new URL(`${API_BASE}/${endpoint}`, window.location.origin);
    if (path !== undefined) {
        url.searchParams.append('path', path);
    }
    return url.toString();
}

/**
 * Navigue vers un dossier spécifique et rafraîchit la liste.
 */
async function navigateToFolder(newPath, isSearchResult = false) {
    if (!isSearchResult) {
        currentPath = newPath;
        isSearchMode = false;
        history.pushState({ path: currentPath }, '', `?path=${encodeURIComponent(currentPath)}`);
    }

    showLoading();
    
    try {
        const url = buildApiUrl('list', newPath);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        renderFileList(data.files, data.current_path, data.is_search_result);
        
    } catch (error) {
        console.error("Erreur lors de la récupération de la liste des fichiers:", error);
        showNotification(`Erreur lors de la navigation: ${error.message}`, 'error');
        if (newPath !== ROOT_PATH && !isSearchResult) {
            navigateToFolder(ROOT_PATH);
        }
    } finally {
        hideLoading();
    }
}

/**
 * Gère la soumission du formulaire de téléversement avec barre de progression.
 */
function handleUploadFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const fileInput = document.getElementById('upload-file-input');
    const file = fileInput.files[0];
    const uploadArea = document.getElementById('upload-status-area');
    
    if (!file) {
        showNotification("Veuillez sélectionner un fichier.", 'warning');
        return;
    }
    
    uploadArea.innerHTML = `
        <div id="progress-container" class="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
            <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full transition-all duration-100 ease-linear" style="width: 0%"></div>
        </div>
        <p id="progress-text" class="text-sm text-center mt-2 text-slate-600">0%</p>
    `;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath); 
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildApiUrl('upload'));

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = `${percentComplete}% - ${file.name}`;
        }
    };

    xhr.onload = function() {
        uploadArea.innerHTML = `<button type="submit" id="upload-submit-btn" 
                                    class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150"
                                    disabled>
                                    <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                                </button>`;
        
        document.getElementById('upload-file-input').addEventListener('change', (event) => {
            const button = document.getElementById('upload-submit-btn');
            if (event.target.files.length > 0) {
                button.removeAttribute('disabled');
            } else {
                button.setAttribute('disabled', 'disabled');
            }
        });

        if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText);
            showNotification(result.message, 'success');
            closeModal();
            navigateToFolder(currentPath);
        } else {
            try {
                const result = JSON.parse(xhr.responseText);
                showNotification(`Échec du téléversement: ${result.error || 'Erreur inconnue'}`, 'error');
            } catch (e) {
                showNotification(`Erreur du serveur (${xhr.status}).`, 'error');
            }
        }
    };
    
    xhr.onerror = function() {
        showNotification("Erreur réseau lors du téléversement.", 'error');
        uploadArea.innerHTML = `<button type="submit" id="upload-submit-btn" 
                                    class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150"
                                    disabled>
                                    <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                                </button>`;
    };

    xhr.send(formData);
}

// Gérer le bouton retour du navigateur
window.onpopstate = (event) => {
    const newPath = event.state?.path || ROOT_PATH;
    if (isSearchMode) {
        exitSearchMode();
    } else {
        navigateToFolder(newPath);
    }
};

// --- AFFICHAGE ET RENDU ---

function showLoading() {
    fileListBody.innerHTML = `
        <tr class="bg-blue-50">
            <td colspan="4" class="py-4 text-center text-blue-600 font-semibold">
                <i class="fas fa-spinner fa-spin mr-2"></i> Chargement des fichiers...
            </td>
        </tr>
    `;
}

function hideLoading() {
    // La fonction navigateToFolder remplace directement le contenu
}

/**
 * Affiche la liste des fichiers dans le tableau et met à jour la barre d'adresse.
 */
function renderFileList(files, path, isSearchResult) {
    pathDisplay.innerHTML = '';
    fileListBody.innerHTML = '';

    // 1. Affichage de la barre d'adresse ou du chemin de recherche
    if (isSearchResult) {
        isSearchMode = true;
        const searchTerm = path.replace("Recherche: '", "").replace("'", "");
        pathDisplay.innerHTML = `
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                    <i class="fas fa-search text-blue-600"></i>
                    <span class="text-slate-600">Résultats pour :</span> 
                    <span class="font-bold text-blue-700">${searchTerm}</span>
                    <span class="text-slate-500 text-sm">(${files.length} résultat${files.length > 1 ? 's' : ''})</span>
                </div>
                <button onclick="exitSearchMode()" 
                        class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition duration-150 text-sm font-medium">
                    <i class="fas fa-times"></i>
                    <span>Quitter la recherche</span>
                </button>
            </div>
        `;
    } else {
        isSearchMode = false;
        const segments = path.split('/').filter(s => s.length > 0);
        let currentSegmentsPath = '';

        pathDisplay.innerHTML += `
            <span class="breadcrumb-segment text-slate-400 hover:text-blue-700 cursor-pointer transition duration-150" 
                  onclick="navigateToFolder('${ROOT_PATH}')">
                <i class="fas fa-home"></i> Racine
            </span>
            <span class="text-slate-400 mx-2">/</span>
        `;

        segments.forEach((segment, index) => {
            currentSegmentsPath += '/' + segment;
            const finalPath = currentSegmentsPath;
            const isLast = index === segments.length - 1;
            
            const segmentHtml = `
                <span class="breadcrumb-segment ${isLast ? 'text-slate-800 font-bold' : 'text-slate-600 hover:text-blue-700 cursor-pointer'} transition duration-150"
                      onclick="navigateToFolder('${finalPath}')">
                    ${segment}
                </span>
            `;
            
            pathDisplay.innerHTML += segmentHtml;
            
            if (!isLast) {
                pathDisplay.innerHTML += `<span class="text-slate-400 mx-2">/</span>`;
            }
        });
    }

    // 2. Tri des fichiers
    if (!isSearchResult) {
        files.sort(compareFiles);
    }
    
    // 3. Bouton "Retour"
    if (!isSearchResult && currentPath !== ROOT_PATH) {
        const parentPath = getParentPath(currentPath);
        fileListBody.innerHTML += `
            <tr class="hover:bg-slate-100 transition duration-150 cursor-pointer group" onclick="navigateToFolder('${parentPath}')">
                <td class="flex items-center px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                    <i class="fas fa-level-up-alt w-5 text-center mr-3 text-slate-400 group-hover:text-blue-600 transition duration-150"></i>
                    <span class="group-hover:text-blue-700 transition duration-150">... (Remonter)</span>
                </td>
                <td colspan="3" class="px-4 py-3 text-sm text-slate-500"></td>
            </tr>
        `;
    }

    // 4. Liste des fichiers
    if (files.length === 0) {
        fileListBody.innerHTML += `
            <tr>
                <td colspan="4" class="py-10 text-center text-slate-500 text-lg">
                    <i class="fas fa-folder-open text-4xl mb-3 text-slate-300"></i>
                    <p>${isSearchResult ? 'Aucun résultat trouvé.' : 'Ce dossier est vide.'}</p>
                </td>
            </tr>
        `;
        return;
    }

    files.forEach(file => {
        const icon = file.is_folder ? '<i class="fas fa-folder text-yellow-500 w-5 text-center mr-3"></i>' : getFileIcon(file.name);
        const nameClass = file.is_folder ? 'font-medium text-blue-600' : 'text-slate-800';
        
        const clickAction = file.is_folder 
            ? `navigateToFolder('/${file.full_relative_path}')` 
            : `handleFileClick('${file.name}', '${file.full_relative_path}', '${file.mime_type}', ${file.size})`;
        
        const contextMenuAction = `showContextMenu(event, '${file.name}', '${file.full_relative_path}', '${file.mime_type}', ${file.size}, ${file.is_folder})`;

        const rowClass = file.is_folder ? 'cursor-pointer hover:bg-yellow-50' : 'cursor-pointer hover:bg-blue-50';

        const displayName = isSearchResult ? 
            `<span class="text-xs text-slate-500 block mb-0.5">${file.full_relative_path.split('/').slice(0, -1).join('/') || '/'}</span>${file.name}` : 
            file.name;

        const row = `
            <tr class="${rowClass} transition duration-150 group" 
                onclick="${clickAction}" 
                oncontextmenu="${contextMenuAction}">
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <div class="flex items-center ${nameClass} text-sm">
                        ${icon}
                        <div>
                            ${displayName}
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500 hidden sm:table-cell">
                    ${file.is_folder ? '-' : formatBytes(file.size)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">
                    ${new Date(file.modified).toLocaleString('fr-FR')}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap text-sm font-medium">
                    <button class="text-slate-400 hover:text-blue-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" 
                            onclick="event.stopPropagation(); ${contextMenuAction}"
                            title="Plus d'options">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </td>
            </tr>
        `;
        fileListBody.innerHTML += row;
    });
    
    updateSortIndicators();
}

/**
 * Met à jour les indicateurs de tri dans les en-têtes.
 */
function updateSortIndicators() {
    document.querySelectorAll('.sortable-header').forEach(header => {
        const column = header.getAttribute('data-column');
        const iconSpan = header.querySelector('.sort-icon');
        
        header.classList.remove('sort-asc', 'sort-desc');
        
        if (iconSpan) {
            iconSpan.classList.remove('fa-sort-up', 'fa-sort-down', 'fa-sort');
            
            if (column === sortColumn) {
                header.classList.add(`sort-${sortDirection}`);
                iconSpan.classList.add(sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                iconSpan.classList.add('fa-sort');
            }
        }
    });
}

/**
 * Gère le clic sur un en-tête de colonne pour le tri.
 */
function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = (sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    navigateToFolder(currentPath);
}

/**
 * Fonction de comparaison pour le tri des fichiers.
 */
function compareFiles(a, b) {
    if (a.is_folder !== b.is_folder) {
        return a.is_folder ? -1 : 1;
    }
    
    let comparison = 0;
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (sortColumn === 'name') {
        comparison = aValue.localeCompare(bValue);
    } else if (sortColumn === 'size' || sortColumn === 'modified') {
        comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }

    return sortDirection === 'asc' ? comparison : comparison * -1;
}

/**
 * Détermine l'icône Font Awesome appropriée pour un fichier.
 */
function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    let iconClass = 'fas fa-file-alt';
    let colorClass = 'text-slate-400';

    const iconMap = {
        'html': 'fas fa-file-code', 'css': 'fas fa-file-code', 'js': 'fas fa-file-code', 'py': 'fas fa-file-code', 'json': 'fas fa-file-code', 'xml': 'fas fa-file-code',
        'pdf': 'fas fa-file-pdf', 'doc': 'fas fa-file-word', 'docx': 'fas fa-file-word', 'xls': 'fas fa-file-excel', 'xlsx': 'fas fa-file-excel', 'ppt': 'fas fa-file-powerpoint', 'pptx': 'fas fa-file-powerpoint', 'txt': 'fas fa-file-alt', 'log': 'fas fa-file-alt',
        'png': 'fas fa-file-image', 'jpg': 'fas fa-file-image', 'jpeg': 'fas fa-file-image', 'gif': 'fas fa-file-image', 'svg': 'fas fa-file-image', 'webp': 'fas fa-file-image',
        'mp4': 'fas fa-file-video', 'mov': 'fas fa-file-video', 'avi': 'fas fa-file-video', 'mkv': 'fas fa-file-video', 'mp3': 'fas fa-file-audio', 'wav': 'fas fa-file-audio', 'flac': 'fas fa-file-audio',
        'zip': 'fas fa-file-archive', 'rar': 'fas fa-file-archive', '7z': 'fas fa-file-archive', 'tar': 'fas fa-file-archive', 'gz': 'fas fa-file-archive',
    };

    const colorMap = {
        'pdf': 'text-red-600', 'doc': 'text-blue-600', 'docx': 'text-blue-600', 'xls': 'text-green-600', 'xlsx': 'text-green-600', 'ppt': 'text-orange-600', 'pptx': 'text-orange-600',
        'png': 'text-indigo-600', 'jpg': 'text-indigo-600', 'jpeg': 'text-indigo-600', 'gif': 'text-indigo-600', 'svg': 'text-indigo-600', 'webp': 'text-indigo-600',
        'mp4': 'text-purple-600', 'mov': 'text-purple-600', 'avi': 'text-purple-600', 'mkv': 'text-purple-600', 'mp3': 'text-purple-600', 'wav': 'text-purple-600', 'flac': 'text-purple-600',
        'zip': 'text-gray-600', 'rar': 'text-gray-600', '7z': 'text-gray-600', 'tar': 'text-gray-600', 'gz': 'text-gray-600',
        'html': 'text-red-500', 'css': 'text-blue-500', 'js': 'text-yellow-500', 'py': 'text-green-500', 'json': 'text-gray-700', 'xml': 'text-gray-700', 'log': 'text-gray-700'
    };

    if (iconMap[extension]) iconClass = iconMap[extension];
    if (colorMap[extension]) colorClass = colorMap[extension];
    
    return `<i class="${iconClass} ${colorClass} w-5 text-center mr-3"></i>`;
}

// --- LOGIQUE UTILITAIRE ---

function getParentPath(path) {
    if (path === ROOT_PATH) return ROOT_PATH;
    const segments = path.split('/').filter(s => s.length > 0);
    segments.pop();
    return '/' + segments.join('/');
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    if (bytes === undefined) return '-';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- LOGIQUE MODALE & MENU CONTEXTUEL ---

function openModal(title, content) {
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    modalOverlay.classList.remove('hidden');
    setTimeout(() => modalOverlay.classList.add('opacity-100'), 10);
    isModalOpen = true;
}

function closeModal() {
    modalOverlay.classList.remove('opacity-100');
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
        modalContent.innerHTML = '';
    }, 300); 
    isModalOpen = false;
}

document.addEventListener('click', (event) => {
    if (contextMenu && !contextMenu.contains(event.target)) {
        contextMenu.classList.add('hidden');
    }
});

/**
 * Affiche le menu contextuel personnalisé.
 */
function showContextMenu(event, name, path, mimeType, size, isFolder) {
    event.preventDefault();
    event.stopPropagation();
    
    selectedFile = { name, path, mimeType, size, isFolder };
    
    const menuHtml = generateContextMenuHtml(selectedFile);
    contextMenu.innerHTML = menuHtml;
    
    const x = event.clientX; 
    const y = event.clientY;
    
    contextMenu.style.position = 'fixed';
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    
    contextMenu.classList.remove('hidden');

    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;

    if (x + menuWidth > window.innerWidth) {
        contextMenu.style.left = `${window.innerWidth - menuWidth - 10}px`;
    }
    if (y + menuHeight > window.innerHeight) {
        contextMenu.style.top = `${window.innerHeight - menuHeight - 10}px`;
    } else if (y < 0) {
        contextMenu.style.top = `10px`;
    }
}

/**
 * Génère le contenu HTML pour le menu contextuel.
 */
function generateContextMenuHtml(file) {
    let html = `
        <div class="px-3 py-2 border-b border-slate-100 text-sm font-semibold text-slate-800 truncate">
            ${file.name}
        </div>
    `;

    if (file.isFolder) {
        html += `
            <button onclick="navigateToFolder('/${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                <i class="fas fa-folder-open mr-2 w-4"></i> Ouvrir
            </button>
            <button onclick="openRenameModal('${file.name}', '${file.path}', true)" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                <i class="fas fa-edit mr-2 w-4"></i> Renommer
            </button>
            <div class="border-t border-slate-100 my-1"></div>
            <button onclick="confirmDelete('${file.name}', '${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition duration-150">
                <i class="fas fa-trash-alt mr-2 w-4"></i> Supprimer le dossier
            </button>
        `;
    } else {
        const canView = canViewFile(file.mimeType, file.name);
        html += `
            <button onclick="handleFileClick('${file.name}', '${file.path}', '${file.mimeType}', ${file.size})" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                <i class="fas ${canView ? 'fa-eye' : 'fa-download'} mr-2 w-4"></i> ${canView ? 'Visualiser' : 'Télécharger'}
            </button>
        `;
        if (canView) {
            html += `
                <button onclick="downloadFile('${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                    <i class="fas fa-download mr-2 w-4"></i> Télécharger
                </button>
            `;
        }
        html += `
            <button onclick="openRenameModal('${file.name}', '${file.path}', false)" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                <i class="fas fa-edit mr-2 w-4"></i> Renommer
            </button>
            <div class="border-t border-slate-100 my-1"></div>
            <button onclick="confirmDelete('${file.name}', '${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition duration-150">
                <i class="fas fa-trash-alt mr-2 w-4"></i> Supprimer le fichier
            </button>
        `;
    }

    return html;
}

// --- ACTIONS SUR FICHIERS / API ---

/**
 * Gère le clic sur un fichier de manière intelligente.
 */
function handleFileClick(filename, path, mimeType, size) {
    const canBeViewed = canViewFile(mimeType, filename);
    
    if (canBeViewed) {
        viewFile(path, mimeType, size);
    } else {
        downloadFile(path);
    }
}

/**
 * Détermine si un fichier peut être visualisé.
 */
function canViewFile(mimeType, filename) {
    if (mimeType.startsWith('image/')) return true;
    if (mimeType.startsWith('video/')) return true;
    if (mimeType.startsWith('audio/')) return true;
    if (mimeType.startsWith('text/')) return true;
    if (mimeType === 'application/json') return true;
    
    const codeExtensions = ['.py', '.js', '.html', '.css', '.xml', '.log', '.json', '.md', '.yml', '.yaml', '.sh', '.bat', '.txt'];
    if (codeExtensions.some(ext => filename.toLowerCase().endsWith(ext))) return true;
    
    return false;
}

/**
 * Lance le téléchargement d'un fichier.
 */
function downloadFile(path) {
    contextMenu.classList.add('hidden');
    window.open(buildApiUrl('download', path), '_blank');
    showNotification(`Téléchargement de ${path.split('/').pop()} initié.`, 'info');
}

/**
 * Ouvre le fichier dans un visualiseur.
 */
function viewFile(path, mimeType, size) {
    contextMenu.classList.add('hidden');
    const filename = path.split('/').pop();

    if (mimeType.startsWith('image/')) {
        openModal(filename, `<img src="${buildApiUrl('view', path)}" alt="${filename}" class="max-w-full h-auto rounded-lg mx-auto shadow-xl">`);
    } else if (mimeType.startsWith('video/')) {
        window.open(API_BASE + `/player?path=${path}`, '_blank');
    } else if (mimeType.startsWith('audio/')) {
        openModal(filename, `<audio controls src="${buildApiUrl('view', path)}" class="w-full mt-4"></audio>`);
    } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || filename.endsWith('.log') || filename.endsWith('.py') || filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js')) {
        // Ouvrir directement le fichier texte dans le navigateur
        window.open(buildApiUrl('view', path), '_blank');
    } else {
        showNotification(`Visualisation non supportée pour ${filename}. Lancement du téléchargement.`, 'warning');
        downloadFile(path);
    }
}

// --- LOGIQUE DE RECHERCHE ---

/**
 * Gère la soumission des formulaires de recherche.
 */
function handleSearchSubmit(event) {
    event.preventDefault();
    
    let query = '';
    if (event.currentTarget.id === 'search-form-desktop') {
        query = document.getElementById('search-input').value.trim();
        document.getElementById('search-input').value = '';
    } else {
        query = document.getElementById('mobile-search-input').value.trim();
        document.getElementById('mobile-search-input').value = '';
        closeMobileSearchModal();
    }

    if (query) {
        performSearch(query);
    } else {
        showNotification('Veuillez entrer un terme de recherche.', 'info');
    }
}

/**
 * Lance la recherche en appelant l'API.
 */
async function performSearch(query) {
    showLoading();
    lastSearchQuery = query;
    
    try {
        const url = new URL(`${API_BASE}/search`, window.location.origin);
        url.searchParams.append('query', query);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        renderFileList(data.files, data.current_path, data.is_search_result);
        
    } catch (error) {
        console.error("Erreur lors de la recherche:", error);
        showNotification(`Erreur lors de la recherche: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Quitte le mode recherche et retourne au dossier actuel.
 */
function exitSearchMode() {
    isSearchMode = false;
    lastSearchQuery = '';
    navigateToFolder(currentPath);
}

// --- MODALE DE CRÉATION DE DOSSIER ---

function openCreateFolderModal() {
    contextMenu.classList.add('hidden');
    const title = "Créer un nouveau dossier";
    const content = `
        <form id="create-folder-form" class="space-y-4">
            <label for="folder-name" class="block text-sm font-medium text-slate-700">Nom du dossier :</label>
            <input type="text" id="folder-name" name="folder-name" 
                   class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                   placeholder="Nouveau Dossier" required autofocus>
            <div class="flex justify-end space-x-3 pt-2">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                <button type="submit" class="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition">Créer</button>
            </div>
        </form>
    `;
    openModal(title, content);

    document.getElementById('create-folder-form').addEventListener('submit', handleCreateFolderSubmit);
}

async function handleCreateFolderSubmit(event) {
    event.preventDefault();
    closeModal();

    const folderName = document.getElementById('folder-name').value.trim();
    if (!folderName) {
        showNotification("Le nom du dossier ne peut pas être vide.", 'warning');
        return;
    }

    try {
        const response = await fetch(API_BASE + '/create_folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent_path: currentPath,
                folder_name: folderName
            })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message, 'success');
            navigateToFolder(currentPath);
        } else {
            throw new Error(result.error || "Erreur inconnue lors de la création du dossier.");
        }
    } catch (error) {
        console.error("Erreur de création de dossier:", error);
        showNotification(`Échec de la création: ${error.message}`, 'error');
    }
}

// --- MODALE DE TÉLÉVERSEMENT ---

/**
 * Formate la taille d'un fichier en une chaîne lisible.
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Ferme le menu contextuel.
 */
function closeContextMenu() {
    if (contextMenu) {
        contextMenu.classList.add('hidden');
    }
}

/**
 * Ouvre la modale de téléversement.
 */
function openUploadModal() {
    closeContextMenu(); 
    
    const content = `
        <form id="upload-form" class="space-y-4">
            <p class="text-sm text-slate-600">Le fichier sera téléversé dans le dossier actuel : 
                <span class="font-semibold text-blue-600">${currentPath}</span>
            </p>
            <input type="file" id="upload-file-input" name="file" required 
                   class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer">
            
            <div id="upload-status-area">
                <button type="submit" id="upload-submit-btn" 
                        class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150 disabled:opacity-50"
                        disabled>
                    <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                </button>
            </div>
        </form>
    `;
    
    openModal("Téléverser un Fichier", content);
    
    document.getElementById('upload-file-input').addEventListener('change', (event) => {
        const button = document.getElementById('upload-submit-btn');
        if (button) { 
            if (event.target.files.length > 0) {
                button.removeAttribute('disabled');
            } else {
                button.setAttribute('disabled', 'disabled');
            }
        }
    });

    document.getElementById('upload-form').addEventListener('submit', handleUploadFormSubmit);
}

// --- LOGIQUE DE SUPPRESSION ---

function confirmDelete(name, path) {
    contextMenu.classList.add('hidden');
    const isFolder = name.endsWith('/');

    const title = `Supprimer ${isFolder ? 'le dossier' : 'le fichier'} ?`;
    const content = `
        <p class="text-slate-700">Êtes-vous sûr de vouloir supprimer définitivement :</p>
        <p class="font-semibold text-red-600 mt-2 truncate">${name}</p>
        <p class="text-sm text-slate-500 mt-2">Cette action est irréversible.</p>
        <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
            <button type="button" onclick="handleDelete('${path}')" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">Supprimer</button>
        </div>
    `;
    openModal(title, content);
}

async function handleDelete(path) {
    closeModal();

    try {
        const response = await fetch(API_BASE + '/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message, 'success');
            navigateToFolder(currentPath);
        } else {
            throw new Error(result.error || "Erreur inconnue lors de la suppression.");
        }
    } catch (error) {
        console.error("Erreur de suppression:", error);
        showNotification(`Échec de la suppression: ${error.message}`, 'error');
    }
}

// --- LOGIQUE DE RENOMMAGE ---

function openRenameModal(currentName, path, isFolder) {
    contextMenu.classList.add('hidden');
    const title = `Renommer ${isFolder ? 'le dossier' : 'le fichier'}`;
    
    // Extraire le nom sans extension pour les fichiers
    let nameWithoutExt = currentName;
    let extension = '';
    
    if (!isFolder && currentName.includes('.')) {
        const lastDotIndex = currentName.lastIndexOf('.');
        nameWithoutExt = currentName.substring(0, lastDotIndex);
        extension = currentName.substring(lastDotIndex);
    }
    
    const content = `
        <form id="rename-form" class="space-y-4">
            <div>
                <label for="new-name" class="block text-sm font-medium text-slate-700 mb-2">
                    Nouveau nom ${isFolder ? 'du dossier' : 'du fichier'} :
                </label>
                <div class="flex items-center gap-2">
                    <input type="text" id="new-name" name="new-name" 
                           class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                           value="${nameWithoutExt}" required autofocus>
                    ${!isFolder ? `<span class="text-slate-600 font-medium">${extension}</span>` : ''}
                </div>
                <p class="text-xs text-slate-500 mt-2">
                    ${isFolder ? 'Le nom ne doit pas contenir de caractères spéciaux.' : `L'extension ${extension} sera conservée.`}
                </p>
            </div>
            <input type="hidden" id="old-path" value="${path}">
            <input type="hidden" id="is-folder" value="${isFolder}">
            <input type="hidden" id="extension" value="${extension}">
            <div class="flex justify-end space-x-3 pt-2">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                <button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Renommer</button>
            </div>
        </form>
    `;
    openModal(title, content);

    document.getElementById('rename-form').addEventListener('submit', handleRenameSubmit);
    
    // Sélectionner le texte dans l'input
    const input = document.getElementById('new-name');
    input.select();
}

async function handleRenameSubmit(event) {
    event.preventDefault();
    closeModal();

    const newNameInput = document.getElementById('new-name').value.trim();
    const oldPath = document.getElementById('old-path').value;
    const isFolder = document.getElementById('is-folder').value === 'true';
    const extension = document.getElementById('extension').value;
    
    if (!newNameInput) {
        showNotification("Le nouveau nom ne peut pas être vide.", 'warning');
        return;
    }

    // Ajouter l'extension pour les fichiers
    const newName = isFolder ? newNameInput : newNameInput + extension;

    try {
        const response = await fetch(API_BASE + '/rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_path: oldPath,
                new_name: newName
            })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message, 'success');
            navigateToFolder(currentPath);
        } else {
            throw new Error(result.error || "Erreur inconnue lors du renommage.");
        }
    } catch (error) {
        console.error("Erreur de renommage:", error);
        showNotification(`Échec du renommage: ${error.message}`, 'error');
    }
}

// --- NOTIFICATIONS ---

/**
 * Affiche une notification temporaire.
 */
function showNotification(message, type = 'info') {
    const iconMap = {
        'success': 'fas fa-check-circle text-green-500',
        'error': 'fas fa-exclamation-triangle text-red-500',
        'info': 'fas fa-info-circle text-blue-500',
        'warning': 'fas fa-exclamation-circle text-yellow-500'
    };
    
    const bgMap = {
        'success': 'bg-green-100 border-green-400',
        'error': 'bg-red-100 border-red-400',
        'info': 'bg-blue-100 border-blue-400',
        'warning': 'bg-yellow-100 border-yellow-400'
    };

    const notification = document.createElement('div');
    notification.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-xl border ${bgMap[type]} transition-opacity duration-300 z-50 flex items-center opacity-0 max-w-md`;
    
    notification.innerHTML = `
        <i class="${iconMap[type]} mr-3 text-lg flex-shrink-0"></i>
        <span class="text-sm font-medium text-slate-700">${message}</span>
    `;
    
    notificationContainer.appendChild(notification);

    setTimeout(() => notification.classList.remove('opacity-0'), 10);

    setTimeout(() => {
        notification.classList.add('opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// --- GESTION MOBILE ---

function openMobileSearchModal() {
    mobileSearchModal.classList.remove('hidden');
}

function closeMobileSearchModal() {
    mobileSearchModal.classList.add('hidden');
}

// --- INITIALISATION ---

window.onload = function init() {
    // 1. Récupération des références DOM
    fileListBody = document.getElementById('file-list-body');
    pathDisplay = document.getElementById('path-display');
    modalOverlay = document.getElementById('modal-overlay');
    modalTitle = document.getElementById('modal-title');
    modalContent = document.getElementById('modal-content');
    contextMenu = document.getElementById('context-menu');
    mobileSearchModal = document.getElementById('mobile-search-modal');
    notificationContainer = document.getElementById('notification-container');

    // 2. Attachement des événements

    // Gestionnaires de tri
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            handleSort(column);
        });
    });

    // Formulaires de recherche
    document.getElementById('search-form-desktop').addEventListener('submit', handleSearchSubmit);
    document.getElementById('search-form-mobile').addEventListener('submit', handleSearchSubmit);

    // Boutons d'action
    document.getElementById('desktop-create-folder-btn').addEventListener('click', openCreateFolderModal);
    document.getElementById('mobile-create-folder-btn').addEventListener('click', openCreateFolderModal);
    document.getElementById('desktop-upload-btn').addEventListener('click', openUploadModal);
    document.getElementById('mobile-upload-btn').addEventListener('click', openUploadModal);
    document.getElementById('mobile-search-btn').addEventListener('click', openMobileSearchModal);
    document.getElementById('mobile-close-search-btn').addEventListener('click', closeMobileSearchModal);

    // 3. Charger le dossier initial
    const params = new URLSearchParams(window.location.search);
    const initialPath = params.get('path') || ROOT_PATH;
    navigateToFolder(initialPath);
    
    // 4. Écouter les événements clavier
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            closeModal();
        }
        if (e.key === 'Escape' && !mobileSearchModal.classList.contains('hidden')) {
            closeMobileSearchModal();
        }
        if (e.key === 'Escape' && isSearchMode) {
            exitSearchMode();
        }
    });
};