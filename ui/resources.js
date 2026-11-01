/* ============================================================================
   UI — Таблица ресурсов и кнопки
   ============================================================================ */

function renderResourcesTable() {
    const tbody = document.getElementById('resources-tbody');
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('search-resources')?.value || '').toLowerCase();

    for (const [name, res] of Object.entries(app.registry.resources)) {
        // Поиск
        if (searchTerm && !name.toLowerCase().includes(searchTerm)) {
            continue;
        }

        const tr = document.createElement('tr');
        tr.dataset.name = name;
        tr.draggable = true;

        // Drag events
        tr.addEventListener('dragstart', onResourceDragStart);
        tr.addEventListener('dragover', onResourceDragOver);
        tr.addEventListener('dragleave', onResourceDragLeave);
        tr.addEventListener('drop', onResourceDrop);

        const tdName = document.createElement('td');
        tdName.textContent = name;
        tr.appendChild(tdName);

        const tdType = document.createElement('td');
        tdType.textContent = res.type === 'basic' ? 'Базовый' : 'Составной';
        tr.appendChild(tdType);

        const tdCost = document.createElement('td');
        if (res.type === 'basic') {
            tdCost.textContent = res.costPerUnit.toFixed(2);
        } else {
            try {
                const cost = res.getCost(app.registry.resources);
                tdCost.textContent = cost.toFixed(2) + ' (расч.)';
                tdCost.className = 'cost-calculated';
            } catch (e) {
                tdCost.textContent = 'Ошибка';
                tdCost.className = 'cost-error';
            }
        }
        tr.appendChild(tdCost);

        const tdUnit = document.createElement('td');
        tdUnit.textContent = res.type === 'basic' ? res.unit : '—';
        tr.appendChild(tdUnit);

        const tdAction = document.createElement('td');
        const btnLoupe = document.createElement('button');
        btnLoupe.className = 'btn-loupe';
        btnLoupe.textContent = '🔍';
        btnLoupe.title = 'Показать состав ресурса';
        btnLoupe.addEventListener('click', (e) => {
            e.stopPropagation();
            showCompositionTree(name);
        });
        tdAction.appendChild(btnLoupe);
        tr.appendChild(tdAction);

        tr.addEventListener('click', () => {
            document.querySelectorAll('#resources-tbody tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
        });

        tbody.appendChild(tr);
    }
}

// Поиск по ресурсам
document.getElementById('search-resources')?.addEventListener('input', () => {
    renderResourcesTable();
});

// ==================== КНОПКИ РЕСУРСОВ ====================

document.getElementById('btn-add-basic').addEventListener('click', () => {
    app.editingResourceName = null;
    app.editingResourceType = 'basic';
    document.getElementById('modal-resource-title').textContent = 'Новый базовый ресурс';
    document.getElementById('basic-name').value = '';
    document.getElementById('basic-unit').value = '';
    document.getElementById('basic-cost').value = '';
    showModal('modal-resource-edit');
});

document.getElementById('btn-add-composite').addEventListener('click', () => {
    app.editingResourceName = null;
    app.editingResourceType = 'composite';
    app.currentCompositionData = {};
    app.currentCompositionOutput = 1;
    document.getElementById('modal-composition-title').textContent = 'Новый составной ресурс';
    document.getElementById('comp-name').value = '';
    document.getElementById('comp-output').value = 1;
    document.getElementById('comp-toll').value = 0;
    document.getElementById('form-group-category').style.display = 'none';
    renderCompositionTable();
    updateCostPreview();
    showModal('modal-composition');
});

document.getElementById('btn-edit-resource').addEventListener('click', () => {
    const selected = document.querySelector('#resources-tbody tr.selected');
    if (!selected) {
        showToast('Выберите ресурс в таблице', 'error');
        return;
    }

    const name = selected.dataset.name;
    const res = app.registry.resources[name];

    if (res.type === 'basic') {
        app.editingResourceName = name;
        app.editingResourceType = 'basic';
        document.getElementById('modal-resource-title').textContent = 'Редактировать базовый ресурс';
        document.getElementById('basic-name').value = name;
        document.getElementById('basic-unit').value = res.unit;
        document.getElementById('basic-cost').value = res.costPerUnit;
        showModal('modal-resource-edit');
    } else {
        app.editingResourceName = name;
        app.editingResourceType = 'composite';
        app.currentCompositionData = { ...res.composition };
        app.currentCompositionOutput = res.outputQuantity || 1;
        app.currentCompositionToll = res.toll || 0;
        document.getElementById('modal-composition-title').textContent = 'Редактировать: ' + name;
        document.getElementById('comp-name').value = name;
        document.getElementById('comp-output').value = app.currentCompositionOutput;
        document.getElementById('comp-toll').value = app.currentCompositionToll;
        document.getElementById('form-group-category').style.display = 'none';
        renderCompositionTable();
        updateCostPreview();
        showModal('modal-composition');
    }
});

