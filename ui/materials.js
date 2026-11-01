/* ============================================================================
   UI — Вкладка «Материалы» (сводка ресурсов для крафтов в корзине)
   ============================================================================ */

// Получить полный BOM ресурса из реестра (рекурсивно, возвращает ТОЛЬКО базовые)
function getRegistryBom(resourceName, multiplier = 1) {
    const res = app.registry.resources[resourceName];
    if (!res) return {};

    const bom = {};

    if (res.type === 'basic') {
        bom[resourceName] = (bom[resourceName] || 0) + multiplier;
        return bom;
    }

    // Composite: expand components
    const output = res.outputQuantity || 1;
    for (const [compName, compQty] of Object.entries(res.composition)) {
        const expanded = getRegistryBom(compName, multiplier * compQty / output);
        for (const [name, qty] of Object.entries(expanded)) {
            bom[name] = (bom[name] || 0) + qty;
        }
    }

    return bom;
}

// Получить ВСЕ ресурсы в дереве BOM (и составные, и базовые)
function getAllResourcesInBom(resourceName, multiplier = 1) {
    const res = app.registry.resources[resourceName];
    if (!res) return {};

    const bom = {};

    // Добавляем этот ресурс
    bom[resourceName] = (bom[resourceName] || 0) + multiplier;

    if (res.type === 'basic') {
        return bom;
    }

    // Composite: expand components
    const output = res.outputQuantity || 1;
    for (const [compName, compQty] of Object.entries(res.composition)) {
        const expanded = getAllResourcesInBom(compName, multiplier * compQty / output);
        for (const [name, qty] of Object.entries(expanded)) {
            bom[name] = (bom[name] || 0) + qty;
        }
    }

    return bom;
}

// Получить стоимость крафта
function getCraftCost(craft) {
    const temp = new CompositeResource(craft.name, craft.composition, craft.outputQuantity, craft.toll || 0);
    return temp.getCost(app.registry.resources);
}

// Экранирование HTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Получить стоимость одного юнита ресурса
function getCostPerUnit(resourceName) {
    const res = app.registry.resources[resourceName];
    if (!res) return 0;
    if (res.type === 'basic') return res.costPerUnit;
    try {
        const temp = new CompositeResource(resourceName, res.composition, res.outputQuantity || 1, res.toll || 0);
        return temp.getCost(app.registry.resources);
    } catch (e) {
        return 0;
    }
}

// Агрегировать все ресурсы из корзины (ВСЕ уровни дерева)
function aggregateCartResources() {
    const crafts = app.materialsCrafts;
    const totalNeeded = {}; // все ресурсы в дереве (и составные, и базовые)

    for (const craft of crafts) {
        for (const [compName, compQty] of Object.entries(craft.composition)) {
            const totalQty = compQty * craft.quantity;
            const res = app.registry.resources[compName];

            if (!res) {
                totalNeeded[compName] = (totalNeeded[compName] || 0) + totalQty;
                continue;
            }

            // Показываем этот ресурс в таблице
            totalNeeded[compName] = (totalNeeded[compName] || 0) + totalQty;

            if (res.type === 'composite') {
                // Разворачиваем составной и добавляем его компоненты
                const output = res.outputQuantity || 1;
                const expanded = getRegistryBom(compName, totalQty / output);
                for (const [name, qty] of Object.entries(expanded)) {
                    totalNeeded[name] = (totalNeeded[name] || 0) + qty;
                }
            }
        }
    }

    return totalNeeded;
}

