// ============================================
// textEditor.js - Éditeur de texte intégré
// ============================================

const textEditor = {
    currentPath: null,
    originalContent: null,
    isModified: false,
    editor: null,

    open(path, filename) {
        this.currentPath = path;
        this.isModified = false;
        
        // Créer l'overlay de l'éditeur
        const editorHTML = `
            <div id="text-editor-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div class="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] max-w-6xl flex flex-col overflow-hidden animate-slideUp">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                                <i class="fas fa-file-code text-white text-lg"></i>
                            </div>
                            <div>
                                <h2 class="text-lg font-semibold text-slate-800 truncate max-w-md" title="${filename}">${filename}</h2>
                                <p class="text-xs text-slate-500">${path}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            <span id="editor-status" class="text-sm text-slate-500 mr-2">Chargement...</span>
                            <button onclick="textEditor.save()" id="save-btn" disabled
                                    class="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md">
                                <i class="fas fa-save"></i>
                                <span>Enregistrer</span>
                            </button>
                            <button onclick="textEditor.close()" 
                                    class="w-10 h-10 rounded-xl hover:bg-slate-200 transition-colors duration-200 flex items-center justify-center text-slate-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Barre d'outils -->
                    <div class="flex items-center gap-2 px-6 py-3 bg-slate-50 border-b border-slate-200">
                        <button onclick="textEditor.undo()" title="Annuler (Ctrl+Z)"
                                class="w-9 h-9 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-600">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button onclick="textEditor.redo()" title="Rétablir (Ctrl+Y)"
                                class="w-9 h-9 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-600">
                            <i class="fas fa-redo"></i>
                        </button>
                        <div class="w-px h-6 bg-slate-300 mx-2"></div>
                        <button onclick="textEditor.find()" title="Rechercher (Ctrl+F)"
                                class="w-9 h-9 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-600">
                            <i class="fas fa-search"></i>
                        </button>
                        <div class="w-px h-6 bg-slate-300 mx-2"></div>
                        <select id="editor-font-size" onchange="textEditor.changeFontSize(this.value)" 
                                class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="12">12px</option>
                            <option value="14" selected>14px</option>
                            <option value="16">16px</option>
                            <option value="18">18px</option>
                            <option value="20">20px</option>
                        </select>
                        <div class="flex-1"></div>
                        <div id="editor-info" class="text-sm text-slate-500"></div>
                    </div>
                    
                    <!-- Zone d'édition -->
                    <div class="flex-1 relative overflow-hidden">
                        <textarea id="text-editor-content" 
                                  class="absolute inset-0 w-full h-full px-6 py-4 font-mono text-sm leading-relaxed resize-none focus:outline-none bg-white text-slate-800"
                                  spellcheck="false"
                                  placeholder="Chargement du contenu..."></textarea>
                    </div>
                    
                    <!-- Footer -->
                    <div class="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                        <div class="flex items-center gap-4">
                            <span id="editor-lines">Lignes: 0</span>
                            <span id="editor-chars">Caractères: 0</span>
                            <span id="editor-cursor">Ligne 1, Col 1</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fas fa-keyboard text-slate-400"></i>
                            <span>Ctrl+S pour sauvegarder</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
                
                #text-editor-content {
                    tab-size: 4;
                }
                
                #text-editor-content::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                }
                
                #text-editor-content::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                
                #text-editor-content::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 6px;
                }
                
                #text-editor-content::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', editorHTML);
        this.editor = document.getElementById('text-editor-content');
        
        // Charger le contenu
        this.loadContent();
        
        // Event listeners
        this.setupEventListeners();
    },

    async loadContent() {
        try {
            const response = await fetch(utils.buildApiUrl('view', this.currentPath));
            
            if (!response.ok) {
                throw new Error('Impossible de charger le fichier');
            }
            
            const content = await response.text();
            this.originalContent = content;
            this.editor.value = content;
            this.editor.placeholder = '';
            
            this.updateStatus('Prêt');
            this.updateStats();
            this.editor.focus();
            
        } catch (error) {
            console.error('Erreur de chargement:', error);
            this.updateStatus('Erreur de chargement', true);
            notifications.show(`Impossible de charger le fichier: ${error.message}`, 'error');
        }
    },

    setupEventListeners() {
        // Détection des modifications
        this.editor.addEventListener('input', () => {
            this.isModified = this.editor.value !== this.originalContent;
            this.updateSaveButton();
            this.updateStats();
        });
        
        // Raccourcis clavier
        this.editor.addEventListener('keydown', (e) => {
            // Ctrl+S pour sauvegarder
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.isModified) {
                    this.save();
                }
            }
            
            // Tab pour indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.editor.selectionStart;
                const end = this.editor.selectionEnd;
                this.editor.value = this.editor.value.substring(0, start) + '    ' + this.editor.value.substring(end);
                this.editor.selectionStart = this.editor.selectionEnd = start + 4;
            }
        });
        
        // Mettre à jour la position du curseur
        this.editor.addEventListener('keyup', () => this.updateCursorPosition());
        this.editor.addEventListener('click', () => this.updateCursorPosition());
        
        // Fermeture avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('text-editor-overlay')) {
                this.close();
            }
        });
        
        // Empêcher la fermeture accidentelle
        window.addEventListener('beforeunload', (e) => {
            if (this.isModified && document.getElementById('text-editor-overlay')) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    },

    updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.disabled = !this.isModified;
            this.updateStatus(this.isModified ? 'Modifications non enregistrées' : 'Enregistré');
        }
    },

    updateStatus(message, isError = false) {
        const status = document.getElementById('editor-status');
        if (status) {
            status.textContent = message;
            status.className = `text-sm mr-2 ${isError ? 'text-red-600' : this.isModified ? 'text-orange-600' : 'text-green-600'}`;
        }
    },

    updateStats() {
        const content = this.editor.value;
        const lines = content.split('\n').length;
        const chars = content.length;
        
        const linesEl = document.getElementById('editor-lines');
        const charsEl = document.getElementById('editor-chars');
        
        if (linesEl) linesEl.textContent = `Lignes: ${lines}`;
        if (charsEl) charsEl.textContent = `Caractères: ${chars}`;
    },

    updateCursorPosition() {
        const cursorEl = document.getElementById('editor-cursor');
        if (!cursorEl) return;
        
        const pos = this.editor.selectionStart;
        const textBeforeCursor = this.editor.value.substring(0, pos);
        const line = textBeforeCursor.split('\n').length;
        const col = textBeforeCursor.split('\n').pop().length + 1;
        
        cursorEl.textContent = `Ligne ${line}, Col ${col}`;
    },

    changeFontSize(size) {
        this.editor.style.fontSize = `${size}px`;
    },

    undo() {
        document.execCommand('undo');
    },

    redo() {
        document.execCommand('redo');
    },

    find() {
        const search = prompt('Rechercher:');
        if (search) {
            window.find(search);
        }
    },

    async save() {
        if (!this.isModified) return;
        
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enregistrement...';
            this.updateStatus('Enregistrement en cours...');
            
            // Créer un FormData avec le fichier
            const blob = new Blob([this.editor.value], { type: 'text/plain' });
            const file = new File([blob], this.currentPath.split('/').pop(), { type: 'text/plain' });
            
            const formData = new FormData();
            formData.append('files', file);
            
            // Déterminer le dossier parent
            const pathParts = this.currentPath.split('/');
            pathParts.pop(); // Enlever le nom du fichier
            const parentPath = '/' + pathParts.join('/');
            
            formData.append('path', parentPath);
            
            const response = await fetch(API_BASE + '/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.originalContent = this.editor.value;
                this.isModified = false;
                this.updateSaveButton();
                this.updateStatus('Enregistré');
                notifications.show('Fichier enregistré avec succès', 'success');
            } else {
                throw new Error(result.error || 'Erreur lors de l\'enregistrement');
            }
            
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
            this.updateStatus('Erreur d\'enregistrement', true);
            notifications.show(`Impossible d'enregistrer: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    },

    close() {
        if (this.isModified) {
            if (!confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer l\'éditeur ?')) {
                return;
            }
        }
        
        const overlay = document.getElementById('text-editor-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        this.currentPath = null;
        this.originalContent = null;
        this.isModified = false;
        this.editor = null;
    }
};