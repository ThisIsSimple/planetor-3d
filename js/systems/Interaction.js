// Babylon.js Interaction System
import { gameState } from '../core/GameState.js';
import { player, playerState, getLookDirection } from '../entities/Player.js';
import { trees, createExplosion, spawnDrop } from '../world/Environment.js';
import { fields, placeBuilding } from './Building.js';
import { ITEM_DB } from '../data/Items.js';
import { showMessage } from '../ui/UIManager.js';
import { consumeItem } from './Inventory.js';
import { scene, addShadowCaster } from '../world/Scene.js';

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
        const d = BABYLON.Vector3.Distance(player.position, f.mesh.position);
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
    const attackRange = heldItem.range || 5.0;
    const attackAngle = 0.5; // cos(60°) ≈ 0.5 → 전방 120도 범위

    let target = null;
    let minD = attackRange;

    trees.forEach(t => {
        const d = BABYLON.Vector3.Distance(player.position, t.position);
        if (d < minD) {
            // 캐릭터 정면 방향 기준으로 각도 체크
            const toTree = t.position.subtract(player.position).normalize();
            const dot = BABYLON.Vector3.Dot(lookDir, toTree);
            
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
    if (!treeObj.metadata.health) treeObj.metadata.health = 100;
    treeObj.metadata.health -= damage;

    // Visual feedback
    const explosionPos = treeObj.position.add(new BABYLON.Vector3(0, 2, 0));
    createExplosion(explosionPos, 0x8b4513, 3);

    // Shake effect (simple)
    treeObj.rotation.z += 0.1;
    setTimeout(() => { treeObj.rotation.z -= 0.1; }, 100);

    if (treeObj.metadata.health <= 0) {
        chopTree(treeObj);
    }
}

function chopTree(treeObj) {
    const idx = trees.indexOf(treeObj);
    if (idx > -1) {
        if (treeObj.metadata.healthBar) treeObj.metadata.healthBar.dispose();
        treeObj.dispose();
        trees.splice(idx, 1);
        createExplosion(treeObj.position, 0x8b4513, 8);
        spawnDrop(treeObj.position, 'wood');
        if (Math.random() < 0.2) spawnDrop(treeObj.position, 'seed_unknown');
        gameState.hunger = Math.max(0, gameState.hunger - 1);
    }
}

function plantSeed(fieldObj, seedId) {
    const cropGroup = new BABYLON.TransformNode("crop", scene);
    cropGroup.position.copyFrom(fieldObj.mesh.position);
    if (fieldObj.mesh.rotationQuaternion) {
        cropGroup.rotationQuaternion = fieldObj.mesh.rotationQuaternion.clone();
    }
    
    // Sprout - Y axis is surface normal
    const sprout = BABYLON.MeshBuilder.CreateCylinder("sprout", {
        diameterTop: 0.2,
        diameterBottom: 0.2,
        height: 0.5,
        tessellation: 8
    }, scene);
    sprout.parent = cropGroup;
    sprout.position.y = 0.5;
    
    const sproutMat = new BABYLON.StandardMaterial("sproutMat", scene);
    sproutMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
    sprout.material = sproutMat;
    
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
    // Remove old children
    crop.mesh.getChildMeshes().forEach(m => m.dispose());
    
    if (crop.stage === 1) {
        const stem = BABYLON.MeshBuilder.CreateCylinder("stem", {
            diameterTop: 0.4,
            diameterBottom: 0.4,
            height: 1.0,
            tessellation: 8
        }, scene);
        stem.parent = crop.mesh;
        stem.position.y = 0.5;
        
        const stemMat = new BABYLON.StandardMaterial("stemMat", scene);
        stemMat.diffuseColor = new BABYLON.Color3(0.133, 0.545, 0.133);
        stem.material = stemMat;
        
    } else if (crop.stage === 2) {
        // Carrot - pointing up
        const carrot = BABYLON.MeshBuilder.CreateCylinder("carrot", {
            diameterTop: 0,
            diameterBottom: 0.6,
            height: 0.8,
            tessellation: 8
        }, scene);
        carrot.parent = crop.mesh;
        carrot.position.y = 0.4;
        
        const carrotMat = new BABYLON.StandardMaterial("carrotMat", scene);
        carrotMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0); // Orange
        carrot.material = carrotMat;
        
        // Leaves
        const leaves = BABYLON.MeshBuilder.CreateCylinder("carrotLeaves", {
            diameterTop: 0,
            diameterBottom: 1.0,
            height: 0.5,
            tessellation: 8
        }, scene);
        leaves.parent = crop.mesh;
        leaves.position.y = 1.0;
        
        const leavesMat = new BABYLON.StandardMaterial("carrotLeavesMat", scene);
        leavesMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        leaves.material = leavesMat;
    }
    
    createExplosion(crop.mesh.position, 0x00ff00, 3);
}

function harvestCrop(fieldObj) {
    fieldObj.crop.mesh.dispose();
    fieldObj.crop = null;
    spawnDrop(fieldObj.mesh.position, 'carrot');
    createExplosion(fieldObj.mesh.position, 0xff7f00, 8);
    showMessage("수확했습니다!", "#ffd700");
}

function removeCrop(fieldObj) {
    fieldObj.crop.mesh.dispose();
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
    
    const explosionPos = player.position.add(new BABYLON.Vector3(0, 3, 0));
    createExplosion(explosionPos, 0xff7f00, 5);
}
