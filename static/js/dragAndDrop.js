// ============================================
// dragAndDrop.js - Gestion du Drag & Drop
// ============================================

const dragAndDrop = {
    dropZone: null,
    overlay: null,
    uploadQueue: [],
    isUploading: false,
    
    init() {
        // Créer l'overlay de drop
        this.createDropOverlay();
        
        // Attacher les événements sur la zone de fichiers
        this.dropZone = document.getElementById('file-list');
        
        if (!this.dropZone) {
            console.warn('dropZone non trouvée, drag&drop non initialisé');
            return;
        }
        
        // Empêcher le comportement par défaut du navigateur
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop zone
        ['dragenter', 'dragover'].forEach(eventName => {
            document.body.addEventListener(eventName, () => this.showDropOverlay(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, () => this.hideDropOverlay(), false);
        });
        
        // Gérer le drop
        document.body.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        console.log('✅ Drag & Drop initialisé');
    },
    
    createDropOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'drop-overlay';
        this.overlay.className = 'hidden';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(59, 130, 246, 0.9);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        `;
        
        this.overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <i class="fas fa-cloud-upload-alt" style="font-size: 80px; margin-bottom: 20px; animation: bounce 1s infinite;"></i>
                <h2 style="font-size: 32px; font-weight: 600; margin-bottom: 10px;">Déposez vos fichiers ici</h2>
                <p style="font-size: 18px; opacity: 0.9;">Les fichiers seront uploadés dans le dossier actuel</p>
            </div>
            <style>
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
            </style>
        `;
        
        document.body.appendChild(this.overlay);
    },
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    showDropOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('hidden');
        }
    },
    
    hideDropOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    },
    
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length === 0) return;
        
        this.hideDropOverlay();
        
        // Ajouter les fichiers à la queue
        Array.from(files).forEach(file => {
            this.uploadQueue.push(file);
        });
        
        // Afficher une notification
        if (typeof notifications !== 'undefined') {
            notifications.show(`📤 ${files.length} fichier(s) en attente d'upload`, 'info');
        }
        
        // Démarrer l'upload si pas déjà en cours
        if (!this.isUploading) {
            this.processQueue();
        }
    },
    
    async processQueue() {
        if (this.uploadQueue.length === 0) {
            this.isUploading = false;
            return;
        }
        
        this.isUploading = true;
        const file = this.uploadQueue.shift();
        
        await this.uploadFile(file);
        
        // Continuer avec le prochain fichier
        this.processQueue();
    },
    
    async uploadFile(file) {
        const currentPath = state.currentPath || '/';
        
        // Créer une notification de progression
        const uploadId = 'upload-' + Date.now();
        if (typeof notifications !== 'undefined') {
            notifications.show(`⏳ Upload de ${file.name}...`, 'info', 0);
        }
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', currentPath);
            
            const response = await fetch(API_BASE + '/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                if (typeof notifications !== 'undefined') {
                    notifications.show(`✅ ${file.name} uploadé avec succès`, 'success');
                }
                
                // Rafraîchir la liste des fichiers si on est sur le bon dossier
                if (typeof navigation !== 'undefined' && state.currentPath === currentPath) {
                    navigation.navigateToFolder(currentPath);
                }
            } else {
                throw new Error(result.error || 'Erreur lors de l\'upload');
            }
            
        } catch (error) {
            console.error('Erreur upload:', error);
            if (typeof notifications !== 'undefined') {
                notifications.show(`❌ Échec de l'upload de ${file.name}: ${error.message}`, 'error');
            }
        }
    },
    
    // Méthode pour ouvrir le sélecteur de fichiers classique
    openFileSelector() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                Array.from(files).forEach(file => {
                    this.uploadQueue.push(file);
                });
                
                if (typeof notifications !== 'undefined') {
                    notifications.show(`📤 ${files.length} fichier(s) sélectionné(s)`, 'info');
                }
                
                if (!this.isUploading) {
                    this.processQueue();
                }
            }
        };
        input.click();
    }
};

// Initialiser au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dragAndDrop.init();
    });
} else {
    dragAndDrop.init();
}