// Рассчитать стоимость с учётом наличия (рекурсивно для составных)
function calculateCostWithInStock(totalNeeded, inStock) {
    // Сначала копируем все потребности
    const remaining = { ...totalNeeded };

    // Применяем наличие: для составных рекурсивно вычитаем все ресурсы в дереве
    for (const [resName, stockQty] of Object.entries(inStock)) {
        const qty = parseFloat(stockQty) || 0;
        if (qty <= 0) continue;

        const res = app.registry.resources[resName];
        if (!res) continue;

        // Вычитаем из этого ресурса
        remaining[resName] = Math.max(0, (remaining[resName] || 0) - qty);

        if (res.type === 'composite') {
            // Рекурсивно вычитаем все ресурсы в дереве этого составного
            const outputPerUnit = res.outputQuantity || 1;
            const batches = qty / outputPerUnit;

            // Получаем все ресурсы в дереве этого составного
            const subBom = getAllResourcesInBom(resName, batches);
            for (const [subName, subQty] of Object.entries(subBom)) {
                if (subName === resName) continue; // Не вычитаем сам ресурс (уже вычли)
                remaining[subName] = Math.max(0, (remaining[subName] || 0) - subQty);
            }
        }
    }

    // Считаем стоимость только за то, что нужно докупить (базовые ресурсы)
    let totalCost = 0;
    for (const [resName, qty] of Object.entries(remaining)) {
        if (qty > 0) {
            const res = app.registry.resources[resName];
            if (res && res.type === 'basic') {
                totalCost += qty * res.costPerUnit;
            }
        }
    }

    return { remaining, totalCost };
}

