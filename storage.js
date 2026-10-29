/* ============================================================================
   STORAGE — LocalStorage с debounce
   ============================================================================ */

const STORAGE_KEY = 'craft_system_data';
const CATEGORY_FILTER_KEY = 'craft_system_category_filter';

let saveTimeout = null;

function debounceSave(registry, crafts, materialsCrafts) {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
        try {
            const data = {
                resources: registry.toDict(),
                crafts: crafts,
                materialsCrafts: materialsCrafts || []
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            showToast('Автосохранение', 'info');
        } catch (e) {
            console.error('Ошибка автосохранения:', e);
        }
    }, 1000);
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.error('Ошибка загрузки из LocalStorage:', e);
        return null;
    }
}

function loadCategoryFilter() {
    return localStorage.getItem(CATEGORY_FILTER_KEY) || 'all';
}

function saveCategoryFilter(categoryId) {
    localStorage.setItem(CATEGORY_FILTER_KEY, categoryId);
}
