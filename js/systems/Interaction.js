import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { gameState } from '../core/GameState.js';
import { player, playerState, getLookDirection } from '../entities/Player.js';
import { trees, createExplosion, spawnDrop } from '../world/Environment.js';
import { fields, placeBuilding } from './Building.js';
import { ITEM_DB } from '../data/Items.js';
import { showMessage } from '../ui/UIManager.js';
import { consumeItem } from './Inventory.js';
import { scene } from '../world/Scene.js';

export function handleInteraction() {
    if (gameState.mode === 'build') {
        placeBuilding();
        return;
    }
    const slotItem = gameState.inventory[gameState.selectedSlot];
    const heldItem = slotItem ? ITEM_DB[slotItem.id] : null;

    let target = null, minD = 5.0;

    // Prioritize fields for interaction
    fields.forEach(f => {
        const d = player.position.distanceTo(f.mesh.position);
        if (d < 4.0 && d < minD) { minD = d; target = { type: 'field', obj: f }; }
    });

    if (target && target.type === 'field') {
        if (target.obj.crop) {
            const crop = target.obj.crop;
            if (crop.stage === 2) harvestCrop(target.obj);
            else removeCrop(target.obj);
        } else {
            if (heldItem && heldItem.type === 'seed') {
                plantSeed(target.obj, heldItem.id);
                consumeItem(heldItem.id, 1);
            } else {
                showMessage("씨앗이 필요합니다.", "#ff6b6b");
            }
        }
        return;
    }

    if (heldItem && heldItem.type === 'food') {
        eatFood(gameState.selectedSlot);
        return;
    }
}

export function checkAttackHit() {
    const slotItem = gameState.inventory[gameState.selectedSlot];
    const heldItem = slotItem ? ITEM_DB[slotItem.id] : null;
    if (!heldItem || heldItem.type !== 'weapon') return;

    // 캐릭터가 바라보는 정면 방향
    const lookDir = getLookDirection();
    
    // 공격 범위 설정
    const attackRange = heldItem.range || 5.0; // 무기별 공격 범위
    const attackAngle = 0.5; // cos(60°) ≈ 0.5 → 전방 120도 범위

    let target = null;
    let minD = attackRange;

    trees.forEach(t => {
        const d = player.position.distanceTo(t.position);
        if (d < minD) {
            // 캐릭터 정면 방향 기준으로 각도 체크
            const toTree = t.position.clone().sub(player.position).normalize();
            const dot = lookDir.dot(toTree);
            
            // 정면 방향 기준 일정 각도 내에 있는지 확인
            if (dot > attackAngle) {
                minD = d;
                target = { type: 'tree', obj: t };
            }
        }
    });

    if (target && target.type === 'tree') {
        if (heldItem.id === 'axe') {
            damageTree(target.obj, heldItem.damage || 20);
        }
    }
}

function damageTree(treeObj, damage) {
    if (!treeObj.userData.health) treeObj.userData.health = 100; // Fallback
    treeObj.userData.health -= damage;

    // Visual feedback
    createExplosion(treeObj.position.clone().add(new THREE.Vector3(0, 2, 0)), 0x8b4513, 3);

    // Shake effect (simple)
    treeObj.rotation.z += 0.1;
    setTimeout(() => { treeObj.rotation.z -= 0.1; }, 100);

    if (treeObj.userData.health <= 0) {
        chopTree(treeObj);
    }
}

function chopTree(treeObj) {
    const idx = trees.indexOf(treeObj);
    if (idx > -1) {
        if (treeObj.userData.healthBar) treeObj.userData.healthBar.dispose();
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
    const slotItem = gameState.inventory[slotIndex];
    if (!slotItem) return;
    const item = ITEM_DB[slotItem.id];
    if (!item || item.type !== 'food') return;

    const hungerRestore = item.hungerRestore || 10;
    if (gameState.hunger >= 100) { showMessage("배가 부릅니다.", "#ccc"); return; }
    gameState.hunger = Math.min(100, gameState.hunger + hungerRestore);
    consumeItem(item.id, 1);
    showMessage("냠냠!", "#ffd700");
    createExplosion(player.position.clone().add(new THREE.Vector3(0, 3, 0)), 0xff7f00, 5);
}
