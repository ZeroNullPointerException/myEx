// ============================================
// modules/layoutSystem.js - Layouts prédéfinis
// ============================================

export const layoutSystem = {
    // ============================================
    // LAYOUTS PRÉDÉFINIS
    // ============================================
    
    createLayoutMenu() {
        // Supprimer le menu existant s'il existe
        const existingMenu = document.getElementById('layout-menu');
        if (existingMenu) existingMenu.remove();
        
        const menu = document.createElement('div');
        menu.id = 'layout-menu';
        menu.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(17, 24, 39, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 12px;
            padding: 15px;
            z-index: 999997;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            min-width: 250px;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        menu.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(59, 130, 246, 0.2);">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">📐 Layouts</h3>
                <button id="close-layout-menu" style="background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 20px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 10px;">
                ${this.activeWindows.length} fenêtre(s) ouverte(s)
            </div>
            <div id="layout-buttons" style="display: flex; flex-direction: column; gap: 8px;">
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Bouton fermer
        document.getElementById('close-layout-menu').addEventListener('click', () => {
            menu.remove();
        });
        
        this.populateLayoutButtons();
    },
    
    populateLayoutButtons() {
        const container = document.getElementById('layout-buttons');
        if (!container) return;
        
        const windowCount = this.activeWindows.length;
        const layouts = [];
        
        // Layouts disponibles selon le nombre de fenêtres
        if (windowCount >= 1) {
            layouts.push(
                { id: 'maximize', name: '⬜ Maximiser active', icon: '🔲' },
                { id: 'cascade', name: '📚 Cascade', icon: '📚' }
            );
        }
        
        if (windowCount >= 2) {
            layouts.push(
                { id: 'split-h', name: '◫ Split horizontal 50/50', icon: '◫' },
                { id: 'split-v', name: '⬒ Split vertical 50/50', icon: '⬒' },
                { id: 'split-33-67', name: '▯ Split 33/67', icon: '▯' },
                { id: 'split-67-33', name: '▮ Split 67/33', icon: '▮' }
            );
        }
        
        if (windowCount >= 3) {
            layouts.push(
                { id: 'triple-col', name: '⬒⬒ 3 colonnes', icon: '|||' },
                { id: 'one-plus-two', name: '⬜⬒ 1 + 2', icon: '⬜◫' }
            );
        }
        
        if (windowCount >= 4) {
            layouts.push(
                { id: 'quad', name: '▦ Grille 2×2', icon: '▦' },
                { id: 'quad-focus', name: '▣ Focus + 3', icon: '▣' }
            );
        }
        
        layouts.forEach(layout => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                color: white;
                padding: 10px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                text-align: left;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            btn.innerHTML = `<span>${layout.icon}</span><span>${layout.name}</span>`;
            
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(59, 130, 246, 0.2)';
                btn.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(59, 130, 246, 0.1)';
                btn.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            });
            
            btn.addEventListener('click', () => {
                this.applyLayout(layout.id);
                document.getElementById('layout-menu').remove();
            });
            
            container.appendChild(btn);
        });
        
        // Message si pas assez de fenêtres
        if (layouts.length === 0) {
            container.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; padding: 20px;">Ouvrez des fenêtres pour voir les layouts disponibles</div>';
        }
    },
    
    applyLayout(layoutId) {
        const windows = this.activeWindows.slice(0, 4); // Max 4 fenêtres
        if (windows.length === 0) return;
        
        // Désactiver les transitions temporairement pour un snap instantané
        windows.forEach(win => {
            win.element.style.transition = 'none';
        });
        
        switch(layoutId) {
            case 'maximize':
                this.layoutMaximize(windows[0]);
                break;
            case 'cascade':
                this.layoutCascade(windows);
                break;
            case 'split-h':
                this.layoutSplitHorizontal(windows, 0.5);
                break;
            case 'split-v':
                this.layoutSplitVertical(windows, 0.5);
                break;
            case 'split-33-67':
                this.layoutSplitHorizontal(windows, 0.33);
                break;
            case 'split-67-33':
                this.layoutSplitHorizontal(windows, 0.67);
                break;
            case 'triple-col':
                this.layoutTripleColumn(windows);
                break;
            case 'one-plus-two':
                this.layoutOnePlusTwo(windows);
                break;
            case 'quad':
                this.layoutQuad(windows);
                break;
            case 'quad-focus':
                this.layoutQuadFocus(windows);
                break;
        }
        
        // Réactiver les transitions après un court délai
        setTimeout(() => {
            windows.forEach(win => {
                win.element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            });
        }, 50);
        
        if (typeof notifications !== 'undefined') {
            notifications.show('📐 Layout appliqué', 'success');
        }
    },
    
    layoutMaximize(window) {
        const el = window.element;
        el.style.left = '0';
        el.style.top = '0';
        el.style.width = '100vw';
        el.style.height = '100vh';
        el.style.borderRadius = '0';
        this.updateContentHeight(el);
        this.bringToFront(el);
    },
    
    layoutCascade(windows) {
        windows.forEach((win, i) => {
            const el = win.element;
            const offset = i * 40;
            el.style.left = (100 + offset) + 'px';
            el.style.top = (80 + offset) + 'px';
            el.style.width = '500px';
            el.style.height = '600px';
            el.style.borderRadius = '12px';
            this.updateContentHeight(el);
            this.bringToFront(el);
        });
    },
    
    layoutSplitHorizontal(windows, ratio) {
        const el1 = windows[0].element;
        const el2 = windows[1]?.element;
        
        const width1 = ratio * 100;
        const width2 = (1 - ratio) * 100;
        
        el1.style.left = '0';
        el1.style.top = '0';
        el1.style.width = width1 + 'vw';
        el1.style.height = '100vh';
        el1.style.borderRadius = '0';
        this.updateContentHeight(el1);
        
        if (el2) {
            el2.style.left = width1 + 'vw';
            el2.style.top = '0';
            el2.style.width = width2 + 'vw';
            el2.style.height = '100vh';
            el2.style.borderRadius = '0';
            this.updateContentHeight(el2);
            
            // Activer le mode split
            this.enableSplitMode(windows[0].id, windows[1].id);
        }
    },
    
    layoutSplitVertical(windows, ratio) {
        const el1 = windows[0].element;
        const el2 = windows[1]?.element;
        
        const height1 = ratio * 100;
        const height2 = (1 - ratio) * 100;
        
        el1.style.left = '0';
        el1.style.top = '0';
        el1.style.width = '100vw';
        el1.style.height = height1 + 'vh';
        el1.style.borderRadius = '0';
        this.updateContentHeight(el1);
        
        if (el2) {
            el2.style.left = '0';
            el2.style.top = height1 + 'vh';
            el2.style.width = '100vw';
            el2.style.height = height2 + 'vh';
            el2.style.borderRadius = '0';
            this.updateContentHeight(el2);
        }
    },
    
    layoutTripleColumn(windows) {
        const width = 100 / Math.min(windows.length, 3);
        
        windows.slice(0, 3).forEach((win, i) => {
            const el = win.element;
            el.style.left = (i * width) + 'vw';
            el.style.top = '0';
            el.style.width = width + 'vw';
            el.style.height = '100vh';
            el.style.borderRadius = '0';
            this.updateContentHeight(el);
        });
    },
    
    layoutOnePlusTwo(windows) {
        const el1 = windows[0].element;
        const el2 = windows[1]?.element;
        const el3 = windows[2]?.element;
        
        // Première fenêtre : gauche 50%
        el1.style.left = '0';
        el1.style.top = '0';
        el1.style.width = '50vw';
        el1.style.height = '100vh';
        el1.style.borderRadius = '0';
        this.updateContentHeight(el1);
        
        // Deuxième fenêtre : haut droite 50%
        if (el2) {
            el2.style.left = '50vw';
            el2.style.top = '0';
            el2.style.width = '50vw';
            el2.style.height = '50vh';
            el2.style.borderRadius = '0';
            this.updateContentHeight(el2);
        }
        
        // Troisième fenêtre : bas droite 50%
        if (el3) {
            el3.style.left = '50vw';
            el3.style.top = '50vh';
            el3.style.width = '50vw';
            el3.style.height = '50vh';
            el3.style.borderRadius = '0';
            this.updateContentHeight(el3);
        }
    },
    
    layoutQuad(windows) {
        windows.slice(0, 4).forEach((win, i) => {
            const el = win.element;
            const col = i % 2;
            const row = Math.floor(i / 2);
            
            el.style.left = (col * 50) + 'vw';
            el.style.top = (row * 50) + 'vh';
            el.style.width = '50vw';
            el.style.height = '50vh';
            el.style.borderRadius = '0';
            this.updateContentHeight(el);
        });
    },
    
    layoutQuadFocus(windows) {
        const el1 = windows[0].element;
        const el2 = windows[1]?.element;
        const el3 = windows[2]?.element;
        const el4 = windows[3]?.element;
        
        // Première fenêtre : grande à gauche
        el1.style.left = '0';
        el1.style.top = '0';
        el1.style.width = '67vw';
        el1.style.height = '100vh';
        el1.style.borderRadius = '0';
        this.updateContentHeight(el1);
        
        // Trois petites à droite
        const smallWidth = 33;
        const smallHeight = 100 / 3;
        
        [el2, el3, el4].forEach((el, i) => {
            if (el) {
                el.style.left = '67vw';
                el.style.top = (i * smallHeight) + 'vh';
                el.style.width = smallWidth + 'vw';
                el.style.height = smallHeight + 'vh';
                el.style.borderRadius = '0';
                this.updateContentHeight(el);
            }
        });
    }
};