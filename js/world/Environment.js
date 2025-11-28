// Babylon.js Environment - Trees, Particles, Drops, Crashed Ship
import { scene, addShadowCaster } from './Scene.js';
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
 * @param {BABYLON.Vector3} playerStartPos - 플레이어 시작 위치
 */
export function spawnCrashedShip(playerStartPos) {
    const ship = new BABYLON.TransformNode("crashedShip", scene);
    
    // 플레이어 시작 위치에서 약간 떨어진 곳에 배치
    const up = playerStartPos.clone().normalize();
    const tempAxis = new BABYLON.Vector3(0, 0, 1);
    let right = BABYLON.Vector3.Cross(up, tempAxis);
    if (right.lengthSquared() < 0.001) {
        right = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(1, 0, 0));
    }
    right.normalize();
    
    const shipPos = playerStartPos.add(right.scale(8)); // 플레이어 옆 8유닛 거리
    shipPos.normalize();
    shipPos.scaleInPlace(gameState.planet.radius);
    
    ship.position.copyFrom(shipPos);
    
    // 행성 표면에 맞춰 회전
    const shipUp = shipPos.clone().normalize();
    alignToSurface(ship, shipUp);
    
    // 불시착 느낌을 위해 약간 기울임 (quaternion 기반)
    const tiltX = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), 0.15);
    const tiltY = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 1, 0), 0.1);
    ship.rotationQuaternion = ship.rotationQuaternion.multiply(tiltX).multiply(tiltY);
    
    // === 우주선 메인 바디 (캡슐) - standing upright on Y-axis ===
    const body = BABYLON.MeshBuilder.CreateCapsule("shipBody", {
        radius: 1.8,
        height: 7.6,
        tessellation: 16
    }, scene);
    body.parent = ship;
    // No rotation - capsule stands upright along Y-axis
    body.position.y = 3.8; // Half of height (7.6/2) so bottom touches ground
    
    const bodyMat = new BABYLON.StandardMaterial("shipBodyMat", scene);
    bodyMat.diffuseColor = new BABYLON.Color3(0.44, 0.50, 0.56); // Slate gray
    bodyMat.metallic = 0.7;
    bodyMat.roughness = 0.3;
    body.material = bodyMat;
    addShadowCaster(body);
    
    // === 조종석 (유리 돔) - on top ===
    const cockpit = BABYLON.MeshBuilder.CreateSphere("cockpit", {
        diameter: 2.4,
        slice: 0.5,
        segments: 16
    }, scene);
    cockpit.parent = ship;
    cockpit.position.set(0, 7.0, 0.8); // Top of ship, slightly forward
    cockpit.rotation.x = Math.PI / 6; // Tilt forward
    
    const cockpitMat = new BABYLON.StandardMaterial("cockpitMat", scene);
    cockpitMat.diffuseColor = new BABYLON.Color3(0.53, 0.81, 0.92); // Sky blue
    cockpitMat.alpha = 0.6;
    cockpit.material = cockpitMat;
    
    // === 날개 (왼쪽) - middle height ===
    const leftWing = BABYLON.MeshBuilder.CreateBox("leftWing", {
        width: 4, height: 0.2, depth: 1.5
    }, scene);
    leftWing.parent = ship;
    leftWing.position.set(-2.5, 4, 0);
    leftWing.rotation.z = 0.1;
    
    const wingMat = new BABYLON.StandardMaterial("wingMat", scene);
    wingMat.diffuseColor = new BABYLON.Color3(0.29, 0.29, 0.29);
    wingMat.metallic = 0.8;
    leftWing.material = wingMat;
    addShadowCaster(leftWing);
    
    // === 날개 (오른쪽) - 손상됨 ===
    const rightWing = BABYLON.MeshBuilder.CreateBox("rightWing", {
        width: 4, height: 0.2, depth: 1.5
    }, scene);
    rightWing.parent = ship;
    rightWing.position.set(2.5, 4, 0);
    rightWing.rotation.z = -0.3; // Damaged, drooping
    rightWing.rotation.y = 0.2;
    rightWing.material = wingMat;
    addShadowCaster(rightWing);
    
    // === 추진기 (아래쪽) - pointing down ===
    const engineMat = new BABYLON.StandardMaterial("engineMat", scene);
    engineMat.diffuseColor = new BABYLON.Color3(0.18, 0.18, 0.18);
    engineMat.metallic = 0.9;
    
    const engine1 = BABYLON.MeshBuilder.CreateCylinder("engine1", {
        diameterTop: 1.2, diameterBottom: 1.6, height: 1.5, tessellation: 8
    }, scene);
    engine1.parent = ship;
    // No rotation needed - cylinder already points along Y-axis
    engine1.position.set(-0.8, 0.5, 0);
    engine1.material = engineMat;
    
    const engine2 = engine1.clone("engine2");
    engine2.parent = ship;
    engine2.position.set(0.8, 0.5, 0);
    
    // === 손상 표시 - 그을음 자국 ===
    const scorch = BABYLON.MeshBuilder.CreateDisc("scorch", {
        radius: 1.2, tessellation: 16
    }, scene);
    scorch.parent = ship;
    scorch.position.set(1.6, 5, 0.5);
    scorch.rotation.y = Math.PI / 2; // Face outward on ship side
    
    const scorchMat = new BABYLON.StandardMaterial("scorchMat", scene);
    scorchMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    scorchMat.alpha = 0.7;
    scorch.material = scorchMat;
    
    // === 연기 효과용 데이터 ===
    ship.metadata = {
        smokePosition: new BABYLON.Vector3(1.0, 5.5, 0.5),
        smokeTimer: 0
    };
    
    // Store up direction for smoke
    ship.metadata.upDirection = ship.position.clone().normalize();
    
    // === 착륙 다리 ===
    const legMat = new BABYLON.StandardMaterial("legMat", scene);
    legMat.diffuseColor = new BABYLON.Color3(0.33, 0.33, 0.33);
    
    const createLeg = (name, xPos, zPos, rotX, rotZ) => {
        const leg = BABYLON.MeshBuilder.CreateCylinder(name, {
            diameterTop: 0.2, diameterBottom: 0.4, height: 2.0, tessellation: 6
        }, scene);
        leg.parent = ship;
        leg.position.set(xPos, 0.3, zPos);
        leg.rotation.x = rotX;
        leg.rotation.z = rotZ;
        leg.material = legMat;
        return leg;
    };
    
    // Three landing legs spread out
    createLeg("leg1", -1.5, -1.0, -0.3, -0.4);
    createLeg("leg2", 1.5, -1.0, -0.3, 0.4);
    createLeg("leg3", 0, 1.5, 0.4, 0);
    
    crashedShip = ship;
    return ship;
}

