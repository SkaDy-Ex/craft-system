/* ============================================================================
   UI — Вкладка «Лавка» (Shop)
   ============================================================================ */

// ==================== ПОДВКЛАДКИ ЛАВКИ ====================

document.querySelectorAll('.shop-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.shop-sub-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = 'shop-tab-' + btn.dataset.shopTab;
        document.getElementById(tabId).classList.add('active');
    });
});

// ==================== РЕНДЕР ТАБЛИЦ ЛАВКИ ====================

function renderShopTables() {
    renderActiveShopTable();
    renderSoldShopTable();
    renderShopStats();
}

function renderActiveShopTable() {
    const tbody = document.getElementById('shop-active-tbody');
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('search-shop-active')?.value || '').toLowerCase();

    for (const listing of app.shopDB.listings) {
        if (listing.isSoldOut) continue;
        if (searchTerm && !listing.name.toLowerCase().includes(searchTerm)) continue;

        const tr = document.createElement('tr');
        tr.dataset.id = listing.id;

        // Название
        const tdName = document.createElement('td');
        tdName.textContent = listing.name;
        tr.appendChild(tdName);

        // Тип
        const tdType = document.createElement('td');
        tdType.textContent = listing.type === 'basic' ? 'Базовый' : (listing.type === 'composite' ? 'Составной' : 'Крафт');
        tr.appendChild(tdType);

        // Всего шт.
        const tdTotal = document.createElement('td');
        tdTotal.textContent = listing.quantity;
        tdTotal.style.textAlign = 'center';
        tr.appendChild(tdTotal);

        // Продано
        const tdSold = document.createElement('td');
        tdSold.textContent = listing.soldQuantity;
        tdSold.style.textAlign = 'center';
        tr.appendChild(tdSold);

        // Осталось
        const tdRemaining = document.createElement('td');
        tdRemaining.textContent = listing.remainingQuantity;
        tdRemaining.style.textAlign = 'center';
        tdRemaining.style.color = listing.remainingQuantity <= 2 ? '#e08080' : '#81c784';
        tr.appendChild(tdRemaining);

        // Себестоимость
        const tdCost = document.createElement('td');
        tdCost.textContent = listing.totalCost.toFixed(2);
        tdCost.style.textAlign = 'right';
        tr.appendChild(tdCost);

        // Цена лавки
        const tdPrice = document.createElement('td');
        tdPrice.textContent = listing.listingPrice.toFixed(2);
        tdPrice.style.textAlign = 'right';
        tr.appendChild(tdPrice);

        // Прибыль/ед.
        const tdProfit = document.createElement('td');
        const profitPerUnit = listing.listingPrice - listing.costPerUnit;
        tdProfit.textContent = profitPerUnit.toFixed(2);
        tdProfit.style.textAlign = 'right';
        tdProfit.className = profitPerUnit > 0 ? 'profit-positive' : (profitPerUnit < 0 ? 'profit-negative' : 'profit-neutral');
        tr.appendChild(tdProfit);

        // Дата
        const tdDate = document.createElement('td');
        tdDate.textContent = formatDate(listing.listedDate);
        tr.appendChild(tdDate);

        // Действия
        const tdAction = document.createElement('td');
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-warning';
        btnEdit.textContent = '✎';
        btnEdit.style.fontSize = '11px';
        btnEdit.style.padding = '3px 6px';
        btnEdit.title = 'Редактировать';
        btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditListingModal(listing.id);
        });
        tdAction.appendChild(btnEdit);

        const btnSell = document.createElement('button');
        btnSell.className = 'btn btn-sell';
        btnSell.textContent = '💰 Продать';
        btnSell.disabled = listing.remainingQuantity <= 0;
        btnSell.addEventListener('click', (e) => {
            e.stopPropagation();
            openSellModal(listing.id);
        });
        tdAction.appendChild(btnSell);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    }
}

