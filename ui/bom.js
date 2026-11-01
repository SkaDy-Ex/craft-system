/* ============================================================================
   UI — Дерево состава (BOM Tree) и полная разузловка
   ============================================================================ */

function showCompositionTree(resourceName) {
    const res = app.registry.resources[resourceName];
    if (!res) { showError('Ресурс не найден'); return; }

    if (res.type === 'basic') {
        showInfo('Информация', 'Ресурс "' + resourceName + '" — базовый, состава нет.');
        return;
    }

    app.bomTreeResourceName = resourceName;
    document.getElementById('bom-tree-title').textContent = 'Состав: ' + resourceName;

    const container = document.getElementById('bom-tree-container');
    container.innerHTML = '';
    buildTreeHtml(container, resourceName, 1.0, true);

    try {
        const total = app.registry.getTotalCost(resourceName);
        document.getElementById('bom-tree-total-cost').textContent = 'Полная стоимость: ' + total.toFixed(2) + ' грш.';
    } catch (err) {
        document.getElementById('bom-tree-total-cost').textContent = 'Ошибка расчёта';
    }

    showModal('modal-bom-tree');
}

function buildTreeHtml(container, name, multiplier, isRoot) {
    const res = app.registry.resources[name];
    if (!res) {
        const div = document.createElement('div');
        div.className = 'tree-node' + (isRoot ? ' tree-node-root' : '');
        div.innerHTML = '<span style="color:#e74c3c;">' + name + '</span> <span class="tree-qty">[' + Math.round(multiplier) + ']</span>';
        container.appendChild(div);
        return;
    }

    const div = document.createElement('div');
    div.className = 'tree-node' + (isRoot ? ' tree-node-root' : '');

    if (res.type === 'basic') {
        const cost = res.costPerUnit * multiplier;
        div.innerHTML = '<span class="tree-basic">' + name + '</span> <span class="tree-qty">[' + Math.round(multiplier) + ' ' + (res.unit || '') + ']</span> <span class="tree-cost">' + cost.toFixed(2) + ' грш.</span>';
    } else {
        const compositeDiv = document.createElement('div');
        compositeDiv.className = 'tree-composite';
        compositeDiv.textContent = name + ' ▼';
        compositeDiv.addEventListener('click', () => {
            if (compositeDiv.dataset.expanded === 'true') {
                compositeDiv.dataset.expanded = 'false';
                compositeDiv.textContent = name + ' ▼';
                if (compositeDiv.nextSibling && compositeDiv.nextSibling.classList.contains('tree-children')) {
                    compositeDiv.nextSibling.style.display = 'none';
                }
            } else {
                compositeDiv.dataset.expanded = 'true';
                compositeDiv.textContent = name + ' ▲';
                if (compositeDiv.nextSibling && compositeDiv.nextSibling.classList.contains('tree-children')) {
                    compositeDiv.nextSibling.style.display = 'block';
                }
            }
        });
        compositeDiv.dataset.expanded = 'false';
        div.appendChild(compositeDiv);

        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        childrenDiv.style.display = 'block';

        for (const [compName, qty] of Object.entries(res.composition)) {
            buildTreeHtml(childrenDiv, compName, multiplier * qty, false);
        }

        div.appendChild(childrenDiv);
    }

    container.appendChild(div);
}

// ==================== КРАФТ — ПОЛНАЯ РАЗУЗЛОВКА ====================

