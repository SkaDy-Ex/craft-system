/* ============================================================================
   DATA LAYER — ShopDB (Лавка: выставленные и проданные товары)
   ============================================================================ */

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getTimestamp() {
    return new Date().toISOString();
}

function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

class ShopListing {
    constructor(name, type, quantity, costPerUnit, listingPrice) {
        this.id = generateId();
        this.name = name;
        this.type = type; // 'basic' | 'composite' | 'craft'
        this.quantity = quantity;
        this.costPerUnit = costPerUnit;
        this.totalCost = costPerUnit * quantity;
        this.listingPrice = listingPrice;
        this.listedDate = getTimestamp();
        this.soldQuantity = 0;
        this.soldItems = []; // { quantity, pricePerUnit, total, soldDate }
    }

    get remainingQuantity() {
        return this.quantity - this.soldQuantity;
    }

    get isSoldOut() {
        return this.soldQuantity >= this.quantity;
    }

    get totalRevenue() {
        let total = 0;
        for (const sale of this.soldItems) {
            total += sale.total;
        }
        return total;
    }

    get totalProfit() {
        let profit = 0;
        for (const sale of this.soldItems) {
            const costBasis = this.costPerUnit * sale.quantity;
            profit += sale.total - costBasis;
        }
        return profit;
    }

    get profitMargin() {
        if (this.totalRevenue === 0) return 0;
        return ((this.totalRevenue - this._totalCostForSold()) / this.totalRevenue) * 100;
    }

    _totalCostForSold() {
        return this.costPerUnit * this.soldQuantity;
    }

    sell(quantity, pricePerUnit) {
        const actualQty = Math.min(quantity, this.remainingQuantity);
        if (actualQty <= 0) return false;

        const total = actualQty * pricePerUnit;
        this.soldItems.push({
            quantity: actualQty,
            pricePerUnit: pricePerUnit,
            total: total,
            soldDate: getTimestamp()
        });
        this.soldQuantity += actualQty;
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            quantity: this.quantity,
            costPerUnit: this.costPerUnit,
            listingPrice: this.listingPrice,
            listedDate: this.listedDate,
            soldQuantity: this.soldQuantity,
            soldItems: this.soldItems
        };
    }

    static fromJSON(data) {
        const listing = new ShopListing(
            data.name,
            data.type,
            data.quantity,
            data.costPerUnit,
            data.listingPrice
        );
        listing.id = data.id;
        listing.listedDate = data.listedDate;
        listing.soldQuantity = data.soldQuantity || 0;
        listing.soldItems = data.soldItems || [];
        return listing;
    }
}

class ShopDB {
    constructor() {
        this.listings = [];
    }

    addListing(listing) {
        this.listings.push(listing);
    }

    removeListing(id) {
        const idx = this.listings.findIndex(l => l.id === id);
        if (idx >= 0) {
            this.listings.splice(idx, 1);
            return true;
        }
        return false;
    }

    getListing(id) {
        return this.listings.find(l => l.id === id);
    }

    sellFromListing(id, quantity, pricePerUnit) {
        const listing = this.getListing(id);
        if (!listing) return false;
        const success = listing.sell(quantity, pricePerUnit);
        if (success) {
            debounceSave(app.registry, app.crafts, app.materialsCrafts, app.shopDB);
        }
        return success;
    }

    // ==================== СТАТИСТИКА ====================

    getStats() {
        let totalListed = 0;
        let totalSold = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;

        for (const listing of this.listings) {
            totalListed += listing.quantity;
            totalSold += listing.soldQuantity;
            totalRevenue += listing.totalRevenue;
            totalCost += listing._totalCostForSold();
            totalProfit += listing.totalProfit;
        }

        const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

        return {
            totalListed,
            totalSold,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            roi: Math.round(roi * 100) / 100,
            listingCount: this.listings.length
        };
    }

    getStatsByType() {
        const byType = {};
        for (const listing of this.listings) {
            const type = listing.type;
            if (!byType[type]) {
                byType[type] = {
                    type: type,
                    listed: 0,
                    sold: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0
                };
            }
            byType[type].listed += listing.quantity;
            byType[type].sold += listing.soldQuantity;
            byType[type].revenue += listing.totalRevenue;
            byType[type].cost += listing._totalCostForSold();
            byType[type].profit += listing.totalProfit;
        }

        for (const key of Object.keys(byType)) {
            byType[key].revenue = Math.round(byType[key].revenue * 100) / 100;
            byType[key].cost = Math.round(byType[key].cost * 100) / 100;
            byType[key].profit = Math.round(byType[key].profit * 100) / 100;
        }

        return Object.values(byType);
    }

    // ==================== СЕРИАЛИЗАЦИЯ ====================

    toDict() {
        return this.listings.map(l => l.toJSON());
    }

    static fromDict(data) {
        const shop = new ShopDB();
        if (data && Array.isArray(data)) {
            for (const item of data) {
                shop.addListing(ShopListing.fromJSON(item));
            }
        }
        return shop;
    }
}