function renderSoldShopTable() {
    const tbody = document.getElementById('shop-sold-tbody');
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('search-shop-sold')?.value || '').toLowerCase();

    for (const listing of app.shopDB.listings) {
        if (!listing.isSoldOut) continue;
        if (searchTerm && !listing.name.toLowerCase().includes(searchTerm)) continue;

        const tr = document.createElement('tr');
        tr.dataset.id = listing.id;
        tr.classList.add('listing-soldout');

        const tdName = document.createElement('td');
        tdName.textContent = listing.name;
        tr.appendChild(tdName);

        const tdType = document.createElement('td');
        tdType.textContent = listing.type === 'basic' ? 'Базовый' : (listing.type === 'composite' ? 'Составной' : 'Крафт');
        tr.appendChild(tdType);

        const tdTotal = document.createElement('td');
        tdTotal.textContent = listing.quantity;
        tdTotal.style.textAlign = 'center';
        tr.appendChild(tdTotal);

        const tdSold = document.createElement('td');
        tdSold.textContent = listing.soldQuantity;
        tdSold.style.textAlign = 'center';
        tr.appendChild(tdSold);

        const tdRevenue = document.createElement('td');
        tdRevenue.textContent = listing.totalRevenue.toFixed(2);
        tdRevenue.style.textAlign = 'right';
        tdRevenue.className = 'profit-positive';
        tr.appendChild(tdRevenue);

        const tdProfit = document.createElement('td');
        tdProfit.textContent = listing.totalProfit.toFixed(2);
        tdProfit.style.textAlign = 'right';
        tdProfit.className = listing.totalProfit > 0 ? 'profit-positive' : (listing.totalProfit < 0 ? 'profit-negative' : 'profit-neutral');
        tr.appendChild(tdProfit);

        const tdDate = document.createElement('td');
        tdDate.textContent = listing.soldItems.length > 0 ? formatDate(listing.soldItems[listing.soldItems.length - 1].soldDate) : '—';
        tr.appendChild(tdDate);

        const tdAction = document.createElement('td');
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn btn-danger';
        btnDelete.textContent = '✕';
        btnDelete.style.fontSize = '12px';
        btnDelete.style.padding = '6px 10px';
        btnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Удалить проданный листинг "' + listing.name + '"?')) {
                app.shopDB.removeListing(listing.id);
                renderShopTables();
                showToast('Листинг удалён', 'success');
            }
        });
        tdAction.appendChild(btnDelete);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    }
}

// ==================== СТАТИСТИКА ====================

function renderShopStats() {
    const stats = app.shopDB.getStats();

    document.getElementById('shop-stat-listed').textContent = stats.totalListed;
    document.getElementById('shop-stat-sold').textContent = stats.totalSold;
    document.getElementById('shop-stat-revenue').textContent = stats.totalRevenue.toFixed(2) + ' грш.';

    const profitEl = document.getElementById('shop-stat-profit');
    profitEl.textContent = stats.totalProfit.toFixed(2) + ' грш.';
    profitEl.className = 'shop-stat-value shop-stat-profit' + (stats.totalProfit < 0 ? ' negative' : '');

    const roiEl = document.getElementById('shop-stat-roi');
    roiEl.textContent = stats.roi.toFixed(2) + '%';
    roiEl.className = 'shop-stat-value shop-stat-roi' + (stats.roi < 0 ? ' negative' : '');

    // Статистика по типам
    const typeStats = app.shopDB.getStatsByType();
    const typeTbody = document.getElementById('shop-stats-type-tbody');
    typeTbody.innerHTML = '';

    const typeLabels = {
        basic: '📦 Базовый',
        composite: '🔗 Составной',
        craft: '🔨 Крафт'
    };

    for (const ts of typeStats) {
        const tr = document.createElement('tr');

        const tdType = document.createElement('td');
        tdType.textContent = typeLabels[ts.type] || ts.type;
        tr.appendChild(tdType);

        const tdListed = document.createElement('td');
        tdListed.textContent = ts.listed;
        tdListed.style.textAlign = 'center';
        tr.appendChild(tdListed);

        const tdSold = document.createElement('td');
        tdSold.textContent = ts.sold;
        tdSold.style.textAlign = 'center';
        tr.appendChild(tdSold);

        const tdRevenue = document.createElement('td');
        tdRevenue.textContent = ts.revenue.toFixed(2);
        tdRevenue.style.textAlign = 'right';
        tdRevenue.className = 'profit-positive';
        tr.appendChild(tdRevenue);

        const tdProfit = document.createElement('td');
        tdProfit.textContent = ts.profit.toFixed(2);
        tdProfit.style.textAlign = 'right';
        tdProfit.className = ts.profit > 0 ? 'profit-positive' : (ts.profit < 0 ? 'profit-negative' : 'profit-neutral');
        tr.appendChild(tdProfit);

        typeTbody.appendChild(tr);
    }
}

