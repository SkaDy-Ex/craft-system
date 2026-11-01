/* ============================================================================
   DATA LAYER — Registry (Resources)
   ============================================================================ */

class DependencyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DependencyError';
    }
}

class Resource {
    constructor(name) {
        this.name = name;
    }

    getCost(registry, _visited = null) {
        throw new Error('Не реализовано');
    }

    getBom(registry, multiplier = 1.0) {
        throw new Error('Не реализовано');
    }
}

class BasicResource extends Resource {
    constructor(name, unit, costPerUnit) {
        super(name);
        this.unit = unit;
        this.costPerUnit = costPerUnit;
        this.type = 'basic';
    }

    getCost(registry, _visited = null) {
        return this.costPerUnit;
    }

    getBom(registry, multiplier = 1.0) {
        return { [this.name]: multiplier };
    }

    toJSON() {
        return {
            type: 'basic',
            unit: this.unit,
            cost_per_unit: this.costPerUnit
        };
    }

    static fromJSON(name, data) {
        return new BasicResource(name, data.unit, data.cost_per_unit);
    }
}

class CompositeResource extends Resource {
    constructor(name, composition = {}, outputQuantity = 1, toll = 0) {
        super(name);
        this.composition = composition;
        this.outputQuantity = outputQuantity;
        this.toll = toll;
        this.type = 'composite';
    }

    getCost(registry, _visited = null) {
        if (Object.keys(this.composition).length === 0) {
            return 0.0;
        }

        if (_visited === null) {
            _visited = new Set();
        }

        if (_visited.has(this.name)) {
            throw new DependencyError(
                'Циклическая зависимость: ' + Array.from(_visited).join(' -> ') + ' -> ' + this.name
            );
        }

        _visited.add(this.name);

        let totalCost = 0.0;
        for (const [compName, qty] of Object.entries(this.composition)) {
            if (!(compName in registry)) {
                throw new Error("Ресурс '" + compName + "' не найден в реестре.");
            }

            const component = registry[compName];
            const componentCost = component.getCost(registry, _visited);
            totalCost += componentCost * qty;
        }

        _visited.delete(this.name);
        return (totalCost + this.toll) / this.outputQuantity;
    }

    getBom(registry, multiplier = 1.0) {
        const bom = {};
        for (const [compName, qty] of Object.entries(this.composition)) {
            const component = registry[compName];
            const componentBom = component.getBom(registry, multiplier * qty);
            for (const [resName, resQty] of Object.entries(componentBom)) {
                bom[resName] = (bom[resName] || 0.0) + resQty;
            }
        }
        return bom;
    }

    toJSON() {
        return {
            type: 'composite',
            composition: this.composition,
            output_quantity: this.outputQuantity,
            toll: this.toll
        };
    }

    static fromJSON(name, data) {
        return new CompositeResource(name, data.composition, data.output_quantity || 1, data.toll || 0);
    }
}

class ResourceRegistry {
    constructor() {
        this.resources = {};
    }

    addOrUpdate(resource) {
        if (resource instanceof CompositeResource) {
            try {
                resource.getCost(this.resources);
            } catch (e) {
                if (e instanceof DependencyError) {
                    throw new DependencyError('Невозможно сохранить: ' + e.message);
                }
            }
        }
        this.resources[resource.name] = resource;
    }

    delete(name) {
        for (const res of Object.values(this.resources)) {
            if (res instanceof CompositeResource && name in res.composition) {
                throw new Error(
                    "Ресурс '" + name + "' используется в составе '" + res.name + "'. " +
                    'Сначала удалите его из состава.'
                );
            }
        }
        delete this.resources[name];
    }

    getTotalCost(resourceName) {
        if (!(resourceName in this.resources)) {
            throw new Error('Ресурс не найден');
        }
        return this.resources[resourceName].getCost(this.resources);
    }

    getFullBom(resourceName) {
        if (!(resourceName in this.resources)) {
            throw new Error('Ресурс не найден');
        }
        return this.resources[resourceName].getBom(this.resources);
    }

    toDict() {
        const data = {};
        for (const [name, res] of Object.entries(this.resources)) {
            data[name] = res.toJSON();
        }
        return data;
    }

    static fromDict(data) {
        const registry = new ResourceRegistry();

        for (const [name, props] of Object.entries(data)) {
            if (props.type === 'basic') {
                registry.addOrUpdate(BasicResource.fromJSON(name, props));
            }
        }

        const compositeItems = Object.entries(data).filter(([name, props]) => props.type === 'composite');
        let remaining = [...compositeItems];

        for (let iteration = 0; iteration < remaining.length + 1; iteration++) {
            if (remaining.length === 0) break;

            const successfullyLoaded = [];
            for (const [name, props] of remaining) {
                try {
                    registry.addOrUpdate(CompositeResource.fromJSON(name, props));
                    successfullyLoaded.push([name, props]);
                } catch (e) {
                    // Skip
                }
            }

            remaining = remaining.filter(([name]) => !successfullyLoaded.some(([n]) => n === name));

            if (remaining.length === 0) break;
        }

        if (remaining.length > 0) {
            const [name, props] = remaining[0];
            registry.addOrUpdate(CompositeResource.fromJSON(name, props));
        }

        return registry;
    }
}