function createTreeMesh(pos) {
    const tree = new BABYLON.TransformNode("tree", scene);
    tree.position.copyFrom(pos);
    
    // Align to sphere surface
    const up = pos.clone().normalize();
    alignToSurface(tree, up);

    // Trunk - Y axis is now surface normal, so cylinder stands upright
    const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
        diameterTop: 1.2, diameterBottom: 1.6, height: 2.5, tessellation: 8
    }, scene);
    trunk.parent = tree;
    trunk.position.y = 1.25;
    
    const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.545, 0.271, 0.075); // Brown
    trunk.material = trunkMat;
    addShadowCaster(trunk);

    // Leaves layer 1 (cone pointing up)
    const leaves1 = BABYLON.MeshBuilder.CreateCylinder("leaves1", {
        diameterTop: 0, diameterBottom: 4.4, height: 3.5, tessellation: 8
    }, scene);
    leaves1.parent = tree;
    leaves1.position.y = 3.0;
    
    const leavesMat1 = new BABYLON.StandardMaterial("leavesMat1", scene);
    leavesMat1.diffuseColor = new BABYLON.Color3(0.133, 0.545, 0.133); // Forest green
    leaves1.material = leavesMat1;
    addShadowCaster(leaves1);

    // Leaves layer 2 (cone pointing up)
    const leaves2 = BABYLON.MeshBuilder.CreateCylinder("leaves2", {
        diameterTop: 0, diameterBottom: 3.2, height: 3.0, tessellation: 8
    }, scene);
    leaves2.parent = tree;
    leaves2.position.y = 4.5;
    
    const leavesMat2 = new BABYLON.StandardMaterial("leavesMat2", scene);
    leavesMat2.diffuseColor = new BABYLON.Color3(0.196, 0.804, 0.196); // Lime green
    leaves2.material = leavesMat2;
    addShadowCaster(leaves2);

    // Health Bar
    const healthBar = new HealthBar(tree, 7);

    tree.metadata = {
        health: 100,
        maxHealth: 100,
        healthBar: healthBar
    };

    trees.push(tree);
    return tree;
}

// Helper function to align an object to sphere surface
// Babylon.js uses left-handed coordinate system and column-major matrices
function alignToSurface(node, up) {
    // Create orthonormal basis where 'up' becomes the local Y axis (standing on surface)
    // For left-handed system: X = Y × Z, Z = X × Y
    let zAxis = new BABYLON.Vector3(0, 0, 1);
    let xAxis = BABYLON.Vector3.Cross(up, zAxis);  // Y × Z = X (left-handed)
    if (xAxis.lengthSquared() < 0.001) {
        xAxis = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(1, 0, 0));
    }
    xAxis.normalize();
    zAxis = BABYLON.Vector3.Cross(xAxis, up).normalize();  // X × Y = Z (left-handed)
    
    // Babylon.js uses column-major order in FromValues
    // Columns represent: X-axis, Y-axis, Z-axis of new coordinate system
    const rotMatrix = BABYLON.Matrix.FromValues(
        xAxis.x, xAxis.y, xAxis.z, 0,  // column 0 (X-axis)
        up.x, up.y, up.z, 0,            // column 1 (Y-axis = surface normal)
        zAxis.x, zAxis.y, zAxis.z, 0,  // column 2 (Z-axis)
        0, 0, 0, 1
    );
    
    node.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
}

