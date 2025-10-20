// ============================================
// ui.js - Gestion de l'interface utilisateur
// ============================================

const ui = {
    showLoading() {
        dom.fileListBody.innerHTML = `
            <tr class="bg-blue-50">
                <td colspan="4" class="py-4 text-center text-blue-600 font-semibold">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Chargement des fichiers...
                </td>
            </tr>
        `;
    },

    showSlowLoadingWarning() {
        dom.fileListBody.innerHTML = `
            <tr class="bg-yellow-50">
                <td colspan="4" class="py-6 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-spinner fa-spin text-yellow-600 text-3xl mb-3"></i>
                        <p class="text-yellow-700 font-semibold">Chargement en cours...</p>
                        <p class="text-yellow-600 text-sm mt-2">Ce répertoire contient beaucoup d'éléments</p>
                        <p class="text-yellow-500 text-xs mt-1">Veuillez patienter...</p>
                    </div>
                </td>
            </tr>
        `;
    },

    hideLoading() {
        // La fonction navigateToFolder remplace directement le contenu
    },

    renderFileList(files, path, isSearchResult) {
        dom.pathDisplay.innerHTML = '';
        dom.fileListBody.innerHTML = '';

        // Affichage de la barre d'adresse
        if (isSearchResult) {
            state.isSearchMode = true;
            const searchTerm = path.replace("Recherche: '", "").replace("'", "");
            dom.pathDisplay.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-search text-blue-600"></i>
                        <span class="text-slate-600">Résultats pour :</span> 
                        <span class="font-bold text-blue-700">${searchTerm}</span>
                        <span class="text-slate-500 text-sm">(${files.length} résultat${files.length > 1 ? 's' : ''})</span>
                    </div>
                    <button onclick="search.exitSearchMode()" 
                            class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition duration-150 text-sm font-medium">
                        <i class="fas fa-times"></i>
                        <span>Quitter la recherche</span>
                    </button>
                </div>
            `;
        } else {
            state.isSearchMode = false;
            const segments = path.split('/').filter(s => s.length > 0);
            let currentSegmentsPath = '';

            dom.pathDisplay.innerHTML += `
                <span class="breadcrumb-segment text-slate-400 hover:text-blue-700 cursor-pointer transition duration-150" 
                      onclick="navigation.navigateToFolder('${ROOT_PATH}')">
                    <i class="fas fa-home"></i> Racine
                </span>
                <span class="text-slate-400 mx-2">/</span>
            `;

            segments.forEach((segment, index) => {
                currentSegmentsPath += '/' + segment;
                const finalPath = currentSegmentsPath;
                const isLast = index === segments.length - 1;
                
                const segmentHtml = `
                    <span class="breadcrumb-segment ${isLast ? 'text-slate-800 font-bold' : 'text-slate-600 hover:text-blue-700 cursor-pointer'} transition duration-150"
                          onclick="navigation.navigateToFolder('${finalPath}')">
                        ${segment}
                    </span>
                `;
                
                dom.pathDisplay.innerHTML += segmentHtml;
                
                if (!isLast) {
                    dom.pathDisplay.innerHTML += `<span class="text-slate-400 mx-2">/</span>`;
                }
            });
        }

        // Tri des fichiers
        if (!isSearchResult) {
            files.sort(sorting.compareFiles);
        }
        
        // Bouton "Retour"
        if (!isSearchResult && state.currentPath !== ROOT_PATH) {
            const backRow = document.createElement('tr');
            backRow.className = 'hover:bg-slate-100 transition duration-150 cursor-pointer group';
            backRow.onclick = () => navigation.navigateUp();
            backRow.innerHTML = `
                <td class="flex items-center px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                    <i class="fas fa-level-up-alt w-5 text-center mr-3 text-slate-400 group-hover:text-blue-600 transition duration-150"></i>
                    <span class="group-hover:text-blue-700 transition duration-150">... (Remonter)</span>
                </td>
                <td colspan="3" class="px-4 py-3 text-sm text-slate-500"></td>
            `;
            dom.fileListBody.appendChild(backRow);
        }

        // Liste des fichiers
        if (files.length === 0) {
            dom.fileListBody.innerHTML += `
                <tr>
                    <td colspan="4" class="py-10 text-center text-slate-500 text-lg">
                        <i class="fas fa-folder-open text-4xl mb-3 text-slate-300"></i>
                        <p>${isSearchResult ? 'Aucun résultat trouvé.' : 'Ce dossier est vide.'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Afficher message pour gros répertoires
        if (files.length > 200) {
            const infoRow = document.createElement('tr');
            infoRow.className = 'bg-blue-50';
            infoRow.id = 'loading-info';
            infoRow.innerHTML = `
                <td colspan="4" class="py-2 text-center text-blue-600 text-sm">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    Affichage de ${files.length} éléments en cours...
                </td>
            `;
            dom.fileListBody.appendChild(infoRow);
        }

        // Rendu optimisé par morceaux avec vrai délai asynchrone
        const CHUNK_SIZE = 100;
        let currentIndex = 0;

        const renderChunk = () => {
            const endIndex = Math.min(currentIndex + CHUNK_SIZE, files.length);
            const fragment = document.createDocumentFragment();
            
            for (let i = currentIndex; i < endIndex; i++) {
                const file = files[i];
                const tr = document.createElement('tr');
                
                const icon = file.is_folder ? 
                    '<i class="fas fa-folder text-yellow-500 w-5 text-center mr-3"></i>' : 
                    utils.getFileIcon(file.name);
                
                const nameClass = file.is_folder ? 'font-medium text-blue-600' : 'text-slate-800';
                const rowClass = file.is_folder ? 'cursor-pointer hover:bg-yellow-50' : 'cursor-pointer hover:bg-blue-50';

                const displayName = isSearchResult ? 
                    `<span class="text-xs text-slate-500 block mb-0.5">${file.full_relative_path.split('/').slice(0, -1).join('/') || '/'}</span>${file.name}` : 
                    file.name;

                tr.className = `${rowClass} transition duration-150 group`;
                
                // Événements via propriétés au lieu d'attributs inline
                tr.onclick = () => {
                    if (file.is_folder) {
                        navigation.navigateToFolder('/' + file.full_relative_path);
                    } else {
                        fileActions.handleFileClick(file.name, file.full_relative_path, file.mime_type, file.size);
                    }
                };
                
                tr.oncontextmenu = (e) => {
                    contextMenu.show(e, file.name, file.full_relative_path, file.mime_type, file.size, file.is_folder);
                };

                tr.innerHTML = `
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                        <div class="flex items-center ${nameClass} text-sm">
                            ${icon}
                            <div>${displayName}</div>
                        </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500 hidden sm:table-cell">
                        ${file.is_folder ? '-' : utils.formatBytes(file.size)}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">
                        ${new Date(file.modified).toLocaleString('fr-FR')}
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap text-sm font-medium">
                        <button class="text-slate-400 hover:text-blue-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" 
                                title="Plus d'options">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </td>
                `;
                
                // Ajouter événement au bouton menu
                const menuBtn = tr.querySelector('button');
                menuBtn.onclick = (e) => {
                    e.stopPropagation();
                    contextMenu.show(e, file.name, file.full_relative_path, file.mime_type, file.size, file.is_folder);
                };
                
                fragment.appendChild(tr);
            }
            
            dom.fileListBody.appendChild(fragment);
            currentIndex = endIndex;
            
            // Continuer si nécessaire
            if (currentIndex < files.length) {
                // Utiliser setTimeout avec délai 0 pour libérer le thread
                setTimeout(renderChunk, 0);
            } else {
                // Terminé - supprimer l'indicateur
                const loadingInfo = document.getElementById('loading-info');
                if (loadingInfo) loadingInfo.remove();
                
                sorting.updateIndicators();
            }
        };

        // Démarrer le rendu
        setTimeout(renderChunk, 0);
    }
};