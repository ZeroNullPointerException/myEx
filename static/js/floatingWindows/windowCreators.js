// ============================================
// modules/windowCreators.js - Création des fenêtres
// ============================================

export const windowCreators = {
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
        
        viewer.innerHTML = this._buildImageViewerHTML(viewerId, filename, imageUrl);
        
        document.body.appendChild(viewer);
        this.makeDraggable(viewer);
        this.makeResizable(viewer);
        this.makeClickToFront(viewer);
        this.activeWindows.push({ id: viewerId, type: 'image', element: viewer, magnetic: true });
        
        if (!isMobile) this.cascadeWindow(viewer);
        
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
        
        player.innerHTML = this._buildAudioPlayerHTML(playerId, filename, audioUrl);
        
        document.body.appendChild(player);
        this.makeDraggable(player);
        this.makeResizable(player);
        this.makeClickToFront(player);
        this.activeWindows.push({ id: playerId, type: 'audio', element: player, magnetic: true });
        
        if (!isMobile) this.cascadeWindow(player);
        
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
        
        viewer.innerHTML = this._buildFolderViewerHTML(viewerId, folderName, folderPath);
        
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
        
        if (!isMobile) this.cascadeWindow(viewer);
        
        this.loadFolderContent(viewerId, folderPath);
        
        return viewerId;
    },
    
    createPopupWindow(filename, url, type) {
        const width = type === 'image' ? 800 : 400;
        const height = type === 'image' ? 600 : 200;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;
        const popup = window.open('', 'viewer_' + Date.now(), features);
        
        if (!popup) {
            if (typeof notifications !== 'undefined') {
                notifications.show('⚠️ Les popups sont bloquées. Autorisez-les pour ce site.', 'warning');
            }
            return null;
        }
        
        popup.document.write(this._buildPopupHTML(filename, url, type));
        popup.document.close();
        
        if (typeof notifications !== 'undefined') {
            notifications.show(`🪟 ${filename} ouvert dans une nouvelle fenêtre`, 'success');
        }
        
        return popup;
    },
    
    // Templates HTML
    _buildImageViewerHTML(viewerId, filename, imageUrl) {
        return `
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
    },
    
    _buildAudioPlayerHTML(playerId, filename, audioUrl) {
        return `
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
    },
    
    _buildFolderViewerHTML(viewerId, folderName, folderPath) {
        return `
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
    },
    
    _buildPopupHTML(filename, url, type) {
        const headerBg = type === 'image' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        const iconName = type === 'image' ? 'image' : 'music';
        const contentHtml = type === 'image' 
            ? `<img src="${url}" alt="${filename}">` 
            : `<audio controls autoplay><source src="${url}" type="audio/mpeg"></audio>`;
        
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${filename}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>* { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .header { background: ${headerBg}; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header-title { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; }
        .content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: auto; background: white; }
        .content img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; }
        .content audio { width: 100%; max-width: 500px; }
        .footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 12px; }
        button { padding: 8px 16px; border: none; border-radius: 6px; background: #3b82f6; color: white; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        button:hover { background: #2563eb; transform: translateY(-1px); }
        </style></head><body>
        <div class="header"><div class="header-title"><i class="fas fa-${iconName}"></i><span>${filename}</span></div></div>
        <div class="content">${contentHtml}</div>
        <div class="footer">
        <button onclick="window.open('${url.replace('/view', '/download')}', '_blank')"><i class="fas fa-download"></i>Télécharger</button>
        <button onclick="window.close()"><i class="fas fa-times"></i>Fermer</button>
        </div></body></html>`;
    }
};