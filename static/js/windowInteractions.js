// ============================================
// 2. windowInteractions.js - Fonctions d'interaction (Gestion Flottante et Pop-up)
// Doit être chargé après floatingViewer.js
// CORRECTION : Ajout de la fonction manquante makeClickToFront.
// ============================================

Object.assign(floatingViewer, {
    
    // ============================================
    // Logique de Drag & Drop (Base)
    // ============================================

    makeDraggable(element) {
        const header = element.querySelector('.viewer-header');
        let isDragging = false;
        let initialX, initialY;
        
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
        };
        
        const handleDrag = (clientX, clientY) => {
            if (!isDragging) return;
            
            element.style.left = (clientX - initialX) + 'px';
            element.style.top = (clientY - initialY) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        };
        
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
                const windowData = this.activeWindows.find(w => w.element === element);
                const isSplitWindow = this.linkedResizePair && (this.linkedResizePair.idA === element.id || this.linkedResizePair.idB === element.id);
                
                // Si la fenêtre est en mode Split, on le désactive et on la replace
                if (isSplitWindow) {
                    this.disableTiling(element.id); 
                    this.snapToDefaultPosition(element); 
                    if (typeof notifications !== 'undefined') {
                         notifications.show('🧲 Mode Split désactivé par déplacement', 'info');
                    }
                    return; 
                }

                // Application du Tuilage (Aimantation)
                if (windowData && windowData.magnetic && typeof this.applyTilingSnap === 'function') {
                    this.applyTilingSnap(element); 
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
    
    // ============================================
    // Logique de Redimensionnement (PAR LES BORDS)
    // ============================================

    makeResizable(element) {
        let isResizing = false;
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        let direction = '';

        const RESIZE_MARGIN = 8; // Zone de détection en pixels (8px)
        const MIN_WIDTH = 250;
        const MIN_HEIGHT = 100;

        const isAudioPlayer = element.classList.contains('floating-audio-player');
        
        const getResizeDirection = (e) => {
            const rect = element.getBoundingClientRect();
            let dir = '';
            
            // Empêcher le redimensionnement par les bords si on clique dans l'entête
            if (e.target.closest('.viewer-header') && !isResizing) return ''; 

            const onTop = e.clientY - rect.top < RESIZE_MARGIN;
            const onBottom = rect.bottom - e.clientY < RESIZE_MARGIN;
            const onLeft = e.clientX - rect.left < RESIZE_MARGIN;
            const onRight = rect.right - e.clientX < RESIZE_MARGIN;
            
            // --- Logique SPLIT MODE (Prioritaire si Split A) ---
            const isSplitWindowA = this.linkedResizePair && this.linkedResizePair.idA === element.id;
            
            if (isSplitWindowA) {
                // En mode Split, seule la bordure de droite (E) est le 'splitter'
                if (onRight) return 'E_SPLITTER';
                return ''; // Désactiver les autres directions
            }
            // Fin Logique SPLIT MODE
            
            // Logique normale
            if (onTop) dir += 'N';
            else if (onBottom) dir += 'S';

            if (onLeft) dir += 'W';
            else if (onRight) dir += 'E';
            
            // Logique Audio Player : Limiter la redimension verticale
            if (isAudioPlayer && (dir.includes('N') || dir.includes('S')) && dir.length > 0 && dir !== 'E' && dir !== 'W') {
                return '';
            }

            return dir;
        };
        
        const setCursor = (e) => {
            if (isResizing) return;

            const dir = getResizeDirection(e);
            let cursor = 'auto';

            if (dir.includes('N') && dir.includes('E')) cursor = 'ne-resize';
            else if (dir.includes('N') && dir.includes('W')) cursor = 'nw-resize';
            else if (dir.includes('S') && dir.includes('E')) cursor = 'se-resize';
            else if (dir.includes('S') && dir.includes('W')) cursor = 'sw-resize';
            else if (dir.includes('N') || dir.includes('S')) cursor = 'ns-resize';
            else if (dir.includes('E') || dir.includes('W') || dir === 'E_SPLITTER') cursor = 'ew-resize';

            element.style.cursor = cursor;
        };

        const startResize = (e) => {
            direction = getResizeDirection(e);
            if (!direction) return;

            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            this.bringToFront(element);

            const rect = element.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startWidth = rect.width;
            startHeight = rect.height;
            startLeft = rect.left;
            startTop = rect.top;
            
            element.style.transition = 'none';
        };

        const handleResize = (e) => {
            if (!isResizing) return;
            e.preventDefault();
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // --- Logique SPLIT MODE (Prioritaire) ---
            if (direction === 'E_SPLITTER' && this.linkedResizePair) {
                const viewerB = document.getElementById(this.linkedResizePair.idB);
                if (viewerB) {
                    const totalWidth = window.innerWidth;
                    
                    const newWidthA = Math.max(MIN_WIDTH, e.clientX); 
                    const newWidthB = Math.max(MIN_WIDTH, totalWidth - e.clientX);

                    if (newWidthA < MIN_WIDTH || newWidthB < MIN_WIDTH) return; 
                    
                    element.style.width = newWidthA + 'px';
                    viewerB.style.width = newWidthB + 'px';
                    viewerB.style.left = newWidthA + 'px';
                    
                    this.updateContentHeight(element);
                    this.updateContentHeight(viewerB);
                }
                return;
            }
            // Fin Logique SPLIT MODE
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;
            
            // Redimensionnement Horizontal
            if (direction.includes('E')) {
                newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
            } else if (direction.includes('W')) {
                newWidth = Math.max(MIN_WIDTH, startWidth - deltaX);
                if (newWidth > MIN_WIDTH) { 
                    newLeft = startLeft + deltaX;
                } else {
                    newLeft = startLeft + (startWidth - MIN_WIDTH); 
                }
            }
            
            // Redimensionnement Vertical
            if (direction.includes('S')) {
                newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
            } else if (direction.includes('N')) {
                newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
                if (newHeight > MIN_HEIGHT) {
                    newTop = startTop + deltaY;
                } else {
                    newTop = startTop + (startHeight - MIN_HEIGHT);
                }
            }
            
            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';

            this.updateContentHeight(element);
        };

        const endResize = () => {
            if (isResizing) {
                isResizing = false;
                element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                element.style.cursor = 'auto'; 
            }
        };

        // Événements pour le changement de curseur
        element.addEventListener('mousemove', setCursor);
        element.addEventListener('mouseleave', () => {
            element.style.cursor = 'auto';
        });

        // Événements pour le redimensionnement
        element.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', endResize);
    },
    
    // ============================================
    // Fonctions de Gestion de l'Ordre Z
    // ============================================

    makeClickToFront(element) { 
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.viewer-header') && (e.target.tagName === 'BUTTON' || e.target.tagName === 'I')) {
                return;
            }
            const isResizingCursor = element.style.cursor !== 'auto' && element.style.cursor !== 'default';
            if (isResizingCursor) {
                return;
            }

            this.bringToFront(element);
        });
    },

    bringToFront(element) {
        element.style.zIndex = this.nextZIndex++;
    },
    
    // ============================================
    // Le reste des fonctions 
    // ============================================

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
        const MINIMIZED_HEIGHT = '50px'; 
        const MARGIN = 10;
        const window = this.activeWindows.find(w => w.id === viewerId);
        if (!window) return;
        
        const element = window.element;
        const content = element.querySelector('.viewer-content');
        const footer = element.querySelector('.viewer-footer');
        const minimizeBtn = element.querySelector('.minimize-btn');
        const icon = minimizeBtn ? minimizeBtn.querySelector('i') : null;
        
        if (window.minimized) {
            if (content) content.style.display = window.type === 'image' ? 'flex' : 'block';
            if (footer) footer.style.display = 'flex';
            
            if (window.savedDimensions) {
                element.style.width = window.savedDimensions.width;
                element.style.height = window.savedDimensions.height;
                
                element.style.top = window.savedDimensions.top;
                element.style.left = window.savedDimensions.left;
                element.style.right = window.savedDimensions.right;
                element.style.bottom = window.savedDimensions.bottom;
                
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
            if (minimizeBtn) minimizeBtn.title = 'Restaurer';
            
            window.minimized = false;
            delete window.savedDimensions;
            
        } else {
            const rect = element.getBoundingClientRect();
            
            window.savedDimensions = {
                width: element.style.width || rect.width + 'px',
                height: element.style.height || rect.height + 'px',
                
                top: element.style.top, 
                left: element.style.left,
                right: element.style.right,
                bottom: element.style.bottom,
                
                minHeight: element.style.minHeight,
                contentHeight: content ? content.style.height : 'auto'
            };
            
            if (content) content.style.display = 'none';
            if (footer) footer.style.display = 'none';
            
            element.style.height = MINIMIZED_HEIGHT;
            element.style.minHeight = MINIMIZED_HEIGHT;
            element.offsetHeight;
            
            const screenHeight = window.innerHeight;
            const newRect = element.getBoundingClientRect();
            
            if (newRect.bottom > screenHeight) {
                const minimizedHeightValue = parseInt(MINIMIZED_HEIGHT);
                const newTop = screenHeight - minimizedHeightValue - MARGIN; 
                element.style.top = Math.max(MARGIN, newTop) + 'px'; 
                element.style.bottom = 'auto';
            }
            
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

            if (this.linkedResizePair && (this.linkedResizePair.idA === viewerId || this.linkedResizePair.idB === viewerId)) {
                const idToKeep = (this.linkedResizePair.idA === viewerId) ? this.linkedResizePair.idB : this.linkedResizePair.idA;
                this.disableTiling(idToKeep); 
            }
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
            
            this.updateContentHeight(element);
            
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
            
            this.updateContentHeight(element);
            
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
    
    updateContentHeight(element) { 
        const content = element.querySelector('.viewer-content');
        if (content) {
            const header = element.querySelector('.viewer-header');
            const footer = element.querySelector('.viewer-footer');
            
            const headerHeight = header ? header.offsetHeight : 0;
            const footerHeight = footer ? footer.offsetHeight : 0;
            
            const rect = element.getBoundingClientRect();
            const newContentHeight = rect.height - headerHeight - footerHeight - 10; 
            
            content.style.height = Math.max(50, newContentHeight) + 'px';
        }
    },
    
    closeAll() {
        [...this.activeWindows].forEach(window => {
            this.closeWindow(window.id);
        });
    },

    // ============================================
    // Fonctions de Pop-up (inchangées)
    // ============================================

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
    }
});