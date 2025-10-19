

// ============================================
// navigation.js - Gestion de la navigation
// ============================================

const navigation = {
    async navigateToFolder(newPath, isSearchResult = false, addToHistory = true) {
        if (!isSearchResult) {
            state.currentPath = newPath;
            state.isSearchMode = false;
            
            if (addToHistory) {
                state.navigationHistory = state.navigationHistory.slice(0, state.historyIndex + 1);
                if (state.navigationHistory[state.navigationHistory.length - 1] !== newPath) {
                    state.navigationHistory.push(newPath);
                    state.historyIndex = state.navigationHistory.length - 1;
                }
            }
            
            history.pushState({ path: state.currentPath }, '', `?path=${encodeURIComponent(state.currentPath)}`);
        }

        ui.showLoading();
        
        try {
            const url = utils.buildApiUrl('list', newPath);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            ui.renderFileList(data.files, data.current_path, data.is_search_result);
            
        } catch (error) {
            console.error("Erreur lors de la récupération de la liste des fichiers:", error);
            notifications.show(`Erreur lors de la navigation: ${error.message}`, 'error');
            if (newPath !== ROOT_PATH && !isSearchResult) {
                navigation.navigateToFolder(ROOT_PATH);
            }
        } finally {
            ui.hideLoading();
        }
    },

    navigateUp() {
        if (state.currentPath === ROOT_PATH) {
            notifications.show("Vous êtes déjà à la racine", 'info');
            return;
        }
        
        const parentPath = utils.getParentPath(state.currentPath);
        navigation.navigateToFolder(parentPath);
    }
};