function showFullBomForCraft(craftIndex) {
    const craft = app.crafts[craftIndex];
    if (!craft) return;

    try {
        const temp = new CompositeResource(craft.name, craft.composition, craft.outputQuantity, craft.toll || 0);
        const fullBom = temp.getBom(app.registry.resources);
        const costOne = temp.getCost(app.registry.resources);
        const totalCost = costOne * craft.quantity;

        // Build beautiful report
        const report = document.getElementById('full-bom-report');
        const catLabel = getCategoryLabel(craft.category);

        let html = '<div class="bom-report-header">';
        html += '<div class="bom-report-title">' + escapeHtml(craft.name) + '</div>';
        html += '<div class="bom-report-meta">';
        html += '<span class="bom-report-badge">' + escapeHtml(catLabel) + '</span>';
        html += '<span class="bom-report-qty">×' + craft.quantity + ' шт.</span>';
        html += '</div></div>';

        // Cost summary
        html += '<div class="bom-report-costs">';
        html += '<div class="bom-cost-row">';
        html += '<span class="bom-cost-label">Стоимость одного:</span>';
        html += '<span class="bom-cost-value">' + costOne.toFixed(2) + ' грш.</span>';
        html += '</div>';
        html += '<div class="bom-cost-row bom-cost-row-total">';
        html += '<span class="bom-cost-label">Общая стоимость:</span>';
        html += '<span class="bom-cost-value">' + totalCost.toFixed(2) + ' грш.</span>';
        html += '</div>';
        html += '</div>';

        // Direct composition
        html += '<div class="bom-report-section">';
        html += '<div class="bom-section-title">Прямой состав</div>';
        html += '<div class="bom-composition-list">';
        for (const [name, qty] of Object.entries(craft.composition)) {
            const res = app.registry.resources[name];
            const isComposite = res && res.type === 'composite';
            const typeIcon = isComposite ? '🔗' : '📦';
            const typeClass = isComposite ? 'bom-comp-composite' : 'bom-comp-basic';
            html += '<div class="bom-comp-item">';
            html += '<span class="bom-comp-icon">' + typeIcon + '</span>';
            html += '<span class="bom-comp-name">' + escapeHtml(name) + '</span>';
            html += '<span class="bom-comp-badge ' + typeClass + '">' + (isComposite ? 'составной' : 'базовый') + '</span>';
            html += '<span class="bom-comp-qty">' + Math.round(qty) + ' шт.</span>';
            html += '</div>';
        }
        html += '</div></div>';

        // Full BOM (aggregated base resources)
        const sortedBom = Object.entries(fullBom).sort((a, b) => a[0].localeCompare(b[0]));
        html += '<div class="bom-report-section">';
        html += '<div class="bom-section-title">Итого базовых ресурсов (×' + craft.quantity + ')</div>';
        html += '<div class="bom-composition-list">';
        for (const [name, qty] of sortedBom) {
            const res = app.registry.resources[name];
            const unit = res ? (res.unit || 'шт.') : 'шт.';
            html += '<div class="bom-comp-item">';
            html += '<span class="bom-comp-icon">📦</span>';
            html += '<span class="bom-comp-name">' + escapeHtml(name) + '</span>';
            html += '<span class="bom-comp-qty">' + Math.round(qty) + ' ' + escapeHtml(unit) + '</span>';
            html += '</div>';
        }
        html += '</div></div>';

        report.innerHTML = html;
        report.style.display = 'block';

        app.fullBomTitle = 'Полная разузловка: ' + craft.name;
        app.fullBomText = generateFullBomText(craft, fullBom, costOne, totalCost);
        document.getElementById('full-bom-title').textContent = app.fullBomTitle;
        showModal('modal-full-bom');
    } catch (err) {
        showError('Ошибка расчёта: ' + err.message);
    }
}

function generateFullBomText(craft, fullBom, costOne, totalCost) {
    let text = '═══════════════════════════════════════════\n';
    text += '  ' + craft.name + ' (×' + craft.quantity + ')\n';
    text += '═══════════════════════════════════════════\n\n';
    text += 'Категория: ' + getCategoryLabel(craft.category) + '\n';
    text += 'Стоимость одного: ' + costOne.toFixed(2) + ' грш.\n';
    if (craft.toll > 0) {
        text += 'Пошлина кузни: ' + craft.toll.toFixed(2) + ' грш.\n';
    }
    text += 'Общая стоимость: ' + totalCost.toFixed(2) + ' грш.\n\n';
    text += '─── Прямой состав ───\n';
    for (const [name, qty] of Object.entries(craft.composition)) {
        text += '  ' + name + ': ' + Math.round(qty) + ' шт.\n';
    }
    text += '\n─── Итого базовых ресурсов ───\n';
    for (const [name, qty] of Object.entries(fullBom).sort()) {
        text += '  ' + name + ': ' + Math.round(qty) + ' шт.\n';
    }
    return text;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


