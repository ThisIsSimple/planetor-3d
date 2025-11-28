// Babylon.js Building System
import { gameState } from '../core/GameState.js';
import { BUILDING_DB } from '../data/Buildings.js';
import { scene, addShadowCaster } from '../world/Scene.js';
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
    const group = new BABYLON.TransformNode("building_" + id, scene);
    const data = BUILDING_DB[id];
    
    if (data.cat === 'housing') {
        // House body - Y axis is surface normal
        const body = BABYLON.MeshBuilder.CreateBox("houseBody", {
            width: 4, height: 3, depth: 4
        }, scene);
        body.parent = group;
        body.position.y = 1.5;
        
        const bodyMat = new BABYLON.StandardMaterial("houseBodyMat", scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.96, 0.96, 0.86); // Beige
        body.material = bodyMat;
        addShadowCaster(body);
        
        // Roof (pyramid pointing up along Y axis)
        const roof = BABYLON.MeshBuilder.CreateCylinder("houseRoof", {
            diameterTop: 0,
            diameterBottom: 7, // sqrt(2) * 4 ≈ 7 for 4x4 base
            height: 2.5,
            tessellation: 4
        }, scene);
        roof.parent = group;
        roof.rotation.y = Math.PI / 4; // Rotate to align with square base
        roof.position.y = 4.25;
        
        const roofMat = new BABYLON.StandardMaterial("houseRoofMat", scene);
        roofMat.diffuseColor = new BABYLON.Color3(0.804, 0.361, 0.361); // Indian red
        roof.material = roofMat;
        
    } else if (data.cat === 'deco') {
        // Decorative tree - trunk (Y axis is up)
        const trunk = BABYLON.MeshBuilder.CreateCylinder("decoTrunk", {
            diameterTop: 0.4,
            diameterBottom: 0.6,
            height: 1.5,
            tessellation: 8
        }, scene);
        trunk.parent = group;
        trunk.position.y = 0.75;
        
        const trunkMat = new BABYLON.StandardMaterial("decoTrunkMat", scene);
        trunkMat.diffuseColor = new BABYLON.Color3(0.545, 0.271, 0.075);
        trunk.material = trunkMat;
        addShadowCaster(trunk);
        
        // Leaves (sphere)
        const leaves = BABYLON.MeshBuilder.CreateSphere("decoLeaves", {
            diameter: 2.4,
            segments: 8
        }, scene);
        leaves.parent = group;
        leaves.position.y = 2.0;
        
        const leavesMat = new BABYLON.StandardMaterial("decoLeavesMat", scene);
        leavesMat.diffuseColor = new BABYLON.Color3(0, 0.392, 0); // Dark green
        leaves.material = leavesMat;
        addShadowCaster(leaves);
        
    } else if (data.cat === 'farming') {
        // Farm field (soil) - flat on surface
        const soil = BABYLON.MeshBuilder.CreateBox("farmSoil", {
            width: 3, height: 0.5, depth: 3
        }, scene);
        soil.parent = group;
        soil.position.y = 0.25;
        soil.receiveShadows = true;
        
        const soilMat = new BABYLON.StandardMaterial("farmSoilMat", scene);
        soilMat.diffuseColor = new BABYLON.Color3(0.365, 0.251, 0.216); // Brown
        soil.material = soilMat;
    }
    
    group.metadata = { radius: data.radius, buildId: id };
    return group;
}

export function updatePreviewMesh() {
    removePreviewMesh();
    const ghostGroup = getBuildingGeometry(gameState.buildId);
    
    // Apply wireframe red material to all meshes
    const redMat = new BABYLON.StandardMaterial("previewMat", scene);
    redMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
    redMat.alpha = 0.4;
    redMat.wireframe = true;
    
    ghostGroup.getChildMeshes().forEach(mesh => {
        mesh.material = redMat;
    });
    
    gameState.previewMesh = ghostGroup;
}

export function removePreviewMesh() {
    if (gameState.previewMesh) {
        gameState.previewMesh.dispose();
        gameState.previewMesh = null;
    }
}

export function updatePreviewTransform() {
    if (gameState.mode !== 'build' || !gameState.previewMesh) return;
    
    const dist = 4;
    const spawnPos = playerState.position
        .add(cameraState.forward.scale(dist))
        .normalize()
        .scale(gameState.planet.radius);
    
    gameState.previewMesh.position.copyFrom(spawnPos);
    
    // Align to surface - Y axis becomes surface normal
    const up = spawnPos.clone().normalize();
    
    // Project forward onto surface plane (remove up component)
    let forward = cameraState.forward.clone();
    const upComponent = BABYLON.Vector3.Dot(forward, up);
    forward = forward.subtract(up.scale(upComponent));
    if (forward.lengthSquared() < 0.001) {
        // forward was parallel to up, use fallback
        forward = new BABYLON.Vector3(1, 0, 0);
        const upComp2 = BABYLON.Vector3.Dot(forward, up);
        forward = forward.subtract(up.scale(upComp2));
    }
    forward.normalize();
    
    // Create orthonormal basis for left-handed system
    // X = Y × Z (up × forward), Z = X × Y (xAxis × up)
    let xAxis = BABYLON.Vector3.Cross(up, forward);
    if (xAxis.lengthSquared() < 0.001) {
        xAxis = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(0, 0, 1));
    }
    xAxis.normalize();
    const zAxis = BABYLON.Vector3.Cross(xAxis, up).normalize();
    
    // Babylon.js column-major matrix
    const rotMatrix = BABYLON.Matrix.FromValues(
        xAxis.x, xAxis.y, xAxis.z, 0,
        up.x, up.y, up.z, 0,
        zAxis.x, zAxis.y, zAxis.z, 0,
        0, 0, 0, 1
    );
    
    gameState.previewMesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
    
    // Apply build rotation
    const rotQuat = BABYLON.Quaternion.RotationAxis(up, gameState.buildRotation);
    gameState.previewMesh.rotationQuaternion = gameState.previewMesh.rotationQuaternion.multiply(rotQuat);
}

export function placeBuilding() {
    const data = BUILDING_DB[gameState.buildId];
    const woodCount = countItem('wood');
    const cost = data.cost.wood || 0;
    if (woodCount < cost) { 
        showMessage(`나무가 부족합니다 (${woodCount}/${cost})`, "#ff6b6b"); 
        return; 
    }
    
    let tooClose = false;
    const pos = gameState.previewMesh.position;
    buildings.forEach(b => {
        const bRadius = (b.metadata && b.metadata.radius) ? b.metadata.radius : 2.0;
        if (BABYLON.Vector3.Distance(b.position, pos) < (data.radius + bRadius)) {
            tooClose = true;
        }
    });
    
    if (tooClose) { 
        showMessage("공간이 부족합니다.", "#ff6b6b"); 
        return; 
    }
    
    consumeItem('wood', cost);
    
    const finalGroup = getBuildingGeometry(gameState.buildId);
    finalGroup.position.copyFrom(gameState.previewMesh.position);
    if (gameState.previewMesh.rotationQuaternion) {
        finalGroup.rotationQuaternion = gameState.previewMesh.rotationQuaternion.clone();
    }
    
    buildings.push(finalGroup);
    
    if (data.cat === 'farming') {
        fields.push({ mesh: finalGroup, crop: null });
    }
    
    createExplosion(finalGroup.position, 0xffd700, 15);
    showMessage(`${data.name} 건설 완료!`, "#ffd700");
}
