
// ============================================
// search.js - Gestion de la recherche
// ============================================

const search = {
    handleSubmit(event) {
        event.preventDefault();
        
        let query = '';
        if (event.currentTarget.id === 'search-form-desktop') {
            query = document.getElementById('search-input').value.trim();
            document.getElementById('search-input').value = '';
        } else {
            query = document.getElementById('mobile-search-input').value.trim();
            document.getElementById('mobile-search-input').value = '';
            mobile.closeSearchModal();
        }

        if (query) {
            search.perform(query);
        } else {
            notifications.show('Veuillez entrer un terme de recherche.', 'info');
        }
    },

    async perform(query) {
        ui.showLoading();
        state.lastSearchQuery = query;
        
        try {
            const url = new URL(`${API_BASE}/search`, window.location.origin);
            url.searchParams.append('query', query);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            ui.renderFileList(data.files, data.current_path, data.is_search_result);
            
        } catch (error) {
            console.error("Erreur lors de la recherche:", error);
            notifications.show(`Erreur lors de la recherche: ${error.message}`, 'error');
        } finally {
            ui.hideLoading();
        }
    },

    exitSearchMode() {
        state.isSearchMode = false;
        state.lastSearchQuery = '';
        navigation.navigateToFolder(state.currentPath);
    }
};
