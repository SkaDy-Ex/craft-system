/* ============================================================================
   DATA LAYER — Crafts with Categories
   ============================================================================ */

// Доступные категории
const CRAFT_CATEGORIES = [
    { id: 'weapons', label: '⚔️ Оружие' },
    { id: 'armor', label: '🛡️ Броня' },
    { id: 'alchemy', label: '⚗️ Алхимия' },
    { id: 'jewelry', label: '💎 Ювелирка' },
    { id: 'ranged', label: '🏹 Лучное' },
    { id: 'clothing', label: '👕 Одежда' },
    { id: 'food', label: '🍖 Еда' },
    { id: 'brewing', label: '🍺 Пивоварение' },
    { id: 'carpentry', label: '🪚 Столярка' }
];

function getCategoryLabel(categoryId) {
    const cat = CRAFT_CATEGORIES.find(c => c.id === categoryId);
    return cat ? cat.label : '📦 Другое';
}

function getCategoryOptionsHtml(selectedCategory) {
    let html = '';
    for (const cat of CRAFT_CATEGORIES) {
        const selected = cat.id === selectedCategory ? ' selected' : '';
        html += '<option value="' + cat.id + '"' + selected + '>' + cat.label + '</option>';
    }
    return html;
}

// Фильтры категорий
function getCraftsByCategory(crafts, categoryId) {
    if (!categoryId || categoryId === 'all') {
        return crafts;
    }
    return crafts.filter(c => c.category === categoryId);
}

function getAllCategoriesWithCounts(crafts) {
    const counts = { all: crafts.length };
    for (const cat of CRAFT_CATEGORIES) {
        counts[cat.id] = crafts.filter(c => c.category === cat.id).length;
    }
    return counts;
}

function exportCraftsData(crafts, registry) {
    return {
        resources: registry.toDict(),
        crafts: crafts
    };
}

function importCraftsData(data) {
    const registry = ResourceRegistry.fromDict(data.resources || {});
    const crafts = (data.crafts || []).map(c => ({
        name: c.name || '',
        quantity: c.quantity || 1,
        composition: c.composition || {},
        outputQuantity: c.outputQuantity || 1,
        toll: c.toll || 0,
        category: c.category || 'other'
    }));
    return { registry, crafts };
}
