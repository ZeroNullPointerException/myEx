// ============================================
// contextMenu.js - Menu contextuel
// ============================================

const contextMenu = {
    show(event, name, path, mimeType, size, isFolder) {
        event.preventDefault();
        event.stopPropagation();
        
        state.selectedFile = { name, path, mimeType, size, isFolder };
        
        const menuHtml = contextMenu.generateHtml(state.selectedFile);
        dom.contextMenu.innerHTML = menuHtml;
        
        const x = event.clientX; 
        const y = event.clientY;
        
        dom.contextMenu.style.position = 'fixed';
        dom.contextMenu.style.top = `${y}px`;
        dom.contextMenu.style.left = `${x}px`;
        
        dom.contextMenu.classList.remove('hidden');

        const menuWidth = dom.contextMenu.offsetWidth;
        const menuHeight = dom.contextMenu.offsetHeight;

        if (x + menuWidth > window.innerWidth) {
            dom.contextMenu.style.left = `${window.innerWidth - menuWidth - 10}px`;
        }
        if (y + menuHeight > window.innerHeight) {
            dom.contextMenu.style.top = `${window.innerHeight - menuHeight - 10}px`;
        } else if (y < 0) {
            dom.contextMenu.style.top = `10px`;
        }
    },

    hide() {
        if (dom.contextMenu) {
            dom.contextMenu.classList.add('hidden');
        }
    },

    generateHtml(file) {
        let html = `
            <div class="px-3 py-2 border-b border-slate-100 text-sm font-semibold text-slate-800 truncate">
                ${file.name}
            </div>
        `;

        // -------------------------------------------------------------
        // LOGIQUE CONDITIONNELLE POUR LE BOUTON "ALLER AU DOSSIER PARENT"
        // Le bouton n'est affiché que si le gestionnaire est en mode recherche
        let parentButtonHtml = '';
        if (typeof state !== 'undefined' && state.isSearchMode) { 
            parentButtonHtml = `
                <div class="border-t border-slate-100 my-1"></div>
                <button onclick="contextMenu.hide(); navigation.navigateToFolder(utils.getParentPath('${file.path}'))" 
                        class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                    <i class="fas fa-level-up-alt mr-2 w-4"></i> Aller au dossier parent
                </button>
            `;
        }
        // -------------------------------------------------------------
        
        if (file.isFolder) {
            html += `
                <button onclick="navigation.navigateToFolder('/${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                    <i class="fas fa-folder-open mr-2 w-4"></i> Ouvrir
                </button>
                <button onclick="folderActions.openRenameModal('${file.name}', '${file.path}', true)" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                    <i class="fas fa-edit mr-2 w-4"></i> Renommer
                </button>
                
                ${parentButtonHtml} <div class="border-t border-slate-100 my-1"></div>
                <button onclick="fileActions.confirmDelete('${file.name}', '${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition duration-150">
                    <i class="fas fa-trash-alt mr-2 w-4"></i> Supprimer le dossier
                </button>
            `;
        } else {
            const canView = fileActions.canViewFile(file.mimeType, file.name);
            html += `
                <button onclick="fileActions.handleFileClick('${file.name}', '${file.path}', '${file.mimeType}', ${file.size})" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                    <i class="fas ${canView ? 'fa-eye' : 'fa-download'} mr-2 w-4"></i> ${canView ? 'Visualiser' : 'Télécharger'}
                </button>
            `;
            if (canView) {
                html += `
                    <button onclick="fileActions.downloadFile('${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                        <i class="fas fa-download mr-2 w-4"></i> Télécharger
                    </button>
                `;
            }
            html += `
                <button onclick="folderActions.openRenameModal('${file.name}', '${file.path}', false)" class="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition duration-150">
                    <i class="fas fa-edit mr-2 w-4"></i> Renommer
                </button>
                
                ${parentButtonHtml} <div class="border-t border-slate-100 my-1"></div>
                <button onclick="fileActions.confirmDelete('${file.name}', '${file.path}')" class="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition duration-150">
                    <i class="fas fa-trash-alt mr-2 w-4"></i> Supprimer le fichier
                </button>
            `;
        }

        return html;
    }
};