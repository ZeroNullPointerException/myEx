
// ============================================
// folderActions.js - Actions sur les dossiers
// ============================================

const folderActions = {
    openCreateModal() {
        contextMenu.hide();
        const title = "Créer un nouveau dossier";
        const content = `
            <form id="create-folder-form" class="space-y-4">
                <label for="folder-name" class="block text-sm font-medium text-slate-700">Nom du dossier :</label>
                <input type="text" id="folder-name" name="folder-name" 
                       class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                       placeholder="Nouveau Dossier" required autofocus>
                <div class="flex justify-end space-x-3 pt-2">
                    <button type="button" onclick="modal.close()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                    <button type="submit" class="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition">Créer</button>
                </div>
            </form>
        `;
        modal.open(title, content);

        document.getElementById('create-folder-form').addEventListener('submit', folderActions.handleCreate);
    },

    async handleCreate(event) {
        event.preventDefault();
        modal.close();

        const folderName = document.getElementById('folder-name').value.trim();
        if (!folderName) {
            notifications.show("Le nom du dossier ne peut pas être vide.", 'warning');
            return;
        }

        try {
            const response = await fetch(API_BASE + '/create_folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parent_path: state.currentPath,
                    folder_name: folderName
                })
            });

            const result = await response.json();

            if (response.ok) {
                notifications.show(result.message, 'success');
                navigation.navigateToFolder(state.currentPath);
            } else {
                throw new Error(result.error || "Erreur inconnue lors de la création du dossier.");
            }
        } catch (error) {
            console.error("Erreur de création de dossier:", error);
            notifications.show(`Échec de la création: ${error.message}`, 'error');
        }
    },

    openRenameModal(currentName, path, isFolder) {
        contextMenu.hide();
        const title = `Renommer ${isFolder ? 'le dossier' : 'le fichier'}`;
        
        let nameWithoutExt = currentName;
        let extension = '';
        
        if (!isFolder && currentName.includes('.')) {
            const lastDotIndex = currentName.lastIndexOf('.');
            nameWithoutExt = currentName.substring(0, lastDotIndex);
            extension = currentName.substring(lastDotIndex);
        }
        
        const content = `
            <form id="rename-form" class="space-y-4">
                <div>
                    <label for="new-name" class="block text-sm font-medium text-slate-700 mb-2">
                        Nouveau nom ${isFolder ? 'du dossier' : 'du fichier'} :
                    </label>
                    <div class="flex items-center gap-2">
                        <input type="text" id="new-name" name="new-name" 
                               class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                               value="${nameWithoutExt}" required autofocus>
                        ${!isFolder ? `<span class="text-slate-600 font-medium">${extension}</span>` : ''}
                    </div>
                    <p class="text-xs text-slate-500 mt-2">
                        ${isFolder ? 'Le nom ne doit pas contenir de caractères spéciaux.' : `L'extension ${extension} sera conservée.`}
                    </p>
                </div>
                <input type="hidden" id="old-path" value="${path}">
                <input type="hidden" id="is-folder" value="${isFolder}">
                <input type="hidden" id="extension" value="${extension}">
                <div class="flex justify-end space-x-3 pt-2">
                    <button type="button" onclick="modal.close()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                    <button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Renommer</button>
                </div>
            </form>
        `;
        modal.open(title, content);

        document.getElementById('rename-form').addEventListener('submit', folderActions.handleRename);
        
        const input = document.getElementById('new-name');
        input.select();
    },

    async handleRename(event) {
        event.preventDefault();
        modal.close();

        const newNameInput = document.getElementById('new-name').value.trim();
        const oldPath = document.getElementById('old-path').value;
        const isFolder = document.getElementById('is-folder').value === 'true';
        const extension = document.getElementById('extension').value;
        
        if (!newNameInput) {
            notifications.show("Le nouveau nom ne peut pas être vide.", 'warning');
            return;
        }

        const newName = isFolder ? newNameInput : newNameInput + extension;

        try {
            const response = await fetch(API_BASE + '/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    old_path: oldPath,
                    new_name: newName
                })
            });

            const result = await response.json();

            if (response.ok) {
                notifications.show(result.message, 'success');
                navigation.navigateToFolder(state.currentPath);
            } else {
                throw new Error(result.error || "Erreur inconnue lors du renommage.");
            }
        } catch (error) {
            console.error("Erreur de renommage:", error);
            notifications.show(`Échec du renommage: ${error.message}`, 'error');
        }
    }
};
