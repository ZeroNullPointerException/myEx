// ============================================
// floatingViewer.js - Visualiseur flottant pour images et audio
// ============================================

const floatingViewer = {
    activeWindows: [],
    nextZIndex: 1000,
    isMobile: window.innerWidth <= 768,
    
    createImageViewer(filename, imageUrl) {
        const viewerId = 'viewer-' + Date.now();
        const isMobile = this.isMobile;
        
        const viewer = document.createElement('div');
        viewer.id = viewerId;
        viewer.className = 'floating-viewer floating-image-viewer';
        
        // Dimensions initiales adaptées
        const initialWidth = isMobile ? (window.innerWidth - 20) : 400;
        const initialHeight = isMobile ? (window.innerHeight * 0.6) : 500;
        
        viewer.style.cssText = `
            position: fixed;
            top: ${isMobile ? '10px' : '80px'};
            left: ${isMobile ? '10px' : 'auto'};
            right: ${isMobile ? '10px' : '20px'};
            width: ${initialWidth}px;
            height: ${initialHeight}px;
            min-width: 250px;
            min-height: 200px;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(226, 232, 240, 0.4);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            overflow: hidden;
            z-index: ${this.nextZIndex++};
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        viewer.innerHTML = `
            <div class="viewer-header" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            ">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-image text-white"></i>
                    <span class="text-white font-semibold text-sm truncate" title="${filename}">${filename}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); floatingViewer.toggleFullscreen('${viewerId}')" 
                            class="fullscreen-btn text-white hover:bg-white/20 w-9 h-9 rounded transition flex items-center justify-center"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            title="Plein écran">
                        <i class="fas fa-expand text-sm"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.minimizeWindow('${viewerId}')" 
                            class="minimize-btn text-white hover:bg-white/20 w-9 h-9 rounded transition flex items-center justify-center"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            title="Réduire">
                        <i class="fas fa-minus text-sm"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.closeWindow('${viewerId}')" 
                            class="text-white hover:bg-white/20 w-9 h-9 rounded transition flex items-center justify-center"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            title="Fermer">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
            </div>
            <div class="viewer-content" style="
                padding: 0;
                height: calc(100% - 110px);
                overflow: auto;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f8fafc;
            ">
                <img src="${imageUrl}" 
                     alt="${filename}" 
                     style="max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; cursor: zoom-in; object-fit: contain;"
                     onclick="floatingViewer.toggleImageZoom(this)">
            </div>
            <div class="viewer-footer" style="
                padding: 8px 16px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
            ">
                <button onclick="event.stopPropagation(); floatingViewer.downloadFromViewer('${imageUrl}', '${filename}')"
                        class="text-sm text-slate-600 hover:text-blue-600 transition flex items-center gap-2"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent; padding: 8px;">
                    <i class="fas fa-download"></i>
                    <span>Télécharger</span>
                </button>
                <button onclick="event.stopPropagation(); floatingViewer.toggleMagnetic('${viewerId}')"
                        class="magnetic-btn text-sm transition flex items-center gap-2"
                        style="color: #3b82f6; font-weight: 600; touch-action: manipulation; -webkit-tap-highlight-color: transparent; padding: 8px;"
                        title="Aimantation activée">
                    <i class="fas fa-magnet"></i>
                    <span class="magnetic-status">ON</span>
                </button>
            </div>
            <div class="resize-handle" style="
                position: absolute;
                bottom: 0;
                right: 0;
                width: 40px;
                height: 40px;
                cursor: nwse-resize;
                touch-action: none;
                background: linear-gradient(135deg, transparent 50%, rgba(100, 116, 139, 0.5) 50%);
                border-bottom-right-radius: 12px;
                z-index: 10;
            ">
                <i class="fas fa-expand-alt" style="position: absolute; bottom: 4px; right: 4px; color: rgba(100, 116, 139, 0.6); font-size: 12px;"></i>
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
    
    createAudioPlayer(filename, audioUrl) {
        const playerId = 'player-' + Date.now();
        const isMobile = this.isMobile;
        
        const player = document.createElement('div');
        player.id = playerId;
        player.className = 'floating-viewer floating-audio-player';
        
        // Position et largeur adaptées
        const initialWidth = isMobile ? (window.innerWidth - 20) : 350;
        
        player.style.cssText = `
            position: fixed;
            bottom: ${isMobile ? '80px' : '20px'};
            left: ${isMobile ? '10px' : 'auto'};
            right: ${isMobile ? '10px' : '20px'};
            width: ${initialWidth}px;
            min-width: 250px;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(226, 232, 240, 0.4);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            overflow: hidden;
            z-index: ${this.nextZIndex++};
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        player.innerHTML = `
            <div class="viewer-header" style="
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            ">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-music text-white"></i>
                    <span class="text-white font-semibold text-sm truncate" title="${filename}">${filename}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); floatingViewer.toggleFullscreen('${playerId}')" 
                            class="fullscreen-btn text-white hover:bg-white/20 w-9 h-9 rounded transition flex items-center justify-center"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            title="Plein écran">
                        <i class="fas fa-expand text-sm"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.minimizeWindow('${playerId}')" 
                            class="minimize-btn text-white hover:bg-white/20 w-9 h-9 rounded transition flex items-center justify-center"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            title="Réduire">
                        <i class="fas fa-minus text-sm"></i>
                    </button>
                    <button onclick="event.stopPropagation(); floatingViewer.closeWindow('${playerId}')" 
                            class="text-white hover:bg-white/20 w-9 h-9 rounded transition flex items-center justify-center"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            title="Fermer">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
            </div>
            <div class="viewer-content" style="padding: 16px;">
                <audio id="${playerId}-audio" controls style="width: 100%;" autoplay>
                    <source src="${audioUrl}" type="audio/mpeg">
                    Votre navigateur ne supporte pas la lecture audio.
                </audio>
            </div>
            <div class="viewer-footer" style="
                padding: 8px 16px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
            ">
                <button onclick="event.stopPropagation(); floatingViewer.downloadFromViewer('${audioUrl}', '${filename}')"
                        class="text-sm text-slate-600 hover:text-blue-600 transition flex items-center gap-2"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent; padding: 8px;">
                    <i class="fas fa-download"></i>
                    <span>Télécharger</span>
                </button>
                <button onclick="event.stopPropagation(); floatingViewer.toggleMagnetic('${playerId}')"
                        class="magnetic-btn text-sm transition flex items-center gap-2"
                        style="color: #3b82f6; font-weight: 600; touch-action: manipulation; -webkit-tap-highlight-color: transparent; padding: 8px;"
                        title="Aimantation activée">
                    <i class="fas fa-magnet"></i>
                    <span class="magnetic-status">ON</span>
                </button>
            </div>
            <div class="resize-handle-horizontal" style="
                position: absolute;
                bottom: 0;
                right: 0;
                width: 40px;
                height: 40px;
                cursor: ew-resize;
                touch-action: none;
                background: linear-gradient(135deg, transparent 50%, rgba(100, 116, 139, 0.5) 50%);
                border-bottom-right-radius: 12px;
                z-index: 10;
            ">
                <i class="fas fa-arrows-alt-h" style="position: absolute; bottom: 4px; right: 4px; color: rgba(100, 116, 139, 0.6); font-size: 12px;"></i>
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
            
            const rect = element.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            
            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));
            
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
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        
        const startResize = (clientX, clientY) => {
            isResizing = true;
            startX = clientX;
            startY = clientY;
            const rect = element.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
            startLeft = rect.left;
            startTop = rect.top;
            element.style.transition = 'none';
        };
        
        const handleResize = (clientX, clientY) => {
            if (!isResizing) return;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            // Largeur
            const maxWidth = window.innerWidth - startLeft - 10;
            const newWidth = Math.max(250, Math.min(startWidth + deltaX, maxWidth));
            element.style.width = newWidth + 'px';
            
            // Hauteur (seulement pour images et si pas horizontal only)
            if (isImage && !isHorizontalOnly) {
                const maxHeight = window.innerHeight - startTop - 10;
                const newHeight = Math.max(250, Math.min(startHeight + deltaY, maxHeight));
                element.style.height = newHeight + 'px';
                
                const content = element.querySelector('.viewer-content');
                if (content) {
                    content.style.height = `calc(${newHeight}px - 110px)`;
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
        let snapped = false;
        
        const distanceLeft = rect.left;
        const distanceRight = screenWidth - rect.right;
        const distanceTop = rect.top;
        const distanceBottom = screenHeight - rect.bottom;
        
        const minDistance = Math.min(distanceLeft, distanceRight, distanceTop, distanceBottom);
        
        if (minDistance < snapDistance) {
            snapped = true;
            const margin = 10;
            
            if (minDistance === distanceLeft) {
                // Gauche
                newLeft = margin;
                newWidth = isMobile ? (screenWidth - 2 * margin) : Math.min(screenWidth * 0.45, 600);
                newTop = Math.max(margin, Math.min(rect.top, screenHeight - rect.height - margin));
                if (element.classList.contains('floating-image-viewer')) {
                    newHeight = isMobile ? (screenHeight * 0.7) : Math.min(screenHeight - newTop - margin, 800);
                }
            }
            else if (minDistance === distanceRight) {
                // Droite
                newWidth = isMobile ? (screenWidth - 2 * margin) : Math.min(screenWidth * 0.45, 600);
                newLeft = screenWidth - newWidth - margin;
                newTop = Math.max(margin, Math.min(rect.top, screenHeight - rect.height - margin));
                if (element.classList.contains('floating-image-viewer')) {
                    newHeight = isMobile ? (screenHeight * 0.7) : Math.min(screenHeight - newTop - margin, 800);
                }
            }
            else if (minDistance === distanceTop) {
                // Haut
                newTop = margin;
                newHeight = isMobile ? (screenHeight * 0.7) : Math.min(screenHeight * 0.6, 700);
                newLeft = Math.max(margin, Math.min(rect.left, screenWidth - rect.width - margin));
                if (isMobile) {
                    newWidth = screenWidth - 2 * margin;
                }
            }
            else if (minDistance === distanceBottom) {
                // Bas
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
                    content.style.height = `calc(${newHeight}px - 110px)`;
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
                notifications.show(`🧲 Collé au bord ${edgeName}`, 'success');
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
            // === RESTAURER ===
            
            // Restaurer l'affichage du contenu et footer
            if (content) content.style.display = window.type === 'image' ? 'flex' : 'block';
            if (footer) footer.style.display = 'flex';
            if (resizeHandle) resizeHandle.style.display = 'block';
            
            // Restaurer les dimensions sauvegardées
            if (window.savedDimensions) {
                element.style.width = window.savedDimensions.width;
                element.style.height = window.savedDimensions.height;
                element.style.minHeight = window.savedDimensions.minHeight || 'auto';
                
                // Pour les images, restaurer aussi la hauteur du contenu
                if (window.type === 'image' && content) {
                    content.style.height = window.savedDimensions.contentHeight;
                }
            } else {
                // Fallback si pas de dimensions sauvegardées
                element.style.height = 'auto';
                element.style.minHeight = '200px';
            }
            
            // Changer l'icône
            if (icon) {
                icon.classList.remove('fa-window-maximize');
                icon.classList.add('fa-minus');
            }
            if (minimizeBtn) minimizeBtn.title = 'Réduire';
            
            window.minimized = false;
            delete window.savedDimensions;
            
        } else {
            // === MINIMISER ===
            
            // Sauvegarder les dimensions actuelles
            const rect = element.getBoundingClientRect();
            window.savedDimensions = {
                width: element.style.width || rect.width + 'px',
                height: element.style.height || rect.height + 'px',
                minHeight: element.style.minHeight,
                contentHeight: content ? content.style.height : 'auto'
            };
            
            // Cacher le contenu et footer
            if (content) content.style.display = 'none';
            if (footer) footer.style.display = 'none';
            if (resizeHandle) resizeHandle.style.display = 'none';
            
            // Ajuster la hauteur pour ne garder que le header
            element.style.height = 'auto';
            element.style.minHeight = 'auto';
            
            // Forcer le recalcul
            element.offsetHeight;
            
            // Changer l'icône
            if (icon) {
                icon.classList.remove('fa-minus');
                icon.classList.add('fa-window-maximize');
            }
            if (minimizeBtn) minimizeBtn.title = 'Restaurer';
            
            window.minimized = true;
        }
        
        // Animation visuelle
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
            button.style.color = '#3b82f6';
            button.style.fontWeight = '600';
            button.title = 'Aimantation activée';
            if (statusSpan) statusSpan.textContent = 'ON';
        } else {
            button.style.color = '#64748b';
            button.style.fontWeight = '400';
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
            // Restaurer
            element.style.position = 'fixed';
            element.style.left = window.savedPosition.left;
            element.style.top = window.savedPosition.top;
            element.style.width = window.savedPosition.width;
            element.style.height = window.savedPosition.height;
            element.style.borderRadius = '12px';
            
            if (window.type === 'image') {
                const content = element.querySelector('.viewer-content');
                content.style.height = `calc(${window.savedPosition.height} - 110px)`;
            }
            
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
            fullscreenBtn.title = 'Plein écran';
            window.fullscreen = false;
        } else {
            // Sauvegarder position actuelle
            window.savedPosition = {
                left: element.style.left,
                top: element.style.top,
                width: element.style.width,
                height: element.style.height
            };
            
            // Passer en plein écran
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
            notifications.show(`📥 Téléchargement de ${filename} initié`, 'info');
        }
    },
    
    closeAll() {
        [...this.activeWindows].forEach(window => {
            this.closeWindow(window.id);
        });
    },
    
    // Gestion du redimensionnement de l'écran
    handleScreenResize() {
        this.isMobile = window.innerWidth <= 768;
        
        this.activeWindows.forEach(win => {
            const element = win.element;
            const rect = element.getBoundingClientRect();
            
            // Ajuster si la fenêtre dépasse maintenant
            if (rect.right > window.innerWidth) {
                element.style.left = Math.max(10, window.innerWidth - rect.width - 10) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                element.style.top = Math.max(10, window.innerHeight - rect.height - 10) + 'px';
            }
            
            // Sur mobile, adapter la largeur
            if (this.isMobile) {
                element.style.width = (window.innerWidth - 20) + 'px';
                element.style.left = '10px';
                element.style.right = '10px';
            }
        });
    }
};

// Écouter les changements d'orientation et de taille d'écran
window.addEventListener('resize', () => {
    floatingViewer.handleScreenResize();
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        floatingViewer.handleScreenResize();
    }, 100);
});