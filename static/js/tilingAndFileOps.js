// ============================================
// 3. tilingAndFileOps.js - Fonctions avancées (Tuilage, Split, Opérations de Fichiers)
// Doit être chargé après floatingViewer.js et viewerInteractions.js
// Correction : Ajout du tri des dossiers/fichiers dans loadFolderContent.
// ============================================

Object.assign(floatingViewer, {
    
    // ============================================
    // Logique de Tuilage (Snap) et Split
    // ... (Reste inchangé) ...
    // ============================================

    applyTilingSnap(element) { 
        const rect = element.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const margin = 10; 

        let snapMode = null; 
        
        const nearTop = rect.top <= margin;
        const nearBottom = rect.bottom >= screenHeight - margin;
        const nearLeft = rect.left <= margin;
        const nearRight = rect.right >= screenWidth - margin;

        if (nearTop && nearLeft) {
            snapMode = 'quarter-tl'; 
        } else if (nearTop && nearRight) {
            snapMode = 'quarter-tr';
        } else if (nearBottom && nearLeft) {
            snapMode = 'quarter-bl'; 
        } else if (nearBottom && nearRight) {
            snapMode = 'quarter-br';
        }
        else if (nearTop) {
            snapMode = 'full';
        }
        else if (nearLeft) {
            snapMode = 'half-left';
        }
        else if (nearRight) {
            snapMode = 'half-right';
        }

        if (!snapMode) {
             return; 
        }

        const windowId = element.id;

        const neighboringWindow = this.findNeighboringWindow(snapMode, element.id);
        
        element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'; 
        element.style.right = 'auto';
        element.style.bottom = 'auto';

        switch(snapMode) {
            case 'full':
                element.style.left = '0';
                element.style.top = '0';
                element.style.width = '100vw';
                element.style.height = '100vh';
                element.style.borderRadius = '0';
                if (this.linkedResizePair) {
                    this.disableTiling(windowId);
                }
                break;
            case 'half-left':
                element.style.left = '0';
                element.style.top = '0';
                element.style.width = '50vw';
                element.style.height = '100vh';
                element.style.borderRadius = '0'; 
                
                if (neighboringWindow && neighboringWindow.snapMode === 'half-right') {
                    this.enableSplitMode(windowId, neighboringWindow.id); 
                } else if (this.linkedResizePair) {
                    this.disableTiling(windowId);
                }
                break;
            case 'half-right':
                element.style.left = '50vw';
                element.style.top = '0';
                element.style.width = '50vw';
                element.style.height = '100vh';
                element.style.borderRadius = '0';
                
                if (neighboringWindow && neighboringWindow.snapMode === 'half-left') {
                    this.enableSplitMode(neighboringWindow.id, windowId); 
                } else if (this.linkedResizePair) {
                    this.disableTiling(windowId);
                }
                break;
            case 'quarter-tl': 
            case 'quarter-tr': 
            case 'quarter-bl': 
            case 'quarter-br': 
                element.style.width = '50vw';
                element.style.height = '50vh';
                element.style.left = snapMode.includes('tr') || snapMode.includes('br') ? '50vw' : '0';
                element.style.top = snapMode.includes('bl') || snapMode.includes('br') ? '50vh' : '0';
                element.style.borderRadius = '0';
                if (this.linkedResizePair) {
                    this.disableTiling(windowId);
                }
                break;
        }

        this.updateContentHeight(element);

        element.style.transform = 'scale(1.02)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
        
        if (typeof notifications !== 'undefined') {
            notifications.show('🧲 Tuilage ' + snapMode.replace('-', ' ') + ' appliqué', 'success');
        }
    },

    findNeighboringWindow(targetSnapMode, currentId) { 
        let neighbor = null;
        let expectedSnapMode = null;
        
        if (targetSnapMode === 'half-left') {
            expectedSnapMode = 'half-right';
        } else if (targetSnapMode === 'half-right') {
            expectedSnapMode = 'half-left';
        } else {
            return null; 
        }
        
        this.activeWindows.forEach(windowData => {
            const element = windowData.element;
            const rect = element.getBoundingClientRect();
            const screenWidth = window.innerWidth;
            const margin = 5; 

            if (element.id === currentId || this.linkedResizePair?.idA === element.id || this.linkedResizePair?.idB === element.id) {
                return;
            }
            
            const isHalfLeft = rect.left <= margin && rect.width > screenWidth / 2 - margin && rect.width < screenWidth / 2 + margin;
            const isHalfRight = rect.right >= screenWidth - margin && rect.width > screenWidth / 2 - margin && rect.width < screenWidth / 2 + margin && rect.left > screenWidth / 2 - margin;


            if (expectedSnapMode === 'half-left' && isHalfLeft) {
                neighbor = { id: windowData.id, snapMode: 'half-left' };
            } 
            else if (expectedSnapMode === 'half-right' && isHalfRight) {
                neighbor = { id: windowData.id, snapMode: 'half-right' };
            }
        });
        
        return neighbor;
    },
    
    disableTiling(viewerIdToKeep) { 
        if (!this.linkedResizePair) return;

        const idA = this.linkedResizePair.idA;
        const idB = this.linkedResizePair.idB;

        const otherId = (idA === viewerIdToKeep) ? idB : idA;
        const otherWindow = document.getElementById(otherId);
        
        if (otherWindow) {
            this.snapToDefaultPosition(otherWindow); 
        }
        
        this.linkedResizePair = null;

        if (typeof notifications !== 'undefined') {
            notifications.show('🧲 Mode Split désactivé.', 'info');
        }
    },

    enableSplitMode(viewerIdA, viewerIdB, axis = 'vertical') { 
        this.linkedResizePair = {
            idA: viewerIdA,
            idB: viewerIdB,
            axis: axis
        };
        
        const viewerA = document.getElementById(viewerIdA);
        const viewerB = document.getElementById(viewerIdB);
        
        if (viewerA) {
            viewerA.style.position = 'fixed';
            viewerA.style.borderRadius = '0';
            viewerA.style.left = '0';
            viewerA.style.width = '50vw';
            viewerA.style.height = '100vh';
            viewerA.style.top = '0'; 
            viewerA.style.right = 'auto';
            viewerA.style.bottom = 'auto';

            const headerBtns = viewerA.querySelectorAll('.viewer-header button');
            headerBtns.forEach(btn => btn.style.display = 'none');
            
            this.updateContentHeight(viewerA);
        }
        
        if (viewerB) {
            viewerB.style.position = 'fixed';
            viewerB.style.borderRadius = '0';
            viewerB.style.left = '50vw';
            viewerB.style.width = '50vw';
            viewerB.style.height = '100vh';
            viewerB.style.top = '0'; 
            viewerB.style.right = 'auto';
            viewerB.style.bottom = 'auto';
            
            const headerBtns = viewerB.querySelectorAll('.viewer-header button');
            headerBtns.forEach(btn => btn.style.display = 'none');
            
            this.updateContentHeight(viewerB);
        }
        
        if (typeof notifications !== 'undefined') {
            notifications.show('🔗 Mode Split activé entre ' + viewerIdA + ' et ' + viewerIdB, 'success');
        }
    },

    // ============================================
    // Logique de Chargement et de Tri des Dossiers/Fichiers (Correction)
    // ============================================

    async loadFolderContent(viewerId, folderPath) {
        const viewer = document.getElementById(viewerId);
        if (!viewer) return;
        
        const content = viewer.querySelector('.viewer-content');
        
        try {
            // NOTE: API_BASE doit être défini ailleurs pour que cela fonctionne.
            const response = await fetch(`${API_BASE}/list?path=${encodeURIComponent(folderPath)}`);
            const data = await response.json();
            
            let items = [];
            if (data.items && Array.isArray(data.items)) {
                items = data.items;
            } else if (data.files && Array.isArray(data.files)) {
                items = data.files;
            } else if (data.folders && Array.isArray(data.folders)) {
                items = data.folders;
            } else if (Array.isArray(data)) {
                items = data;
            } else {
                console.error('Format de données inattendu:', data);
                throw new Error('Format de données invalide - Vérifiez la console');
            }
            
            // --- CORRECTION DU TRI ---
            const folders = items.filter(item => item.is_folder || item.isFolder || item.type === 'folder');
            const files = items.filter(item => !item.is_folder && !item.isFolder && item.type !== 'folder');
            
            // Tri alphabétique des dossiers et des fichiers séparément
            folders.sort((a, b) => (a.name || a.filename).localeCompare(b.name || b.filename));
            files.sort((a, b) => (a.name || a.filename).localeCompare(b.name || b.filename));

            const sortedItems = [...folders, ...files];
            // -------------------------

            let html = '<div class="folder-browser">';
            html += '<div class="folder-path" style="padding: 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">';
            html += '<i class="fas fa-folder mr-2"></i>' + folderPath;
            html += '</div>';
            html += '<div class="folder-items" style="overflow-y: auto; max-height: calc(100% - 45px); min-height: 200px; padding-bottom: 40px;">';
            
            // Élément de retour au dossier parent
            if (folderPath !== '/' && folderPath !== '') {
                const parentPath = folderPath.split('/').slice(0, -1).join('/') || '/';
                html += '<div class="folder-item" onclick="floatingViewer.loadFolderContent(\'' + viewerId + '\', \'' + parentPath + '\')" ';
                html += 'style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s;" ';
                html += 'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">';
                html += '<i class="fas fa-level-up-alt text-slate-400" style="width: 20px;"></i>';
                html += '<span style="font-size: 13px; color: #64748b;">..</span>';
                html += '</div>';
            }
            
            // Affichage des éléments triés
            sortedItems.forEach(item => {
                const isFolder = item.is_folder || item.isFolder || item.type === 'folder';
                const itemName = item.name || item.filename;
                let fullPath = folderPath === '/' ? '/' + itemName : folderPath + '/' + itemName;
                fullPath = fullPath.replace(/\/+/g, '/');
                
                if (isFolder) {
                    html += '<div class="folder-item" ';
                    html += 'draggable="true" ';
                    html += 'data-name="' + itemName + '" ';
                    html += 'data-path="' + fullPath + '" ';
                    html += 'data-is-folder="true" ';
                    html += 'onclick="floatingViewer.loadFolderContent(\'' + viewerId + '\', \'' + fullPath + '\')" ';
                    html += 'style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s;" ';
                    html += 'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">';
                    html += '<i class="fas fa-folder text-yellow-500" style="width: 20px;"></i>';
                    html += '<span style="font-size: 13px; color: #1e293b; flex: 1;">' + itemName + '</span>';
                    html += '<i class="fas fa-chevron-right text-slate-300" style="font-size: 10px;"></i>';
                    html += '</div>';
                } else {
                    const mimeType = item.mime_type || item.mimeType || item.type || '';
                    const fileSize = item.size || 0;
                    const icon = this.getFileIconForViewer(itemName);
                    
                    html += '<div class="folder-item" ';
                    html += 'draggable="true" ';
                    html += 'data-name="' + itemName + '" ';
                    html += 'data-path="' + fullPath + '" ';
                    html += 'data-is-folder="false" ';
                    html += 'onclick="floatingViewer.handleFileInViewer(\'' + itemName.replace(/'/g, "\\'") + '\', \'' + fullPath.replace(/'/g, "\\'") + '\', \'' + mimeType + '\')" ';
                    html += 'style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s;" ';
                    html += 'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">';
                    html += icon;
                    html += '<span style="font-size: 13px; color: #1e293b; flex: 1;">' + itemName + '</span>';
                    html += '<span style="font-size: 11px; color: #94a3b8;">' + this.formatSize(fileSize) + '</span>';
                    html += '</div>';
                }
            });
            
            html += '</div></div>';
            content.innerHTML = html;
            
            this.attachDragAndDropEvents(viewerId, folderPath);
            
            const headerSpan = viewer.querySelector('.viewer-header span');
            if (headerSpan) {
                const folderName = folderPath.split('/').pop() || 'Racine';
                headerSpan.textContent = folderName;
                headerSpan.title = folderPath;
            }
            
            const windowData = this.activeWindows.find(w => w.id === viewerId);
            if (windowData) {
                windowData.folderPath = folderPath;
            }
            
        } catch (error) {
            console.error('Erreur de chargement du dossier:', error);
            console.error('Chemin du dossier:', folderPath);
            content.innerHTML = '<div style="padding: 20px; text-align: center; color: #dc2626;">';
            content.innerHTML += '<i class="fas fa-exclamation-triangle text-3xl mb-3"></i>';
            content.innerHTML += '<p style="font-weight: 600;">Erreur de chargement</p>';
            content.innerHTML += '<p style="font-size: 12px; color: #64748b; margin-top: 8px;">' + error.message + '</p>';
            content.innerHTML += '<p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Chemin: ' + folderPath + '</p>';
            content.innerHTML += '<button onclick="floatingViewer.loadFolderContent(\'' + viewerId + '\', \'' + folderPath + '\')" ';
            content.innerHTML += 'style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">';
            content.innerHTML += '<i class="fas fa-redo mr-2"></i>Réessayer</button>';
            content.innerHTML += '</div>';
        }
    },

    handleFileInViewer(filename, path, mimeType) {
        if (typeof contextMenu !== 'undefined') {
            contextMenu.hide();
        }
        
        const cleanPath = path.startsWith('//') ? path.substring(1) : path;
        
        if (typeof fileActions !== 'undefined') {
            fileActions.handleFileClick(filename, cleanPath, mimeType, 0);
        }
    },
    
    getFileIconForViewer(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'png': 'fas fa-file-image text-indigo-500', 'jpg': 'fas fa-file-image text-indigo-500', 'jpeg': 'fas fa-file-image text-indigo-500',
            'gif': 'fas fa-file-image text-indigo-500', 'svg': 'fas fa-file-image text-indigo-500', 'webp': 'fas fa-file-image text-indigo-500',
            'mp4': 'fas fa-file-video text-purple-500', 'mov': 'fas fa-file-video text-purple-500', 'avi': 'fas fa-file-video text-purple-500',
            'mp3': 'fas fa-file-audio text-pink-500', 'wav': 'fas fa-file-audio text-pink-500', 'pdf': 'fas fa-file-pdf text-red-500',
            'doc': 'fas fa-file-word text-blue-500', 'docx': 'fas fa-file-word text-blue-500', 'xls': 'fas fa-file-excel text-green-500',
            'xlsx': 'fas fa-file-excel text-green-500', 'txt': 'fas fa-file-alt text-slate-400', 'js': 'fas fa-file-code text-yellow-500',
            'py': 'fas fa-file-code text-green-500', 'html': 'fas fa-file-code text-orange-500', 'css': 'fas fa-file-code text-blue-500',
            'zip': 'fas fa-file-archive text-slate-500', 'rar': 'fas fa-file-archive text-slate-500'
        };
        
        const iconClass = iconMap[extension] || 'fas fa-file text-slate-400';
        return '<i class="' + iconClass + '" style="width: 20px;"></i>';
    },
    
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    },
    
    handleScreenResize() {
        this.isMobile = window.innerWidth <= 768;
        
        this.activeWindows.forEach(win => {
            const element = win.element;
            
            // Réajustement des fenêtres en mode Split
            if (this.linkedResizePair) {
                const viewerA = document.getElementById(this.linkedResizePair.idA);
                const viewerB = document.getElementById(this.linkedResizePair.idB);
                
                if (viewerA && viewerB) {
                    const totalWidth = window.innerWidth;
                    
                    viewerA.style.height = '100vh'; 
                    viewerB.style.height = '100vh'; 
                    
                    const currentWidthA = parseFloat(viewerA.style.width);
                    const ratio = currentWidthA / (window.innerWidth / 100) / 100;
                    
                    let newWidthA = totalWidth / 2;
                    
                    if (!isNaN(currentWidthA) && currentWidthA > 100 && currentWidthA < totalWidth - 100) {
                        newWidthA = totalWidth * ratio;
                    }
                    
                    const newWidthB = totalWidth - newWidthA;

                    viewerA.style.width = newWidthA + 'px';
                    viewerB.style.width = newWidthB + 'px';
                    viewerB.style.left = newWidthA + 'px';
                    
                    this.updateContentHeight(viewerA);
                    this.updateContentHeight(viewerB);
                }
            } else {
                // Ajustement des fenêtres flottantes normales
                const rect = element.getBoundingClientRect();

                if (rect.right > window.innerWidth) {
                    element.style.left = Math.max(10, window.innerWidth - rect.width - 10) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    element.style.top = Math.max(10, window.innerHeight - rect.height - 10) + 'px';
                }
                
                if (this.isMobile) {
                    element.style.width = (window.innerWidth - 20) + 'px';
                    element.style.left = '10px';
                    element.style.right = '10px';
                }
            }
            this.updateContentHeight(win.element);
        });
    },

    // ============================================
    // Logique de Drag & Drop pour les fichiers/dossiers (inchangée)
    // ...
    // ============================================

    attachDragAndDropEvents(viewerId, currentFolderPath) {
        const viewer = document.getElementById(viewerId);
        if (!viewer) return;
        
        const items = viewer.querySelectorAll('.folder-item[draggable="true"]');
        const folderItems = viewer.querySelectorAll('.folder-item[data-is-folder="true"]');
        const folderItemsContainer = viewer.querySelector('.folder-items');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                const name = item.getAttribute('data-name');
                const path = item.getAttribute('data-path');
                const isFolder = item.getAttribute('data-is-folder') === 'true';
                
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    name: name,
                    path: path,
                    isFolder: isFolder
                }));
                
                item.style.opacity = '0.5';
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                e.stopPropagation();
                item.style.opacity = '1';
                item.classList.remove('dragging');
            });
        });
        
        folderItems.forEach(folderItem => {
            folderItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                
                if (!folderItem.classList.contains('dragging')) {
                    folderItem.style.background = '#dbeafe';
                    folderItem.style.borderLeft = '3px solid #3b82f6';
                }
            });
            
            folderItem.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                folderItem.style.background = 'white';
                folderItem.style.borderLeft = 'none';
            });
            
            folderItem.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                folderItem.style.background = 'white';
                folderItem.style.borderLeft = 'none';
                
                const data = e.dataTransfer.getData('text/plain');
                if (!data) return;
                
                const draggedItem = JSON.parse(data);
                const targetPath = folderItem.getAttribute('data-path');
                
                this.moveItemToFolder(viewerId, draggedItem, targetPath);
            });
        });
        
        if (folderItemsContainer) {
            folderItemsContainer.addEventListener('dragover', (e) => {
                const isOverFolderItem = e.target.closest('.folder-item[data-is-folder="true"]');
                
                if (!isOverFolderItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    
                    folderItemsContainer.style.background = '#eff6ff';
                    folderItemsContainer.style.outline = '2px dashed #3b82f6';
                }
            });
            
            folderItemsContainer.addEventListener('dragleave', (e) => {
                if (!folderItemsContainer.contains(e.relatedTarget)) {
                    folderItemsContainer.style.background = '';
                    folderItemsContainer.style.outline = '';
                }
            });
            
            folderItemsContainer.addEventListener('drop', (e) => {
                const isOverFolderItem = e.target.closest('.folder-item[data-is-folder="true"]');
                
                if (!isOverFolderItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    folderItemsContainer.style.background = '';
                    folderItemsContainer.style.outline = '';
                    
                    const data = e.dataTransfer.getData('text/plain');
                    if (!data) return;
                    
                    const draggedItem = JSON.parse(data);
                    
                    this.moveItemToFolder(viewerId, draggedItem, currentFolderPath);
                }
            });
        }
        
        const viewerContent = viewer.querySelector('.viewer-content');
        if (viewerContent) {
            viewerContent.addEventListener('dragover', (e) => {
                const isOverFolderItem = e.target.closest('.folder-item[data-is-folder="true"]');
                
                if (!isOverFolderItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                }
            });
            
            viewerContent.addEventListener('drop', (e) => {
                const isOverFolderItem = e.target.closest('.folder-item[data-is-folder="true"]');
                
                if (!isOverFolderItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const data = e.dataTransfer.getData('text/plain');
                    if (!data) return;
                    
                    const draggedItem = JSON.parse(data);
                    
                    this.moveItemToFolder(viewerId, draggedItem, currentFolderPath);
                }
            });
        }
    },
    
    async moveItemToFolder(viewerId, item, targetFolderPath) {
        const itemParentPath = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
        
        if (itemParentPath === targetFolderPath) {
            if (typeof notifications !== 'undefined') {
                notifications.show('ℹ️ Le fichier est déjà dans ce dossier', 'info');
            }
            return;
        }
        
        if (item.isFolder && targetFolderPath.startsWith(item.path)) {
            if (typeof notifications !== 'undefined') {
                notifications.show('⚠️ Impossible de déplacer un dossier dans lui-même', 'warning');
            }
            return;
        }
        
        if (typeof notifications !== 'undefined') {
            notifications.show(`🔄 Déplacement de "${item.name}" vers "${targetFolderPath}"...`, 'info');
        }
        
        try {
            const response = await fetch(API_BASE + '/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_path: item.path,
                    destination_folder: targetFolderPath
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                if (typeof notifications !== 'undefined') {
                    notifications.show(`✅ "${item.name}" déplacé avec succès`, 'success');
                }
                
                const windowData = this.activeWindows.find(w => w.id === viewerId);
                if (windowData && windowData.folderPath) {
                    this.loadFolderContent(viewerId, windowData.folderPath);
                }
                
                // Rafraîchir les autres fenêtres si elles affichent les dossiers concernés
                this.activeWindows.forEach(win => {
                    if (win.type === 'folder' && win.id !== viewerId) {
                        if (win.folderPath === itemParentPath || win.folderPath === targetFolderPath) {
                            this.loadFolderContent(win.id, win.folderPath);
                        }
                    }
                });
                
            } else {
                throw new Error(result.error || 'Erreur lors du déplacement');
            }
            
        } catch (error) {
            console.error('Erreur de déplacement:', error);
            if (typeof notifications !== 'undefined') {
                notifications.show(`❌ Échec du déplacement: ${error.message}`, 'error');
            }
        }
    }
});

// ============================================
// Écouteurs d'événements (Garantissent la définition de floatingViewer)
// ============================================

window.addEventListener('resize', () => {
    floatingViewer.handleScreenResize();
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        floatingViewer.handleScreenResize();
    }, 100);
});