export function updateEnvironment(playerPos, camera) {
    updateParticles();

    // Update Tree Health Bars
    trees.forEach(tree => {
        const dist = BABYLON.Vector3.Distance(tree.position, playerPos);
        if (dist < 15) {
            tree.metadata.healthBar.update(camera, tree.metadata.health, tree.metadata.maxHealth);
        } else {
            tree.metadata.healthBar.setVisible(false);
        }
    });
    
    // 고장난 우주선 연기 효과
    if (crashedShip && crashedShip.metadata) {
        crashedShip.metadata.smokeTimer += 0.016; // 약 60fps 기준
        if (crashedShip.metadata.smokeTimer > 0.3) { // 0.3초마다 연기 생성
            crashedShip.metadata.smokeTimer = 0;
            createSmoke(crashedShip);
        }
    }
}

/**
 * 우주선에서 연기 파티클 생성
 */
function createSmoke(ship) {
    const smoke = BABYLON.MeshBuilder.CreateSphere("smoke", {
        diameter: 0.6, segments: 6
    }, scene);
    
    // 우주선의 손상된 부분에서 연기 생성
    const worldMatrix = ship.getWorldMatrix();
    const localPos = ship.metadata.smokePosition;
    const worldPos = BABYLON.Vector3.TransformCoordinates(localPos, worldMatrix);
    smoke.position.copyFrom(worldPos);
    
    const smokeMat = new BABYLON.StandardMaterial("smokeMat", scene);
    smokeMat.diffuseColor = new BABYLON.Color3(0.27, 0.27, 0.27);
    smokeMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    smokeMat.alpha = 0.6;
    smoke.material = smokeMat;
    
    // 위로 올라가는 속도 (행성 표면 기준 위쪽)
    const up = ship.position.clone().normalize();
    const vel = up.scale(0.08);
    vel.x += (Math.random() - 0.5) * 0.02;
    vel.y += (Math.random() - 0.5) * 0.02;
    vel.z += (Math.random() - 0.5) * 0.02;
    
    particles.push({ 
        mesh: smoke, 
        vel: vel, 
        life: 1.5,
        isSmoke: true,
        material: smokeMat
    });
}

export function createExplosion(pos, color, count) {
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;
    
    for (let i = 0; i < count; i++) {
        const m = BABYLON.MeshBuilder.CreateBox("particle", { size: 0.4 }, scene);
        m.position.copyFrom(pos);
        
        const mat = new BABYLON.StandardMaterial("particleMat", scene);
        mat.diffuseColor = new BABYLON.Color3(r, g, b);
        mat.emissiveColor = new BABYLON.Color3(r * 0.5, g * 0.5, b * 0.5);
        m.material = mat;
        
        const vel = new BABYLON.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize().scale(0.4);
        
        particles.push({ mesh: m, vel: vel, life: 1.0 });
    }
}

export function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        if (p.isSmoke) {
            // 연기 파티클은 더 천천히 사라지고 커짐
            p.life -= 0.01;
            p.mesh.position.addInPlace(p.vel);
            const scale = 1 + (1.5 - p.life) * 0.8;
            p.mesh.scaling.setAll(scale);
            if (p.material) {
                p.material.alpha = p.life * 0.4;
            }
        } else {
            // 일반 파티클
            p.life -= 0.02;
            p.mesh.position.addInPlace(p.vel);
            p.mesh.scaling.setAll(p.life);
        }
        
        if (p.life <= 0) {
            p.mesh.dispose();
            particles.splice(i, 1);
        }
    }
}

export function spawnDrop(pos, itemId) {
    const mesh = BABYLON.MeshBuilder.CreateSphere("drop", {
        diameter: 0.6, segments: 8
    }, scene);
    mesh.position.copyFrom(pos);
    mesh.position.y += 1;
    
    const mat = new BABYLON.StandardMaterial("dropMat", scene);
    mat.diffuseColor = new BABYLON.Color3(1, 1, 0);
    mat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0);
    mesh.material = mat;
    
    const up = pos.clone().normalize();
    const vel = up.scale(0.5);
    vel.x += (Math.random() - 0.5) * 0.2;
    vel.y += (Math.random() - 0.5) * 0.2;
    vel.z += (Math.random() - 0.5) * 0.2;
    
    drops.push({ mesh: mesh, vel: vel, life: 1.0, itemId: itemId });
}

export function updateDrops(player) {
    for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life -= 0.02;
        d.mesh.position.addInPlace(d.vel);
        
        const toPlayer = player.position.subtract(d.mesh.position);
        if (toPlayer.length() < 5) {
            d.vel.addInPlace(toPlayer.normalize().scale(0.05));
        }
        
        if (BABYLON.Vector3.Distance(d.mesh.position, player.position) < 2.0 || d.life <= 0) {
            addItem(d.itemId, 1);
            showMessage(`+ ${ITEM_DB[d.itemId].name}`, "#4ade80");
            d.mesh.dispose();
            drops.splice(i, 1);
        }
    }
}
