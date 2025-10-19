/*
 * Fichier JavaScript externe pour le Gestionnaire de Fichiers.
 * Ce script gérait précédemment l'intégralité de la logique dans index.html.
 */

const API_BASE = '/api';
const ROOT_PATH = '/';

// État global
let currentPath = ROOT_PATH;
let selectedFile = null;
let isModalOpen = false;
let sortColumn = 'name'; // 'name', 'size', 'modified'
let sortDirection = 'asc'; // 'asc', 'desc'

// Références DOM (initialisation au chargement de la fenêtre)
let fileListBody;
let pathDisplay;
let modalOverlay;
let modalTitle;
let modalContent;
let contextMenu;
let mobileSearchModal;
let notificationContainer; // Ajout de la référence pour les notifications

// --- GESTION DES CHEMINS ---

/**
 * Construit l'URL d'une API pour un chemin donné.
 * @param {string} endpoint - Le point de terminaison de l'API (ex: 'list', 'download').
 * @param {string} path - Le chemin relatif dans le système de fichiers.
 * @returns {string} L'URL complète.
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
 * @param {string} newPath - Le nouveau chemin absolu (ex: '/dossier/sous-dossier').
 * @param {boolean} isSearchResult - Indique si nous affichons des résultats de recherche.
 */
async function navigateToFolder(newPath, isSearchResult = false) {
    // Si c'est un résultat de recherche, on ne modifie pas currentPath pour la navigation
    if (!isSearchResult) {
        currentPath = newPath;
        // Mettre à jour l'état de l'historique du navigateur
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
        // Revenir à la racine en cas d'erreur de navigation non bloquante
        if (newPath !== ROOT_PATH && !isSearchResult) {
            navigateToFolder(ROOT_PATH);
        }
    } finally {
        hideLoading();
    }
}/**
 * Gère la soumission du formulaire de téléversement (mise à jour avec barre de progression).
 */
function handleUploadFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const fileInput = document.getElementById('upload-file-input');
    const file = fileInput.files[0];
    const uploadArea = document.getElementById('upload-status-area'); // Nouveau conteneur
    
    if (!file) {
        showNotification("Veuillez sélectionner un fichier.", 'warning');
        return;
    }
    
    // Remplacer le contenu du statut par la barre de progression
    uploadArea.innerHTML = `
        <div id="progress-container" class="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
            <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full transition-all duration-100 ease-linear" style="width: 0%"></div>
        </div>
        <p id="progress-text" class="text-sm text-center mt-2 text-slate-600">0%</p>
    `;

    // 1. Créer l'objet FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath); 
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // 2. Utiliser XMLHttpRequest pour gérer la progression
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', buildApiUrl('upload'));

    // Gérer l'événement de progression
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = `${percentComplete}% - ${file.name}`;
        }
    };

    // Gérer la fin de la requête (succès ou échec)
    xhr.onload = function() {
        // Rétablir le statut initial de la zone d'upload
        uploadArea.innerHTML = `<button type="submit" id="upload-submit-btn" 
                                    class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150"
                                    disabled>
                                    <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                                </button>`;
        
        // Réactiver l'écouteur pour le bouton de soumission
        document.getElementById('upload-file-input').addEventListener('change', (event) => {
            const button = document.getElementById('upload-submit-btn');
            if (event.target.files.length > 0) {
                button.removeAttribute('disabled');
            } else {
                button.setAttribute('disabled', 'disabled');
            }
        });

        if (xhr.status >= 200 && xhr.status < 300) {
            // Succès
            const result = JSON.parse(xhr.responseText);
            showNotification(result.message, 'success');
            closeModal();
            navigateToFolder(currentPath);
        } else {
            // Échec
            try {
                const result = JSON.parse(xhr.responseText);
                showNotification(`Échec du téléversement: ${result.error || 'Erreur inconnue'}`, 'error');
            } catch (e) {
                showNotification(`Erreur du serveur (${xhr.status}).`, 'error');
            }
        }
    };
    
    // Gérer les erreurs réseau (ex: pas de connexion)
    xhr.onerror = function() {
        showNotification("Erreur réseau lors du téléversement.", 'error');
        // Rétablir l'interface en cas d'erreur
        uploadArea.innerHTML = `<button type="submit" id="upload-submit-btn" 
                                    class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150"
                                    disabled>
                                    <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                                </button>`;
    };

    // 3. Envoyer la requête
    xhr.send(formData);
}
// Gérer le bouton retour du navigateur
window.onpopstate = (event) => {
    const newPath = event.state?.path || ROOT_PATH;
    navigateToFolder(newPath);
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
    // La fonction navigateToFolder remplace directement le contenu, donc pas besoin de vide explicite ici.
}

