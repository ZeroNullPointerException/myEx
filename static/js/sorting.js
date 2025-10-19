
// ============================================
// sorting.js - Gestion du tri
// ============================================

const sorting = {
    updateIndicators() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            const column = header.getAttribute('data-column');
            const iconSpan = header.querySelector('.sort-icon');
            
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (iconSpan) {
                iconSpan.classList.remove('fa-sort-up', 'fa-sort-down', 'fa-sort');
                
                if (column === state.sortColumn) {
                    header.classList.add(`sort-${state.sortDirection}`);
                    iconSpan.classList.add(state.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
                } else {
                    iconSpan.classList.add('fa-sort');
                }
            }
        });
    },

    handleSort(column) {
        if (state.sortColumn === column) {
            state.sortDirection = (state.sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            state.sortColumn = column;
            state.sortDirection = 'asc';
        }
        
        navigation.navigateToFolder(state.currentPath);
    },

    compareFiles(a, b) {
        if (a.is_folder !== b.is_folder) {
            return a.is_folder ? -1 : 1;
        }
        
        let comparison = 0;
        const aValue = a[state.sortColumn];
        const bValue = b[state.sortColumn];

        if (state.sortColumn === 'name') {
            comparison = aValue.localeCompare(bValue);
        } else if (state.sortColumn === 'size' || state.sortColumn === 'modified') {
            comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }

        return state.sortDirection === 'asc' ? comparison : comparison * -1;
    }
};