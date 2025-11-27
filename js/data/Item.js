export class Item {
    constructor(id, name, icon, description, rarity = 'Normal') {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.description = description;
        this.rarity = rarity; // Normal, Rare, Unique, Epic, Legendary
        this.type = 'item';
    }
}

export class Equipment extends Item {
    constructor(id, name, icon, description, rarity, durability) {
        super(id, name, icon, description, rarity);
        this.durability = durability;
        this.maxDurability = durability;
        this.type = 'equipment';
    }
}

export class Weapon extends Equipment {
    constructor(id, name, icon, description, rarity, durability, damage, attackSpeed) {
        super(id, name, icon, description, rarity, durability);
        this.damage = damage;
        this.attackSpeed = attackSpeed;
        this.type = 'weapon';
    }
}

export class Consumable extends Item {
    constructor(id, name, icon, description, rarity) {
        super(id, name, icon, description, rarity);
        this.type = 'consumable';
    }
}

export class Food extends Consumable {
    constructor(id, name, icon, description, rarity, hungerRestore, healthRestore = 0) {
        super(id, name, icon, description, rarity);
        this.hungerRestore = hungerRestore;
        this.healthRestore = healthRestore;
        this.type = 'food';
    }
}

export class Material extends Item {
    constructor(id, name, icon, description, rarity) {
        super(id, name, icon, description, rarity);
        this.type = 'material';
    }
}

export class Plantable extends Item {
    constructor(id, name, icon, description, rarity) {
        super(id, name, icon, description, rarity);
        this.type = 'plantable';
    }
}

export class Seed extends Plantable {
    constructor(id, name, icon, description, rarity, cropType) {
        super(id, name, icon, description, rarity);
        this.cropType = cropType;
        this.type = 'seed';
    }
}
