/* ============================================================================
   UI — Таблица крафтов, категории, drag&drop
   ============================================================================ */

function renderCraftsTable() {
    const tbody = document.getElementById('crafts-tbody');
    tbody.innerHTML = '';

    const filterCat = loadCategoryFilter();
    const visibleCrafts = getCraftsByCategory(app.crafts, filterCat);

    const searchTerm = (document.getElementById('search-crafts')?.value || '').toLowerCase();

    for (let i = 0; i < visibleCrafts.length; i++) {
        const craft = visibleCrafts[i];
        // Поиск
        if (searchTerm && !craft.name.toLowerCase().includes(searchTerm)) {
            continue;
        }
        // Находим оригинальный индекс
        const origIndex = app.crafts.indexOf(craft);
        const tr = document.createElement('tr');
        tr.dataset.index = origIndex;
        tr.draggable = true;

        // Drag events
        tr.addEventListener('dragstart', onCraftDragStart);
        tr.addEventListener('dragover', onCraftDragOver);
        tr.addEventListener('dragleave', onCraftDragLeave);
        tr.addEventListener('drop', onCraftDrop);

        // Название изделия
        const tdName = document.createElement('td');
        tdName.textContent = craft.name;
        tr.appendChild(tdName);

        // Категория
        const tdCat = document.createElement('td');
        tdCat.textContent = getCategoryLabel(craft.category);
        tdCat.className = 'category-badge';
        tr.appendChild(tdCat);

        // Количество
        const tdQty = document.createElement('td');
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.className = 'form-input';
        qtyInput.step = '1';
        qtyInput.min = '1';
        qtyInput.value = craft.quantity;
        qtyInput.addEventListener('change', () => {
            const val = parseInt(qtyInput.value);
            if (!isNaN(val) && val >= 1) {
                app.crafts[origIndex].quantity = val;
                renderCraftsTable();
                debounceSave(app.registry, app.crafts, app.materialsCrafts);
            }
        });
        tdQty.appendChild(qtyInput);
        tr.appendChild(tdQty);

        // Стоимость одного
        const tdCostOne = document.createElement('td');
        try {
            const cost = getCraftCost(craft);
            tdCostOne.textContent = cost.toFixed(2);
            tdCostOne.className = 'cost-calculated';
        } catch (e) {
            tdCostOne.textContent = 'Ошибка';
            tdCostOne.className = 'cost-error';
        }
        tr.appendChild(tdCostOne);

        // Общая стоимость
        const tdTotal = document.createElement('td');
        try {
            const cost = getCraftCost(craft);
            const total = cost * craft.quantity;
            tdTotal.textContent = total.toFixed(2);
            tdTotal.className = 'cost-calculated';
        } catch (e) {
            tdTotal.textContent = '—';
        }
        tr.appendChild(tdTotal);

        // Действия
        const tdAction = document.createElement('td');

        const btnBom = document.createElement('button');
        btnBom.className = 'btn-loupe';
        btnBom.textContent = '📋';
        btnBom.title = 'Показать полную разузловку';
        btnBom.addEventListener('click', (e) => {
            e.stopPropagation();
            showFullBomForCraft(origIndex);
        });
        tdAction.appendChild(btnBom);

        // Кнопка «В корзину»
        const isInCart = app.materialsCrafts.some(c => c.name === craft.name);
        const btnCart = document.createElement('button');
        btnCart.className = 'btn-loupe';
        btnCart.textContent = isInCart ? '✅' : '➕';
        btnCart.title = isInCart ? 'Убрать из корзины' : 'Добавить в корзину';
        btnCart.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCraftInCart(craft, origIndex);
        });
        tdAction.appendChild(btnCart);

        tr.appendChild(tdAction);

        // Выделение строки
        tr.addEventListener('click', () => {
            document.querySelectorAll('#crafts-tbody tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
        });

        tbody.appendChild(tr);
    }

    updateTotalCraftCost();
    updateCategoryFilterUI();
}

function getCraftCost(craft) {
    const temp = new CompositeResource(craft.name, craft.composition, craft.outputQuantity, craft.toll || 0);
    return temp.getCost(app.registry.resources);
}

function updateTotalCraftCost() {
    let total = 0;
    for (const craft of app.crafts) {
        try {
            const cost = getCraftCost(craft);
            total += cost * craft.quantity;
        } catch (e) {
            // Пропускаем ошибки
        }
    }
    // Add tolls
    for (const craft of app.crafts) {
        total += craft.toll || 0;
    }
    document.getElementById('total-craft-cost').textContent = 'Итого за все: ' + total.toFixed(2) + ' грш.';
}

// ==================== КАТЕГОРИИ ====================

function updateCategoryFilterUI() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    const counts = getAllCategoriesWithCounts(app.crafts);
    let html = '<option value="all">Все (' + counts.all + ')</option>';
    for (const cat of CRAFT_CATEGORIES) {
        html += '<option value="' + cat.id + '"' +
            (cat.id === select.value ? ' selected' : '') + '>' +
            cat.label + ' (' + (counts[cat.id] || 0) + ')</option>';
    }
    select.innerHTML = html;
}

