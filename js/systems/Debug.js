// Debug System - 충돌 영역 시각화
import { scene } from '../world/Scene.js';
import { gameState } from '../core/GameState.js';
import { trees, crashedShip } from '../world/Environment.js';
import { buildings } from './Building.js';
import { player, playerState } from '../entities/Player.js';
import { showMessage } from '../ui/UIManager.js';

// 디버그 메시들을 저장
let debugMeshes = [];
let debugMaterials = {};

// 색상 상수
const COLORS = {
    player: new BABYLON.Color3(1, 0.2, 0.2),      // 빨간색
    tree: new BABYLON.Color3(0.2, 1, 0.2),        // 녹색
    building: new BABYLON.Color3(0.2, 0.5, 1),    // 파란색
    ship: new BABYLON.Color3(1, 0.6, 0.2)         // 주황색
};

/**
 * 디버그 재질 초기화
 */
function initDebugMaterials() {
    if (Object.keys(debugMaterials).length > 0) return;
    
    for (const [key, color] of Object.entries(COLORS)) {
        const mat = new BABYLON.StandardMaterial(`debugMat_${key}`, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color.scale(0.3);
        mat.alpha = 0.4;
        mat.wireframe = true;
        mat.backFaceCulling = false;
        debugMaterials[key] = mat;
    }
}

/**
 * 디버그 시각화 토글
 */
export function toggleDebugVisuals() {
    gameState.debugMode = !gameState.debugMode;
    
    if (gameState.debugMode) {
        initDebugMaterials();
        createDebugMeshes();
        showMessage("디버그 모드 ON - 충돌 영역 표시", "#ffd700");
    } else {
        clearDebugMeshes();
        showMessage("디버그 모드 OFF", "#ccc");
    }
}

/**
 * 모든 디버그 메시 생성
 */
function createDebugMeshes() {
    clearDebugMeshes();
    
    // 플레이어 충돌 영역
    createPlayerDebugMesh();
    
    // 나무 충돌 영역
    trees.forEach((tree, index) => {
        createTreeDebugMesh(tree, index);
    });
    
    // 건물 충돌 영역
    buildings.forEach((building, index) => {
        createBuildingDebugMesh(building, index);
    });
    
    // 우주선 충돌 영역
    if (crashedShip) {
        createShipDebugMesh();
    }
}

/**
 * 플레이어 충돌 영역 메시 생성
 */
function createPlayerDebugMesh() {
    const sphere = BABYLON.MeshBuilder.CreateSphere("debug_player", {
        diameter: playerState.radius * 2,
        segments: 16
    }, scene);
    sphere.material = debugMaterials.player;
    sphere.isPickable = false;
    
    debugMeshes.push({
        mesh: sphere,
        type: 'player',
        target: player
    });
}

/**
 * 나무 충돌 영역 메시 생성
 */
function createTreeDebugMesh(tree, index) {
    const treeRadius = 1.2; // Player.js에서 정의된 나무 충돌 반경
    
    const sphere = BABYLON.MeshBuilder.CreateSphere(`debug_tree_${index}`, {
        diameter: treeRadius * 2,
        segments: 12
    }, scene);
    sphere.material = debugMaterials.tree;
    sphere.position.copyFrom(tree.position);
    sphere.isPickable = false;
    
    debugMeshes.push({
        mesh: sphere,
        type: 'tree',
        target: tree
    });
}

/**
 * 건물 충돌 영역 메시 생성
 */
function createBuildingDebugMesh(building, index) {
    const buildingRadius = (building.metadata && building.metadata.radius) 
        ? building.metadata.radius 
        : 3.5;
    
    const sphere = BABYLON.MeshBuilder.CreateSphere(`debug_building_${index}`, {
        diameter: buildingRadius * 2,
        segments: 16
    }, scene);
    sphere.material = debugMaterials.building;
    sphere.position.copyFrom(building.position);
    sphere.isPickable = false;
    
    debugMeshes.push({
        mesh: sphere,
        type: 'building',
        target: building
    });
}

/**
 * 우주선 캡슐 충돌 영역 메시 생성
 */
function createShipDebugMesh() {
    const capsuleRadius = 1.8;
    const capsuleHalfHeight = 2.0;
    
    // 캡슐 형태 생성 (Babylon.js 캡슐 사용)
    const capsule = BABYLON.MeshBuilder.CreateCapsule("debug_ship", {
        radius: capsuleRadius,
        height: capsuleHalfHeight * 2 + capsuleRadius * 2,
        tessellation: 16,
        subdivisions: 1
    }, scene);
    capsule.material = debugMaterials.ship;
    capsule.isPickable = false;
    
    debugMeshes.push({
        mesh: capsule,
        type: 'ship',
        target: crashedShip
    });
}

/**
 * 모든 디버그 메시 제거
 */
function clearDebugMeshes() {
    debugMeshes.forEach(item => {
        if (item.mesh) {
            item.mesh.dispose();
        }
    });
    debugMeshes = [];
}

/**
 * 디버그 메시 위치 업데이트 (매 프레임 호출)
 */
export function updateDebugVisuals() {
    if (!gameState.debugMode) return;
    
    // 새로 추가된 오브젝트 확인 및 처리
    const currentTreeCount = debugMeshes.filter(d => d.type === 'tree').length;
    const currentBuildingCount = debugMeshes.filter(d => d.type === 'building').length;
    
    if (currentTreeCount !== trees.length || currentBuildingCount !== buildings.length) {
        // 오브젝트 수가 변경되면 다시 생성
        createDebugMeshes();
        return;
    }
    
    debugMeshes.forEach(item => {
        if (!item.target || !item.mesh) return;
        
        switch (item.type) {
            case 'player':
                item.mesh.position.copyFrom(player.position);
                break;
                
            case 'tree':
                // 나무가 제거되었는지 확인
                if (!trees.includes(item.target)) {
                    item.mesh.dispose();
                    return;
                }
                item.mesh.position.copyFrom(item.target.position);
                break;
                
            case 'building':
                item.mesh.position.copyFrom(item.target.position);
                break;
                
            case 'ship':
                // 우주선 캡슐 위치 계산 (로컬 오프셋 적용)
                if (crashedShip) {
                    const localCenter = new BABYLON.Vector3(0, 0, 2);
                    const worldMatrix = crashedShip.getWorldMatrix();
                    const worldCenter = BABYLON.Vector3.TransformCoordinates(localCenter, worldMatrix);
                    item.mesh.position.copyFrom(worldCenter);
                    
                    // 캡슐 회전도 적용
                    if (crashedShip.rotationQuaternion) {
                        item.mesh.rotationQuaternion = crashedShip.rotationQuaternion.clone();
                    }
                }
                break;
        }
    });
    
    // 제거된 메시 정리
    debugMeshes = debugMeshes.filter(item => {
        if (item.type === 'tree' && !trees.includes(item.target)) {
            return false;
        }
        return item.mesh && !item.mesh.isDisposed();
    });
}

/**
 * 디버그 재질 해제
 */
export function disposeDebugMaterials() {
    for (const mat of Object.values(debugMaterials)) {
        mat.dispose();
    }
    debugMaterials = {};
}

