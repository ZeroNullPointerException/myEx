
// ============================================
// fileActions.js - Actions sur les fichiers
// ============================================

const fileActions = {
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

    downloadFile(path) {
        contextMenu.hide();
        window.open(utils.buildApiUrl('download', path), '_blank');
        notifications.show(`Téléchargement de ${path.split('/').pop()} initié.`, 'info');
    },

    viewFile(path, mimeType, size) {
        contextMenu.hide();
        const filename = path.split('/').pop();

        if (mimeType.startsWith('image/')) {
            modal.open(filename, `<img src="${utils.buildApiUrl('view', path)}" alt="${filename}" class="max-w-full h-auto rounded-lg mx-auto shadow-xl">`);
        } else if (mimeType.startsWith('video/')) {
            window.open(API_BASE + `/player?path=${path}`, '_blank');
        } else if (mimeType.startsWith('audio/')) {
            modal.open(filename, `<audio controls src="${utils.buildApiUrl('view', path)}" class="w-full mt-4"></audio>`);
        } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || filename.endsWith('.log') || filename.endsWith('.py') || filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js')) {
            window.open(utils.buildApiUrl('view', path), '_blank');
        } else {
            notifications.show(`Visualisation non supportée pour ${filename}. Lancement du téléchargement.`, 'warning');
            fileActions.downloadFile(path);
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
    }
};