// ==================== ПОИСК ====================

document.getElementById('search-shop-active')?.addEventListener('input', () => {
    renderActiveShopTable();
});

document.getElementById('search-shop-sold')?.addEventListener('input', () => {
    renderSoldShopTable();
});

// ==================== ДОБАВЛЕНИЕ ИЗ КРАФТОВ ====================

document.getElementById('btn-shop-add-from-craft').addEventListener('click', () => {
    const select = document.getElementById('shop-craft-select');
    select.innerHTML = '';

    if (app.crafts.length === 0) {
        showToast('Нет доступных крафтов', 'error');
        return;
    }

    for (let i = 0; i < app.crafts.length; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = app.crafts[i].name;
        select.appendChild(opt);
    }

    document.getElementById('shop-craft-search').value = '';
    document.getElementById('shop-craft-qty').value = '1';
    document.getElementById('shop-craft-price').value = '0';

    // Фильтрация по поиску
    const filterCrafts = () => {
        const search = document.getElementById('shop-craft-search').value.toLowerCase();
        for (const opt of select.options) {
            opt.style.display = (!search || opt.text.toLowerCase().includes(search)) ? '' : 'none';
        }
        if (select.options.length > 0 && !select.value) {
            select.selectedIndex = 0;
        }
    };
    filterCrafts();
    document.getElementById('shop-craft-search').oninput = filterCrafts;

    updateCraftCostPreview();
    document.getElementById('shop-craft-qty').oninput = updateCraftCostPreview;
    document.getElementById('shop-craft-price').oninput = updateCraftCostPreview;

    showModal('modal-shop-add-craft');
});

function updateCraftCostPreview() {
    const select = document.getElementById('shop-craft-select');
    const idx = parseInt(select.value);
    const qty = parseInt(document.getElementById('shop-craft-qty').value) || 1;
    const price = parseFloat(document.getElementById('shop-craft-price').value) || 0;

    const previewEl = document.getElementById('shop-craft-cost-preview');

    if (isNaN(idx) || idx < 0 || idx >= app.crafts.length) {
        previewEl.innerHTML = 'Себестоимость: —';
        return;
    }

    const craft = app.crafts[idx];
    try {
        const temp = new CompositeResource(craft.name, craft.composition, craft.outputQuantity, craft.toll || 0);
        const costPerUnit = temp.getCost(app.registry.resources);
        const totalCost = costPerUnit * qty;
        const totalRevenue = price * qty;
        const profitPerUnit = price - costPerUnit;
        const totalProfit = totalRevenue - totalCost;

        previewEl.innerHTML =
            '<strong style="color:#c9a84c;">За штуку:</strong><br>' +
            'Себестоимость: ' + costPerUnit.toFixed(2) + ' грш.<br>' +
            'Цена лавки: ' + price.toFixed(2) + ' грш.<br>' +
            '<strong style="color:' + (profitPerUnit >= 0 ? '#81c784' : '#e08080') + '">Прибыль: ' + profitPerUnit.toFixed(2) + ' грш.</strong><br><br>' +
            '<strong style="color:#c9a84c;">За комплект (' + qty + ' шт.):</strong><br>' +
            'Себестоимость: ' + totalCost.toFixed(2) + ' грш.<br>' +
            'Доход: ' + totalRevenue.toFixed(2) + ' грш.<br>' +
            '<strong style="color:' + (totalProfit >= 0 ? '#81c784' : '#e08080') + '">Прибыль: ' + totalProfit.toFixed(2) + ' грш.</strong>';
    } catch (e) {
        previewEl.innerHTML = '<strong>Ошибка расчёта:</strong> ' + e.message;
    }
}