document.getElementById('category-filter')?.addEventListener('change', (e) => {
    saveCategoryFilter(e.target.value);
    renderCraftsTable();
});

document.getElementById('search-crafts')?.addEventListener('input', () => {
    renderCraftsTable();
});

// ==================== КОРЗИНА МАТЕРИАЛОВ ====================

function toggleCraftInCart(craft, craftIndex) {
    const existing = app.materialsCrafts.findIndex(c => c.name === craft.name);
    if (existing >= 0) {
        app.materialsCrafts.splice(existing, 1);
        showToast('Убрано из корзины: ' + craft.name, 'info');
    } else {
        app.materialsCrafts.push({
            name: craft.name,
            quantity: craft.quantity,
            composition: { ...craft.composition },
            outputQuantity: craft.outputQuantity || 1,
            toll: craft.toll || 0,
            category: craft.category
        });
        showToast('Добавлено в корзину: ' + craft.name, 'success');
    }
    renderCraftsTable();
    renderMaterialsTable();
    debounceSave(app.registry, app.crafts, app.materialsCrafts);
}

// ==================== КНОПКИ КРАФТОВ ====================

function populateCategorySelect(selectedCategory) {
    const select = document.getElementById('comp-category');
    if (!select) return;
    let html = '';
    for (const cat of CRAFT_CATEGORIES) {
        const selected = cat.id === selectedCategory ? ' selected' : '';
        html += '<option value="' + cat.id + '"' + selected + '>' + cat.label + '</option>';
    }
    select.innerHTML = html;
}

document.getElementById('btn-add-craft').addEventListener('click', () => {
    app.editingCraftIndex = -1;
    app.editingResourceType = null;
    app.currentCompositionOutput = 1;
    app.currentCompositionToll = 0;
    document.getElementById('modal-composition-title').textContent = 'Новый крафт';
    document.getElementById('comp-name').value = '';
    document.getElementById('comp-output').value = 1;
    document.getElementById('comp-toll').value = 0;
    document.getElementById('form-group-category').style.display = 'block';
    populateCategorySelect('weapons');
    app.currentCompositionData = {};
    renderCompositionTable();
    updateCostPreview();
    showModal('modal-composition');
});

document.getElementById('btn-edit-craft').addEventListener('click', () => {
    const selected = document.querySelector('#crafts-tbody tr.selected');
    if (!selected) {
        showToast('Выберите крафт для редактирования', 'error');
        return;
    }

    const index = parseInt(selected.dataset.index);
    const craft = app.crafts[index];

    app.editingCraftIndex = index;
    app.editingResourceType = null;
    app.currentCompositionOutput = craft.outputQuantity || 1;
    app.currentCompositionToll = craft.toll || 0;
    document.getElementById('modal-composition-title').textContent = 'Редактировать: ' + craft.name;
    document.getElementById('comp-name').value = craft.name;
    document.getElementById('comp-output').value = app.currentCompositionOutput;
    document.getElementById('comp-toll').value = app.currentCompositionToll;
    document.getElementById('form-group-category').style.display = 'block';
    populateCategorySelect(craft.category);
    app.currentCompositionData = { ...craft.composition };
    renderCompositionTable();
    updateCostPreview();
    showModal('modal-composition');
});

document.getElementById('btn-delete-craft').addEventListener('click', () => {
    const selected = document.querySelector('#crafts-tbody tr.selected');
    if (!selected) {
        showToast('Выберите крафт для удаления', 'error');
        return;
    }

    const index = parseInt(selected.dataset.index);
    const name = app.crafts[index].name;
    if (!confirm('Удалить крафт "' + name + '"?')) return;

    app.crafts.splice(index, 1);
    renderCraftsTable();
    renderMaterialsTable();
    showToast('Крафт удалён', 'success');
    debounceSave(app.registry, app.crafts);
});

// ==================== DRAG & DROP ДЛЯ КРАФТОВ ====================

let draggedCraftRow = null;

function onCraftDragStart(e) {
    draggedCraftRow = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
}

function onCraftDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.style.borderTop = '2px solid #c9a84c';
    this.style.borderTopStyle = 'solid';
}

function onCraftDragLeave(e) {
    this.style.borderTop = '';
}

function onCraftDrop(e) {
    e.preventDefault();
    this.style.borderTop = '';
    if (!draggedCraftRow || draggedCraftRow === this) return;

    const fromIndex = parseInt(draggedCraftRow.dataset.index);
    const toIndex = parseInt(this.dataset.index);

    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = app.crafts.splice(fromIndex, 1);
    app.crafts.splice(toIndex, 0, moved);

    renderCraftsTable();
    renderMaterialsTable();
    debounceSave(app.registry, app.crafts, app.materialsCrafts);
}

document.addEventListener('dragend', () => {
    draggedCraftRow = null;
    document.querySelectorAll('#crafts-tbody tr').forEach(tr => {
        tr.style.borderTop = '';
        tr.style.opacity = '';
    });
});
