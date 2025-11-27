import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { gameState } from '../core/GameState.js';
import { BUILDING_DB } from '../data/Buildings.js';
import { scene } from '../world/Scene.js';
import { playerState } from '../entities/Player.js';
import { cameraState } from '../core/Camera.js';
import { showMessage } from '../ui/UIManager.js';
import { consumeItem, countItem } from './Inventory.js';
import { createExplosion } from '../world/Environment.js';

export let buildings = [];
export let fields = [];
export let currentBuildList = [];

export function selectCategory(cat) {
    gameState.buildCat = cat;
    refreshBuildList();
    if (currentBuildList.length > 0) {
        gameState.buildId = currentBuildList[0];
        updatePreviewMesh();
        refreshBuildList();
    }
}

export function refreshBuildList() {
    const container = document.getElementById('build-list-container');
    if (!container) return;
    container.innerHTML = '';
    document.querySelectorAll('.cat-btn').forEach(btn => {
        const catName = (gameState.buildCat === 'housing' ? '주거' : gameState.buildCat === 'farming' ? '농사' : '장식');
        btn.classList.toggle('active', btn.innerText === catName);
    });

    currentBuildList = [];
    for (const [id, data] of Object.entries(BUILDING_DB)) {
        if (data.cat === gameState.buildCat) {
            currentBuildList.push(parseInt(id));
            const item = document.createElement('div');
            item.className = 'build-item';
            if (parseInt(id) === gameState.buildId) item.classList.add('selected');
            item.innerHTML = `<span style="font-size:20px;">${data.icon}</span><span style="font-size:10px; color:#ccc;">${data.name}</span>`;
            container.appendChild(item);
        }
    }

    if (!currentBuildList.includes(gameState.buildId) && currentBuildList.length > 0) {
        gameState.buildId = currentBuildList[0];
        updatePreviewMesh();
    }
}

function getBuildingGeometry(id) {
    const group = new THREE.Group();
    const data = BUILDING_DB[id];
    if (data.cat === 'housing') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 3), new THREE.MeshStandardMaterial({ color: 0xf5f5dc }));
        body.position.z = 1.5; body.castShadow = true; group.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0xcd5c5c }));
        roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI / 4; roof.position.z = 4.25; group.add(roof);
    } else if (data.cat === 'deco') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
        trunk.rotation.x = Math.PI / 2; trunk.position.z = 0.75; trunk.castShadow = true; group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0x006400 }));
        leaves.position.z = 2.0; leaves.castShadow = true; group.add(leaves);
    } else if (data.cat === 'farming') {
        const soil = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
        soil.position.z = 0.25; soil.receiveShadow = true; group.add(soil);
    }
    group.userData.radius = data.radius; group.userData.buildId = id;
    return group;
}

export function updatePreviewMesh() {
    removePreviewMesh();
    const ghostGroup = getBuildingGeometry(gameState.buildId);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.4, wireframe: true });
    ghostGroup.traverse((child) => { if (child.isMesh) child.material = redMat; });
    gameState.previewMesh = ghostGroup;
    scene.add(ghostGroup);
}

export function removePreviewMesh() {
    if (gameState.previewMesh) {
        scene.remove(gameState.previewMesh);
        gameState.previewMesh = null;
    }
}

export function updatePreviewTransform() {
    if (gameState.mode !== 'build' || !gameState.previewMesh) return;
    const dist = 4; // 플레이어와 더 가까운 위치에 건설
    const spawnPos = playerState.position.clone()
        .add(cameraState.forward.clone().multiplyScalar(dist))
        .normalize().multiplyScalar(gameState.planet.radius);
    gameState.previewMesh.position.copy(spawnPos);
    const up = spawnPos.clone().normalize();
    const forward = cameraState.forward.clone();
    const xAxis = new THREE.Vector3().crossVectors(forward, up).normalize();
    const yAxis = new THREE.Vector3().crossVectors(up, xAxis).normalize();
    const zAxis = up.clone();
    const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    gameState.previewMesh.quaternion.setFromRotationMatrix(m);
    gameState.previewMesh.rotateZ(gameState.buildRotation);
}

export function placeBuilding() {
    const data = BUILDING_DB[gameState.buildId];
    const woodCount = countItem('wood');
    const cost = data.cost.wood || 0;
    if (woodCount < cost) { showMessage(`나무가 부족합니다 (${woodCount}/${cost})`, "#ff6b6b"); return; }
    let tooClose = false;
    const pos = gameState.previewMesh.position;
    buildings.forEach(b => {
        if (b.position.distanceTo(pos) < (data.radius + (b.userData.radius || 2.0))) tooClose = true;
    });
    if (tooClose) { showMessage("공간이 부족합니다.", "#ff6b6b"); return; }
    consumeItem('wood', cost);
    const finalGroup = getBuildingGeometry(gameState.buildId);
    finalGroup.position.copy(gameState.previewMesh.position);
    finalGroup.quaternion.copy(gameState.previewMesh.quaternion);
    scene.add(finalGroup);
    buildings.push(finalGroup);
    if (data.cat === 'farming') fields.push({ mesh: finalGroup, crop: null });
    createExplosion(finalGroup.position, 0xffd700, 15);
    showMessage(`${data.name} 건설 완료!`, "#ffd700");
}