document.getElementById('btn-shop-confirm-add-craft').addEventListener('click', () => {
    const select = document.getElementById('shop-craft-select');
    const idx = parseInt(select.value);
    const qty = parseInt(document.getElementById('shop-craft-qty').value);
    const price = parseFloat(document.getElementById('shop-craft-price').value);

    if (isNaN(idx) || idx < 0 || idx >= app.crafts.length) {
        showToast('Выберите крафт', 'error');
        return;
    }
    if (isNaN(qty) || qty < 1) {
        showToast('Введите корректное количество', 'error');
        return;
    }
    if (isNaN(price) || price < 0) {
        showToast('Введите корректную цену', 'error');
        return;
    }

    const craft = app.crafts[idx];
    try {
        const temp = new CompositeResource(craft.name, craft.composition, craft.outputQuantity, craft.toll || 0);
        const costPerUnit = temp.getCost(app.registry.resources);

        const listing = new ShopListing(craft.name, 'craft', qty, costPerUnit, price);
        app.shopDB.addListing(listing);
        renderShopTables();
        hideModal('modal-shop-add-craft');
        showToast('Крафт добавлен в лавку: ' + craft.name, 'success');
    } catch (e) {
        showError('Ошибка расчёта себестоимости: ' + e.message);
    }
});

// ==================== ДОБАВЛЕНИЕ ИЗ РЕСУРСОВ ====================

document.getElementById('btn-shop-add-from-resources').addEventListener('click', () => {
    const select = document.getElementById('shop-resource-select');
    select.innerHTML = '';

    const entries = Object.entries(app.registry.resources);

    if (entries.length === 0) {
        showToast('Нет доступных ресурсов', 'error');
        return;
    }

    for (const [name, res] of entries) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name + ' (' + (res.type === 'basic' ? 'базовый' : 'сост.') + ')';
        select.appendChild(opt);
    }

    document.getElementById('shop-resource-search').value = '';
    document.getElementById('shop-resource-qty').value = '1';
    document.getElementById('shop-resource-price').value = '0';

    // Фильтрация по поиску
    const filterResources = () => {
        const search = document.getElementById('shop-resource-search').value.toLowerCase();
        for (const opt of select.options) {
            opt.style.display = (!search || opt.text.toLowerCase().includes(search)) ? '' : 'none';
        }
        if (select.options.length > 0 && !select.value) {
            select.selectedIndex = 0;
        }
    };
    filterResources();
    document.getElementById('shop-resource-search').oninput = filterResources;

    updateResourceCostPreview();
    document.getElementById('shop-resource-qty').oninput = updateResourceCostPreview;
    document.getElementById('shop-resource-price').oninput = updateResourceCostPreview;

    showModal('modal-shop-add-resource');
});

function updateResourceCostPreview() {
    const select = document.getElementById('shop-resource-select');
    const name = select.value;
    const qty = parseInt(document.getElementById('shop-resource-qty').value) || 1;
    const price = parseFloat(document.getElementById('shop-resource-price').value) || 0;

    const previewEl = document.getElementById('shop-resource-cost-preview');

    if (!name || !(name in app.registry.resources)) {
        previewEl.innerHTML = 'Себестоимость: —';
        return;
    }

    const res = app.registry.resources[name];
    let costPerUnit;
    try {
        costPerUnit = res.getCost(app.registry.resources);
    } catch (e) {
        costPerUnit = 0;
    }

    const totalCost = costPerUnit * qty;
    const totalRevenue = price * qty;
    const profitPerUnit = price - costPerUnit;
    const totalProfit = totalRevenue - totalCost;

    previewEl.innerHTML =
        '<strong style="color:#c9a84c;">За штуку:</strong><br>' +
        'Себестоимость: ' + costPerUnit.toFixed(2) + ' грш.<br>' +
        'Цена лавки: ' + price.toFixed(2) + ' грш.<br>' +
        '<strong style="color:' + (profitPerUnit >= 0 ? '#81c784' : '#e08080') + '">Прибыль: ' + profitPerUnit.toFixed(2) + ' грш.</strong><br><br>' +
        '<strong style="color:#c9a84c;">За комплект (' + qty + ' шт.):</strong><br>' +
        'Себестоимость: ' + totalCost.toFixed(2) + ' грш.<br>' +
        'Доход: ' + totalRevenue.toFixed(2) + ' грш.<br>' +
        '<strong style="color:' + (totalProfit >= 0 ? '#81c784' : '#e08080') + '">Прибыль: ' + totalProfit.toFixed(2) + ' грш.</strong>';
}

