
// ============================================
// utils.js - Fonctions utilitaires
// ============================================

const utils = {
    buildApiUrl(endpoint, path) {
        const url = new URL(`${API_BASE}/${endpoint}`, window.location.origin);
        if (path !== undefined) {
            url.searchParams.append('path', path);
        }
        return url.toString();
    },

    getParentPath(path) {
        if (path === ROOT_PATH) return ROOT_PATH;
        const segments = path.split('/').filter(s => s.length > 0);
        segments.pop();
        return '/' + segments.join('/');
    },

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        if (bytes === undefined) return '-';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Octets';
        const k = 1024;
        const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        let iconClass = 'fas fa-file-alt';
        let colorClass = 'text-slate-400';

        const iconMap = {
            'html': 'fas fa-file-code', 'css': 'fas fa-file-code', 'js': 'fas fa-file-code', 
            'py': 'fas fa-file-code', 'json': 'fas fa-file-code', 'xml': 'fas fa-file-code',
            'pdf': 'fas fa-file-pdf', 'doc': 'fas fa-file-word', 'docx': 'fas fa-file-word', 
            'xls': 'fas fa-file-excel', 'xlsx': 'fas fa-file-excel', 
            'ppt': 'fas fa-file-powerpoint', 'pptx': 'fas fa-file-powerpoint', 
            'txt': 'fas fa-file-alt', 'log': 'fas fa-file-alt',
            'png': 'fas fa-file-image', 'jpg': 'fas fa-file-image', 'jpeg': 'fas fa-file-image', 
            'gif': 'fas fa-file-image', 'svg': 'fas fa-file-image', 'webp': 'fas fa-file-image',
            'mp4': 'fas fa-file-video', 'mov': 'fas fa-file-video', 'avi': 'fas fa-file-video', 
            'mkv': 'fas fa-file-video', 'mp3': 'fas fa-file-audio', 'wav': 'fas fa-file-audio', 
            'flac': 'fas fa-file-audio',
            'zip': 'fas fa-file-archive', 'rar': 'fas fa-file-archive', '7z': 'fas fa-file-archive', 
            'tar': 'fas fa-file-archive', 'gz': 'fas fa-file-archive',
        };

        const colorMap = {
            'pdf': 'text-red-600', 'doc': 'text-blue-600', 'docx': 'text-blue-600', 
            'xls': 'text-green-600', 'xlsx': 'text-green-600', 'ppt': 'text-orange-600', 
            'pptx': 'text-orange-600',
            'png': 'text-indigo-600', 'jpg': 'text-indigo-600', 'jpeg': 'text-indigo-600', 
            'gif': 'text-indigo-600', 'svg': 'text-indigo-600', 'webp': 'text-indigo-600',
            'mp4': 'text-purple-600', 'mov': 'text-purple-600', 'avi': 'text-purple-600', 
            'mkv': 'text-purple-600', 'mp3': 'text-purple-600', 'wav': 'text-purple-600', 
            'flac': 'text-purple-600',
            'zip': 'text-gray-600', 'rar': 'text-gray-600', '7z': 'text-gray-600', 
            'tar': 'text-gray-600', 'gz': 'text-gray-600',
            'html': 'text-red-500', 'css': 'text-blue-500', 'js': 'text-yellow-500', 
            'py': 'text-green-500', 'json': 'text-gray-700', 'xml': 'text-gray-700', 
            'log': 'text-gray-700'
        };

        if (iconMap[extension]) iconClass = iconMap[extension];
        if (colorMap[extension]) colorClass = colorMap[extension];
        
        return `<i class="${iconClass} ${colorClass} w-5 text-center mr-3"></i>`;
    }
};