import * as THREE from 'https://unpkg.com/three@0.181.0/build/three.module.js';
import { scene } from './Scene.js';
import { gameState } from '../core/GameState.js';
import { getRandomPositionOnSphere } from '../utils/MathUtils.js';
import { ITEM_DB } from '../data/Items.js';
import { addItem } from '../systems/Inventory.js';
import { showMessage } from '../ui/UIManager.js';
import { HealthBar } from '../ui/WorldUI.js';

export let trees = [], particles = [], drops = [];
export let crashedShip = null;

export function spawnTree() {
    createTreeMesh(getRandomPositionOnSphere(gameState.planet.radius));
}

/**
 * 고장난 우주선 생성 - 플레이어 시작 위치 근처에 배치
 * @param {THREE.Vector3} playerStartPos - 플레이어 시작 위치
 */
export function spawnCrashedShip(playerStartPos) {
    const ship = new THREE.Group();
    
    // 플레이어 시작 위치에서 약간 떨어진 곳에 배치
    const up = playerStartPos.clone().normalize();
    const right = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 0, 1)).normalize();
    const shipPos = playerStartPos.clone().add(right.multiplyScalar(8)); // 플레이어 옆 8유닛 거리
    shipPos.normalize().multiplyScalar(gameState.planet.radius);
    
    ship.position.copy(shipPos);
    
    // 행성 표면에 맞춰 회전
    const shipUp = shipPos.clone().normalize();
    const xAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), shipUp);
    if (xAxis.lengthSq() < 0.001) xAxis.set(1, 0, 0);
    xAxis.normalize();
    const yAxis = new THREE.Vector3().crossVectors(shipUp, xAxis).normalize();
    ship.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, shipUp));
    
    // 불시착 느낌을 위해 약간 기울임
    ship.rotateX(0.15);
    ship.rotateY(0.1);
    
    // === 우주선 메인 바디 (유선형 캡슐) ===
    const bodyGeo = new THREE.CapsuleGeometry(1.8, 4, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x708090, // 슬레이트 그레이
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.z = 2;
    body.castShadow = true;
    ship.add(body);
    
    // === 조종석 (유리 돔) ===
    const cockpitGeo = new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({ 
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.6,
        metalness: 0.1,
        roughness: 0.1
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, -1.5, 2.8);
    cockpit.rotation.x = -Math.PI / 6;
    ship.add(cockpit);
    
    // === 날개 (왼쪽) ===
    const wingGeo = new THREE.BoxGeometry(4, 0.2, 1.5);
    const wingMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a4a4a,
        metalness: 0.8,
        roughness: 0.2
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-2.5, 0, 2);
    leftWing.rotation.z = 0.1;
    leftWing.castShadow = true;
    ship.add(leftWing);
    
    // === 날개 (오른쪽) - 손상됨 ===
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(2.5, 0, 2);
    rightWing.rotation.z = -0.3; // 꺾여있음
    rightWing.rotation.y = 0.2;
    rightWing.castShadow = true;
    ship.add(rightWing);
    
    // === 추진기 (뒤쪽) ===
    const engineGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 8);
    const engineMat = new THREE.MeshStandardMaterial({ 
        color: 0x2f2f2f,
        metalness: 0.9,
        roughness: 0.1
    });
    
    const engine1 = new THREE.Mesh(engineGeo, engineMat);
    engine1.rotation.x = Math.PI / 2;
    engine1.position.set(-0.8, 2.8, 1.8);
    ship.add(engine1);
    
    const engine2 = new THREE.Mesh(engineGeo, engineMat);
    engine2.rotation.x = Math.PI / 2;
    engine2.position.set(0.8, 2.8, 1.8);
    ship.add(engine2);
    
    // === 손상 표시 - 그을음 자국 ===
    const scorchGeo = new THREE.CircleGeometry(1.5, 16);
    const scorchMat = new THREE.MeshBasicMaterial({ 
        color: 0x1a1a1a,
        transparent: true,
        opacity: 0.7
    });
    const scorch1 = new THREE.Mesh(scorchGeo, scorchMat);
    scorch1.position.set(1.5, 0.5, 3.2);
    scorch1.rotation.y = Math.PI / 2;
    ship.add(scorch1);
    
    // === 연기 파티클 효과 (고장난 느낌) ===
    const smokeGroup = new THREE.Group();
    smokeGroup.position.set(0.8, 2.5, 2.5);
    ship.add(smokeGroup);
    ship.userData.smokeGroup = smokeGroup;
    ship.userData.smokeTimer = 0;
    
    // === 착륙 다리 ===
    const legGeo = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(-1.2, -1, 0.5);
    leg1.rotation.x = 0.3;
    ship.add(leg1);
    
    const leg2 = new THREE.Mesh(legGeo, legMat);
    leg2.position.set(1.2, -1, 0.5);
    leg2.rotation.x = 0.3;
    ship.add(leg2);
    
    const leg3 = new THREE.Mesh(legGeo, legMat);
    leg3.position.set(0, 1.5, 0.5);
    leg3.rotation.x = -0.3;
    ship.add(leg3);
    
    scene.add(ship);
    crashedShip = ship;
    
    return ship;
}

