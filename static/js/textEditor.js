// ============================================
// textEditor.js - Éditeur de texte flottant intégré
// ============================================

const textEditor = {
    activeEditors: [],

    open(filename, filePath) {
        const editorId = 'editor-' + Date.now();
        const isMobile = window.innerWidth <= 768;
        
        const editor = document.createElement('div');
        editor.id = editorId;
        editor.className = 'floating-viewer floating-text-editor';
        
        const initialWidth = isMobile ? (window.innerWidth - 20) : 800;
        const initialHeight = isMobile ? (window.innerHeight * 0.8) : 600;
        
        editor.style.top = isMobile ? '10px' : '50px';
        editor.style.left = isMobile ? '10px' : '50px';
        editor.style.width = initialWidth + 'px';
        editor.style.height = initialHeight + 'px';
        editor.style.zIndex = floatingViewer.nextZIndex++;
        editor.style.position = 'fixed';
        
        editor.innerHTML = `
            <div class="viewer-header viewer-header-editor" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-file-code"></i>
                    <span title="${filename}">${filename}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); textEditor.save('${editorId}')" 
                            id="${editorId}-save-btn"
                            class="save-btn opacity-50 cursor-not-allowed" 
                            disabled
                            title="Enregistrer (Ctrl+S)">
                        <i class="fas fa-save"></i>
                    </button>
                    <button onclick="event.stopPropagation(); textEditor.toggleFullscreen('${editorId}')" 
                            class="fullscreen-btn" title="Plein écran">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button onclick="event.stopPropagation(); textEditor.minimizeWindow('${editorId}')" 
                            class="minimize-btn" title="Réduire">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button onclick="event.stopPropagation(); textEditor.close('${editorId}')" title="Fermer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="editor-toolbar">
                <button onclick="event.stopPropagation(); textEditor.undo('${editorId}')" 
                        class="toolbar-btn" title="Annuler (Ctrl+Z)">
                    <i class="fas fa-undo"></i>
                </button>
                <button onclick="event.stopPropagation(); textEditor.redo('${editorId}')" 
                        class="toolbar-btn" title="Rétablir (Ctrl+Y)">
                    <i class="fas fa-redo"></i>
                </button>
                <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 4px;"></div>
                <select id="${editorId}-font-size" 
                        onchange="textEditor.changeFontSize('${editorId}', this.value)"
                        style="padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; background: white;">
                    <option value="12">12px</option>
                    <option value="14" selected>14px</option>
                    <option value="16">16px</option>
                    <option value="18">18px</option>
                    <option value="20">20px</option>
                </select>
                <div style="flex: 1;"></div>
                <span id="${editorId}-status" style="font-size: 12px; color: #64748b;">Chargement...</span>
            </div>
            
            <div class="viewer-content viewer-content-editor">
                <textarea id="${editorId}-textarea" 
                          spellcheck="false"
                          placeholder="Chargement du contenu..."></textarea>
            </div>
            
            <div class="viewer-footer" style="padding: 8px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
                <div style="display: flex; gap: 12px;">
                    <span id="${editorId}-lines">Lignes: 0</span>
                    <span id="${editorId}-chars">Caractères: 0</span>
                    <span id="${editorId}-cursor">Ligne 1, Col 1</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button onclick="event.stopPropagation(); textEditor.toggleMagnetic('${editorId}')" 
                            class="magnetic-btn" title="Aimantation activée">
                        <i class="fas fa-magnet"></i>
                        <span class="magnetic-status">ON</span>
                    </button>
                    <span style="color: #94a3b8;"><i class="fas fa-keyboard" style="margin-right: 4px;"></i>Ctrl+S pour sauvegarder</span>
                </div>
            </div>
            
            <div class="resize-handle">
                <i class="fas fa-expand-alt"></i>
            </div>
        `;
        
        document.body.appendChild(editor);
        
        // Utiliser les fonctions de floatingViewer pour le drag, resize, etc.
        floatingViewer.makeDraggable(editor);
        floatingViewer.makeResizable(editor);
        floatingViewer.makeClickToFront(editor);
        
        // Créer les données de la fenêtre
        const windowData = {
            id: editorId,
            type: 'editor',
            element: editor,
            magnetic: true,
            filePath: filePath,
            filename: filename,
            originalContent: null,
            isModified: false
        };
        
        // Ajouter aux fenêtres actives de floatingViewer ET de textEditor
        floatingViewer.activeWindows.push(windowData);
        this.activeEditors.push(windowData);
        
        if (!isMobile) {
            floatingViewer.cascadeWindow(editor);
        }
        
        // Charger le contenu et setup
        this.loadContent(editorId, filePath);
        this.setupEventListeners(editorId);
        
        return editorId;
    },

    async loadContent(editorId, filePath) {
        const windowData = this.activeEditors.find(w => w.id === editorId);
        if (!windowData) return;
        
        const textarea = document.getElementById(editorId + '-textarea');
        
        try {
            const response = await fetch(utils.buildApiUrl('view', filePath));
            
            if (!response.ok) {
                throw new Error('Impossible de charger le fichier');
            }
            
            const content = await response.text();
            windowData.originalContent = content;
            textarea.value = content;
            textarea.placeholder = '';
            
            this.updateStats(editorId);
            this.updateStatus(editorId, 'Prêt', 'success');
            textarea.focus();
            
        } catch (error) {
            console.error('Erreur de chargement:', error);
            this.updateStatus(editorId, 'Erreur de chargement', 'error');
            if (typeof notifications !== 'undefined') {
                notifications.show(`Impossible de charger le fichier: ${error.message}`, 'error');
            }
        }
    },

    setupEventListeners(editorId) {
        const windowData = this.activeEditors.find(w => w.id === editorId);
        if (!windowData) return;
        
        const textarea = document.getElementById(editorId + '-textarea');
        
        // Détection des modifications
        textarea.addEventListener('input', () => {
            windowData.isModified = textarea.value !== windowData.originalContent;
            this.updateSaveButton(editorId);
            this.updateStats(editorId);
        });
        
        // Raccourcis clavier
        textarea.addEventListener('keydown', (e) => {
            // Ctrl+S pour sauvegarder
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (windowData.isModified) {
                    this.save(editorId);
                }
            }
            
            // Tab pour indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }
        });
        
        // Mettre à jour la position du curseur
        textarea.addEventListener('keyup', () => this.updateCursorPosition(editorId));
        textarea.addEventListener('click', () => this.updateCursorPosition(editorId));
    },

    updateSaveButton(editorId) {
        const windowData = this.activeEditors.find(w => w.id === editorId);
        if (!windowData) return;
        
        const saveBtn = document.getElementById(editorId + '-save-btn');
        if (saveBtn) {
            saveBtn.disabled = !windowData.isModified;
            if (windowData.isModified) {
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
        
        this.updateStatus(editorId, windowData.isModified ? 'Modifications non enregistrées' : 'Enregistré', windowData.isModified ? 'warning' : 'success');
    },

    updateStatus(editorId, message, type = 'info') {
        const statusEl = document.getElementById(editorId + '-status');
        if (statusEl) {
            statusEl.textContent = message;
            const colors = {
                'success': '#22c55e',
                'warning': '#f59e0b',
                'error': '#ef4444',
                'info': '#64748b'
            };
            statusEl.style.color = colors[type] || colors.info;
        }
    },

    updateStats(editorId) {
        const textarea = document.getElementById(editorId + '-textarea');
        if (!textarea) return;
        
        const content = textarea.value;
        const lines = content.split('\n').length;
        const chars = content.length;
        
        const linesEl = document.getElementById(editorId + '-lines');
        const charsEl = document.getElementById(editorId + '-chars');
        
        if (linesEl) linesEl.textContent = `Lignes: ${lines}`;
        if (charsEl) charsEl.textContent = `Caractères: ${chars}`;
    },

    updateCursorPosition(editorId) {
        const textarea = document.getElementById(editorId + '-textarea');
        const cursorEl = document.getElementById(editorId + '-cursor');
        if (!textarea || !cursorEl) return;
        
        const pos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, pos);
        const line = textBeforeCursor.split('\n').length;
        const col = textBeforeCursor.split('\n').pop().length + 1;
        
        cursorEl.textContent = `Ligne ${line}, Col ${col}`;
    },

    changeFontSize(editorId, size) {
        const textarea = document.getElementById(editorId + '-textarea');
        if (textarea) {
            textarea.style.fontSize = size + 'px';
        }
    },

    undo(editorId) {
        const textarea = document.getElementById(editorId + '-textarea');
        if (textarea) {
            textarea.focus();
            document.execCommand('undo');
        }
    },

    redo(editorId) {
        const textarea = document.getElementById(editorId + '-textarea');
        if (textarea) {
            textarea.focus();
            document.execCommand('redo');
        }
    },

    async save(editorId) {
        const windowData = this.activeEditors.find(w => w.id === editorId);
        if (!windowData || !windowData.isModified) return;
        
        const textarea = document.getElementById(editorId + '-textarea');
        const saveBtn = document.getElementById(editorId + '-save-btn');
        
        const originalBtnHtml = saveBtn.innerHTML;
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            this.updateStatus(editorId, 'Enregistrement en cours...', 'info');
            
            // Créer un FormData avec le fichier
            const blob = new Blob([textarea.value], { type: 'text/plain' });
            const file = new File([blob], windowData.filename, { type: 'text/plain' });
            
            const formData = new FormData();
            formData.append('files', file);
            
            // Déterminer le dossier parent
            const pathParts = windowData.filePath.split('/');
            pathParts.pop();
            const parentPath = '/' + pathParts.join('/');
            
            formData.append('path', parentPath);
            
            const response = await fetch(API_BASE + '/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                windowData.originalContent = textarea.value;
                windowData.isModified = false;
                this.updateSaveButton(editorId);
                this.updateStatus(editorId, 'Enregistré', 'success');
                
                if (typeof notifications !== 'undefined') {
                    notifications.show('✅ Fichier enregistré avec succès', 'success');
                }
                
                // Rafraîchir la vue principale si nécessaire
                if (typeof navigation !== 'undefined' && typeof state !== 'undefined') {
                    const currentDir = windowData.filePath.substring(0, windowData.filePath.lastIndexOf('/')) || '/';
                    if (state.currentPath === currentDir) {
                        navigation.navigateToFolder(state.currentPath);
                    }
                }
            } else {
                throw new Error(result.error || 'Erreur lors de l\'enregistrement');
            }
            
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
            this.updateStatus(editorId, 'Erreur d\'enregistrement', 'error');
            if (typeof notifications !== 'undefined') {
                notifications.show(`❌ Impossible d'enregistrer: ${error.message}`, 'error');
            }
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHtml;
        }
    },

    close(editorId) {
        const windowData = this.activeEditors.find(w => w.id === editorId);
        if (!windowData) return;
        
        if (windowData.isModified) {
            if (!confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer l\'éditeur ?')) {
                return;
            }
        }
        
        // Utiliser la fonction de fermeture de floatingViewer
        floatingViewer.closeWindow(editorId);
        
        // Retirer de notre liste
        const index = this.activeEditors.findIndex(w => w.id === editorId);
        if (index !== -1) {
            this.activeEditors.splice(index, 1);
        }
    },

    toggleFullscreen(editorId) {
        floatingViewer.toggleFullscreen(editorId);
        // Mettre à jour la hauteur après le changement
        setTimeout(() => this.updateContentHeight(editorId), 350);
    },

    minimizeWindow(editorId) {
        floatingViewer.minimizeWindow(editorId);
        // Mettre à jour la hauteur après le changement
        setTimeout(() => this.updateContentHeight(editorId), 150);
    },

    toggleMagnetic(editorId) {
        floatingViewer.toggleMagnetic(editorId);
    }
};