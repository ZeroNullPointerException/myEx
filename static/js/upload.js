// ============================================
// upload.js - Gestion du téléversement
// ============================================

const upload = {
    openModal() {
        contextMenu.hide();
        
        const title = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <i class="fas fa-cloud-upload-alt text-white text-lg"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Téléverser des fichiers</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Glissez vos fichiers ou cliquez pour parcourir</p>
                </div>
            </div>
        `;
        
        const content = `
            <form id="upload-form" class="space-y-6">
                
                <div class="space-y-6 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
                
                    <div id="drop-zone" class="relative group">
                        <input type="file" id="file-input" name="files" multiple webkitdirectory="" 
                           class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                           onchange="upload.handleFileSelect(event)">
                        
                        <div class="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center transition-all duration-300 hover:border-blue-500 hover:bg-blue-50/50 group-hover:scale-[1.02]">
                            <div class="flex flex-col items-center gap-3">
                                <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center transform transition-transform group-hover:scale-110">
                                    <i class="fas fa-folder-open text-blue-600 text-xl"></i>
                                </div>
                                
                                <div>
                                    <p class="text-base font-semibold text-slate-700 mb-0.5">
                                        Sélectionnez un dossier complet
                                    </p>
                                    <p class="text-xs text-slate-500">
                                        ou glissez-déposez vos fichiers ici
                                    </p>
                                </div>
                                
                                <div class="flex gap-2 text-xs text-slate-400 mt-1">
                                    <span class="px-3 py-1 bg-slate-100 rounded-full">Tous formats</span>
                                    <span class="px-3 py-1 bg-slate-100 rounded-full">Structure préservée</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 text-sm text-slate-500">
                        <div class="flex-1 h-px bg-slate-200"></div>
                        <span class="font-medium">ou</span>
                        <div class="flex-1 h-px bg-slate-200"></div>
                    </div>

                    <label class="block">
                        <input type="file" id="file-input-single" name="files" multiple 
                            class="hidden"
                            onchange="upload.handleFileSelect(event)">
                        <div class="cursor-pointer border-2 border-slate-200 rounded-xl p-4 text-center transition-all duration-200 hover:border-blue-500 hover:bg-blue-50/30">
                            <div class="flex items-center justify-center gap-3">
                                <i class="fas fa-file text-slate-400 text-lg"></i>
                                <span class="font-medium text-slate-700">Sélectionner des fichiers individuels</span>
                            </div>
                        </div>
                    </label>

                    <div id="file-list" class="hidden space-y-2"></div>

                    <div id="upload-progress" class="hidden space-y-2">
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-medium text-slate-700">Téléversement en cours...</span>
                            <span id="progress-text" class="text-blue-600 font-semibold">0%</span>
                        </div>
                        <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div id="progress-bar" class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out" style="width: 0%"></div>
                        </div>
                    </div>
                
                </div> <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="modal.close()" 
                            class="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all duration-200">
                        Annuler
                    </button>
                    <button type="submit" id="upload-btn" disabled
                            class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                        <i class="fas fa-upload mr-2"></i>
                        Téléverser
                    </button>
                </div>
            </form>
        `;
        
        modal.open(title, content);
        upload.setupDragAndDrop();
        
        document.getElementById('upload-form').addEventListener('submit', upload.handleUpload);
    },

    setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-blue-500', 'bg-blue-50');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            const input = document.getElementById('file-input');
            input.files = files;
            upload.handleFileSelect({ target: input });
        });
    },
handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const fileListDiv = document.getElementById('file-list');
        const uploadBtn = document.getElementById('upload-btn');
        
        fileListDiv.innerHTML = '';
        fileListDiv.classList.remove('hidden');

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between pb-2 mb-3 border-b border-slate-200';
        header.innerHTML = `
            <span class="text-sm font-semibold text-slate-700">
                <i class="fas fa-check-circle text-green-500 mr-2"></i>
                ${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}
            </span>
            <button type="button" onclick="upload.clearFiles()" class="text-xs text-red-600 hover:text-red-700 font-medium">
                <i class="fas fa-times mr-1"></i>Effacer
            </button>
        `;
        fileListDiv.appendChild(header);

        const listContainer = document.createElement('div');
        // Note: 'max-h-48' et 'overflow-y-auto' sont gérés par le conteneur principal de la modale (max-h-[60vh]), 
        // mais cette classe est conservée pour des raisons de style si besoin d'un défilement secondaire.
        listContainer.className = 'space-y-2 max-h-48 overflow-y-auto pr-2'; 
        
        // MODIFICATION 1 : Supprimer .slice(0, 10) pour parcourir TOUS les fichiers
        files.forEach(file => { 
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors';
            
            const icon = file.type.startsWith('image/') ? 'fa-image text-purple-500' :
                        file.type.startsWith('video/') ? 'fa-video text-red-500' :
                        file.type.startsWith('audio/') ? 'fa-music text-pink-500' :
                        'fa-file text-slate-500';
            
            fileItem.innerHTML = `
                <i class="fas ${icon} text-lg"></i>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-700 truncate">${file.name}</p>
                    <p class="text-xs text-slate-500">${upload.formatSize(file.size)}</p>
                </div>
            `;
            listContainer.appendChild(fileItem);
        });
        
        // MODIFICATION 2 : Supprimer le bloc qui affichait "et X autres fichiers"
        /*
        if (files.length > 10) {
            const moreItem = document.createElement('div');
            moreItem.className = 'text-center text-sm text-slate-500 py-2';
            moreItem.innerHTML = `<i class="fas fa-ellipsis-h mr-2"></i>et ${files.length - 10} autre${files.length - 10 > 1 ? 's' : ''} fichier${files.length - 10 > 1 ? 's' : ''}`;
            listContainer.appendChild(moreItem);
        }
        */
        
        fileListDiv.appendChild(listContainer);
        uploadBtn.disabled = false;
    },

    clearFiles() {
        document.getElementById('file-input').value = '';
        document.getElementById('file-input-single').value = '';
        document.getElementById('file-list').classList.add('hidden');
        document.getElementById('upload-btn').disabled = true;
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    async handleUpload(event) {
        event.preventDefault();

        const fileInput = document.getElementById('file-input');
        const fileInputSingle = document.getElementById('file-input-single');
        const files = fileInput.files.length > 0 ? fileInput.files : fileInputSingle.files;

        if (files.length === 0) {
            notifications.show("Aucun fichier sélectionné.", 'warning');
            return;
        }

        const progressDiv = document.getElementById('upload-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const uploadBtn = document.getElementById('upload-btn');
        const fileListDiv = document.getElementById('file-list');

        progressDiv.classList.remove('hidden');
        uploadBtn.disabled = true;
        fileListDiv.classList.add('hidden');

        const formData = new FormData();
        formData.append('path', state.currentPath);

        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
            if (files[i].webkitRelativePath) {
                formData.append('paths', files[i].webkitRelativePath);
            }
        }

        try {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percentComplete + '%';
                    progressText.textContent = percentComplete + '%';
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 201) {
                    const result = JSON.parse(xhr.responseText);
                    notifications.show(result.message, 'success');
                    modal.close();
                    navigation.navigateToFolder(state.currentPath);
                } else {
                    const result = JSON.parse(xhr.responseText);
                    throw new Error(result.error || "Erreur lors du téléversement.");
                }
            });

            xhr.addEventListener('error', () => {
                throw new Error("Erreur réseau lors du téléversement.");
            });

            xhr.open('POST', API_BASE + '/upload');
            xhr.send(formData);

        } catch (error) {
            console.error("Erreur de téléversement:", error);
            notifications.show(`Échec du téléversement: ${error.message}`, 'error');
            progressDiv.classList.add('hidden');
            uploadBtn.disabled = false;
            fileListDiv.classList.remove('hidden');
        }
    }
};