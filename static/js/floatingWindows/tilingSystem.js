// ============================================
// modules/tilingSystem.js - Système de tuilage et Split
// ============================================

export const tilingSystem = {
    // Fonction unifiée de détection de zone de snap
    detectSnapZone(clientX, clientY, rectLeft = null, rectTop = null, rectRight = null, rectBottom = null) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const edgeMargin = 50; // Zone de détection des bords (agrandie)
        const cornerSize = 150; // Zone de coin depuis les coins
        
        // Si on passe des coordonnées de rect, on les utilise, sinon on utilise clientX/Y
        const x = rectLeft !== null ? rectLeft : clientX;
        const y = rectTop !== null ? rectTop : clientY;
        const right = rectRight !== null ? rectRight : clientX;
        const bottom = rectBottom !== null ? rectBottom : clientY;
        
        // Détection de proximité des bords
        const nearTop = y <= edgeMargin;
        const nearBottom = bottom >= screenHeight - edgeMargin;
        const nearLeft = x <= edgeMargin;
        const nearRight = right >= screenWidth - edgeMargin;
        
        // Détection des zones de coin (zone étendue depuis les coins)
        const inTopLeftCorner = x <= cornerSize && y <= cornerSize;
        const inTopRightCorner = right >= screenWidth - cornerSize && y <= cornerSize;
        const inBottomLeftCorner = x <= cornerSize && bottom >= screenHeight - cornerSize;
        const inBottomRightCorner = right >= screenWidth - cornerSize && bottom >= screenHeight - cornerSize;
        
        // Priorité 1: COINS - Il faut être À LA FOIS dans la zone de coin ET proche des deux bords
        if (inTopLeftCorner && nearTop && nearLeft) {
            return 'quarter-tl';
        } else if (inTopRightCorner && nearTop && nearRight) {
            return 'quarter-tr';
        } else if (inBottomLeftCorner && nearBottom && nearLeft) {
            return 'quarter-bl';
        } else if (inBottomRightCorner && nearBottom && nearRight) {
            return 'quarter-br';
        }
        // Priorité 2: Plein écran (HAUT uniquement, pas dans les coins)
        else if (nearTop && !inTopLeftCorner && !inTopRightCorner) {
            return 'full';
        }
        // Priorité 3: Moitiés d'écran (CÔTÉS gauche/droite, pas dans les coins)
        else if (nearLeft && !inTopLeftCorner && !inBottomLeftCorner) {
            return 'half-left';
        }
        else if (nearRight && !inTopRightCorner && !inBottomRightCorner) {
            return 'half-right';
        }
        
        // Pas de snap pour le bord BAS seul ou milieu de l'écran
        return null;
    },
    
    // Fonction unifiée pour appliquer les styles de snap
    applySnapStyles(element, snapMode) {
        switch(snapMode) {
            case 'full':
                element.style.left = '0';
                element.style.top = '0';
                element.style.width = '100vw';
                element.style.height = '100vh';
                break;
            case 'half-left':
                element.style.left = '0';
                element.style.top = '0';
                element.style.width = '50vw';
                element.style.height = '100vh';
                break;
            case 'half-right':
                element.style.left = '50vw';
                element.style.top = '0';
                element.style.width = '50vw';
                element.style.height = '100vh';
                break;
            case 'quarter-tl':
                element.style.left = '0';
                element.style.top = '0';
                element.style.width = '50vw';
                element.style.height = '50vh';
                break;
            case 'quarter-tr':
                element.style.left = '50vw';
                element.style.top = '0';
                element.style.width = '50vw';
                element.style.height = '50vh';
                break;
            case 'quarter-bl':
                element.style.left = '0';
                element.style.top = '50vh';
                element.style.width = '50vw';
                element.style.height = '50vh';
                break;
            case 'quarter-br':
                element.style.left = '50vw';
                element.style.top = '50vh';
                element.style.width = '50vw';
                element.style.height = '50vh';
                break;
        }
    },
    
    makeDraggable(element) {
        const header = element.querySelector('.viewer-header');
        let isDragging = false;
        let currentX, currentY, initialX, initialY;
        let previewOverlay = null;
        
        const createPreviewOverlay = () => {
            if (!previewOverlay) {
                previewOverlay = document.createElement('div');
                previewOverlay.id = 'tiling-preview-overlay';
                previewOverlay.style.cssText = `
                    position: fixed;
                    background: rgba(59, 130, 246, 0.2);
                    border: 3px solid rgba(59, 130, 246, 0.6);
                    pointer-events: none;
                    z-index: 999999;
                    display: none;
                    transition: all 0.15s ease;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
                `;
                document.body.appendChild(previewOverlay);
            }
            return previewOverlay;
        };
        
        const createDropZones = () => {
            // Supprimer les anciennes zones si elles existent
            document.querySelectorAll('.drop-zone-indicator').forEach(el => el.remove());
            
            const zones = [
                { id: 'top', style: 'left: 25%; top: 0; width: 50%; height: 50px;', icon: '⬆️' },
                { id: 'left', style: 'left: 0; top: 25%; width: 50px; height: 50%;', icon: '⬅️' },
                { id: 'right', style: 'right: 0; top: 25%; width: 50px; height: 50%;', icon: '➡️' },
                { id: 'top-left', style: 'left: 0; top: 0; width: 100px; height: 100px;', icon: '↖️' },
                { id: 'top-right', style: 'right: 0; top: 0; width: 100px; height: 100px;', icon: '↗️' },
                { id: 'bottom-left', style: 'left: 0; bottom: 0; width: 100px; height: 100px;', icon: '↙️' },
                { id: 'bottom-right', style: 'right: 0; bottom: 0; width: 100px; height: 100px;', icon: '↘️' }
            ];
            
            zones.forEach(zone => {
                const zoneEl = document.createElement('div');
                zoneEl.className = 'drop-zone-indicator';
                zoneEl.dataset.zone = zone.id;
                zoneEl.innerHTML = `<span style="font-size: 24px;">${zone.icon}</span>`;
                zoneEl.style.cssText = `
                    position: fixed;
                    ${zone.style}
                    background: rgba(59, 130, 246, 0.1);
                    border: 2px dashed rgba(59, 130, 246, 0.3);
                    pointer-events: none;
                    z-index: 999998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s ease, background 0.2s ease;
                    border-radius: 8px;
                `;
                document.body.appendChild(zoneEl);
            });
        };
        
        const showDropZones = () => {
            document.querySelectorAll('.drop-zone-indicator').forEach(el => {
                el.style.opacity = '1';
            });
        };
        
        const hideDropZones = () => {
            document.querySelectorAll('.drop-zone-indicator').forEach(el => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 200);
            });
        };
        
        const highlightActiveZone = (snapMode) => {
            document.querySelectorAll('.drop-zone-indicator').forEach(el => {
                el.style.background = 'rgba(59, 130, 246, 0.1)';
                el.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            });
            
            let activeZone = null;
            switch(snapMode) {
                case 'full': activeZone = 'top'; break;
                case 'half-left': activeZone = 'left'; break;
                case 'half-right': activeZone = 'right'; break;
                case 'quarter-tl': activeZone = 'top-left'; break;
                case 'quarter-tr': activeZone = 'top-right'; break;
                case 'quarter-bl': activeZone = 'bottom-left'; break;
                case 'quarter-br': activeZone = 'bottom-right'; break;
            }
            
            if (activeZone) {
                const zoneEl = document.querySelector(`[data-zone="${activeZone}"]`);
                if (zoneEl) {
                    zoneEl.style.background = 'rgba(59, 130, 246, 0.3)';
                    zoneEl.style.borderColor = 'rgba(59, 130, 246, 0.8)';
                }
            }
        };
        
        const updatePreview = (clientX, clientY) => {
            const snapMode = this.detectSnapZone(clientX, clientY);
            const overlay = createPreviewOverlay();
            
            if (!snapMode) {
                overlay.style.display = 'none';
                highlightActiveZone(null);
                return;
            }
            
            overlay.style.display = 'block';
            this.applySnapStyles(overlay, snapMode);
            highlightActiveZone(snapMode);
        };
        
        const removePreview = () => {
            if (previewOverlay) {
                previewOverlay.style.display = 'none';
            }
        };
        
        const startDrag = (clientX, clientY) => {
            if (element.style.position !== 'fixed' && element.style.position !== 'absolute') {
                element.style.position = 'fixed'; 
            }
            isDragging = true;
            const rect = element.getBoundingClientRect();
            initialX = clientX - rect.left;
            initialY = clientY - rect.top;
            element.style.transition = 'none';
            this.bringToFront(element);
            createPreviewOverlay();
            
            const windowData = this.activeWindows.find(w => w.element === element);
            if (windowData && windowData.magnetic) {
                createDropZones();
                setTimeout(() => showDropZones(), 50);
            }
        };
        
        const handleDrag = (clientX, clientY) => {
            if (!isDragging) return;
            
            currentX = clientX - initialX;
            currentY = clientY - initialY;
            
            element.style.left = currentX + 'px';
            element.style.top = currentY + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
            
            const windowData = this.activeWindows.find(w => w.element === element);
            if (windowData && windowData.magnetic) {
                updatePreview(clientX, clientY);
            }
        };
        
        const endDrag = (clientX, clientY) => {
            if (isDragging) {
                isDragging = false;
                removePreview();
                hideDropZones();
                element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
                const windowData = this.activeWindows.find(w => w.element === element);
                const isSplitWindow = this.linkedResizePair && (this.linkedResizePair.idA === element.id || this.linkedResizePair.idB === element.id);
                
                if (isSplitWindow) {
                    this.disableTiling(element.id);
                    this.snapToDefaultPosition(element); 
                    if (typeof notifications !== 'undefined') {
                         notifications.show('🧲 Mode Split désactivé par déplacement', 'info');
                    }
                    return; 
                }

                if (windowData && windowData.magnetic) {
                    this.applyTilingSnap(element, clientX, clientY);
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
        
        document.addEventListener('mouseup', (e) => {
            endDrag(e.clientX, e.clientY);
        });
        
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
        
        document.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            endDrag(touch.clientX, touch.clientY);
            removePreview();
        });
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
            
            if (handle.dataset.isSplitter && this.linkedResizePair) {
                const viewerB = document.getElementById(this.linkedResizePair.idB);
                if (viewerB) {
                    const totalWidth = window.innerWidth;
                    const newWidthA = Math.max(100, clientX); 
                    const newWidthB = Math.max(100, totalWidth - clientX);

                    if (newWidthA < 100 || newWidthB < 100) return; 
                    
                    element.style.width = newWidthA + 'px';
                    viewerB.style.width = newWidthB + 'px';
                    viewerB.style.left = newWidthA + 'px';
                    
                    this.updateContentHeight(element);
                    this.updateContentHeight(viewerB);
                }
                return;
            }
            
            element.style.width = newWidth + 'px';
            
            if (isImage && !isHorizontalOnly) {
                const newHeight = Math.max(250, startHeight + deltaY);
                element.style.height = newHeight + 'px';
                this.updateContentHeight(element);
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

    applyTilingSnap(element, clientX = null, clientY = null) { 
        let snapMode;
        
        // Si on a les coordonnées de la souris, on les utilise (priorité)
        if (clientX !== null && clientY !== null) {
            snapMode = this.detectSnapZone(clientX, clientY);
        } else {
            // Sinon on utilise la position de la fenêtre (fallback)
            const rect = element.getBoundingClientRect();
            snapMode = this.detectSnapZone(null, null, rect.left, rect.top, rect.right, rect.bottom);
        }

        if (!snapMode) return;

        const windowId = element.id;
        const neighboringWindow = this.findNeighboringWindow(snapMode, element.id);
        
        element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'; 
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.borderRadius = '0';
        
        // Appliquer les styles de position/taille
        this.applySnapStyles(element, snapMode);

        // Gérer le mode Split pour les demi-écrans
        if (snapMode === 'half-left') {
            if (neighboringWindow && neighboringWindow.snapMode === 'half-right') {
                this.enableSplitMode(windowId, neighboringWindow.id);
            } else if (this.linkedResizePair) {
                this.disableTiling(windowId);
            }
        } else if (snapMode === 'half-right') {
            if (neighboringWindow && neighboringWindow.snapMode === 'half-left') {
                this.enableSplitMode(neighboringWindow.id, windowId);
            } else if (this.linkedResizePair) {
                this.disableTiling(windowId);
            }
        } else {
            // Pour tous les autres modes (full, quarts), désactiver le split
            if (this.linkedResizePair) {
                this.disableTiling(windowId);
            }
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

    snapToDefaultPosition(element) {
        const rect = element.getBoundingClientRect();
        
        const newLeft = Math.max(10, Math.min(rect.left, window.innerWidth - rect.width - 10));
        const newTop = Math.max(10, Math.min(rect.top, window.innerHeight - rect.height - 10));

        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        
        if (element.style.width === '100vw' || element.style.width === '50vw') {
             element.style.width = '400px'; 
             element.style.height = '500px';
        }
       
        element.style.borderRadius = '12px';
        this.updateContentHeight(element);

        const headerBtns = element.querySelectorAll('.viewer-header button');
        headerBtns.forEach(btn => btn.style.display = 'block');
        
        const handle = element.querySelector('.resize-handle, .resize-handle-horizontal');
        if (handle) {
            delete handle.dataset.isSplitter;
            handle.style.display = 'block';
            handle.classList.remove('split-mode-handle');
        }
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
            
            const handleA = viewerA.querySelector('.resize-handle, .resize-handle-horizontal');
            if (handleA) {
                handleA.dataset.isSplitter = 'true'; 
                handleA.style.display = 'block'; 
                handleA.classList.add('split-mode-handle'); 
            }
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
            
            const handleB = viewerB.querySelector('.resize-handle, .resize-handle-horizontal');
            if (handleB) {
                handleB.style.display = 'none'; 
                handleB.classList.remove('split-mode-handle');
                delete handleB.dataset.isSplitter;
            }
        }
        
        if (typeof notifications !== 'undefined') {
            notifications.show('🔗 Mode Split activé entre ' + viewerIdA + ' et ' + viewerIdB, 'success');
        }
    },
    
    // ============================================
    // RACCOURCIS CLAVIER
     setupKeyboardShortcuts() {
        // CORRECTION: Capturer le contexte 'this' (qui est l'objet floatingViewer)
        const viewerContext = this;
        
        document.addEventListener('keydown', (e) => {
            // Ignorer si on est dans un input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Trouver la fenêtre active (celle avec le plus grand z-index)
            // Ligne 634 (corrigée)
            const activeWindow = viewerContext.getActiveWindow(); 
            if (!activeWindow) return;
            
            const element = activeWindow.element;
            const windowData = activeWindow;
            
            // Ctrl/Cmd + Flèches : Snap directionnel
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                e.preventDefault();
                
                switch(e.key) {
                    case 'ArrowUp':
                        viewerContext.snapToPosition(element, 'full');
                        break;
                    case 'ArrowLeft':
                        viewerContext.snapToPosition(element, 'half-left');
                        break;
                    case 'ArrowRight':
                        viewerContext.snapToPosition(element, 'half-right');
                        break;
                    case 'ArrowDown':
                        viewerContext.snapToDefaultPosition(element);
                        break;
                }
            }
            
            // Ctrl/Cmd + Shift + Flèches : Quarts d'écran
            if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                e.preventDefault();
                
                if (e.key === 'ArrowUp' && e.altKey) {
                    viewerContext.snapToPosition(element, 'quarter-tl');
                } else if (e.key === 'ArrowUp') {
                    viewerContext.snapToPosition(element, 'quarter-tr');
                } else if (e.key === 'ArrowDown' && e.altKey) {
                    viewerContext.snapToPosition(element, 'quarter-bl');
                } else if (e.key === 'ArrowDown') {
                    viewerContext.snapToPosition(element, 'quarter-br');
                }
            }
            
            // Ctrl/Cmd + M : Toggle magnétisme
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                viewerContext.toggleMagnetic(activeWindow.id);
            }
            
            // Ctrl/Cmd + F : Toggle fullscreen
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                viewerContext.toggleFullscreen(activeWindow.id);
            }
            
            // Ctrl/Cmd + W : Fermer la fenêtre active
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                viewerContext.closeWindow(activeWindow.id);
            }
            
            // Ctrl/Cmd + L : Ouvrir le menu Layouts
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                viewerContext.createLayoutMenu();
            }
            
            // Ctrl/Cmd + ? ou Ctrl/Cmd + H : Afficher l'aide
            if ((e.ctrlKey || e.metaKey) && (e.key === '?' || e.key === 'h')) {
                e.preventDefault();
                viewerContext.showHelpDialog();
            }
        });
    },
    
    getActiveWindow() {
        // activeWindows est une propriété de floatingViewer, mais sera accessible via 'this'
        // grâce au .call(this) dans floatingViewer.init()
        if (this.activeWindows.length === 0) return null;
        
        return this.activeWindows.reduce((max, win) => {
            const maxZ = parseInt(max.element.style.zIndex) || 0;
            const winZ = parseInt(win.element.style.zIndex) || 0;
            return winZ > maxZ ? win : max;
        });
    },
    
    snapToPosition(element, snapMode) {
        const windowData = this.activeWindows.find(w => w.element === element);
        if (!windowData) return;
        
        // Activer temporairement le magnétisme si nécessaire
        const wasMagnetic = windowData.magnetic;
        if (!wasMagnetic) {
            windowData.magnetic = true;
        }
        
        element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.borderRadius = '0';
        
        this.applySnapStyles(element, snapMode);
        
        // Gérer le mode Split
        const neighboringWindow = this.findNeighboringWindow(snapMode, element.id);
        
        if (snapMode === 'half-left') {
            if (neighboringWindow && neighboringWindow.snapMode === 'half-right') {
                this.enableSplitMode(element.id, neighboringWindow.id);
            } else if (this.linkedResizePair) {
                this.disableTiling(element.id);
            }
        } else if (snapMode === 'half-right') {
            if (neighboringWindow && neighboringWindow.snapMode === 'half-left') {
                this.enableSplitMode(neighboringWindow.id, element.id);
            } else if (this.linkedResizePair) {
                this.disableTiling(element.id);
            }
        } else {
            if (this.linkedResizePair) {
                this.disableTiling(element.id);
            }
        }
        
        this.updateContentHeight(element);
        
        // Restaurer l'état magnétique
        if (!wasMagnetic) {
            windowData.magnetic = false;
        }
        
        if (typeof notifications !== 'undefined') {
            notifications.show('⌨️ Snap ' + snapMode.replace('-', ' '), 'success');
        }
    },
    
    // ============================================
    // AIDE ET DOCUMENTATION
    // ============================================
    
    showHelpDialog() {
        // Supprimer le dialog existant s'il existe
        const existing = document.getElementById('help-dialog');
        if (existing) {
            existing.remove();
            return; // Toggle
        }
        
        const dialog = document.createElement('div');
        dialog.id = 'help-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(17, 24, 39, 0.98);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 16px;
            padding: 30px;
            z-index: 999999;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
            animation: fadeIn 0.2s ease;
        `;
        
        dialog.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -48%) scale(0.95); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                #help-dialog::-webkit-scrollbar {
                    width: 8px;
                }
                #help-dialog::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                }
                #help-dialog::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.3);
                    border-radius: 4px;
                }
                #help-dialog kbd {
                    background: rgba(255,255,255,0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-family: monospace;
                    border: 1px solid rgba(255,255,255,0.2);
                }
            </style>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 600;">⌨️ Raccourcis & Aide</h2>
                <button id="close-help" style="
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.7);
                    cursor: pointer;
                    font-size: 24px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s;
                ">×</button>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="font-size: 16px; margin-bottom: 12px; color: rgba(59, 130, 246, 1);">🎯 Snap directionnel</h3>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
                    <div><kbd>Ctrl</kbd> + <kbd>↑</kbd></div><div style="color: rgba(255,255,255,0.7);">Plein écran</div>
                    <div><kbd>Ctrl</kbd> + <kbd>←</kbd></div><div style="color: rgba(255,255,255,0.7);">Moitié gauche</div>
                    <div><kbd>Ctrl</kbd> + <kbd>→</kbd></div><div style="color: rgba(255,255,255,0.7);">Moitié droite</div>
                    <div><kbd>Ctrl</kbd> + <kbd>↓</kbd></div><div style="color: rgba(255,255,255,0.7);">Position par défaut</div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="font-size: 16px; margin-bottom: 12px; color: rgba(59, 130, 246, 1);">🎨 Quarts d'écran</h3>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
                    <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>↑</kbd></div><div style="color: rgba(255,255,255,0.7);">Haut-droite</div>
                    <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd></div><div style="color: rgba(255,255,255,0.7);">Haut-gauche</div>
                    <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>↓</kbd></div><div style="color: rgba(255,255,255,0.7);">Bas-droite</div>
                    <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd></div><div style="color: rgba(255,255,255,0.7);">Bas-gauche</div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="font-size: 16px; margin-bottom: 12px; color: rgba(59, 130, 246, 1);">📐 Gestion</h3>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
                    <div><kbd>Ctrl</kbd> + <kbd>L</kbd></div><div style="color: rgba(255,255,255,0.7);">Menu Layouts</div>
                    <div><kbd>Ctrl</kbd> + <kbd>M</kbd></div><div style="color: rgba(255,255,255,0.7);">Toggle magnétisme</div>
                    <div><kbd>Ctrl</kbd> + <kbd>F</kbd></div><div style="color: rgba(255,255,255,0.7);">Toggle plein écran</div>
                    <div><kbd>Ctrl</kbd> + <kbd>W</kbd></div><div style="color: rgba(255,255,255,0.7);">Fermer fenêtre</div>
                    <div><kbd>Ctrl</kbd> + <kbd>H</kbd></div><div style="color: rgba(255,255,255,0.7);">Cette aide</div>
                </div>
            </div>
            
            <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid rgba(59, 130, 246, 0.5); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px;">🧲 Drag & Drop magnétique</h4>
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.8);">
                    Activez le magnétisme (<kbd>Ctrl</kbd>+<kbd>M</kbd>) puis glissez une fenêtre vers les bords.
                    Des zones de drop apparaîtront automatiquement.
                </p>
            </div>
            
            <div style="background: rgba(34, 197, 94, 0.1); border-left: 3px solid rgba(34, 197, 94, 0.5); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px;">🔗 Auto-Snap intelligent</h4>
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.8);">
                    Ouvrez des fichiers liés (ex: image-1.jpg, image-2.jpg) et le système proposera
                    automatiquement une organisation adaptée.
                </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 20px;">
                Appuyez sur <kbd>Échap</kbd> pour fermer
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'help-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999998;
            animation: fadeIn 0.2s ease;
        `;
        document.body.appendChild(backdrop);
        
        // Fermeture
        const closeHelp = () => {
            dialog.remove();
            backdrop.remove();
        };
        
        document.getElementById('close-help').addEventListener('click', closeHelp);
        backdrop.addEventListener('click', closeHelp);
        
        // Échap pour fermer
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeHelp();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Hover effet sur le bouton close
        const closeBtn = document.getElementById('close-help');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255,255,255,0.1)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
        });
    }
};
export default tilingSystem; 
window.addEventListener('DOMContentLoaded', tilingSystem.init);