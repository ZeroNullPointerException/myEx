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
        
        const updatePreview = (clientX, clientY) => {
            const snapMode = this.detectSnapZone(clientX, clientY);
            const overlay = createPreviewOverlay();
            
            if (!snapMode) {
                overlay.style.display = 'none';
                return;
            }
            
            overlay.style.display = 'block';
            this.applySnapStyles(overlay, snapMode);
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
    }
};