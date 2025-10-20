// ============================================
// moveActions.js - Actions de déplacement
// ============================================

const moveActions = {
    async openMoveModal(name, path, isFolder) {
        contextMenu.hide();
        const title = `Déplacer ${isFolder ? 'le dossier' : 'le fichier'}`;
        
        // Récupérer la liste des dossiers disponibles
        const folders = await moveActions.getFolderList();
        
        const content = `
            <form id="move-form" class="space-y-4">
                <div>
                    <p class="text-sm text-slate-700 mb-2">
                        <strong>Élément à déplacer :</strong> ${name}
                    </p>
                    <label for="destination-folder" class="block text-sm font-medium text-slate-700 mb-2">
                        Sélectionner le dossier de destination :
                    </label>
                    <select id="destination-folder" name="destination-folder" 
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="/">/ (Racine)</option>
                        ${folders.map(folder => `<option value="${folder.path}">${folder.display}</option>`).join('')}
                    </select>
                    <p class="text-xs text-slate-500 mt-2">
                        L'élément sera déplacé dans le dossier sélectionné.
                    </p>
                </div>
                <input type="hidden" id="move-source-path" value="${path}">
                <input type="hidden" id="move-is-folder" value="${isFolder}">
                <div class="flex justify-end space-x-3 pt-2">
                    <button type="button" onclick="modal.close()" class="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Annuler</button>
                    <button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Déplacer</button>
                </div>
            </form>
        `;
        modal.open(title, content);

        document.getElementById('move-form').addEventListener('submit', moveActions.handleMove);
    },

    async getFolderList() {
        try {
            const url = utils.buildApiUrl('list', ROOT_PATH);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            const folders = [];
            
            // Fonction récursive pour parcourir les dossiers
            async function exploreFolders(path, depth = 0) {
                const url = utils.buildApiUrl('list', path);
                const response = await fetch(url);
                
                if (!response.ok) return;
                
                const data = await response.json();
                
                for (const item of data.files) {
                    if (item.is_folder) {
                        const folderPath = '/' + item.full_relative_path;
                        const indent = '　'.repeat(depth);
                        folders.push({
                            path: folderPath,
                            display: `${indent}📁 ${folderPath}`
                        });
                        
                        // Explorer récursivement (limité à 3 niveaux pour éviter la surcharge)
                        if (depth < 3) {
                            await exploreFolders(folderPath, depth + 1);
                        }
                    }
                }
            }
            
            await exploreFolders(ROOT_PATH);
            return folders;
            
        } catch (error) {
            console.error("Erreur lors de la récupération des dossiers:", error);
            return [];
        }
    },

    async handleMove(event) {
        event.preventDefault();
        modal.close();

        const sourcePath = document.getElementById('move-source-path').value;
        const destinationFolder = document.getElementById('destination-folder').value;
        
        if (!destinationFolder) {
            notifications.show("Veuillez sélectionner un dossier de destination.", 'warning');
            return;
        }

        try {
            const response = await fetch(API_BASE + '/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_path: sourcePath,
                    destination_folder: destinationFolder
                })
            });

            const result = await response.json();

            if (response.ok) {
                notifications.show(result.message, 'success');
                navigation.navigateToFolder(state.currentPath);
            } else {
                throw new Error(result.error || "Erreur inconnue lors du déplacement.");
            }
        } catch (error) {
            console.error("Erreur de déplacement:", error);
            notifications.show(`Échec du déplacement: ${error.message}`, 'error');
        }
    }
};