document.getElementById('btn-delete-resource').addEventListener('click', () => {
    const selected = document.querySelector('#resources-tbody tr.selected');
    if (!selected) {
        showToast('Выберите ресурс в таблице', 'error');
        return;
    }

    const name = selected.dataset.name;
    if (!confirm('Удалить ресурс "' + name + '"?')) return;

    try {
        app.registry.delete(name);
        renderResourcesTable();
        renderCraftsTable();
        showToast('Ресурс удалён', 'success');
        debounceSave(app.registry, app.crafts, app.materialsCrafts);
    } catch (err) {
        showError(err.message);
    }
});

// ==================== ФОРМА БАЗОВОГО РЕСУРСА ====================

document.getElementById('form-basic-resource').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('basic-name').value.trim();
    const unit = document.getElementById('basic-unit').value.trim();
    const cost = parseFloat(document.getElementById('basic-cost').value);

    if (!name) { showToast('Введите название', 'error'); return; }
    if (!unit) { showToast('Введите единицу измерения', 'error'); return; }
    if (isNaN(cost) || cost < 0) { showToast('Введите корректную цену', 'error'); return; }
    if (name in app.registry.resources && name !== app.editingResourceName) {
        showToast('Ресурс с таким именем уже существует', 'error'); return;
    }

    if (app.editingResourceName && app.editingResourceName !== name) {
        delete app.registry.resources[app.editingResourceName];
    }

    app.registry.addOrUpdate(new BasicResource(name, unit, cost));
    renderResourcesTable();
    hideModal('modal-resource-edit');
    showToast('Ресурс сохранён', 'success');
    debounceSave(app.registry, app.crafts);
});

// ==================== СОСТАВНОЙ РЕСУРС — ТАБЛИЦА ====================

function renderCompositionTable() {
    const tbody = document.getElementById('composition-tbody');
    tbody.innerHTML = '';

    for (const [resName, qty] of Object.entries(app.currentCompositionData)) {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = resName;
        tr.appendChild(tdName);

        const tdQty = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-input';
        input.step = '0.01';
        input.value = qty;
        input.addEventListener('change', () => {
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) {
                app.currentCompositionData[resName] = val;
            }
            updateCostPreview();
        });
        tdQty.appendChild(input);
        tr.appendChild(tdQty);

        tbody.appendChild(tr);
    }
}

document.getElementById('btn-add-component').addEventListener('click', () => {
    const excluded = new Set([...Object.keys(app.currentCompositionData)]);
    const myName = document.getElementById('comp-name').value.trim();
    if (myName) excluded.add(myName);

    const available = Object.keys(app.registry.resources).filter(n => !excluded.has(n));
    if (available.length === 0) {
        showToast('Все доступные ресурсы уже добавлены', 'info');
        return;
    }

    const select = document.getElementById('component-select');
    select.innerHTML = '';
    available.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        select.appendChild(opt);
    });

    document.getElementById('component-qty').value = '1';
    showModal('modal-select-component');

    document.getElementById('btn-confirm-component').onclick = () => {
        const name = select.value;
        const qty = parseFloat(document.getElementById('component-qty').value);
        if (isNaN(qty) || qty <= 0) {
            showToast('Введите корректное количество', 'error');
            return;
        }
        app.currentCompositionData[name] = qty;
        renderCompositionTable();
        updateCostPreview();
        hideModal('modal-select-component');
    };
});

document.getElementById('btn-remove-component').addEventListener('click', () => {
    const rows = document.querySelectorAll('#composition-tbody tr.selected');
    if (rows.length === 0) {
        showToast('Выберите строку для удаления', 'error');
        return;
    }
    rows.forEach(row => {
        const name = row.cells[0].textContent;
        delete app.currentCompositionData[name];
    });
    renderCompositionTable();
    updateCostPreview();
});

document.getElementById('composition-tbody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    tr.classList.toggle('selected');
});

