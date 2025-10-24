// ============================================
// floatingViewer.js - Visualiseur flottant pour images et audio
// ============================================

const floatingViewer = {
    activeWindows: [],
    nextZIndex: 1000,
    isMobile: window.innerWidth <= 768,
    
    createImageViewer(filename, imageUrl, asPopup = false) {
        const viewerId = 'viewer-' + Date.now();
        const isMobile = this.isMobile;
        
        if (asPopup && !isMobile) {
            return this.createPopupWindow(filename, imageUrl, 'image');
        }
        
        const viewer = document.createElement('div');
        viewer.id = viewerId;
        viewer.className = 'floating-viewer floating-image-viewer';
        
        const initialWidth = isMobile ? (window.innerWidth - 20) : 400;
        const initialHeight = isMobile ? (window.innerHeight * 0.6) : 500;
        
        viewer.style.top = isMobile ? '10px' : '80px';
        viewer.style.left = isMobile ? '10px' : 'auto';
        viewer.style.right = isMobile ? '10px' : '20px';
        viewer.style.width = initialWidth + 'px';
        viewer.style.height = initialHeight + 'px';
        viewer.style.zIndex = this.nextZIndex++;
        
        viewer.innerHTML = `
            <div class="viewer-header viewer-header-image">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-image"></i>
                    <span title="${filename}">${filename}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); floatingViewer.openAsPopup('${viewerId}', '${filename}', '${imageUrl}', 'image')" 
                            class="popup-btn" title="Ouvrir dans une nouvelle fenêtre">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.toggleFullscreen('${viewerId}')" 
                            class="fullscreen-btn" title="Plein écran">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.minimizeWindow('${viewerId}')" 
                            class="minimize-btn" title="Réduire">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.closeWindow('${viewerId}')" title="Fermer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="viewer-content viewer-content-image">
                <img src="${imageUrl}" alt="${filename}" onclick="floatingViewer.toggleImageZoom(this)">
            </div>
            <div class="viewer-footer">
                <button onclick="event.stopPropagation(); floatingViewer.downloadFromViewer('${imageUrl}', '${filename}')" class="download-btn">
                    <i class="fas fa-download"></i>
                    <span>Télécharger</span>
                </button>
                <button onclick="event.stopPropagation(); floatingViewer.toggleMagnetic('${viewerId}')" class="magnetic-btn" title="Aimantation activée">
                    <i class="fas fa-magnet"></i>
                    <span class="magnetic-status">ON</span>
                </button>
            </div>
            <div class="resize-handle">
                <i class="fas fa-expand-alt"></i>
            </div>
        `;
        
        document.body.appendChild(viewer);
        this.makeDraggable(viewer);
        this.makeResizable(viewer);
        this.makeClickToFront(viewer);
        this.activeWindows.push({ id: viewerId, type: 'image', element: viewer, magnetic: true });
        
        if (!isMobile) {
            this.cascadeWindow(viewer);
        }
        
        return viewerId;
    },
    
    createAudioPlayer(filename, audioUrl, asPopup = false) {
        const playerId = 'player-' + Date.now();
        const isMobile = this.isMobile;
        
        if (asPopup && !isMobile) {
            return this.createPopupWindow(filename, audioUrl, 'audio');
        }
        
        const player = document.createElement('div');
        player.id = playerId;
        player.className = 'floating-viewer floating-audio-player';
        
        const initialWidth = isMobile ? (window.innerWidth - 20) : 350;
        
        player.style.bottom = isMobile ? '80px' : '20px';
        player.style.left = isMobile ? '10px' : 'auto';
        player.style.right = isMobile ? '10px' : '20px';
        player.style.width = initialWidth + 'px';
        player.style.zIndex = this.nextZIndex++;
        
        player.innerHTML = `
            <div class="viewer-header viewer-header-audio">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-music"></i>
                    <span title="${filename}">${filename}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); floatingViewer.openAsPopup('${playerId}', '${filename}', '${audioUrl}', 'audio')" 
                            class="popup-btn" title="Ouvrir dans une nouvelle fenêtre">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.toggleFullscreen('${playerId}')" 
                            class="fullscreen-btn" title="Plein écran">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.minimizeWindow('${playerId}')" 
                            class="minimize-btn" title="Réduire">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.closeWindow('${playerId}')" title="Fermer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="viewer-content viewer-content-audio">
                <audio id="${playerId}-audio" controls autoplay>
                    <source src="${audioUrl}" type="audio/mpeg">
                    Votre navigateur ne supporte pas la lecture audio.
                </audio>
            </div>
            <div class="viewer-footer">
                <button onclick="event.stopPropagation(); floatingViewer.downloadFromViewer('${audioUrl}', '${filename}')" class="download-btn">
                    <i class="fas fa-download"></i>
                    <span>Télécharger</span>
                </button>
                <button onclick="event.stopPropagation(); floatingViewer.toggleMagnetic('${playerId}')" class="magnetic-btn" title="Aimantation activée">
                    <i class="fas fa-magnet"></i>
                    <span class="magnetic-status">ON</span>
                </button>
            </div>
            <div class="resize-handle-horizontal">
                <i class="fas fa-arrows-alt-h"></i>
            </div>
        `;
        
        document.body.appendChild(player);
        this.makeDraggable(player);
        this.makeResizable(player);
        this.makeClickToFront(player);
        this.activeWindows.push({ id: playerId, type: 'audio', element: player, magnetic: true });
        
        if (!isMobile) {
            this.cascadeWindow(player);
        }
        
        return playerId;
    },
    
    createFolderViewer(folderName, folderPath) {
        const viewerId = 'folder-viewer-' + Date.now();
        const isMobile = this.isMobile;
        
        const viewer = document.createElement('div');
        viewer.id = viewerId;
        viewer.className = 'floating-viewer floating-folder-viewer';
        
        const initialWidth = isMobile ? (window.innerWidth - 20) : 600;
        const initialHeight = isMobile ? (window.innerHeight * 0.7) : 500;
        
        viewer.style.top = isMobile ? '10px' : '60px';
        viewer.style.left = isMobile ? '10px' : 'auto';
        viewer.style.right = isMobile ? '10px' : '40px';
        viewer.style.width = initialWidth + 'px';
        viewer.style.height = initialHeight + 'px';
        viewer.style.zIndex = this.nextZIndex++;
        
        viewer.innerHTML = `
            <div class="viewer-header viewer-header-folder">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-folder-open"></i>
                    <span title="${folderName}">${folderName}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); floatingViewer.openFolderAsPopup('${viewerId}', '${folderPath}', '${folderName}')" 
                            class="popup-btn" title="Ouvrir dans une nouvelle fenêtre">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.toggleFullscreen('${viewerId}')" 
                            class="fullscreen-btn" title="Plein écran">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.minimizeWindow('${viewerId}')" 
                            class="minimize-btn" title="Réduire">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.closeWindow('${viewerId}')" title="Fermer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="viewer-content viewer-content-folder">
                <div class="folder-loading">
                    <i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i>
                    <p class="text-sm text-slate-600 mt-2">Chargement du dossier...</p>
                </div>
            </div>
            <div class="resize-handle">
                <i class="fas fa-expand-alt"></i>
            </div>
        `;
        
        document.body.appendChild(viewer);
        this.makeDraggable(viewer);
        this.makeResizable(viewer);
        this.makeClickToFront(viewer);
        this.activeWindows.push({ 
            id: viewerId, 
            type: 'folder', 
            element: viewer, 
            magnetic: true,
            folderPath: folderPath 
        });
        
        if (!isMobile) {
            this.cascadeWindow(viewer);
        }
        
        this.loadFolderContent(viewerId, folderPath);
        
        return viewerId;
    },
    
    async loadFolderContent(viewerId, folderPath) {
        const viewer = document.getElementById(viewerId);
        if (!viewer) return;
        
        const content = viewer.querySelector('.viewer-content');
        
        try {
            const response = await fetch(`${API_BASE}/list?path=${encodeURIComponent(folderPath)}`);
            const data = await response.json();
            
            console.log('API Response:', data);
            console.log('Folder Path:', folderPath);
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur de chargement');
            }
            
            // Vérifier différents formats possibles
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
            
            let html = '<div class="folder-browser">';
            html += '<div class="folder-path" style="padding: 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">';
            html += '<i class="fas fa-folder mr-2"></i>' + folderPath;
            html += '</div>';
            html += '<div class="folder-items" style="overflow-y: auto; max-height: calc(100% - 45px); min-height: 200px; padding-bottom: 40px;">';
            
            if (folderPath !== '/' && folderPath !== '') {
                const parentPath = folderPath.split('/').slice(0, -1).join('/') || '/';
                html += '<div class="folder-item" onclick="floatingViewer.loadFolderContent(\'' + viewerId + '\', \'' + parentPath + '\')" ';
                html += 'style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s;" ';
                html += 'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">';
                html += '<i class="fas fa-level-up-alt text-slate-400" style="width: 20px;"></i>';
                html += '<span style="font-size: 13px; color: #64748b;">..</span>';
                html += '</div>';
            }
            
            const folders = items.filter(item => item.is_folder || item.isFolder || item.type === 'folder');
            const files = items.filter(item => !item.is_folder && !item.isFolder && item.type !== 'folder');
            
            folders.forEach(folder => {
                const folderName = folder.name || folder.filename;
                let fullPath = folderPath === '/' ? '/' + folderName : folderPath + '/' + folderName;
                // Nettoyer les doubles slashes
                fullPath = fullPath.replace(/\/+/g, '/');
                
                html += '<div class="folder-item" ';
                html += 'draggable="true" ';
                html += 'data-name="' + folderName + '" ';
                html += 'data-path="' + fullPath + '" ';
                html += 'data-is-folder="true" ';
                html += 'onclick="floatingViewer.loadFolderContent(\'' + viewerId + '\', \'' + fullPath + '\')" ';
                html += 'style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s;" ';
                html += 'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">';
                html += '<i class="fas fa-folder text-yellow-500" style="width: 20px;"></i>';
                html += '<span style="font-size: 13px; color: #1e293b; flex: 1;">' + folderName + '</span>';
                html += '<i class="fas fa-chevron-right text-slate-300" style="font-size: 10px;"></i>';
                html += '</div>';
            });
            
            files.forEach(file => {
                const fileName = file.name || file.filename;
                let fullPath = folderPath === '/' ? '/' + fileName : folderPath + '/' + fileName;
                // Nettoyer les doubles slashes
                fullPath = fullPath.replace(/\/+/g, '/');
                
                const mimeType = file.mime_type || file.mimeType || file.type || '';
                const fileSize = file.size || 0;
                const icon = this.getFileIconForViewer(fileName);
                
                html += '<div class="folder-item" ';
                html += 'draggable="true" ';
                html += 'data-name="' + fileName + '" ';
                html += 'data-path="' + fullPath + '" ';
                html += 'data-is-folder="false" ';
                html += 'onclick="floatingViewer.handleFileInViewer(\'' + fileName.replace(/'/g, "\\'") + '\', \'' + fullPath.replace(/'/g, "\\'") + '\', \'' + mimeType + '\')" ';
                html += 'style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s;" ';
                html += 'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">';
                html += icon;
                html += '<span style="font-size: 13px; color: #1e293b; flex: 1;">' + fileName + '</span>';
                html += '<span style="font-size: 11px; color: #94a3b8;">' + this.formatSize(fileSize) + '</span>';
                html += '</div>';
            });
            
            html += '</div></div>';
            content.innerHTML = html;
            
            // Attacher les événements de drag & drop
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
        
        // Nettoyer le chemin - enlever le slash initial en double si présent
        const cleanPath = path.startsWith('//') ? path.substring(1) : path;
        
        console.log('Opening file from viewer:', {
            filename: filename,
            path: cleanPath,
            mimeType: mimeType
        });
        
        if (typeof fileActions !== 'undefined') {
            fileActions.handleFileClick(filename, cleanPath, mimeType, 0);
        }
    },
    
    getFileIconForViewer(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'png': 'fas fa-file-image text-indigo-500',
            'jpg': 'fas fa-file-image text-indigo-500',
            'jpeg': 'fas fa-file-image text-indigo-500',
            'gif': 'fas fa-file-image text-indigo-500',
            'svg': 'fas fa-file-image text-indigo-500',
            'webp': 'fas fa-file-image text-indigo-500',
            'mp4': 'fas fa-file-video text-purple-500',
            'mov': 'fas fa-file-video text-purple-500',
            'avi': 'fas fa-file-video text-purple-500',
            'mp3': 'fas fa-file-audio text-pink-500',
            'wav': 'fas fa-file-audio text-pink-500',
            'pdf': 'fas fa-file-pdf text-red-500',
            'doc': 'fas fa-file-word text-blue-500',
            'docx': 'fas fa-file-word text-blue-500',
            'xls': 'fas fa-file-excel text-green-500',
            'xlsx': 'fas fa-file-excel text-green-500',
            'txt': 'fas fa-file-alt text-slate-400',
            'js': 'fas fa-file-code text-yellow-500',
            'py': 'fas fa-file-code text-green-500',
            'html': 'fas fa-file-code text-orange-500',
            'css': 'fas fa-file-code text-blue-500',
            'zip': 'fas fa-file-archive text-slate-500',
            'rar': 'fas fa-file-archive text-slate-500'
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
    
    makeDraggable(element) {
        const header = element.querySelector('.viewer-header');
        let isDragging = false;
        let currentX, currentY, initialX, initialY;
        
        const startDrag = (clientX, clientY) => {
            isDragging = true;
            const rect = element.getBoundingClientRect();
            initialX = clientX - rect.left;
            initialY = clientY - rect.top;
            element.style.transition = 'none';
            this.bringToFront(element);
        };
        
        const handleDrag = (clientX, clientY) => {
            if (!isDragging) return;
            
            currentX = clientX - initialX;
            currentY = clientY - initialY;
            
            element.style.left = currentX + 'px';
            element.style.top = currentY + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        };
        
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
                const window = this.activeWindows.find(w => w.element === element);
                if (window && window.magnetic) {
                    this.snapToEdges(element);
                }
            }
        };
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') return;
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            handleDrag(e.clientX, e.clientY);
        });
        
        document.addEventListener('mouseup', endDrag);
        
        header.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') return;
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            handleDrag(touch.clientX, touch.clientY);
        }, { passive: true });
        
        document.addEventListener('touchend', endDrag);
    },
    
    makeResizable(element) {
        const handle = element.querySelector('.resize-handle, .resize-handle-horizontal');
        if (!handle) return;
        
        const isImage = element.classList.contains('floating-image-viewer');
        const isHorizontalOnly = handle.classList.contains('resize-handle-horizontal');
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        const startResize = (clientX, clientY) => {
            isResizing = true;
            startX = clientX;
            startY = clientY;
            const rect = element.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
            element.style.transition = 'none';
        };
        
        const handleResize = (clientX, clientY) => {
            if (!isResizing) return;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            const newWidth = Math.max(250, startWidth + deltaX);
            element.style.width = newWidth + 'px';
            
            if (isImage && !isHorizontalOnly) {
                const newHeight = Math.max(250, startHeight + deltaY);
                element.style.height = newHeight + 'px';
                
                const content = element.querySelector('.viewer-content');
                if (content) {
                    content.style.height = 'calc(' + newHeight + 'px - 110px)';
                }
            }
        };
        
        const endResize = () => {
            if (isResizing) {
                isResizing = false;
                element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        };
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startResize(e.clientX, e.clientY);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            e.preventDefault();
            handleResize(e.clientX, e.clientY);
        });
        
        document.addEventListener('mouseup', endResize);
        
        handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            startResize(touch.clientX, touch.clientY);
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            const touch = e.touches[0];
            handleResize(touch.clientX, touch.clientY);
        }, { passive: true });
        
        document.addEventListener('touchend', endResize);
    },
    
    snapToEdges(element) {
        const rect = element.getBoundingClientRect();
        const snapDistance = 60;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isMobile = this.isMobile;
        
        let newLeft = rect.left;
        let newTop = rect.top;
        let newWidth = rect.width;
        let newHeight = rect.height;
        
        const distanceLeft = rect.left;
        const distanceRight = screenWidth - rect.right;
        const distanceTop = rect.top;
        const distanceBottom = screenHeight - rect.bottom;
        
        const minDistance = Math.min(distanceLeft, distanceRight, distanceTop, distanceBottom);
        
        if (minDistance < snapDistance) {
            const margin = 10;
            
            if (minDistance === distanceLeft) {
                newLeft = margin;
                newWidth = isMobile ? (screenWidth - 2 * margin) : Math.min(screenWidth * 0.45, 600);
                newTop = Math.max(margin, Math.min(rect.top, screenHeight - rect.height - margin));
                if (element.classList.contains('floating-image-viewer')) {
                    newHeight = isMobile ? (screenHeight * 0.7) : Math.min(screenHeight - newTop - margin, 800);
                }
            }
            else if (minDistance === distanceRight) {
                newWidth = isMobile ? (screenWidth - 2 * margin) : Math.min(screenWidth * 0.45, 600);
                newLeft = screenWidth - newWidth - margin;
                newTop = Math.max(margin, Math.min(rect.top, screenHeight - rect.height - margin));
                if (element.classList.contains('floating-image-viewer')) {
                    newHeight = isMobile ? (screenHeight * 0.7) : Math.min(screenHeight - newTop - margin, 800);
                }
            }
            else if (minDistance === distanceTop) {
                newTop = margin;
                newHeight = isMobile ? (screenHeight * 0.7) : Math.min(screenHeight * 0.6, 700);
                newLeft = Math.max(margin, Math.min(rect.left, screenWidth - rect.width - margin));
                if (isMobile) {
                    newWidth = screenWidth - 2 * margin;
                }
            }
            else if (minDistance === distanceBottom) {
                newHeight = isMobile ? (screenHeight * 0.5) : Math.min(screenHeight * 0.5, 600);
                newTop = screenHeight - newHeight - margin;
                newLeft = Math.max(margin, Math.min(rect.left, screenWidth - rect.width - margin));
                if (isMobile) {
                    newWidth = screenWidth - 2 * margin;
                    newTop = Math.max(margin, newTop);
                }
            }
            
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.width = newWidth + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
            
            if (element.classList.contains('floating-image-viewer')) {
                element.style.height = newHeight + 'px';
                const content = element.querySelector('.viewer-content');
                if (content) {
                    content.style.height = 'calc(' + newHeight + 'px - 110px)';
                }
            }
            
            element.style.transform = 'scale(1.02)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
            
            if (typeof notifications !== 'undefined') {
                const edges = ['gauche', 'droite', 'haut', 'bas'];
                const edgeNames = [distanceLeft, distanceRight, distanceTop, distanceBottom];
                const edgeName = edges[edgeNames.indexOf(minDistance)];
                notifications.show('🧲 Collé au bord ' + edgeName, 'success');
            }
        }
    },
    
    makeClickToFront(element) {
        element.addEventListener('mousedown', () => {
            this.bringToFront(element);
        });
        element.addEventListener('touchstart', () => {
            this.bringToFront(element);
        }, { passive: true });
    },
    
    bringToFront(element) {
        element.style.zIndex = this.nextZIndex++;
    },
    
    cascadeWindow(element) {
        const count = this.activeWindows.length;
        if (count > 1) {
            const offset = ((count - 1) * 30) % 150;
            const currentTop = parseInt(element.style.top) || 80;
            const currentRight = parseInt(element.style.right) || 20;
            
            element.style.top = (currentTop + offset) + 'px';
            element.style.right = (currentRight + offset) + 'px';
        }
    },
    
    minimizeWindow(viewerId) {
        const window = this.activeWindows.find(w => w.id === viewerId);
        if (!window) return;
        
        const element = window.element;
        const content = element.querySelector('.viewer-content');
        const footer = element.querySelector('.viewer-footer');
        const resizeHandle = element.querySelector('.resize-handle, .resize-handle-horizontal');
        const minimizeBtn = element.querySelector('.minimize-btn');
        const icon = minimizeBtn ? minimizeBtn.querySelector('i') : null;
        
        if (window.minimized) {
            if (content) content.style.display = window.type === 'image' ? 'flex' : 'block';
            if (footer) footer.style.display = 'flex';
            if (resizeHandle) resizeHandle.style.display = 'block';
            
            if (window.savedDimensions) {
                element.style.width = window.savedDimensions.width;
                element.style.height = window.savedDimensions.height;
                element.style.minHeight = window.savedDimensions.minHeight || 'auto';
                
                if (window.type === 'image' && content) {
                    content.style.height = window.savedDimensions.contentHeight;
                }
            } else {
                element.style.height = 'auto';
                element.style.minHeight = '200px';
            }
            
            if (icon) {
                icon.classList.remove('fa-window-maximize');
                icon.classList.add('fa-minus');
            }
            if (minimizeBtn) minimizeBtn.title = 'Réduire';
            
            window.minimized = false;
            delete window.savedDimensions;
            
        } else {
            const rect = element.getBoundingClientRect();
            window.savedDimensions = {
                width: element.style.width || rect.width + 'px',
                height: element.style.height || rect.height + 'px',
                minHeight: element.style.minHeight,
                contentHeight: content ? content.style.height : 'auto'
            };
            
            if (content) content.style.display = 'none';
            if (footer) footer.style.display = 'none';
            if (resizeHandle) resizeHandle.style.display = 'none';
            
            element.style.height = 'auto';
            element.style.minHeight = 'auto';
            element.offsetHeight;
            
            if (icon) {
                icon.classList.remove('fa-minus');
                icon.classList.add('fa-window-maximize');
            }
            if (minimizeBtn) minimizeBtn.title = 'Restaurer';
            
            window.minimized = true;
        }
        
        element.style.transform = 'scale(0.98)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 100);
    },
    
    closeWindow(viewerId) {
        const index = this.activeWindows.findIndex(w => w.id === viewerId);
        if (index === -1) return;
        
        const window = this.activeWindows[index];
        
        if (window.type === 'audio') {
            const audio = window.element.querySelector('audio');
            if (audio) {
                audio.pause();
                audio.src = '';
            }
        }
        
        window.element.style.transform = 'scale(0.8)';
        window.element.style.opacity = '0';
        
        setTimeout(() => {
            window.element.remove();
            this.activeWindows.splice(index, 1);
        }, 200);
    },
    
    toggleImageZoom(img) {
        const container = img.parentElement;
        
        if (img.style.maxWidth === '100%' || !img.dataset.zoomed) {
            img.dataset.zoomed = 'true';
            img.style.maxWidth = 'none';
            img.style.maxHeight = 'none';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.cursor = 'zoom-out';
            container.style.overflow = 'auto';
            container.style.alignItems = 'flex-start';
            container.style.justifyContent = 'flex-start';
        } else {
            delete img.dataset.zoomed;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.cursor = 'zoom-in';
            container.style.overflow = 'auto';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
        }
    },
    
    toggleMagnetic(viewerId) {
        const window = this.activeWindows.find(w => w.id === viewerId);
        if (!window) return;
        
        window.magnetic = !window.magnetic;
        
        const button = window.element.querySelector('.magnetic-btn');
        const statusSpan = button.querySelector('.magnetic-status');
        
        if (window.magnetic) {
            button.classList.remove('inactive');
            button.title = 'Aimantation activée';
            if (statusSpan) statusSpan.textContent = 'ON';
        } else {
            button.classList.add('inactive');
            button.title = 'Aimantation désactivée';
            if (statusSpan) statusSpan.textContent = 'OFF';
        }
        
        if (typeof notifications !== 'undefined') {
            notifications.show(
                window.magnetic ? '🧲 Aimantation activée' : 'Aimantation désactivée', 
                window.magnetic ? 'success' : 'info'
            );
        }
    },
    
    toggleFullscreen(viewerId) {
        const window = this.activeWindows.find(w => w.id === viewerId);
        if (!window) return;
        
        const element = window.element;
        const fullscreenBtn = element.querySelector('.fullscreen-btn');
        const icon = fullscreenBtn.querySelector('i');
        
        if (window.fullscreen) {
            element.style.position = 'fixed';
            element.style.left = window.savedPosition.left;
            element.style.top = window.savedPosition.top;
            element.style.width = window.savedPosition.width;
            element.style.height = window.savedPosition.height;
            element.style.borderRadius = '12px';
            
            if (window.type === 'image') {
                const content = element.querySelector('.viewer-content');
                content.style.height = 'calc(' + window.savedPosition.height + ' - 110px)';
            }
            
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
            fullscreenBtn.title = 'Plein écran';
            window.fullscreen = false;
        } else {
            window.savedPosition = {
                left: element.style.left,
                top: element.style.top,
                width: element.style.width,
                height: element.style.height
            };
            
            element.style.left = '0';
            element.style.top = '0';
            element.style.width = '100vw';
            element.style.height = '100vh';
            element.style.borderRadius = '0';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
            
            if (window.type === 'image') {
                const content = element.querySelector('.viewer-content');
                content.style.height = 'calc(100vh - 110px)';
            }
            
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
            fullscreenBtn.title = 'Quitter le plein écran';
            window.fullscreen = true;
            
            this.bringToFront(element);
        }
    },
    
    downloadFromViewer(url, filename) {
        const downloadUrl = url.replace('/view', '/download');
        window.open(downloadUrl, '_blank');
        
        if (typeof notifications !== 'undefined') {
            notifications.show('📥 Téléchargement de ' + filename + ' initié', 'info');
        }
    },
    
    closeAll() {
        [...this.activeWindows].forEach(window => {
            this.closeWindow(window.id);
        });
    },
    
    handleScreenResize() {
        this.isMobile = window.innerWidth <= 768;
        
        this.activeWindows.forEach(win => {
            const element = win.element;
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
        });
    },
    
    createPopupWindow(filename, url, type) {
        const width = type === 'image' ? 800 : 400;
        const height = type === 'image' ? 600 : 200;
        
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        const features = 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no';
        
        const popup = window.open('', 'viewer_' + Date.now(), features);
        
        if (!popup) {
            if (typeof notifications !== 'undefined') {
                notifications.show('⚠️ Les popups sont bloquées. Autorisez-les pour ce site.', 'warning');
            }
            return null;
        }
        
        const headerBg = type === 'image' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        const iconName = type === 'image' ? 'image' : 'music';
        const contentHtml = type === 'image' 
            ? '<img src="' + url + '" alt="' + filename + '">' 
            : '<audio controls autoplay><source src="' + url + '" type="audio/mpeg">Votre navigateur ne supporte pas la lecture audio.</audio>';
        
        popup.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + filename + '</title>');
        popup.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">');
        popup.document.write('<style>* { margin: 0; padding: 0; box-sizing: border-box; }');
        popup.document.write('body { font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }');
        popup.document.write('.header { background: ' + headerBg + '; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }');
        popup.document.write('.header-title { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; }');
        popup.document.write('.content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: auto; background: white; }');
        popup.document.write('.content img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; }');
        popup.document.write('.content audio { width: 100%; max-width: 500px; }');
        popup.document.write('.footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 12px; }');
        popup.document.write('button { padding: 8px 16px; border: none; border-radius: 6px; background: #3b82f6; color: white; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }');
        popup.document.write('button:hover { background: #2563eb; transform: translateY(-1px); }');
        popup.document.write('button:active { transform: translateY(0); }');
        popup.document.write('</style></head><body>');
        popup.document.write('<div class="header"><div class="header-title"><i class="fas fa-' + iconName + '"></i><span>' + filename + '</span></div></div>');
        popup.document.write('<div class="content">' + contentHtml + '</div>');
        popup.document.write('<div class="footer">');
        popup.document.write('<button onclick="window.open(\'' + url.replace('/view', '/download') + '\', \'_blank\')"><i class="fas fa-download"></i>Télécharger</button>');
        popup.document.write('<button onclick="window.close()"><i class="fas fa-times"></i>Fermer</button>');
        popup.document.write('</div></body></html>');
        
        popup.document.close();
        
        if (typeof notifications !== 'undefined') {
            notifications.show('🪟 ' + filename + ' ouvert dans une nouvelle fenêtre', 'success');
        }
        
        return popup;
    },
    
    openAsPopup(viewerId, filename, url, type) {
        const popup = this.createPopupWindow(filename, url, type);
        
        if (popup) {
            this.closeWindow(viewerId);
        }
    },
    
    openFolderAsPopup(viewerId, folderPath, folderName) {
        const width = 1000;
        const height = 700;
        
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        const features = 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no';
        
        const folderUrl = window.location.origin + window.location.pathname + '?path=' + encodeURIComponent(folderPath);
        
        const popup = window.open(folderUrl, 'folder_' + Date.now(), features);
        
        if (!popup) {
            if (typeof notifications !== 'undefined') {
                notifications.show('⚠️ Les popups sont bloquées. Autorisez-les pour ce site.', 'warning');
            }
            return null;
        }
        
        if (typeof notifications !== 'undefined') {
            notifications.show('🪟 Dossier "' + folderName + '" ouvert dans une nouvelle fenêtre', 'success');
        }
        
        return popup;
    },
    
    attachDragAndDropEvents(viewerId, currentFolderPath) {
        const viewer = document.getElementById(viewerId);
        if (!viewer) return;
        
        const items = viewer.querySelectorAll('.folder-item[draggable="true"]');
        const folderItems = viewer.querySelectorAll('.folder-item[data-is-folder="true"]');
        const folderItemsContainer = viewer.querySelector('.folder-items');
        const folderBrowser = viewer.querySelector('.folder-browser');
        
        // Événements de drag sur les items
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
                
                console.log('Drag started:', { name, path, isFolder });
            });
            
            item.addEventListener('dragend', (e) => {
                e.stopPropagation();
                item.style.opacity = '1';
                item.classList.remove('dragging');
            });
        });
        
        // Événements de drop sur les dossiers
        folderItems.forEach(folderItem => {
            folderItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                
                // Ne pas highlight si c'est l'élément en cours de drag
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
                
                console.log('Drop on folder:', {
                    dragged: draggedItem,
                    target: targetPath
                });
                
                this.moveItemToFolder(viewerId, draggedItem, targetPath);
            });
        });
        
        // Événements de drop sur le fond du dossier (zone vide)
        if (folderItemsContainer) {
            folderItemsContainer.addEventListener('dragover', (e) => {
                const isOverFolderItem = e.target.closest('.folder-item[data-is-folder="true"]');
                
                // Accepter le drop si on n'est pas directement sur un dossier
                if (!isOverFolderItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    
                    // Ajouter un indicateur visuel
                    folderItemsContainer.style.background = '#eff6ff';
                    folderItemsContainer.style.outline = '2px dashed #3b82f6';
                }
            });
            
            folderItemsContainer.addEventListener('dragleave', (e) => {
                // Nettoyer uniquement si on quitte vraiment
                if (!folderItemsContainer.contains(e.relatedTarget)) {
                    folderItemsContainer.style.background = '';
                    folderItemsContainer.style.outline = '';
                }
            });
            
            folderItemsContainer.addEventListener('drop', (e) => {
                const isOverFolderItem = e.target.closest('.folder-item[data-is-folder="true"]');
                
                // Drop uniquement si on n'est pas sur un dossier spécifique
                if (!isOverFolderItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    folderItemsContainer.style.background = '';
                    folderItemsContainer.style.outline = '';
                    
                    const data = e.dataTransfer.getData('text/plain');
                    if (!data) return;
                    
                    const draggedItem = JSON.parse(data);
                    
                    console.log('Drop on folder background (folder-items):', {
                        dragged: draggedItem,
                        target: currentFolderPath
                    });
                    
                    this.moveItemToFolder(viewerId, draggedItem, currentFolderPath);
                }
            });
        }
        
        // Drop sur toute la fenêtre du viewer (backup)
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
                    
                    console.log('Drop on viewer content (backup):', {
                        dragged: draggedItem,
                        target: currentFolderPath
                    });
                    
                    this.moveItemToFolder(viewerId, draggedItem, currentFolderPath);
                }
            });
        }
    },
    
    async moveItemToFolder(viewerId, item, targetFolderPath) {
        // Vérifier qu'on ne déplace pas dans le même dossier
        const itemParentPath = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
        
        if (itemParentPath === targetFolderPath) {
            if (typeof notifications !== 'undefined') {
                notifications.show('ℹ️ Le fichier est déjà dans ce dossier', 'info');
            }
            return;
        }
        
        // Vérifier qu'on ne déplace pas un dossier dans lui-même
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
                
                // Rafraîchir la fenêtre flottante
                const windowData = this.activeWindows.find(w => w.id === viewerId);
                if (windowData && windowData.folderPath) {
                    this.loadFolderContent(viewerId, windowData.folderPath);
                }
                
                // Rafraîchir aussi la vue principale si elle affiche ce dossier
                if (typeof navigation !== 'undefined' && typeof state !== 'undefined') {
                    if (state.currentPath === itemParentPath || state.currentPath === targetFolderPath) {
                        navigation.navigateToFolder(state.currentPath);
                    }
                }
                
                // Rafraîchir les autres fenêtres flottantes si elles affichent les dossiers concernés
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
};

window.addEventListener('resize', () => {
    floatingViewer.handleScreenResize();
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        floatingViewer.handleScreenResize();
    }, 100);
});