function createTreeMesh(pos) {
    const tree = new THREE.Group();
    tree.position.copy(pos);
    const up = pos.clone().normalize();
    const xAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(Math.abs(up.z) > 0.99 ? 1 : 0, 0, Math.abs(up.z) > 0.99 ? 0 : 1), up).normalize();
    const yAxis = new THREE.Vector3().crossVectors(up, xAxis).normalize();
    tree.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, up));

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2.5), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
    trunk.rotation.x = Math.PI / 2;
    trunk.position.z = 1.25;
    tree.add(trunk);

    const l1 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.5, 8), new THREE.MeshStandardMaterial({ color: 0x228b22 }));
    l1.rotation.x = Math.PI / 2;
    l1.position.z = 3.0;
    tree.add(l1);

    const l2 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.0, 8), new THREE.MeshStandardMaterial({ color: 0x32cd32 }));
    l2.rotation.x = Math.PI / 2;
    l2.position.z = 4.5;
    tree.add(l2);

    // Health Bar
    // Positioned above the tree (local Z axis)
    // We pass the tree object and the scalar offset (7)
    const healthBar = new HealthBar(tree, 7);

    tree.userData = {
        health: 100,
        maxHealth: 100,
        healthBar: healthBar
    };

    scene.add(tree);
    trees.push(tree);
    return tree;
}

export function updateEnvironment(playerPos, camera) {
    updateParticles();

    // Update Tree Health Bars
    trees.forEach(tree => {
        const dist = tree.position.distanceTo(playerPos);
        if (dist < 15) {
            tree.userData.healthBar.update(camera, tree.userData.health, tree.userData.maxHealth);
        } else {
            tree.userData.healthBar.setVisible(false);
        }
    });
    
    // 고장난 우주선 연기 효과
    if (crashedShip && crashedShip.userData.smokeGroup) {
        crashedShip.userData.smokeTimer += 0.016; // 약 60fps 기준
        if (crashedShip.userData.smokeTimer > 0.3) { // 0.3초마다 연기 생성
            crashedShip.userData.smokeTimer = 0;
            createSmoke(crashedShip);
        }
    }
}

/**
 * 우주선에서 연기 파티클 생성
 */
function createSmoke(ship) {
    const smokeGeo = new THREE.SphereGeometry(0.3, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({ 
        color: 0x444444,
        transparent: true,
        opacity: 0.6
    });
    const smoke = new THREE.Mesh(smokeGeo, smokeMat);
    
    // 우주선의 손상된 부분에서 연기 생성
    const worldPos = new THREE.Vector3();
    ship.userData.smokeGroup.getWorldPosition(worldPos);
    smoke.position.copy(worldPos);
    
    // 위로 올라가는 속도 (행성 표면 기준 위쪽)
    const up = ship.position.clone().normalize();
    const vel = up.clone().multiplyScalar(0.08);
    vel.x += (Math.random() - 0.5) * 0.02;
    vel.y += (Math.random() - 0.5) * 0.02;
    vel.z += (Math.random() - 0.5) * 0.02;
    
    particles.push({ 
        mesh: smoke, 
        vel: vel, 
        life: 1.5,
        isSmoke: true
    });
    scene.add(smoke);
}

export function createExplosion(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: color }));
        m.position.copy(pos);
        const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.4);
        particles.push({ mesh: m, vel: vel, life: 1.0 });
        scene.add(m);
    }
}

export function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        if (p.isSmoke) {
            // 연기 파티클은 더 천천히 사라지고 커짐
            p.life -= 0.01;
            p.mesh.position.add(p.vel);
            p.mesh.scale.setScalar(1 + (1.5 - p.life) * 0.8); // 시간이 지날수록 커짐
            p.mesh.material.opacity = p.life * 0.4; // 점점 투명해짐
        } else {
            // 일반 파티클
            p.life -= 0.02;
            p.mesh.position.add(p.vel);
            p.mesh.scale.setScalar(p.life);
        }
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

export function spawnDrop(pos, itemId) {
    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 1;
    const up = pos.clone().normalize();
    const vel = up.clone().multiplyScalar(0.5).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.2));
    drops.push({ mesh: mesh, vel: vel, life: 1.0, itemId: itemId });
    scene.add(mesh);
}

export function updateDrops(player) {
    for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life -= 0.02;
        d.mesh.position.add(d.vel);
        const toPlayer = player.position.clone().sub(d.mesh.position);
        if (toPlayer.length() < 5) d.vel.add(toPlayer.normalize().multiplyScalar(0.05));
        if (d.mesh.position.distanceTo(player.position) < 2.0 || d.life <= 0) {
            addItem(d.itemId, 1);
            showMessage(`+ ${ITEM_DB[d.itemId].name}`, "#4ade80");
            scene.remove(d.mesh);
            drops.splice(i, 1);
        }
    }
}
