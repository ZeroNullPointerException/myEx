
// ============================================
// notifications.js - Système de notifications
// ============================================

const notifications = {
    show(message, type = 'info') {
        const iconMap = {
            'success': 'fas fa-check-circle text-green-500',
            'error': 'fas fa-exclamation-triangle text-red-500',
            'info': 'fas fa-info-circle text-blue-500',
            'warning': 'fas fa-exclamation-circle text-yellow-500'
        };
        
        const bgMap = {
            'success': 'bg-green-100 border-green-400',
            'error': 'bg-red-100 border-red-400',
            'info': 'bg-blue-100 border-blue-400',
            'warning': 'bg-yellow-100 border-yellow-400'
        };

       const notification = document.createElement('div');
        notification.className = `p-4 rounded-lg shadow-xl border ${bgMap[type]} transition-opacity duration-300 flex items-center opacity-0 max-w-md`;   
        notification.innerHTML = `
            <i class="${iconMap[type]} mr-3 text-lg flex-shrink-0"></i>
            <span class="text-sm font-medium text-slate-700">${message}</span>
        `;
        
        dom.notificationContainer.appendChild(notification);

        setTimeout(() => notification.classList.remove('opacity-0'), 10);

        setTimeout(() => {
            notification.classList.add('opacity-0');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
};