/**
 * Affiche la liste des fichiers dans le tableau et met à jour la barre d'adresse.
 * @param {Array<Object>} files - La liste des fichiers et dossiers.
 * @param {string} path - Le chemin actuel.
 * @param {boolean} isSearchResult - Est-ce un résultat de recherche ?
 */
function renderFileList(files, path, isSearchResult) {
    pathDisplay.innerHTML = '';
    fileListBody.innerHTML = '';

    // 1. Affichage de la barre d'adresse ou du chemin de recherche
    if (isSearchResult) {
        // Affichage pour les résultats de recherche
        pathDisplay.innerHTML = `<span class="text-slate-600">Résultats pour :</span> <span class="font-bold text-blue-700">${path.replace("Recherche: '", "").replace("'", "")}</span>`;
    } else {
        // Affichage de la navigation par chemins (breadcrumbs)
        const segments = path.split('/').filter(s => s.length > 0);
        let currentSegmentsPath = '';

        // Lien vers la racine (/)
        pathDisplay.innerHTML += `
            <span class="breadcrumb-segment text-slate-400 hover:text-blue-700" 
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
                <span class="breadcrumb-segment ${isLast ? 'text-slate-800 font-bold' : 'text-slate-600'}"
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

    // 2. Tri des fichiers (si ce n'est pas un résultat de recherche, nous le faisons côté client)
    if (!isSearchResult) {
        files.sort(compareFiles);
    }
    
    // 3. Rendu du bouton "Retour" si nécessaire
    if (!isSearchResult && currentPath !== ROOT_PATH) {
        const parentPath = getParentPath(currentPath);
        fileListBody.innerHTML += `
            <tr class="hover:bg-slate-50 transition duration-150 cursor-pointer" onclick="navigateToFolder('${parentPath}')">
                <td class="flex items-center px-4 py-3 whitespace-nowrap text-slate-500 font-medium">
                    <i class="fas fa-level-up-alt w-5 text-center mr-3"></i>
                    ... (Remonter)
                </td>
                <td colspan="3" class="px-4 py-3 text-sm text-slate-500"></td>
            </tr>
        `;
    }

    // 4. Rendu de la liste principale
    if (files.length === 0) {
        fileListBody.innerHTML += `
            <tr>
                <td colspan="4" class="py-10 text-center text-slate-500 text-lg">
                    <i class="fas fa-folder-open text-4xl mb-3"></i>
                    <p>${isSearchResult ? 'Aucun résultat trouvé.' : 'Ce dossier est vide.'}</p>
                </td>
            </tr>
        `;
        return;
    }

    files.forEach(file => {
        const icon = file.is_folder ? '<i class="fas fa-folder text-yellow-500 w-5 text-center mr-3"></i>' : getFileIcon(file.name);
        const nameClass = file.is_folder ? 'font-medium text-blue-600' : 'text-slate-800';
        
        // --- LOGIQUE DE CLIC CORRIGÉE ---
        
        // L'action de double-clic pour les dossiers (qui est en réalité le clic simple dans ce schéma)
        const folderClickAction = `navigateToFolder('${file.full_relative_path}')`;
        // L'action d'ouverture de fichier/menu contextuel
        const fileAction = `openFileActions('${file.name}', '${file.full_relative_path}', '${file.mime_type}', ${file.size})`;
        const contextMenuAction = `showContextMenu(event, '${file.name}', '${file.full_relative_path}', '${file.mime_type}', ${file.size}, ${file.is_folder})`;

        // Action sur Clic Simple (pour les dossiers : navigation, pour les fichiers : menu contextuel/rien)
        const clickAction = file.is_folder ? folderClickAction : contextMenuAction;

        // Action sur Double-Clic (pour les dossiers : rien, pour les fichiers : ouverture)
        const dblClickAction = file.is_folder ? `void(0)` : fileAction;

        const rowClass = file.is_folder ? 'cursor-pointer hover:bg-yellow-50/50' : 'cursor-default hover:bg-slate-50/50';

        // Pour les résultats de recherche, on affiche le chemin relatif complet dans la colonne 'Nom'
        const displayName = isSearchResult ? 
            `<span class="text-xs text-slate-500 block">${file.full_relative_path.split('/').slice(0, -1).join('/') || '/'}</span>${file.name}` : 
            file.name;

        const row = `
            <tr class="${rowClass} transition duration-150 group" 
                onclick="${clickAction}" 
                ondblclick="${dblClickAction}"
                oncontextmenu="${contextMenuAction}">
                <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    <div class="flex items-center ${nameClass} text-sm">
                        ${icon}
                        <div>
                            ${displayName}
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    ${formatBytes(file.size)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    ${new Date(file.modified).toLocaleString('fr-FR')}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap text-sm font-medium">
                    <button class="text-slate-400 hover:text-blue-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                            onclick="event.stopPropagation(); ${contextMenuAction}"
                            title="Actions">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </td>
            </tr>
        `;
        fileListBody.innerHTML += row;
    });
    
    // Mettre à jour l'indicateur de tri sur les en-têtes de colonnes
    updateSortIndicators();
}

/**
 * Met à jour les indicateurs de tri (flèches) dans les en-têtes du tableau.
 */
function updateSortIndicators() {
    document.querySelectorAll('.sortable-header').forEach(header => {
        const column = header.getAttribute('data-column');
        const iconSpan = header.querySelector('.sort-icon');
        
        // Supprimer les classes de direction existantes
        header.classList.remove('sort-asc', 'sort-desc');
        
        if (iconSpan) {
            iconSpan.classList.remove('fa-sort-up', 'fa-sort-down', 'fa-sort');
            
            if (column === sortColumn) {
                // Appliquer la nouvelle classe de direction à l'en-tête
                header.classList.add(`sort-${sortDirection}`);
                
                // Mettre à jour l'icône
                iconSpan.classList.add(sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                // Icône neutre pour les autres colonnes
                iconSpan.classList.add('fa-sort');
            }
        }
    });
}

/**
 * Gère le clic sur un en-tête de colonne pour le tri.
 * @param {string} column - La colonne à trier ('name', 'size', 'modified').
 */
function handleSort(column) {
    if (sortColumn === column) {
        // Changer la direction si la même colonne est cliquée
        sortDirection = (sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        // Changer de colonne (réinitialiser à ascendant)
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // Recharger le dossier actuel pour appliquer le tri
    navigateToFolder(currentPath);
}

/**
 * Fonction de comparaison pour le tri des fichiers.
 */
function compareFiles(a, b) {
    // 1. Les dossiers sont toujours en premier
    if (a.is_folder !== b.is_folder) {
        return a.is_folder ? -1 : 1;
    }
    
    // 2. Trier par la colonne choisie
    let comparison = 0;
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (sortColumn === 'name') {
        comparison = aValue.localeCompare(bValue);
    } else if (sortColumn === 'size' || sortColumn === 'modified') {
        comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }

    // 3. Appliquer la direction
    return sortDirection === 'asc' ? comparison : comparison * -1;
}

/**
 * Détermine l'icône Font Awesome appropriée pour un fichier.
 * @param {string} filename - Le nom du fichier.
 * @returns {string} La balise <i> HTML de l'icône.
 */
function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    let iconClass = 'fas fa-file-alt'; // Icône par défaut (texte/inconnu)
    let colorClass = 'text-slate-400';

    const iconMap = {
        // Code
        'html': 'fas fa-file-code', 'css': 'fas fa-file-code', 'js': 'fas fa-file-code', 'py': 'fas fa-file-code', 'json': 'fas fa-file-code', 'xml': 'fas fa-file-code',
        // Documents
        'pdf': 'fas fa-file-pdf', 'doc': 'fas fa-file-word', 'docx': 'fas fa-file-word', 'xls': 'fas fa-file-excel', 'xlsx': 'fas fa-file-excel', 'ppt': 'fas fa-file-powerpoint', 'pptx': 'fas fa-file-powerpoint', 'txt': 'fas fa-file-alt', 'log': 'fas fa-file-alt',
        // Images
        'png': 'fas fa-file-image', 'jpg': 'fas fa-file-image', 'jpeg': 'fas fa-file-image', 'gif': 'fas fa-file-image', 'svg': 'fas fa-file-image', 'webp': 'fas fa-file-image',
        // Média
        'mp4': 'fas fa-file-video', 'mov': 'fas fa-file-video', 'avi': 'fas fa-file-video', 'mkv': 'fas fa-file-video', 'mp3': 'fas fa-file-audio', 'wav': 'fas fa-file-audio', 'flac': 'fas fa-file-audio',
        // Archives
        'zip': 'fas fa-file-archive', 'rar': 'fas fa-file-archive', '7z': 'fas fa-file-archive', 'tar': 'fas fa-file-archive', 'gz': 'fas fa-file-archive',
    };

    const colorMap = {
        'pdf': 'text-red-600', 'doc': 'text-blue-600', 'docx': 'text-blue-600', 'xls': 'text-green-600', 'xlsx': 'text-green-600', 'ppt': 'text-orange-600', 'pptx': 'text-orange-600',
        'png': 'text-indigo-600', 'jpg': 'text-indigo-600', 'jpeg': 'text-indigo-600', 'gif': 'text-indigo-600', 'svg': 'text-indigo-600', 'webp': 'text-indigo-600',
        'mp4': 'text-purple-600', 'mov': 'text-purple-600', 'avi': 'text-purple-600', 'mkv': 'text-purple-600', 'mp3': 'text-purple-600', 'wav': 'text-purple-600', 'flac': 'text-purple-600',
        'zip': 'text-gray-600', 'rar': 'text-gray-600', '7z': 'text-gray-600', 'tar': 'text-gray-600', 'gz': 'text-gray-600',
        'html': 'text-red-500', 'css': 'text-blue-500', 'js': 'text-yellow-500', 'py': 'text-green-500', 'json': 'text-gray-700', 'xml': 'text-gray-700', 'log': 'text-gray-700'
    };

    if (iconMap[extension]) {
        iconClass = iconMap[extension];
    }
    if (colorMap[extension]) {
        colorClass = colorMap[extension];
    }
    
    // Les icônes de fichiers sont un peu plus petites que les dossiers
    return `<i class="${iconClass} ${colorClass} w-5 text-center mr-3"></i>`;
}

// --- LOGIQUE UTILITAIRE ---

/**
 * Calcule le chemin parent.
 */
function getParentPath(path) {
    if (path === ROOT_PATH) return ROOT_PATH;
    const segments = path.split('/').filter(s => s.length > 0);
    segments.pop(); // Retirer le dernier segment
    return '/' + segments.join('/');
}

/**
 * Formate la taille en octets.
 */
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
    // Forcer la reflow pour l'animation d'ouverture
    setTimeout(() => modalOverlay.classList.add('opacity-100'), 10);
    isModalOpen = true;
}

function closeModal() {
    modalOverlay.classList.remove('opacity-100');
    // Cacher après la transition
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
        modalContent.innerHTML = '';
    }, 300); 
    isModalOpen = false;
}

// Cacher le menu contextuel lorsque l'utilisateur clique ailleurs
document.addEventListener('click', (event) => {
    // S'assurer que le clic n'est pas dans le menu contextuel lui-même
    if (contextMenu && !contextMenu.contains(event.target)) {
        contextMenu.classList.add('hidden');
    }
});


/**
 * Affiche le menu contextuel personnalisé.
 */
function showContextMenu(event, name, path, mimeType, size, isFolder) {
    event.preventDefault(); // Empêche le menu contextuel natif du navigateur
    event.stopPropagation(); // Empêche le clic de remonter vers le document et de fermer immédiatement le menu
    
    selectedFile = { name, path, mimeType, size, isFolder };
    
    // Rendre le contenu du menu contextuel
    const menuHtml = generateContextMenuHtml(selectedFile);
    contextMenu.innerHTML = menuHtml;
    
    // Positionner le menu
    // Pour des raisons de performance et de compatibilité, utilisez event.pageX/Y si possible ou event.clientX/Y
    const x = event.clientX; 
    const y = event.clientY;
    
    contextMenu.style.position = 'fixed';
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    
    // On doit le rendre visible avant de calculer sa taille
    contextMenu.classList.remove('hidden');

    // Ajustements pour s'assurer qu'il reste visible à l'écran
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;

    // Ajustement X
    if (x + menuWidth > window.innerWidth) {
        contextMenu.style.left = `${window.innerWidth - menuWidth - 10}px`;
    }
    // Ajustement Y
    if (y + menuHeight > window.innerHeight) {
        contextMenu.style.top = `${window.innerHeight - menuHeight - 10}px`;
    } else if (y < 0) {
        contextMenu.style.top = `10px`;
    }
}

/**
 * Génère le contenu HTML pour le menu contextuel en fonction du type de fichier.
 */
function generateContextMenuHtml(file) {
    let html = `
        <div class="px-3 py-2 border-b border-slate-100 text-sm font-semibold text-slate-800 truncate">
            ${file.name}
        </div>
    `;

    if (file.isFolder) {
        // Actions pour les dossiers
        html += `
            <button onclick="navigateToFolder('${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                <i class="fas fa-folder-open mr-2 w-4"></i> Ouvrir
            </button>
            <div class="border-t border-slate-100 my-1"></div>
            <button onclick="confirmDelete('${file.name}', '${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <i class="fas fa-trash-alt mr-2 w-4"></i> Supprimer le dossier
            </button>
        `;
    } else {
        // Actions pour les fichiers
        html += `
            <button onclick="viewFile('${file.path}', '${file.mimeType}', ${file.size})" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                <i class="fas fa-eye mr-2 w-4"></i> Visualiser
            </button>
            <button onclick="downloadFile('${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                <i class="fas fa-download mr-2 w-4"></i> Télécharger
            </button>
            <div class="border-t border-slate-100 my-1"></div>
            <button onclick="confirmDelete('${file.name}', '${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <i class="fas fa-trash-alt mr-2 w-4"></i> Supprimer le fichier
            </button>
        `;
    }

    return html;
}

// --- ACTIONS SUR FICHIERS / API ---

/**
 * Fonction appelée par le double-clic sur les fichiers.
 * Lance la visualisation ou le téléchargement.
 */
function openFileActions(filename, path, mimeType, size) {
    // Si c'est un type de fichier qui ne peut pas être visualisé (e.g., zip), on lance directement le téléchargement
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType === 'application/octet-stream') {
        downloadFile(path);
    } else {
        viewFile(path, mimeType, size);
    }
}


/**
 * Lance le téléchargement d'un fichier.
 */
function downloadFile(path) {
    contextMenu.classList.add('hidden'); // Fermer le menu
    // Le téléchargement est un simple lien GET vers l'API /download
    window.open(buildApiUrl('download', path), '_blank');
    showNotification(`Téléchargement de ${path.split('/').pop()} initié.`, 'info');
}

/**
 * Ouvre le fichier dans un visualiseur ou lance le téléchargement si non supporté.
 */
function viewFile(path, mimeType, size) {
    contextMenu.classList.add('hidden'); // Fermer le menu
    const filename = path.split('/').pop();

    if (mimeType.startsWith('image/')) {
        // Visualisation d'image
        openModal(filename, `<img src="${buildApiUrl('view', path)}" alt="${filename}" class="max-w-full h-auto rounded-lg mx-auto shadow-xl">`);
    } else if (mimeType.startsWith('video/')) {
        // Visualisation vidéo (ouvre une nouvelle fenêtre/onglet vers la route /api/player)
        window.open(API_BASE + `/player?path=${path}`, '_blank');
    } else if (mimeType.startsWith('audio/')) {
        // Visualisation audio
        openModal(filename, `<audio controls src="${buildApiUrl('view', path)}" class="w-full mt-4"></audio>`);
    } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || filename.endsWith('.log') || filename.endsWith('.py') || filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js')) {
        // Visualisation de texte/code (ouvre une nouvelle fenêtre/onglet vers la route /api/text_viewer)
        window.open(API_BASE + `/text_viewer?path=${path}`, '_blank');
    } else {
        // Autres types (PDF, Office, etc.) : lancer le téléchargement
        showNotification(`Visualisation non supportée pour ${filename}. Lancement du téléchargement.`, 'warning');
        downloadFile(path);
    }
}

// --- LOGIQUE DE RECHERCHE ---

/**
 * Gère la soumission des formulaires de recherche (desktop et mobile).
 * CORRECTION: Ajout de la fonction pour lancer la recherche.
 */
function handleSearchSubmit(event) {
    event.preventDefault();
    
    // Déterminer la source de la recherche pour obtenir la valeur
    let query = '';
    if (event.currentTarget.id === 'search-form-desktop') {
        query = document.getElementById('search-input').value.trim();
        document.getElementById('search-input').value = ''; // Vider le champ
    } else {
        query = document.getElementById('mobile-search-input').value.trim();
        document.getElementById('mobile-search-input').value = ''; // Vider le champ
        closeMobileSearchModal(); // Fermer la modale après la recherche mobile
    }

    if (query) {
        performSearch(query);
    } else {
        showNotification('Veuillez entrer un terme de recherche.', 'info');
    }
}

/**
 * Lance la recherche en appelant l'API.
 * @param {string} query - Le terme de recherche.
 * CORRECTION: Ajout de la fonction pour appeler l'API de recherche récursive.
 */
async function performSearch(query) {
    showLoading();
    
    try {
        const url = new URL(`${API_BASE}/search`, window.location.origin);
        url.searchParams.append('query', query);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        // Le serveur Flask renvoie is_search_result: true
        renderFileList(data.files, data.current_path, data.is_search_result);
        
    } catch (error) {
        console.error("Erreur lors de la recherche:", error);
        showNotification(`Erreur lors de la recherche: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}


// --- MODALE DE CRÉATION DE DOSSIER ---

function openCreateFolderModal() {
    contextMenu.classList.add('hidden'); // Fermer le menu si ouvert
    const title = "Créer un nouveau dossier";
    const content = `
        <form id="create-folder-form" class="space-y-4">
            <label for="folder-name" class="block text-sm font-medium text-slate-700">Nom du dossier :</label>
            <input type="text" id="folder-name" name="folder-name" 
                   class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                   placeholder="Nouveau Dossier" required>
            <div class="flex justify-end space-x-3 pt-2">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                <button type="submit" class="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition">Créer</button>
            </div>
        </form>
    `;
    openModal(title, content);

    // Attacher l'événement de soumission
    document.getElementById('create-folder-form').addEventListener('submit', handleCreateFolderSubmit);
}

async function handleCreateFolderSubmit(event) {
    event.preventDefault();
    closeModal(); // Fermer la modale immédiatement

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
            navigateToFolder(currentPath); // Rafraîchir
        } else {
            throw new Error(result.error || "Erreur inconnue lors de la création du dossier.");
        }
    } catch (error) {
        console.error("Erreur de création de dossier:", error);
        showNotification(`Échec de la création: ${error.message}`, 'error');
    }
}

