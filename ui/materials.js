/* ============================================================================
   UI — Вкладка «Материалы» (сводка ресурсов для крафтов в корзине)
   ============================================================================ */

function renderMaterialsTable() {
    const tbody = document.getElementById('materials-tbody');
    tbody.innerHTML = '';

    const crafts = app.materialsCrafts;

    if (crafts.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.textAlign = 'center';
        td.style.padding = '30px';
        td.style.color = '#999';
        td.textContent = 'Нажмите ➕ на крафте, чтобы добавить его в корзину и увидеть расчёт материалов';
        tr.appendChild(td);
        tbody.appendChild(tr);
        document.getElementById('materials-total').textContent = 'Итого материалов: —';
        return;
    }

    // Aggregate all base resources needed
    const aggregated = {}; // resourceName -> { qty, unit }

    for (const craft of crafts) {
        try {
            const temp = new CompositeResource(craft.name, craft.composition);
            const fullBom = temp.getBom(app.registry.resources);

            for (const [resName, qty] of Object.entries(fullBom)) {
                const res = app.registry.resources[resName];
                const totalQty = qty * craft.quantity;

                if (!(resName in aggregated)) {
                    aggregated[resName] = { qty: 0, unit: res ? (res.unit || 'шт.') : 'шт.' };
                }
                aggregated[resName].qty += totalQty;
            }
        } catch (e) {
            // Skip crafts with errors
        }
    }

    // Sort by name
    const sorted = Object.entries(aggregated).sort((a, b) => a[0].localeCompare(b[0]));

    let totalCost = 0;

    for (const [resName, data] of sorted) {
        const res = app.registry.resources[resName];
        const tr = document.createElement('tr');

        // Name
        const tdName = document.createElement('td');
        tdName.textContent = resName;
        tr.appendChild(tdName);

        // Type
        const tdType = document.createElement('td');
        tdType.textContent = res ? (res.type === 'basic' ? 'Базовый' : 'Составной') : '—';
        tr.appendChild(tdType);

        // Quantity
        const tdQty = document.createElement('td');
        tdQty.textContent = Math.round(data.qty);
        tdQty.style.fontWeight = '600';
        tr.appendChild(tdQty);

        // Unit
        const tdUnit = document.createElement('td');
        tdUnit.textContent = data.unit;
        tr.appendChild(tdUnit);

        // Cost
        const tdCost = document.createElement('td');
        if (res && res.type === 'basic') {
            const cost = data.qty * res.costPerUnit;
            totalCost += cost;
            tdCost.textContent = cost.toFixed(2);
            tdCost.className = 'cost-calculated';
        } else if (res) {
            try {
                const temp = new CompositeResource(resName, res.composition, res.outputQuantity || 1);
                const costPerUnit = temp.getCost(app.registry.resources);
                const cost = data.qty * costPerUnit;
                totalCost += cost;
                tdCost.textContent = cost.toFixed(2);
                tdCost.className = 'cost-calculated';
            } catch (e) {
                tdCost.textContent = '—';
            }
        } else {
            tdCost.textContent = '—';
        }
        tr.appendChild(tdCost);

        tbody.appendChild(tr);
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
    renderCraftsTable();
    renderMaterialsTable();
    debounceSave(app.registry, app.crafts, app.materialsCrafts);
    showToast('Корзина очищена', 'success');
});

// Export materials summary
document.getElementById('btn-export-materials')?.addEventListener('click', () => {
    if (app.materialsCrafts.length === 0) {
        showToast('Добавьте крафты в корзину для экспорта', 'info');
        return;
    }

    const aggregated = {};
    const craftDetails = [];

    for (const craft of app.materialsCrafts) {
        try {
            const temp = new CompositeResource(craft.name, craft.composition);
            const fullBom = temp.getBom(app.registry.resources);
            const costOne = temp.getCost(app.registry.resources);
            const totalCost = costOne * craft.quantity;

            craftDetails.push({
                name: craft.name,
                qty: craft.quantity,
                costOne: costOne,
                totalCost: totalCost,
                bom: fullBom
            });

            for (const [resName, qty] of Object.entries(fullBom)) {
                const res = app.registry.resources[resName];
                const totalQty = qty * craft.quantity;

                if (!(resName in aggregated)) {
                    aggregated[resName] = { qty: 0, unit: res ? (res.unit || 'шт.') : 'шт.' };
                }
                aggregated[resName].qty += totalQty;
            }
        } catch (e) {
            // Skip
        }
    }

    let text = '═══════════════════════════════════════════════\n';
    text += '  СВОДКА МАТЕРИАЛОВ\n';
    text += '═══════════════════════════════════════════════\n\n';

    text += '─── Крафты в корзине ───\n';
    for (const cd of craftDetails) {
        text += '\n' + cd.name + ' (×' + cd.qty + ')\n';
        text += '  Стоимость: ' + cd.costOne.toFixed(2) + ' → ' + cd.totalCost.toFixed(2) + ' грш.\n';
    }

    text += '\n─── Итого базовых ресурсов ───\n';
    for (const [resName, data] of Object.entries(aggregated).sort()) {
        text += '  ' + resName + ': ' + Math.round(data.qty) + ' ' + data.unit + '\n';
    }

    let grandTotal = 0;
    for (const cd of craftDetails) {
        grandTotal += cd.totalCost;
    }
    text += '\n─── ИТОГО: ' + grandTotal.toFixed(2) + ' грш. ───\n';

    downloadText('materials_summary.txt', text);
    showToast('Сводка сохранена', 'success');
});
