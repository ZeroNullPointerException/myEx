
// ============================================
// upload.js - Gestion des téléversements
// ============================================

const upload = {
    openModal() {
        contextMenu.hide();
        
        const content = `
            <form id="upload-form" class="space-y-4">
                <p class="text-sm text-slate-600">Le(s) fichier(s) seront téléversés dans le dossier actuel : 
                    <span class="font-semibold text-blue-600">${state.currentPath}</span>
                </p>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-slate-700">
                        Sélectionner des fichiers ou un dossier :
                    </label>
                    <div class="space-y-3">
                        <div class="flex gap-2">
                            <button type="button" id="select-files-btn" 
                                    class="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition duration-150 border-2 border-blue-400">
                                <i class="fas fa-file mr-2"></i> Fichiers
                            </button>
                            <button type="button" id="select-folder-btn" 
                                    class="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition duration-150 border-2 border-transparent">
                                <i class="fas fa-folder mr-2"></i> Dossier
                            </button>
                        </div>
                        <input type="file" id="upload-file-input" name="file" required multiple
                               class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer">
                        <p class="text-xs text-slate-500">
                            <i class="fas fa-info-circle mr-1"></i>
                            <span id="upload-mode-text">Mode fichiers multiples sélectionné</span>
                        </p>
                    </div>
                </div>
                
                <div id="upload-status-area">
                    <button type="submit" id="upload-submit-btn" 
                            class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150 disabled:opacity-50"
                            disabled>
                        <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                    </button>
                </div>
            </form>
        `;
        
        modal.open("Téléverser des Fichiers", content);
        
        const fileInput = document.getElementById('upload-file-input');
        const selectFilesBtn = document.getElementById('select-files-btn');
        const selectFolderBtn = document.getElementById('select-folder-btn');
        const modeText = document.getElementById('upload-mode-text');
        
        // Mode fichiers
        selectFilesBtn.addEventListener('click', () => {
            fileInput.removeAttribute('webkitdirectory');
            fileInput.removeAttribute('directory');
            fileInput.setAttribute('multiple', '');
            selectFilesBtn.classList.remove('bg-slate-100', 'text-slate-700', 'border-transparent');
            selectFilesBtn.classList.add('bg-blue-100', 'text-blue-700', 'border-blue-400');
            selectFolderBtn.classList.remove('bg-yellow-100', 'text-yellow-700', 'border-yellow-400');
            selectFolderBtn.classList.add('bg-slate-100', 'text-slate-700', 'border-transparent');
            modeText.textContent = 'Mode fichiers multiples sélectionné';
        });
        
        // Mode dossier
        selectFolderBtn.addEventListener('click', () => {
            fileInput.setAttribute('webkitdirectory', '');
            fileInput.setAttribute('directory', '');
            fileInput.removeAttribute('multiple');
            selectFolderBtn.classList.remove('bg-slate-100', 'text-slate-700', 'border-transparent');
            selectFolderBtn.classList.add('bg-yellow-100', 'text-yellow-700', 'border-yellow-400');
            selectFilesBtn.classList.remove('bg-blue-100', 'text-blue-700', 'border-blue-400');
            selectFilesBtn.classList.add('bg-slate-100', 'text-slate-700', 'border-transparent');
            modeText.textContent = 'Mode dossier complet sélectionné';
        });
        
        fileInput.addEventListener('change', upload.handleFileInputChange);
        document.getElementById('upload-form').addEventListener('submit', upload.handleSubmit);
    },

    handleFileInputChange(event) {
        const button = document.getElementById('upload-submit-btn');
        if (button) { 
            if (event.target.files.length > 0) {
                button.removeAttribute('disabled');
                const fileCount = event.target.files.length;
                const buttonText = button.querySelector('span');
                if (buttonText) {
                    buttonText.textContent = `Téléverser (${fileCount} fichier${fileCount > 1 ? 's' : ''})`;
                }
            } else {
                button.setAttribute('disabled', 'disabled');
                const buttonText = button.querySelector('span');
                if (buttonText) {
                    buttonText.textContent = 'Téléverser';
                }
            }
        }
    },

    handleSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const fileInput = document.getElementById('upload-file-input');
        const files = fileInput.files;
        const uploadArea = document.getElementById('upload-status-area');
        
        if (!files || files.length === 0) {
            notifications.show("Veuillez sélectionner des fichiers ou un dossier.", 'warning');
            return;
        }
        
        uploadArea.innerHTML = `
            <div id="progress-container" class="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
                <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full transition-all duration-100 ease-linear" style="width: 0%"></div>
            </div>
            <p id="progress-text" class="text-sm text-center mt-2 text-slate-600">0%</p>
        `;

        const formData = new FormData();
        
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
            if (files[i].webkitRelativePath) {
                formData.append('paths', files[i].webkitRelativePath);
            }
        }
        
        formData.append('path', state.currentPath);
        
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', utils.buildApiUrl('upload'));

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = `${percentComplete}% - ${files.length} fichier(s)`;
            }
        };

        xhr.onload = function() {
            uploadArea.innerHTML = `<button type="submit" id="upload-submit-btn" 
                                        class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150"
                                        disabled>
                                        <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                                    </button>`;
            
            document.getElementById('upload-file-input').addEventListener('change', upload.handleFileInputChange);

            if (xhr.status >= 200 && xhr.status < 300) {
                const result = JSON.parse(xhr.responseText);
                notifications.show(result.message, 'success');
                modal.close();
                navigation.navigateToFolder(state.currentPath);
            } else {
                try {
                    const result = JSON.parse(xhr.responseText);
                    notifications.show(`Échec du téléversement: ${result.error || 'Erreur inconnue'}`, 'error');
                } catch (e) {
                    notifications.show(`Erreur du serveur (${xhr.status}).`, 'error');
                }
            }
        };
        
        xhr.onerror = function() {
            notifications.show("Erreur réseau lors du téléversement.", 'error');
            uploadArea.innerHTML = `<button type="submit" id="upload-submit-btn" 
                                        class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-150"
                                        disabled>
                                        <i class="fas fa-cloud-upload-alt mr-2"></i> <span>Téléverser</span>
                                    </button>`;
        };

        xhr.send(formData);
    }
};