// --- MODALE DE TÉLÉVERSEMENT ---
// --- LOGIQUE DE TÉLÉVERSEMENT AVEC BARRE DE PROGRESSION (MODIFIÉ) ---

/**
 * Formate la taille d'un fichier en une chaîne lisible (ex: 1.2 MB).
 * @param {number} bytes - La taille du fichier en octets.
 * @returns {string} La taille formatée.
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
// app.js

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
    
    // Attacher les listeners après l'ouverture de la modale
    // Le listener pour le changement de fichier est conservé pour activer/désactiver le bouton
    document.getElementById('upload-file-input').addEventListener('change', (event) => {
        const button = document.getElementById('upload-submit-btn');
        // Vérifie si le bouton existe encore (il pourrait avoir été remplacé par la barre de prog.)
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

/**
 * Met à jour l'affichage du nom et de la taille du fichier sélectionné.
 */
function updateFileInfo(event) {
    const fileInput = event.target;
    const infoDiv = document.getElementById('upload-file-info');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSize = formatFileSize(file.size);

        // Affichage du nom et de la taille
        infoDiv.innerHTML = `
            <p class="text-sm font-semibold text-slate-800 break-words">${file.name}</p>
            <p class="text-xs text-slate-500 mt-1">Taille: ${fileSize}</p>
        `;
        document.getElementById('start-upload-btn').disabled = false;
    } else {
        // Rétablir le texte par défaut si aucun fichier n'est sélectionné
        infoDiv.innerHTML = `<p class="text-sm font-medium text-slate-700">Cliquez ou glissez-déposez un fichier ici</p>`;
        document.getElementById('start-upload-btn').disabled = true;
    }
}
// Le reste de la fonction handleUpload (non modifiée) et les autres fonctions de app.js suivent ici...
/**
 * Formate la taille d'un fichier en une chaîne lisible (ex: 1.2 MB).
 * @param {number} bytes - La taille du fichier en octets.
 * @returns {string} La taille formatée.
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function updateUploadPreview(event) {
    const fileInput = event.target;
    const filePreview = document.getElementById('file-preview');
    const uploadBtn = document.getElementById('upload-submit-btn');
    
    filePreview.innerHTML = '';

    if (fileInput.files.length > 0) {
        uploadBtn.disabled = false;
        Array.from(fileInput.files).forEach(file => {
            filePreview.innerHTML += `<p class="text-sm truncate">${getFileIcon(file.name)} ${file.name} (${formatBytes(file.size)})</p>`;
        });
    } else {
        uploadBtn.disabled = true;
        filePreview.innerHTML = '<p class="text-slate-500 text-sm italic">Aucun fichier sélectionné.</p>';
    }
}

async function handleUploadSubmit(event) {
    event.preventDefault();

    const fileInput = document.getElementById('file-input');
    const files = fileInput.files;

    if (files.length === 0) {
        showNotification("Veuillez sélectionner au moins un fichier.", 'warning');
        return;
    }

    closeModal();
    showNotification(`Début du téléversement de ${files.length} fichier(s)...`, 'info');

    // Utilisation de FormData pour envoyer les fichiers
    const formData = new FormData();
    formData.append('path', currentPath); // Chemin de destination

    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]); // Le nom 'file' doit correspondre à ce qu'attend Flask
    }

    try {
        const response = await fetch(API_BASE + '/upload', {
            method: 'POST',
            body: formData // Pas besoin de Content-Type ici, le navigateur le gère avec FormData
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message, 'success');
            navigateToFolder(currentPath); // Rafraîchir
        } else {
            // Le serveur Flask ne prend pas en charge l'upload de plusieurs fichiers à la fois.
            // On peut s'attendre à une boucle ici dans une vraie application.
            throw new Error(result.error || "Erreur lors du téléversement.");
        }
    } catch (error) {
        console.error("Erreur de téléversement:", error);
        showNotification(`Échec du téléversement: ${error.message}`, 'error');
    }
}

// --- LOGIQUE DE SUPPRESSION ---

function confirmDelete(name, path) {
    contextMenu.classList.add('hidden'); // Fermer le menu
    const isFolder = name.endsWith('/'); // Simple vérification heuristique

    const title = `Supprimer ${isFolder ? 'le dossier' : 'le fichier'} ?`;
    const content = `
        <p class="text-slate-700">Êtes-vous sûr de vouloir supprimer définitivement :</p>
        <p class="font-semibold text-red-600 mt-2 truncate">${name}</p>
        <p class="text-sm text-slate-500">Cette action est irréversible.</p>
        <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
            <button type="button" onclick="handleDelete('${path}')" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">Supprimer</button>
        </div>
    `;
    openModal(title, content);
}

async function handleDelete(path) {
    closeModal(); // Fermer la modale

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
            navigateToFolder(currentPath); // Rafraîchir
        } else {
            throw new Error(result.error || "Erreur inconnue lors de la suppression.");
        }
    } catch (error) {
        console.error("Erreur de suppression:", error);
        showNotification(`Échec de la suppression: ${error.message}`, 'error');
    }
}

// --- NOTIFICATIONS ---

/**
 * Affiche une notification temporaire.
 * @param {string} message - Le message à afficher.
 * @param {string} type - Le type ('success', 'error', 'info', 'warning').
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
    notification.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-xl border ${bgMap[type]} transition-opacity duration-300 z-50 flex items-center opacity-0`;
    
    notification.innerHTML = `
        <i class="${iconMap[type]} mr-3 text-lg"></i>
        <span class="text-sm font-medium text-slate-700">${message}</span>
    `;
    
    notificationContainer.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => notification.classList.remove('opacity-0'), 10);

    // Disparition après 5 secondes
    setTimeout(() => {
        notification.classList.add('opacity-0');
        // Suppression du DOM après la transition
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// --- GESTION MOBILE ---

function openMobileSearchModal() {
    mobileSearchModal.classList.remove('hidden');
}

/**
 * Ferme la modale de recherche mobile.
 */
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
    notificationContainer = document.getElementById('notification-container'); // Récupération de la référence

    // 2. Attachement des événements

    // Attachement du gestionnaire de tri aux en-têtes
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            handleSort(column);
        });
    });

    // Attachement des formulaires de recherche
    document.getElementById('search-form-desktop').addEventListener('submit', handleSearchSubmit);
    document.getElementById('search-form-mobile').addEventListener('submit', handleSearchSubmit);

    // Attachement des boutons d'action
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
    
    // 4. Écouter les événements clavier pour fermer la modale avec ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            closeModal();
        }
        if (e.key === 'Escape' && !mobileSearchModal.classList.contains('hidden')) {
            closeMobileSearchModal();
        }
    });
};
