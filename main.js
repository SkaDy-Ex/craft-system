/* ============================================================================
   MAIN — Инициализация и связывание модулей
   ============================================================================ */

// ==================== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ====================

const app = {
    registry: new ResourceRegistry(),
    crafts: [],
    materialsCrafts: [], // корзина материалов
    materialsInStock: {}, // наличие ресурсов
    editingResourceName: null,
    editingResourceType: null,
    currentCompositionData: {},
    currentCompositionOutput: 1,
    currentCompositionToll: 0,
    bomTreeResourceName: null,
    fullBomText: '',
    fullBomTitle: ''
};

// ==================== ЗАГРУЗКА ДАННЫХ ====================

function loadData() {
    // Сначала пробуем LocalStorage
    const saved = loadFromStorage();
    if (saved) {
        const imported = importCraftsData(saved);
        app.registry = imported.registry;
        app.crafts = imported.crafts;
        app.materialsCrafts = saved.materialsCrafts || [];
        app.materialsInStock = {};
        renderResourcesTable();
        renderCraftsTable();
        renderMaterialsTable();
        return;
    }

    // Если нет сохранений — загружаем из craft_system.json
    fetch('craft_system.json')
        .then(r => r.json())
        .then(data => {
            const imported = importCraftsData(data);
            app.registry = imported.registry;
            app.crafts = imported.crafts;
            app.materialsCrafts = data.materialsCrafts || [];
            renderResourcesTable();
            renderCraftsTable();
            renderMaterialsTable();
            debounceSave(app.registry, app.crafts, app.materialsCrafts);
        })
        .catch(() => {
            // Если файл не найден — пустое приложение
            app.materialsCrafts = [];
            renderResourcesTable();
            renderCraftsTable();
            renderMaterialsTable();
        });
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================

// Фикс белого фона при drag&drop
document.addEventListener('dragstart', () => {
    document.body.style.background = '#1a1612 url("https://i.pinimg.com/originals/95/92/1b/95921b8f759dc74bf411b3ef5d210f96.jpg") center/cover no-repeat fixed';
});

document.addEventListener('dragend', () => {
    document.body.style.background = '';
});

document.addEventListener('keydown', (e) => {
    // Ctrl+S — сохранение
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const data = exportCraftsData(app.crafts, app.registry);
        data.materialsCrafts = app.materialsCrafts;
        const json = JSON.stringify(data, null, 4);
        downloadText('craft_system.json', json);
        showToast('Данные сохранены', 'success');
    }

    // Ctrl+O — загрузка
    if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        document.getElementById('file-input').click();
    }

    // Delete — удаление выделенной строки
    if (e.key === 'Delete' && !e.target.matches('input, textarea, select')) {
        const selectedResource = document.querySelector('#resources-tbody tr.selected');
        const selectedCraft = document.querySelector('#crafts-tbody tr.selected');

        if (selectedResource) {
            const name = selectedResource.dataset.name;
            if (confirm('Удалить ресурс "' + name + '"?')) {
                try {
                    app.registry.delete(name);
                    renderResourcesTable();
                    renderCraftsTable();
                    showToast('Ресурс удалён', 'success');
                    debounceSave(app.registry, app.crafts, app.materialsCrafts);
                } catch (err) {
                    showError(err.message);
                }
            }
        } else if (selectedCraft) {
            const index = parseInt(selectedCraft.dataset.index);
            const name = app.crafts[index].name;
            if (confirm('Удалить крафт "' + name + '"?')) {
                app.crafts.splice(index, 1);
                renderCraftsTable();
                showToast('Крафт удалён', 'success');
                debounceSave(app.registry, app.crafts, app.materialsCrafts);
            }
        }
    }

    // Escape — закрыть модалку
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => {
            hideModal(m.id);
        });
    }
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

function init() {
    // Восстанавливаем фильтр категории
    const filterCat = loadCategoryFilter();
    const select = document.getElementById('category-filter');
    if (select) {
        select.value = filterCat;
    }

    // Загружаем данные
    loadData();
}

// ==================== СОХРАНЕНИЕ ПРИ ЗАКРЫТИИ ====================

window.addEventListener('beforeunload', () => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    try {
        const data = {
            resources: app.registry.toDict(),
            crafts: app.crafts,
            materialsCrafts: app.materialsCrafts || []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка сохранения при закрытии:', e);
    }
});

// Запуск
init();