function updateCostPreview() {
    const el = document.getElementById('comp-cost-preview');
    try {
        const toll = parseFloat(document.getElementById('comp-toll').value) || 0;
        const temp = new CompositeResource('preview', app.currentCompositionData, 1, toll);
        const cost = temp.getCost(app.registry.resources);
        el.textContent = 'Расчётная стоимость: ' + cost.toFixed(2) + ' грш.';
        el.style.color = '';
    } catch (err) {
        el.textContent = 'Ошибка: ' + err.message;
        el.style.color = '#e74c3c';
    }
}

document.getElementById('form-composition').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('comp-name').value.trim();
    if (!name) { showToast('Введите название', 'error'); return; }
    if (Object.keys(app.currentCompositionData).length === 0) {
        showToast('Состав не может быть пустым', 'error'); return;
    }

    if (app.editingResourceType === 'composite') {
        if (name in app.registry.resources && name !== app.editingResourceName) {
            showToast('Ресурс с таким именем уже существует', 'error'); return;
        }

        if (app.editingResourceName && app.editingResourceName !== name) {
            delete app.registry.resources[app.editingResourceName];
        }

        const outputQty = parseInt(document.getElementById('comp-output').value) || 1;
        const toll = parseFloat(document.getElementById('comp-toll').value) || 0;

        try {
            app.registry.addOrUpdate(new CompositeResource(name, { ...app.currentCompositionData }, outputQty, toll));
            renderResourcesTable();
            hideModal('modal-composition');
            showToast('Ресурс сохранён', 'success');
            debounceSave(app.registry, app.crafts, app.materialsCrafts);
        } catch (err) {
            if (err instanceof DependencyError) {
                showError('Циклическая зависимость: ' + err.message);
            } else {
                showError('Ошибка: ' + err.message);
            }
        }
    }
    // === КРАФТ ===
    else {
        const outputQty = parseInt(document.getElementById('comp-output').value) || 1;
        const toll = parseFloat(document.getElementById('comp-toll').value) || 0;
        const category = document.getElementById('comp-category')?.value || 'other';

        if (app.editingCraftIndex === -1) {
            if (name in app.registry.resources) {
                showToast('Ресурс с таким именем уже существует. Используйте имя несуществующего ресурса.', 'error');
                return;
            }
        }

        if (app.editingCraftIndex >= 0) {
            app.crafts[app.editingCraftIndex].name = name;
            app.crafts[app.editingCraftIndex].composition = { ...app.currentCompositionData };
            app.crafts[app.editingCraftIndex].outputQuantity = outputQty;
            app.crafts[app.editingCraftIndex].toll = toll;
            app.crafts[app.editingCraftIndex].category = category;
        } else {
            app.crafts.push({
                name: name,
                quantity: 1,
                composition: { ...app.currentCompositionData },
                outputQuantity: outputQty,
                toll: toll,
                category: category
            });
        }

        renderCraftsTable();
        hideModal('modal-composition');
        showToast('Крафт сохранён', 'success');
        debounceSave(app.registry, app.crafts, app.materialsCrafts);
    }
});

// ==================== DRAG & DROP ДЛЯ РЕСУРСОВ ====================

let draggedResourceRow = null;

function onResourceDragStart(e) {
    draggedResourceRow = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
}

function onResourceDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.style.borderTop = '2px solid #c9a84c';
    this.style.borderTopStyle = 'solid';
}

function onResourceDragLeave(e) {
    this.style.borderTop = '';
}

function onResourceDrop(e) {
    e.preventDefault();
    this.style.borderTop = '';
    if (!draggedResourceRow || draggedResourceRow === this) return;

    // Перестановка в Object.entries через временный массив
    const entries = Object.entries(app.registry.resources);
    const fromName = draggedResourceRow.dataset.name;
    const toName = this.dataset.name;
    const fromIdx = entries.findIndex(([n]) => n === fromName);
    const toIdx = entries.findIndex(([n]) => n === toName);

    if (fromIdx === -1 || toIdx === -1) return;

    const [movedEntry] = entries.splice(fromIdx, 1);
    entries.splice(toIdx, 0, movedEntry);

    // Пересоздаём ordered object
    const ordered = {};
    for (const [n, r] of entries) {
        ordered[n] = r;
    }
    app.registry.resources = ordered;

    renderResourcesTable();
    debounceSave(app.registry, app.crafts);
}

document.addEventListener('dragend', () => {
    draggedResourceRow = null;
    document.querySelectorAll('#resources-tbody tr').forEach(tr => {
        tr.style.borderTop = '';
        tr.style.opacity = '';
    });
});
