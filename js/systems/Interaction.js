import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { gameState } from '../core/GameState.js';
import { player } from '../entities/Player.js';
import { trees, createExplosion, spawnDrop } from '../world/Environment.js';
import { fields, placeBuilding } from './Building.js';
import { ITEM_DB } from '../data/Items.js';
import { showMessage } from '../ui/UIManager.js';
import { consumeItem } from './Inventory.js';
import { scene } from '../world/Scene.js';

export function handleInteraction(isHold) {
    if (gameState.mode === 'build') {
        if (!isHold) placeBuilding();
        return;
    }
    const heldItem = gameState.inventory[gameState.selectedSlot];
    let target = null, minD = 5.0;
    trees.forEach(t => {
        const d = player.position.distanceTo(t.position);
        if (d < minD) { minD = d; target = { type: 'tree', obj: t }; }
    });
    fields.forEach(f => {
        const d = player.position.distanceTo(f.mesh.position);
        if (d < 4.0 && d < minD) { minD = d; target = { type: 'field', obj: f }; }
    });

    if (isHold) {
        if (target && target.type === 'tree') {
            if (heldItem && heldItem.id === 'axe') {
                chopTree(target.obj);
            } else {
                showMessage("도끼가 필요합니다.", "#ff6b6b");
            }
            return;
        }

        if (target && target.type === 'field' && target.obj.crop) {
            const crop = target.obj.crop;
            if (crop.stage === 2) harvestCrop(target.obj);
            else removeCrop(target.obj);
            return;
        }
        if (heldItem && ITEM_DB[heldItem.id].type === 'food') {
            eatFood(gameState.selectedSlot);
            return;
        }
    } else {
        if (target && target.type === 'field' && !target.obj.crop) {
            if (heldItem && ITEM_DB[heldItem.id].type === 'seed') {
                plantSeed(target.obj, heldItem.id);
                consumeItem(heldItem.id, 1);
            } else { showMessage("씨앗이 필요합니다.", "#ff6b6b"); }
            return;
        }
    }
}

function chopTree(treeObj) {
    const idx = trees.indexOf(treeObj);
    if (idx > -1) {
        scene.remove(treeObj);
        trees.splice(idx, 1);
        createExplosion(treeObj.position, 0x8b4513, 8);
        spawnDrop(treeObj.position, 'wood');
        if (Math.random() < 0.2) spawnDrop(treeObj.position, 'seed_unknown');
        gameState.hunger = Math.max(0, gameState.hunger - 1);
    }
}

function plantSeed(fieldObj, seedId) {
    const cropGroup = new THREE.Group();
    cropGroup.position.copy(fieldObj.mesh.position);
    cropGroup.quaternion.copy(fieldObj.mesh.quaternion);
    const sprout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    sprout.rotation.x = Math.PI / 2; sprout.position.z = 0.5;
    cropGroup.add(sprout);
    scene.add(cropGroup);
    fieldObj.crop = { mesh: cropGroup, type: 'carrot', stage: 0, timer: 0, maxTime: 10 };
    createExplosion(fieldObj.mesh.position, 0x00ff00, 5);
    showMessage("씨앗을 심었습니다.", "#4ade80");
}

export function updateCrops(delta) {
    fields.forEach(f => {
        if (f.crop && f.crop.stage < 2) {
            f.crop.timer += delta;
            if (f.crop.timer > f.crop.maxTime) {
                f.crop.stage++;
                f.crop.timer = 0;
                updateCropVisual(f.crop);
            }
        }
    });
}

function updateCropVisual(crop) {
    while (crop.mesh.children.length > 0) crop.mesh.remove(crop.mesh.children[0]);
    if (crop.stage === 1) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0), new THREE.MeshStandardMaterial({ color: 0x228b22 }));
        stem.rotation.x = Math.PI / 2; stem.position.z = 0.5; crop.mesh.add(stem);
    } else if (crop.stage === 2) {
        const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xff7f00 }));
        carrot.rotation.x = Math.PI / 2; carrot.position.z = 0.4;
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
        leaves.rotation.x = Math.PI / 2; leaves.position.z = 1.0; crop.mesh.add(carrot); crop.mesh.add(leaves);
    }
    createExplosion(crop.mesh.position, 0x00ff00, 3);
}

function harvestCrop(fieldObj) {
    scene.remove(fieldObj.crop.mesh);
    fieldObj.crop = null;
    spawnDrop(fieldObj.mesh.position, 'carrot');
    createExplosion(fieldObj.mesh.position, 0xff7f00, 8);
    showMessage("수확했습니다!", "#ffd700");
}

function removeCrop(fieldObj) {
    scene.remove(fieldObj.crop.mesh);
    fieldObj.crop = null;
    spawnDrop(fieldObj.mesh.position, 'seed_unknown');
    showMessage("작물을 제거했습니다.", "#ccc");
}

function eatFood(slotIndex) {
    const item = gameState.inventory[slotIndex];
    const hungerRestore = ITEM_DB[item.id].hunger || 10;
    if (gameState.hunger >= 100) { showMessage("배가 부릅니다.", "#ccc"); return; }
    gameState.hunger = Math.min(100, gameState.hunger + hungerRestore);
    consumeItem(item.id, 1);
    showMessage("냠냠!", "#ffd700");
    createExplosion(player.position.clone().add(new THREE.Vector3(0, 3, 0)), 0xff7f00, 5);
}
