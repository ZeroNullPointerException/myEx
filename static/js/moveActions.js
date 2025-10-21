// ============================================
// moveActions.js - Actions de déplacement (VERSION OPTIMISÉE)
// ============================================

const moveActions = {
    currentSourcePath: null,
    
    async openMoveModal(name, path, isFolder) {
        contextMenu.hide();
        const title = `Déplacer ${isFolder ? 'le dossier' : 'le fichier'}`;
        
        moveActions.currentSourcePath = path;
        
        const content = `
            <form id="move-form" class="space-y-4">
                <div>
                    <p class="text-sm text-slate-700 mb-2">
                        <strong>Élément à déplacer :</strong> ${name}
                    </p>
                    <label for="destination-folder" class="block text-sm font-medium text-slate-700 mb-2">
                        Sélectionner le dossier de destination :
                    </label>
                    
                    <!-- Arborescence navigable au lieu d'un select -->
                    <div class="border border-slate-300 rounded-lg bg-white max-h-96 overflow-y-auto">
                        <div id="folder-tree" class="p-2">
                            <div class="flex items-center justify-center py-4 text-slate-500">
                                <i class="fas fa-spinner fa-spin mr-2"></i> Chargement...
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <i class="fas fa-info-circle text-blue-600 mr-1"></i>
                        <strong>Destination sélectionnée :</strong>
                        <span id="selected-path-display" class="text-blue-700 font-mono">/ (Racine)</span>
                    </div>
                    
                    <p class="text-xs text-slate-500 mt-2">
                        Cliquez sur un dossier pour le sélectionner. Cliquez sur la flèche pour l'explorer.
                    </p>
                </div>
                <input type="hidden" id="move-source-path" value="${path}">
                <input type="hidden" id="move-destination-path" value="/">
                <input type="hidden" id="move-is-folder" value="${isFolder}">
                <div class="flex justify-end space-x-3 pt-2">
                    <button type="button" onclick="modal.close()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                    <button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Déplacer</button>
                </div>
            </form>
        `;
        modal.open(title, content);

        // Charger le premier niveau de dossiers
        await moveActions.loadFolderLevel('/', 'folder-tree', 0);
        
        document.getElementById('move-form').addEventListener('submit', moveActions.handleMove);
    },

    async loadFolderLevel(path, containerId, depth) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        try {
            const url = utils.buildApiUrl('list', path);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            const folders = data.files.filter(f => f.is_folder);
            
            // Si c'est le premier chargement (racine)
            if (depth === 0) {
                container.innerHTML = '';
                moveActions.renderFolderItem(container, '/', 'Racine', folders.length > 0, 0, true);
            }
            
            // Ajouter les sous-dossiers
            folders.forEach(folder => {
                const folderPath = '/' + folder.full_relative_path;
                
                // Ne pas afficher le dossier source (on ne peut pas déplacer dans soi-même)
                if (folderPath === moveActions.currentSourcePath) return;
                
                // Ne pas afficher les sous-dossiers du dossier source
                if (folderPath.startsWith(moveActions.currentSourcePath + '/')) return;
                
                moveActions.renderFolderItem(container, folderPath, folder.name, true, depth + 1);
            });
            
        } catch (error) {
            console.error("Erreur lors du chargement des dossiers:", error);
            container.innerHTML = `
                <div class="text-red-600 text-sm p-2">
                    <i class="fas fa-exclamation-triangle mr-1"></i>
                    Erreur de chargement
                </div>
            `;
        }
    },

    renderFolderItem(container, path, name, hasChildren, depth, isRoot = false) {
        const indent = depth * 20;
        const folderId = `folder-${path.replace(/\//g, '-')}`;
        
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item';
        folderDiv.innerHTML = `
            <div class="flex items-center hover:bg-slate-100 rounded px-2 py-1.5 cursor-pointer transition group"
                 style="padding-left: ${indent + 8}px">
                ${hasChildren ? `
                    <button type="button" class="expand-btn w-5 h-5 flex items-center justify-center text-slate-400 hover:text-blue-600 mr-1"
                            onclick="moveActions.toggleFolder('${path}', '${folderId}', ${depth}); event.stopPropagation();">
                        <i class="fas fa-chevron-right text-xs transition-transform duration-200"></i>
                    </button>
                ` : '<span class="w-5 mr-1"></span>'}
                <div class="flex-1 flex items-center select-folder-btn" onclick="moveActions.selectFolder('${path}')">
                    <i class="fas fa-folder text-yellow-500 mr-2"></i>
                    <span class="text-sm ${isRoot ? 'font-semibold' : ''}">${name}</span>
                </div>
            </div>
            <div id="${folderId}" class="folder-children hidden"></div>
        `;
        
        container.appendChild(folderDiv);
    },

    async toggleFolder(path, folderId, depth) {
        const childrenContainer = document.getElementById(folderId);
        const expandBtn = event.target.closest('.expand-btn');
        const icon = expandBtn.querySelector('i');
        
        if (!childrenContainer) return;
        
        if (childrenContainer.classList.contains('hidden')) {
            // Ouvrir
            icon.style.transform = 'rotate(90deg)';
            childrenContainer.classList.remove('hidden');
            
            // Charger les enfants si pas encore chargés
            if (childrenContainer.children.length === 0) {
                childrenContainer.innerHTML = `
                    <div class="text-slate-400 text-xs py-1" style="padding-left: ${(depth + 1) * 20 + 8}px">
                        <i class="fas fa-spinner fa-spin mr-1"></i> Chargement...
                    </div>
                `;
                
                try {
                    const url = utils.buildApiUrl('list', path);
                    const response = await fetch(url);
                    
                    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
                    
                    const data = await response.json();
                    const folders = data.files.filter(f => f.is_folder);
                    
                    childrenContainer.innerHTML = '';
                    
                    if (folders.length === 0) {
                        childrenContainer.innerHTML = `
                            <div class="text-slate-400 text-xs py-1" style="padding-left: ${(depth + 1) * 20 + 8}px">
                                <i class="fas fa-folder-open mr-1"></i> Vide
                            </div>
                        `;
                    } else {
                        folders.forEach(folder => {
                            const folderPath = '/' + folder.full_relative_path;
                            
                            // Ne pas afficher le dossier source
                            if (folderPath === moveActions.currentSourcePath) return;
                            
                            // Ne pas afficher les sous-dossiers du dossier source
                            if (folderPath.startsWith(moveActions.currentSourcePath + '/')) return;
                            
                            moveActions.renderFolderItem(childrenContainer, folderPath, folder.name, true, depth + 1);
                        });
                    }
                } catch (error) {
                    console.error("Erreur:", error);
                    childrenContainer.innerHTML = `
                        <div class="text-red-500 text-xs py-1" style="padding-left: ${(depth + 1) * 20 + 8}px">
                            <i class="fas fa-exclamation-triangle mr-1"></i> Erreur
                        </div>
                    `;
                }
            }
        } else {
            // Fermer
            icon.style.transform = 'rotate(0deg)';
            childrenContainer.classList.add('hidden');
        }
    },

    selectFolder(path) {
        // Retirer la sélection précédente
        document.querySelectorAll('.select-folder-btn').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'text-blue-700');
        });
        
        // Ajouter la nouvelle sélection
        event.target.closest('.select-folder-btn').classList.add('bg-blue-100', 'text-blue-700');
        
        // Mettre à jour le champ caché et l'affichage
        document.getElementById('move-destination-path').value = path;
        document.getElementById('selected-path-display').textContent = path || '/ (Racine)';
    },

    async handleMove(event) {
        event.preventDefault();
        modal.close();

        const sourcePath = document.getElementById('move-source-path').value;
        const destinationFolder = document.getElementById('move-destination-path').value;
        
        if (!destinationFolder) {
            notifications.show("Veuillez sélectionner un dossier de destination.", 'warning');
            return;
        }

        try {
            const response = await fetch(API_BASE + '/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_path: sourcePath,
                    destination_folder: destinationFolder
                })
            });

            const result = await response.json();

            if (response.ok) {
                notifications.show(result.message, 'success');
                navigation.navigateToFolder(state.currentPath);
            } else {
                throw new Error(result.error || "Erreur inconnue lors du déplacement.");
            }
        } catch (error) {
            console.error("Erreur de déplacement:", error);
            notifications.show(`Échec du déplacement: ${error.message}`, 'error');
        }
    }
};