document.getElementById('btn-shop-confirm-add-resource').addEventListener('click', () => {
    const select = document.getElementById('shop-resource-select');
    const name = select.value;
    const qty = parseInt(document.getElementById('shop-resource-qty').value);
    const price = parseFloat(document.getElementById('shop-resource-price').value);

    if (!name || !(name in app.registry.resources)) {
        showToast('Выберите ресурс', 'error');
        return;
    }
    if (isNaN(qty) || qty < 1) {
        showToast('Введите корректное количество', 'error');
        return;
    }
    if (isNaN(price) || price < 0) {
        showToast('Введите корректную цену', 'error');
        return;
    }

    const res = app.registry.resources[name];
    let costPerUnit;
    try {
        costPerUnit = res.getCost(app.registry.resources);
    } catch (e) {
        costPerUnit = 0;
    }

    const type = res.type;
    const listing = new ShopListing(name, type, qty, costPerUnit, price);
    app.shopDB.addListing(listing);
    renderShopTables();
    hideModal('modal-shop-add-resource');
    showToast('Ресурс добавлен в лавку: ' + name, 'success');
});

// ==================== РЕДАКТИРОВАНИЕ ЛИСТИНГА ====================

let currentEditListingId = null;

function openEditListingModal(listingId) {
    const listing = app.shopDB.getListing(listingId);
    if (!listing) return;

    currentEditListingId = listingId;

    document.getElementById('modal-shop-edit-title').textContent = 'Редактировать: ' + listing.name;

    const infoEl = document.getElementById('modal-shop-edit-info');
    infoEl.innerHTML = '<strong>Тип:</strong> ' + (listing.type === 'basic' ? 'Базовый' : (listing.type === 'composite' ? 'Составной' : 'Крафт')) + '<br>' +
        '<strong>Себестоимость:</strong> ' + listing.costPerUnit.toFixed(2) + ' грш./шт.<br>' +
        '<strong>Всего выставлено:</strong> ' + listing.quantity + ' шт.<br>' +
        '<strong>Продано:</strong> ' + listing.soldQuantity + ' шт.<br>' +
        '<strong>Осталось:</strong> ' + listing.remainingQuantity + ' шт.';

    document.getElementById('shop-edit-qty').value = listing.quantity;
    document.getElementById('shop-edit-price').value = listing.listingPrice;

    showModal('modal-shop-edit');
}

document.getElementById('btn-shop-confirm-edit').addEventListener('click', () => {
    if (!currentEditListingId) return;

    const listing = app.shopDB.getListing(currentEditListingId);
    if (!listing) return;

    const newQty = parseInt(document.getElementById('shop-edit-qty').value);
    const newPrice = parseFloat(document.getElementById('shop-edit-price').value);

    if (isNaN(newQty) || newQty < 1) {
        showToast('Введите корректное количество', 'error');
        return;
    }
    if (isNaN(newPrice) || newPrice < 0) {
        showToast('Введите корректную цену', 'error');
        return;
    }

    // Добавляем разницу к количеству (если новый qty больше текущего)
    const diff = newQty - listing.quantity;
    if (diff > 0) {
        listing.quantity += diff;
    } else if (diff < 0) {
        // Если уменьшаем — проверяем, что не меньше проданного
        if (newQty < listing.soldQuantity) {
            showToast('Нельзя уменьшить меньше проданного (' + listing.soldQuantity + ' шт.)', 'error');
            return;
        }
        listing.quantity = newQty;
    } else {
        listing.quantity = newQty;
    }

    listing.listingPrice = newPrice;
    renderShopTables();
    hideModal('modal-shop-edit');
    showToast('Листинг обновлён', 'success');
    debounceSave(app.registry, app.crafts, app.materialsCrafts, app.shopDB);
});

