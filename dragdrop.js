/* ============================================================================
   DRAG & DROP — Загрузка файлов
   ============================================================================ */

// Предотвращаем стандартное поведение браузера для drag&drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

// Подсветка зоны при перетаскивании
document.body.addEventListener('dragenter', (e) => {
    document.body.classList.add('drag-over');
}, false);

document.body.addEventListener('dragleave', (e) => {
    if (e.target === document.body) {
        document.body.classList.remove('drag-over');
    }
}, false);

// Обработка drop
document.body.addEventListener('drop', (e) => {
    document.body.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.json')) {
        showToast('Поддерживаются только .json файлы', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            const imported = importCraftsData(data);
            app.registry = imported.registry;
            app.crafts = imported.crafts;
            app.materialsCrafts = data.materialsCrafts || [];
            app.materialsInStock = {};
            renderResourcesTable();
            renderCraftsTable();
            renderMaterialsTable();
            showToast('Данные загружены', 'success');
            debounceSave(app.registry, app.crafts, app.materialsCrafts);
        } catch (err) {
            showError('Ошибка загрузки JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}, false);

// ==================== КНОПКИ ФАЙЛОВ ====================

document.getElementById('btn-load').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            const imported = importCraftsData(data);
            app.registry = imported.registry;
            app.crafts = imported.crafts;
            app.materialsCrafts = data.materialsCrafts || [];
            app.materialsInStock = {};
            renderResourcesTable();
            renderCraftsTable();
            renderMaterialsTable();
            showToast('Данные загружены', 'success');
            debounceSave(app.registry, app.crafts, app.materialsCrafts);
        } catch (err) {
            showError('Ошибка загрузки JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('btn-save').addEventListener('click', () => {
    const data = exportCraftsData(app.crafts, app.registry);
    data.materialsCrafts = app.materialsCrafts;
    const json = JSON.stringify(data, null, 4);
    downloadText('craft_system.json', json);
    showToast('Данные сохранены', 'success');
});
