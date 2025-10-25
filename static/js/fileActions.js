// ============================================
// fileActions.js - Actions sur les fichiers (avec fenêtres flottantes et éditeur)
// ============================================

const fileActions = {
    longPressTimer: null,
    longPressDelay: 500, // 500ms pour l'appui long
    touchStartData: null,
    
    handleFileClick(filename, path, mimeType, size) {
        const canBeViewed = fileActions.canViewFile(mimeType, filename);
        
        if (canBeViewed) {
            fileActions.viewFile(path, mimeType, size);
        } else {
            fileActions.downloadFile(path);
        }
    },

    canViewFile(mimeType, filename) {
        if (mimeType.startsWith('image/')) return true;
        if (mimeType.startsWith('video/')) return true;
        if (mimeType.startsWith('audio/')) return true;
        if (mimeType.startsWith('text/')) return true;
        if (mimeType === 'application/json') return true;
        
        const codeExtensions = ['.py', '.js', '.html', '.css', '.xml', '.log', '.json', '.md', '.yml', '.yaml', '.sh', '.bat', '.txt'];
        if (codeExtensions.some(ext => filename.toLowerCase().endsWith(ext))) return true;
        
        return false;
    },

    canEditFile(mimeType, filename) {
        if (mimeType.startsWith('text/')) return true;
        if (mimeType === 'application/json') return true;
        
        const editableExtensions = ['.py', '.js', '.html', '.css', '.xml', '.log', '.json', '.md', '.yml', '.yaml', '.sh', '.bat', '.txt', '.env', '.conf', '.cfg', '.ini'];
        return editableExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    },

    editFile(path, filename) {
        contextMenu.hide();
        textEditor.open(path, filename);
    },

    downloadFile(path) {
        contextMenu.hide();
        window.open(utils.buildApiUrl('download', path), '_blank');
        notifications.show(`Téléchargement de ${path.split('/').pop()} initié.`, 'info');
    },

    downloadFolder(path) {
        contextMenu.hide();
        const folderName = path.split('/').filter(s => s).pop() || 'root';
        window.open(API_BASE + `/download_folder?path=${encodeURIComponent(path)}`, '_blank');
        notifications.show(`Création de l'archive ${folderName}.zip en cours...`, 'info');
    },

    viewFile(path, mimeType, size) {
        contextMenu.hide();
        const filename = path.split('/').pop();
        const isMobile = window.innerWidth <= 768;

        // Comportement selon le type de fichier et l'appareil
        if (mimeType.startsWith('image/')) {
            if (isMobile) {
                // Mobile : ouvrir dans un nouvel onglet par défaut
                window.open(utils.buildApiUrl('view', path), '_blank');
            } else {
                // Desktop : fenêtre flottante
                floatingViewer.createImageViewer(filename, utils.buildApiUrl('view', path));
                notifications.show(`Image "${filename}" ouverte dans une fenêtre flottante`, 'success');
            }
        } else if (mimeType.startsWith('audio/')) {
            if (isMobile) {
                // Mobile : ouvrir dans un nouvel onglet par défaut
                window.open(utils.buildApiUrl('view', path), '_blank');
            } else {
                // Desktop : fenêtre flottante
                floatingViewer.createAudioPlayer(filename, utils.buildApiUrl('view', path));
                notifications.show(`Lecture audio de "${filename}" démarrée`, 'success');
            }
        } else if (mimeType.startsWith('video/')) {
            window.open(API_BASE + `/player?path=${path}`, '_blank');
        } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || filename.endsWith('.log') || filename.endsWith('.py') || filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js')) {
            window.open(utils.buildApiUrl('view', path), '_blank');
        } else {
            notifications.show(`Visualisation non supportée pour ${filename}. Lancement du téléchargement.`, 'warning');
            fileActions.downloadFile(path);
        }
    },
    
    // Ouvrir en mode fenêtre flottante (forcé)
    viewFileFloating(path, mimeType) {
        contextMenu.hide();
        const filename = path.split('/').pop();
        
        if (mimeType.startsWith('image/')) {
            floatingViewer.createImageViewer(filename, utils.buildApiUrl('view', path));
            notifications.show(`🖼️ Image ouverte en fenêtre flottante`, 'success');
        } else if (mimeType.startsWith('audio/')) {
            floatingViewer.createAudioPlayer(filename, utils.buildApiUrl('view', path));
            notifications.show(`🎵 Lecture audio en fenêtre flottante`, 'success');
        }
    },

    confirmDelete(name, path) {
        contextMenu.hide();
        const isFolder = name.endsWith('/');

        const title = `Supprimer ${isFolder ? 'le dossier' : 'le fichier'} ?`;
        const content = `
            <p class="text-slate-700">Êtes-vous sûr de vouloir supprimer définitivement :</p>
            <p class="font-semibold text-red-600 mt-2 truncate">${name}</p>
            <p class="text-sm text-slate-500 mt-2">Cette action est irréversible.</p>
            <div class="flex justify-end space-x-3 pt-4">
                <button type="button" onclick="modal.close()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                <button type="button" onclick="fileActions.handleDelete('${path}')" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">Supprimer</button>
            </div>
        `;
        modal.open(title, content);
    },

    async handleDelete(path) {
        modal.close();

        try {
            const response = await fetch(API_BASE + '/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: path })
            });

            const result = await response.json();

            if (response.ok) {
                notifications.show(result.message, 'success');
                navigation.navigateToFolder(state.currentPath);
            } else {
                throw new Error(result.error || "Erreur inconnue lors de la suppression.");
            }
        } catch (error) {
            console.error("Erreur de suppression:", error);
            notifications.show(`Échec de la suppression: ${error.message}`, 'error');
        }
    },
    
    // Gestion de l'appui long pour mobile
    setupLongPressHandlers() {
        // Cette fonction sera appelée lors de la génération de la liste de fichiers
        document.addEventListener('touchstart', (e) => {
            // Trouver si on touche une ligne de fichier
            const fileRow = e.target.closest('tr[data-file-path]');
            if (!fileRow) return;
            
            const path = fileRow.getAttribute('data-file-path');
            const name = fileRow.getAttribute('data-file-name');
            const mimeType = fileRow.getAttribute('data-mime-type');
            const size = fileRow.getAttribute('data-file-size');
            const isFolder = fileRow.getAttribute('data-is-folder') === 'true';
            
            // Sauvegarder les données
            fileActions.touchStartData = { path, name, mimeType, size, isFolder };
            
            // Démarrer le timer d'appui long
            fileActions.longPressTimer = setTimeout(() => {
                // Appui long détecté
                e.preventDefault();
                
                // Vibration si supportée
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                // Afficher le menu contextuel
                const touch = e.touches[0];
                const fakeEvent = {
                    preventDefault: () => {},
                    pageX: touch.pageX,
                    pageY: touch.pageY
                };
                
                contextMenu.show(fakeEvent, name, path, mimeType, size, isFolder);
                
            }, fileActions.longPressDelay);
            
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            // Annuler l'appui long si on bouge le doigt
            if (fileActions.longPressTimer) {
                clearTimeout(fileActions.longPressTimer);
                fileActions.longPressTimer = null;
            }
        });
        
        document.addEventListener('touchend', (e) => {
            // Annuler l'appui long
            if (fileActions.longPressTimer) {
                clearTimeout(fileActions.longPressTimer);
                fileActions.longPressTimer = null;
            }
        });
        
        document.addEventListener('touchcancel', (e) => {
            // Annuler l'appui long
            if (fileActions.longPressTimer) {
                clearTimeout(fileActions.longPressTimer);
                fileActions.longPressTimer = null;
            }
        });
    }
};

// Initialiser les handlers d'appui long au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        fileActions.setupLongPressHandlers();
    });
} else {
    fileActions.setupLongPressHandlers();
}