// ==================== ПРОДАЖА ====================

let currentSellListingId = null;

function openSellModal(listingId) {
    const listing = app.shopDB.getListing(listingId);
    if (!listing) return;

    currentSellListingId = listingId;

    document.getElementById('modal-shop-sell-title').textContent = 'Продать: ' + listing.name;

    const infoEl = document.getElementById('modal-shop-sell-info');
    infoEl.innerHTML = '<strong>Всего:</strong> ' + listing.quantity + ' шт.<br>' +
        '<strong>Осталось:</strong> ' + listing.remainingQuantity + ' шт.<br>' +
        '<strong>Себестоимость:</strong> ' + listing.costPerUnit.toFixed(2) + ' грш./шт.<br>' +
        '<strong>Цена лавки:</strong> ' + listing.listingPrice.toFixed(2) + ' грш./шт.';

    document.getElementById('shop-sell-qty').value = '1';
    document.getElementById('shop-sell-qty').max = listing.remainingQuantity;
    document.getElementById('shop-sell-price').value = listing.listingPrice.toFixed(2);

    showModal('modal-shop-sell');
}

document.getElementById('btn-shop-confirm-sell').addEventListener('click', () => {
    if (!currentSellListingId) return;

    const qty = parseInt(document.getElementById('shop-sell-qty').value);
    const price = parseFloat(document.getElementById('shop-sell-price').value);

    if (isNaN(qty) || qty < 1) {
        showToast('Введите корректное количество', 'error');
        return;
    }
    if (isNaN(price) || price < 0) {
        showToast('Введите корректную цену', 'error');
        return;
    }

    const success = app.shopDB.sellFromListing(currentSellListingId, qty, price);
    if (success) {
        const listing = app.shopDB.getListing(currentSellListingId);
        showToast('Продано: ' + qty + ' шт. ' + listing.name, 'success');
        hideModal('modal-shop-sell');
        renderShopTables();

        if (listing.isSoldOut) {
            showToast('Листинг "' + listing.name + '" полностью продан!', 'success');
        }
    } else {
        showToast('Невозможно продать', 'error');
    }
});

// ==================== УДАЛЕНИЕ ====================

document.getElementById('btn-shop-delete-active').addEventListener('click', () => {
    const selected = document.querySelector('#shop-active-table tr.selected');
    if (!selected) {
        showToast('Выберите листинг для удаления', 'error');
        return;
    }

    const id = selected.dataset.id;
    const listing = app.shopDB.getListing(id);
    if (!listing) return;

    if (confirm('Удалить листинг "' + listing.name + '"?')) {
        app.shopDB.removeListing(id);
        renderShopTables();
        showToast('Листинг удалён', 'success');
    }
});

document.getElementById('btn-shop-delete-sold').addEventListener('click', () => {
    const selected = document.querySelector('#shop-sold-table tr.selected');
    if (!selected) {
        showToast('Выберите проданный листинг для удаления', 'error');
        return;
    }

    const id = selected.dataset.id;
    const listing = app.shopDB.getListing(id);
    if (!listing) return;

    if (confirm('Удалить проданный листинг "' + listing.name + '"?')) {
        app.shopDB.removeListing(id);
        renderShopTables();
        showToast('Листинг удалён', 'success');
    }
});

// ==================== ВЫДЕЛЕНИЕ СТРОК ====================

document.getElementById('shop-active-tbody')?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    document.querySelectorAll('#shop-active-table tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
});

document.getElementById('shop-sold-tbody')?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    document.querySelectorAll('#shop-sold-table tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
});