function renderMaterialsTable() {
    const compositeTbody = document.getElementById('materials-composite-tbody');
    const basicTbody = document.getElementById('materials-basic-tbody');
    const compositeSection = document.getElementById('materials-composite-section');
    const basicSection = document.getElementById('materials-basic-section');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartItemsList = document.getElementById('cart-items-list');
    
    compositeTbody.innerHTML = '';
    basicTbody.innerHTML = '';
    cartItemsContainer.innerHTML = '';

    const crafts = app.materialsCrafts;

    if (crafts.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.textAlign = 'center';
        td.style.padding = '30px';
        td.style.color = '#999';
        td.textContent = 'Нажмите ➕ на крафте, чтобы добавить его в корзину и увидеть расчёт материалов';
        compositeTbody.appendChild(tr);
        compositeSection.style.display = 'none';
        basicSection.style.display = 'none';
        cartItemsList.style.display = 'none';
        document.getElementById('materials-total').textContent = 'Итого материалов: —';
        return;
    }

    // Step 0: Render cart items list
    for (const craft of crafts) {
        const div = document.createElement('div');
        div.style.cssText = 'padding:10px 14px; background:rgba(42, 33, 24, 0.6); border:1px solid rgba(90, 74, 50, 0.4); border-radius:4px; display:flex; justify-content:space-between; align-items:center;';
        
        const leftDiv = document.createElement('div');
        leftDiv.innerHTML = '<strong style="color:#d4c4a0;">' + escapeHtml(craft.name) + '</strong>' +
            '<span style="color:#8a7a60; margin-left:10px;">×' + craft.quantity + ' шт.</span>' +
            '<span style="color:#8a7a60; margin-left:10px;">' + getCategoryLabel(craft.category) + '</span>';
        
        const rightDiv = document.createElement('div');
        rightDiv.style.color = '#c9a84c';
        rightDiv.style.fontWeight = '600';
        try {
            const cost = getCraftCost(craft);
            rightDiv.textContent = (cost * craft.quantity).toFixed(2) + ' грш.';
        } catch (e) {
            rightDiv.textContent = '—';
        }
        
        div.appendChild(leftDiv);
        div.appendChild(rightDiv);
        cartItemsContainer.appendChild(div);
    }
    cartItemsList.style.display = 'block';

    // Step 1: Aggregate all resources (all levels of the BOM tree)
    const totalNeeded = aggregateCartResources();

    // Step 2: Apply in-stock and calculate cost
    const costResult = calculateCostWithInStock(totalNeeded, app.materialsInStock || {});
    const neededRemaining = costResult.remaining;
    let totalCost = costResult.totalCost;

    // Add tolls
    for (const craft of crafts) {
        totalCost += craft.toll || 0;
    }

    // Step 3: Separate composite and basic resources
    const compositeResources = [];
    const basicResources = [];

    for (const resName of Object.keys(totalNeeded)) {
        const res = app.registry.resources[resName];
        if (res && res.type === 'composite') {
            compositeResources.push(resName);
        } else {
            basicResources.push(resName);
        }
    }

    compositeResources.sort((a, b) => a.localeCompare(b));
    basicResources.sort((a, b) => a.localeCompare(b));

    // Helper function to render a row
    function renderRow(resName, tbody) {
        const res = app.registry.resources[resName];
        const tr = document.createElement('tr');

        const needed = Math.round(totalNeeded[resName] || 0);
        const stock = parseFloat(app.materialsInStock[resName]) || 0;
        const remainingQty = Math.max(0, Math.round(neededRemaining[resName] || 0));

        // Name
        const tdName = document.createElement('td');
        tdName.textContent = resName;
        tr.appendChild(tdName);

        // Needed (remaining after in-stock)
        const tdNeeded = document.createElement('td');
        tdNeeded.textContent = remainingQty;
        tdNeeded.style.fontWeight = '600';
        if (remainingQty === 0 && needed > 0) {
            tdNeeded.style.color = '#81c784';
        }
        tr.appendChild(tdNeeded);

        // In stock input
        const tdInStock = document.createElement('td');
        const inputStock = document.createElement('input');
        inputStock.type = 'number';
        inputStock.className = 'form-input';
        inputStock.step = '1';
        inputStock.min = '0';
        inputStock.value = stock || '';
        inputStock.style.width = '80px';
        inputStock.addEventListener('input', () => {
            const val = parseFloat(inputStock.value);
            if (!isNaN(val) && val >= 0) {
                if (!app.materialsInStock) app.materialsInStock = {};
                app.materialsInStock[resName] = val;
            } else {
                delete app.materialsInStock[resName];
            }
            renderMaterialsTable();
        });
        tdInStock.appendChild(inputStock);
        tr.appendChild(tdInStock);

        // Unit
        const tdUnit = document.createElement('td');
        tdUnit.textContent = res ? (res.unit || 'шт.') : 'шт.';
        tr.appendChild(tdUnit);

        // Cost (only for what's still needed at this level)
        const tdCost = document.createElement('td');
        if (remainingQty > 0 && res && res.type === 'basic') {
            const cost = remainingQty * res.costPerUnit;
            tdCost.textContent = cost.toFixed(2);
            tdCost.className = 'cost-calculated';
        } else if (remainingQty > 0 && res) {
            // Composite: show cost of producing remaining
            const cost = remainingQty * getCostPerUnit(resName);
            tdCost.textContent = cost.toFixed(2);
            tdCost.className = 'cost-calculated';
            tdCost.style.color = '#ffb74d';
        } else {
            tdCost.textContent = '0.00';
            tdCost.className = 'cost-calculated';
            tdCost.style.color = '#81c784';
        }
        tr.appendChild(tdCost);

        tbody.appendChild(tr);
    }

    // Render composite resources
    if (compositeResources.length > 0) {
        compositeSection.style.display = 'block';
        for (const resName of compositeResources) {
            renderRow(resName, compositeTbody);
        }
    } else {
        compositeSection.style.display = 'none';
    }

    // Render basic resources
    if (basicResources.length > 0) {
        basicSection.style.display = 'block';
        for (const resName of basicResources) {
            renderRow(resName, basicTbody);
        }
    } else {
        basicSection.style.display = 'none';
    }

    document.getElementById('materials-total').textContent = 'Итого материалов: ' + totalCost.toFixed(2) + ' грш.';
    document.getElementById('stat-resources').textContent = '📦 Ресурсы: ' + Object.keys(app.registry.resources).length;
    document.getElementById('stat-crafts').textContent = '🔨 Крафты: ' + crafts.length + ' в корзине';
    document.getElementById('stat-total-cost').textContent = '💰 Итого: ' + totalCost.toFixed(2) + ' грш.';
}

// Clear cart
document.getElementById('btn-clear-cart')?.addEventListener('click', () => {
    if (app.materialsCrafts.length === 0) {
        showToast('Корзина пуста', 'info');
        return;
    }
    if (!confirm('Очистить корзину?')) return;
    app.materialsCrafts = [];
    app.materialsInStock = {};
    renderCraftsTable();
    renderMaterialsTable();
    debounceSave(app.registry, app.crafts, app.materialsCrafts);
    showToast('Корзина очищена', 'success');
});
