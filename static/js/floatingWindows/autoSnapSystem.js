// ============================================
// modules/autoSnapSystem.js - Snap automatique ÉPURÉ
// Focus: Compositions optimales SANS TROUS
// ============================================

export const autoSnapSystem = {
    
    // ============================================
    // DÉTECTION DE FICHIERS LIÉS (SIMPLE)
    // ============================================
    
    recentlyOpenedFiles: [], 
    maxHistoryTime: 15000,

    detectRelatedFiles(filename, filepath) {
        console.log(`%c[AutoSnap] Détection lancée pour : ${filename}`, 'color: #3b82f6; font-weight: bold;');
        
        const now = Date.now();
        
        // Nettoyer l'historique (ancien + doublons)
        this.recentlyOpenedFiles = this.recentlyOpenedFiles.filter(
            file => now - file.timestamp < this.maxHistoryTime
        );

        console.log(`[AutoSnap] Historique: ${this.recentlyOpenedFiles.length} fichiers`);
        
        let relatedFiles = [];
        
        // Retourner TOUS les fichiers récents SAUF le fichier actuel (éviter doublon)
        if (this.recentlyOpenedFiles.length > 0) {
            relatedFiles = this.recentlyOpenedFiles.filter(f => f.filename !== filename);
            console.log(`%c[AutoSnap] ${relatedFiles.length} fichier(s) lié(s) détecté(s)`, 'color: #10b981; font-weight: bold;');
        }
        
        // Supprimer les doublons du fichier actuel dans l'historique avant d'ajouter
        this.recentlyOpenedFiles = this.recentlyOpenedFiles.filter(f => f.filename !== filename);
        
        // Ajouter le fichier actuel à l'historique
        this.recentlyOpenedFiles.push({
            filename,
            filepath,
            timestamp: now
        });
        
        return relatedFiles;
    },
    
    // ============================================
    // CALCUL LAYOUT OPTIMAL (COEUR DU SYSTÈME)
    // ============================================
    
    calculateOptimalLayout(windowCount) {
        console.log(`%c[AutoSnap] Calcul layout optimal pour ${windowCount} fenêtres`, 'color: #8b5cf6; font-weight: bold;');
        
        // Table de correspondance PARFAITE sans trous
        const layouts = {
            1: { type: 'single', description: 'Plein écran' },
            2: { type: 'split-2', description: '2 colonnes 50/50' },
            3: { type: 'mosaic-3', description: '1 grand (66.67%) + 2 petits (33.33%)' },
            4: { type: 'grid-2x2', description: 'Grille 2×2' },
            5: { type: 'custom-5', description: '2 en haut + 3 en bas' },
            6: { type: 'grid-3x2', description: 'Grille 3×2' },
            7: { type: 'custom-7', description: '3 en haut + 4 en bas' },
            8: { type: 'grid-4x2', description: 'Grille 4×2' },
            9: { type: 'grid-3x3', description: 'Grille 3×3' },
            10: { type: 'grid-5x2', description: 'Grille 5×2' },
            11: { type: 'custom-11', description: '4-4-3 (3 lignes)' },
            12: { type: 'grid-4x3', description: 'Grille 4×3' }
        };
        
        // Pour 13+, calculer dynamiquement
        if (windowCount > 12) {
            const cols = Math.ceil(Math.sqrt(windowCount));
            const rows = Math.ceil(windowCount / cols);
            return { 
                type: 'grid-dynamic', 
                cols, 
                rows,
                description: `Grille ${cols}×${rows}` 
            };
        }
        
        const layout = layouts[windowCount];
        console.log(`%c[AutoSnap] Layout choisi: ${layout.description}`, 'color: #22c55e; font-weight: bold;');
        return layout;
    },
    
    // ============================================
    // AUTO-SNAP APPLICATION (CORRIGÉ)
    // ============================================
    
    applyAutoSnap(windowManager, newWindowId, relatedFiles) {
        console.log(`%c[AutoSnap] 🚀 APPLICATION DU SNAP DÉMARRÉE`, 'color: #c084fc; font-weight: bold; font-size: 14px;');
        console.log('[AutoSnap] Nombre de fenêtres actives:', windowManager.activeWindows.length);
        
        // Fermeture de la notification
        const suggestion = document.getElementById('autosnap-suggestion');
        if (suggestion) {
            suggestion.classList.add('autosnap-closing');
            setTimeout(() => suggestion.remove(), 200);
        }

        setTimeout(() => {
            // OPTION A : Organiser TOUTES les fenêtres ouvertes (simple et prévisible)
            const allWindows = [...windowManager.activeWindows];
            const windowCount = allWindows.length;
            
            console.log(`%c[AutoSnap] ✅ ${windowCount} fenêtres à organiser`, 'color: #10b981; font-weight: bold;');
            console.log('[AutoSnap] Liste des fenêtres:', allWindows.map(w => `${w.filename} (${w.id})`));
            
            if (windowCount === 0) {
                console.error(`%c[AutoSnap] ❌ Aucune fenêtre à organiser`, 'color: #dc2626; font-weight: bold;');
                return;
            }
            
            // Activer le magnétisme pour toutes les fenêtres
            allWindows.forEach(win => win.magnetic = true);
            
            // Calculer et appliquer le layout optimal
            const optimalLayout = this.calculateOptimalLayout(windowCount);
            console.log('[AutoSnap] Layout optimal calculé:', optimalLayout);
            
            this.applyLayout(windowManager, allWindows, optimalLayout);
            
            // Notification de succès
            if (typeof notifications !== 'undefined') {
                notifications.show(`✨ ${optimalLayout.description} appliqué pour ${windowCount} fenêtres`, 'success');
            }
            
        }, 500);
    },
    
    // ============================================
    // APPLICATION DES LAYOUTS (UNIFIÉ)
    // ============================================
    
    applyLayout(windowManager, windows, layout) {
        const count = windows.length;
        
        console.log(`%c[AutoSnap] Application: ${layout.type}`, 'color: #8b5cf6;');
        
        // Animation
        windows.forEach(win => {
            win.element.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });
        
        // Router vers la bonne fonction
        switch(layout.type) {
            case 'single':
                this.layoutSingle(windowManager, windows[0]);
                break;
            case 'split-2':
                this.layoutSplit2(windowManager, windows);
                break;
            case 'mosaic-3':
                this.layoutMosaic3(windowManager, windows);
                break;
            case 'grid-2x2':
                this.layoutGrid(windowManager, windows, 2, 2);
                break;
            case 'custom-5':
                this.layoutCustom5(windowManager, windows);
                break;
            case 'grid-3x2':
                this.layoutGrid(windowManager, windows, 3, 2);
                break;
            case 'custom-7':
                this.layoutCustom7(windowManager, windows);
                break;
            case 'grid-4x2':
                this.layoutGrid(windowManager, windows, 4, 2);
                break;
            case 'grid-3x3':
                this.layoutGrid(windowManager, windows, 3, 3);
                break;
            case 'grid-5x2':
                this.layoutGrid(windowManager, windows, 5, 2);
                break;
            case 'custom-11':
                this.layoutCustom11(windowManager, windows);
                break;
            case 'grid-4x3':
                this.layoutGrid(windowManager, windows, 4, 3);
                break;
            case 'grid-dynamic':
                this.layoutGrid(windowManager, windows, layout.cols, layout.rows);
                break;
            default:
                console.error(`Layout ${layout.type} non reconnu`);
        }
    },
    
    // Helper pour positionner une fenêtre (UNIFIÉ)
    setWindowPosition(windowManager, element, left, top, width, height) {
        element.style.position = 'fixed';
        element.style.left = `${left}vw`;
        element.style.top = `${top}vh`;
        element.style.width = `${width}vw`;
        element.style.height = `${height}vh`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.borderRadius = '0';
        element.style.margin = '0';
        element.style.transform = 'none';
        windowManager.updateContentHeight(element);
    },
    
    // ============================================
    // LAYOUTS SPÉCIFIQUES
    // ============================================
    
    // 1 fenêtre: Plein écran
    layoutSingle(windowManager, window) {
        this.setWindowPosition(windowManager, window.element, 0, 0, 100, 100);
    },
    
    // 2 fenêtres: 50/50
    layoutSplit2(windowManager, windows) {
        this.setWindowPosition(windowManager, windows[0].element, 0, 0, 50, 100);
        this.setWindowPosition(windowManager, windows[1].element, 50, 0, 50, 100);
    },
    
    // 3 fenêtres: Mosaïque 2/3 + 2×1/3
    layoutMosaic3(windowManager, windows) {
        this.setWindowPosition(windowManager, windows[0].element, 0, 0, 66.67, 100);
        this.setWindowPosition(windowManager, windows[1].element, 66.67, 0, 33.33, 50);
        this.setWindowPosition(windowManager, windows[2].element, 66.67, 50, 33.33, 50);
    },
    
    // Grille générique
    layoutGrid(windowManager, windows, cols, rows) {
        const cellWidth = 100 / cols;
        const cellHeight = 100 / rows;
        
        windows.forEach((win, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            this.setWindowPosition(
                windowManager,
                win.element,
                cellWidth * col,
                cellHeight * row,
                cellWidth,
                cellHeight
            );
        });
    },
    
    // 5 fenêtres: 2 en haut + 3 en bas
    layoutCustom5(windowManager, windows) {
        // Ligne 1: 2 fenêtres (50% chacune)
        this.setWindowPosition(windowManager, windows[0].element, 0, 0, 50, 50);
        this.setWindowPosition(windowManager, windows[1].element, 50, 0, 50, 50);
        
        // Ligne 2: 3 fenêtres (33.33% chacune)
        this.setWindowPosition(windowManager, windows[2].element, 0, 50, 33.33, 50);
        this.setWindowPosition(windowManager, windows[3].element, 33.33, 50, 33.34, 50);
        this.setWindowPosition(windowManager, windows[4].element, 66.67, 50, 33.33, 50);
    },
    
    // 7 fenêtres: 3 en haut + 4 en bas
    layoutCustom7(windowManager, windows) {
        // Ligne 1: 3 fenêtres (33.33% chacune)
        this.setWindowPosition(windowManager, windows[0].element, 0, 0, 33.33, 50);
        this.setWindowPosition(windowManager, windows[1].element, 33.33, 0, 33.34, 50);
        this.setWindowPosition(windowManager, windows[2].element, 66.67, 0, 33.33, 50);
        
        // Ligne 2: 4 fenêtres (25% chacune)
        this.setWindowPosition(windowManager, windows[3].element, 0, 50, 25, 50);
        this.setWindowPosition(windowManager, windows[4].element, 25, 50, 25, 50);
        this.setWindowPosition(windowManager, windows[5].element, 50, 50, 25, 50);
        this.setWindowPosition(windowManager, windows[6].element, 75, 50, 25, 50);
    },
    
    // 11 fenêtres: 4-4-3
    layoutCustom11(windowManager, windows) {
        // Ligne 1: 4 fenêtres (25% chacune)
        for (let i = 0; i < 4; i++) {
            this.setWindowPosition(windowManager, windows[i].element, 25 * i, 0, 25, 33.33);
        }
        
        // Ligne 2: 4 fenêtres (25% chacune)
        for (let i = 4; i < 8; i++) {
            this.setWindowPosition(windowManager, windows[i].element, 25 * (i - 4), 33.33, 25, 33.34);
        }
        
        // Ligne 3: 3 fenêtres (33.33% chacune)
        for (let i = 8; i < 11; i++) {
            this.setWindowPosition(windowManager, windows[i].element, 33.33 * (i - 8), 66.67, 33.33, 33.33);
        }
    },
    
    // ============================================
    // NOTIFICATION INTELLIGENTE
    // ============================================
    
    showAutoSnapSuggestion(windowManager, newWindowId, relatedFiles, reason = 'open') {
        console.log(`%c[AutoSnap] Affichage suggestion (${reason})`, 'color: #f97316;');

        const existingSuggestion = document.getElementById('autosnap-suggestion');
        if (existingSuggestion) {
            existingSuggestion.remove();
        }

        // OPTION A : Compter TOUTES les fenêtres actives
        const totalWindows = windowManager.activeWindows.length;
        
        // Ne rien afficher si 0 ou 1 fenêtre
        if (totalWindows <= 1) {
            console.log('[AutoSnap] Pas assez de fenêtres pour une suggestion');
            return;
        }
        
        const optimalLayout = this.calculateOptimalLayout(totalWindows);
        
        const suggestion = document.createElement('div');
        suggestion.id = 'autosnap-suggestion';
        suggestion.className = 'autosnap-suggestion';
        
        // Message personnalisé selon la raison
        const messageTitle = reason === 'close' 
            ? `${totalWindows} fenêtre${totalWindows > 1 ? 's' : ''} restante${totalWindows > 1 ? 's' : ''}`
            : `${totalWindows} fenêtre${totalWindows > 1 ? 's' : ''} ouverte${totalWindows > 1 ? 's' : ''}`;
        
        const messageSubtitle = reason === 'close'
            ? 'Réorganiser automatiquement les fenêtres restantes'
            : 'Organiser automatiquement toutes les fenêtres';
        
        suggestion.innerHTML = `
            <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 15px;">
                <div style="font-size: 28px;">${reason === 'close' ? '🔄' : '🔗'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 5px; font-size: 15px;">
                        ${messageTitle}
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.6);">
                        ${messageSubtitle}
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(59, 130, 246, 0.15); border-left: 3px solid rgba(59, 130, 246, 0.6); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">✨ Layout optimal</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.8);">${optimalLayout.description}</div>
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button id="autosnap-apply" style="
                    flex: 1;
                    background: rgba(59, 130, 246, 0.3);
                    border: 1px solid rgba(59, 130, 246, 0.6);
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                ">Appliquer</button>
                <button id="autosnap-dismiss" style="
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.4);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                ">Ignorer</button>
            </div>
        `;
        
        document.body.appendChild(suggestion);
        
        // Bouton Appliquer
        const applyBtn = suggestion.querySelector('#autosnap-apply');
        applyBtn.addEventListener('mouseenter', () => {
            applyBtn.style.background = 'rgba(59, 130, 246, 0.5)';
        });
        applyBtn.addEventListener('mouseleave', () => {
            applyBtn.style.background = 'rgba(59, 130, 246, 0.3)';
        });
        applyBtn.addEventListener('click', () => {
            console.log('%c[AutoSnap] 🎯 BOUTON APPLIQUER CLIQUÉ', 'color: #10b981; font-weight: bold; font-size: 14px;');
            console.log('[AutoSnap] windowManager:', windowManager);
            console.log('[AutoSnap] newWindowId:', newWindowId);
            console.log('[AutoSnap] relatedFiles:', relatedFiles);
            
            // CORRECTION: Appeler via autoSnapSystem au lieu de this
            autoSnapSystem.applyAutoSnap(windowManager, newWindowId, relatedFiles);
        });
        
        // Bouton Ignorer
        const dismissBtn = suggestion.querySelector('#autosnap-dismiss');
        dismissBtn.addEventListener('mouseenter', () => {
            dismissBtn.style.background = 'rgba(239, 68, 68, 0.3)';
        });
        dismissBtn.addEventListener('mouseleave', () => {
            dismissBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        });
        dismissBtn.addEventListener('click', () => {
            suggestion.classList.add('autosnap-closing');
            setTimeout(() => suggestion.remove(), 200);
        });
        
        // Auto-dismiss après 10 secondes
        setTimeout(() => {
            if (document.getElementById('autosnap-suggestion')) {
                suggestion.classList.add('autosnap-closing');
                setTimeout(() => suggestion.remove(), 200);
            }
        }, 10000);
    }
};