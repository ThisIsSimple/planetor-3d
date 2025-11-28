// Babylon.js Player Entity
import { scene, addShadowCaster } from '../world/Scene.js';
import { gameState } from '../core/GameState.js';
import { camera, cameraState } from '../core/Camera.js';
import { keys } from '../core/Input.js';
import { trees, crashedShip } from '../world/Environment.js';
import { buildings } from '../systems/Building.js';
import { ITEM_DB } from '../data/Items.js';

export let player;
export const playerState = {
    position: null,
    forward: null,
    up: null,
    radius: 1.0,
    verticalVelocity: 0,
    isGrounded: false,
    hand: null,
    equippedWeapon: null,
    isAttacking: false,
    attackTimer: 0,
    attackHitChecked: false
};

// Initialize vectors after BABYLON is loaded
function initPlayerState() {
    if (!playerState.position) {
        playerState.position = new BABYLON.Vector3(0, 40, 0);
        playerState.forward = new BABYLON.Vector3(0, 0, 1);
        playerState.up = new BABYLON.Vector3(0, 1, 0);
    }
}

// Helper: Create quaternion that rotates from vector A to vector B
function quaternionFromUnitVectors(from, to) {
    const dot = BABYLON.Vector3.Dot(from, to);
    
    if (dot > 0.999999) {
        return BABYLON.Quaternion.Identity();
    }
    if (dot < -0.999999) {
        // Vectors are opposite, find orthogonal axis
        let axis = BABYLON.Vector3.Cross(new BABYLON.Vector3(1, 0, 0), from);
        if (axis.lengthSquared() < 0.001) {
            axis = BABYLON.Vector3.Cross(new BABYLON.Vector3(0, 1, 0), from);
        }
        axis.normalize();
        return BABYLON.Quaternion.RotationAxis(axis, Math.PI);
    }
    
    const axis = BABYLON.Vector3.Cross(from, to);
    const s = Math.sqrt((1 + dot) * 2);
    const invs = 1 / s;
    
    return new BABYLON.Quaternion(
        axis.x * invs,
        axis.y * invs,
        axis.z * invs,
        s * 0.5
    );
}

// Helper: Rotate vector by quaternion
function rotateVectorByQuaternion(vec, quat) {
    const result = new BABYLON.Vector3();
    vec.rotateByQuaternionToRef(quat, result);
    return result;
}

export function createPlayer() {
    // Initialize player state vectors
    initPlayerState();
    
    // Player body
    player = BABYLON.MeshBuilder.CreateBox("player", {
        width: 2, height: 3, depth: 2
    }, scene);
    player.position.copyFrom(playerState.position);
    
    const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
    playerMat.diffuseColor = new BABYLON.Color3(1, 0.42, 0.42); // #ff6b6b
    player.material = playerMat;
    addShadowCaster(player);
    
    // Eyes - Babylon.js uses +Z as forward
    const eyes = BABYLON.MeshBuilder.CreateBox("eyes", {
        width: 1.5, height: 0.5, depth: 0.5
    }, scene);
    eyes.parent = player;
    eyes.position.set(0, 0.5, 1);
    
    const eyesMat = new BABYLON.StandardMaterial("eyesMat", scene);
    eyesMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    eyesMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    eyes.material = eyesMat;

    // Right Hand - adjusted for left-handed system
    const hand = BABYLON.MeshBuilder.CreateBox("hand", {
        width: 0.5, height: 0.5, depth: 0.5
    }, scene);
    hand.parent = player;
    hand.position.set(1.2, 0, 0.5);
    hand.material = playerMat;
    playerState.hand = hand;

    return player;
}

export function equipWeapon(itemId) {
    if (!playerState.hand) return;
    unequipWeapon();
    const item = ITEM_DB[itemId];
    if (item && item.type === 'weapon') {
        playerState.equippedWeapon = item;
        // Create simple weapon visual - adjusted for left-handed system
        const weaponMesh = BABYLON.MeshBuilder.CreateBox("weapon", {
            width: 0.3, height: 0.3, depth: 2.5
        }, scene);
        weaponMesh.parent = playerState.hand;
        weaponMesh.position.set(0, 0, 1.0);
        
        const weaponMat = new BABYLON.StandardMaterial("weaponMat", scene);
        weaponMat.diffuseColor = new BABYLON.Color3(0.53, 0.53, 0.53);
        weaponMesh.material = weaponMat;
    }
}

export function unequipWeapon() {
    if (playerState.hand) {
        // Dispose all children meshes
        const children = playerState.hand.getChildMeshes();
        children.forEach(child => child.dispose());
    }
    playerState.equippedWeapon = null;
}

export function jump() {
    if (playerState.isGrounded) {
        playerState.verticalVelocity = 0.5; // Jump force
        playerState.isGrounded = false;
    }
}

export function attack() {
    if (playerState.isAttacking || !playerState.equippedWeapon) return;
    playerState.isAttacking = true;
    playerState.attackTimer = 0;
    playerState.attackHitChecked = false;
}

/**
 * 캐릭터가 바라보는 방향 벡터 반환
 * @returns {BABYLON.Vector3} - 정규화된 방향 벡터
 */
export function getLookDirection() {
    if (!player) return new BABYLON.Vector3(0, 0, 1);
    // Babylon.js uses +Z as forward direction
    const lookDir = new BABYLON.Vector3(0, 0, 1);
    if (player.rotationQuaternion) {
        lookDir.rotateByQuaternionToRef(player.rotationQuaternion, lookDir);
    }
    return lookDir.normalize();
}

export function updatePlayerMovement() {
    playerState.up = playerState.position.clone().normalize();
    
    const right = BABYLON.Vector3.Cross(cameraState.forward, playerState.up).normalize();
    cameraState.forward = BABYLON.Vector3.Cross(playerState.up, right).normalize();

    const moveDir = new BABYLON.Vector3(0, 0, 0);
    if (keys.w) moveDir.addInPlace(cameraState.forward);
    if (keys.s) moveDir.subtractInPlace(cameraState.forward);
    // Babylon.js uses left-handed coordinate system, so swap A/D
    if (keys.d) moveDir.subtractInPlace(right);
    if (keys.a) moveDir.addInPlace(right);

    // Gravity
    const gravity = -gameState.planet.gravity;
    playerState.verticalVelocity += gravity;
    const verticalMove = playerState.up.scale(playerState.verticalVelocity);

    if (moveDir.lengthSquared() > 0) {
        moveDir.normalize();
        
        // Rotate player to face movement direction
        // Create orthonormal basis for left-handed system
        // X = Y × Z (up × forward), Z = X × Y (xAxis × up)
        const forward = moveDir;
        let xAxis = BABYLON.Vector3.Cross(playerState.up, forward);
        if (xAxis.lengthSquared() < 0.001) {
            xAxis = BABYLON.Vector3.Cross(playerState.up, new BABYLON.Vector3(1, 0, 0));
        }
        xAxis.normalize();
        const zAxis = BABYLON.Vector3.Cross(xAxis, playerState.up).normalize();
        
        // Babylon.js column-major matrix
        const rotationMatrix = BABYLON.Matrix.FromValues(
            xAxis.x, xAxis.y, xAxis.z, 0,
            playerState.up.x, playerState.up.y, playerState.up.z, 0,
            zAxis.x, zAxis.y, zAxis.z, 0,
            0, 0, 0, 1
        );
        
        player.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);

        const moveVec = moveDir.scale(gameState.moveSpeed);
        const nextPos = playerState.position.add(moveVec).add(verticalMove);

        // Simple ground collision
        const distToCenter = nextPos.length();
        if (distToCenter < gameState.planet.radius + 1.5) {
            nextPos.normalize();
            nextPos.scaleInPlace(gameState.planet.radius + 1.5);
            playerState.verticalVelocity = 0;
            playerState.isGrounded = true;
        } else {
            playerState.isGrounded = false;
        }

        if (!checkCollision(nextPos)) {
            const oldUp = playerState.up.clone();
            playerState.position.copyFrom(nextPos);
            const newUp = playerState.position.clone().normalize();
            
            // Rotate camera forward to match new up direction
            const q = quaternionFromUnitVectors(oldUp, newUp);
            cameraState.forward = rotateVectorByQuaternion(cameraState.forward, q);
        }
    } else {
        // Apply gravity even if not moving horizontally
        const nextPos = playerState.position.add(verticalMove);
        const distToCenter = nextPos.length();
        if (distToCenter < gameState.planet.radius + 1.5) {
            nextPos.normalize();
            nextPos.scaleInPlace(gameState.planet.radius + 1.5);
            playerState.verticalVelocity = 0;
            playerState.isGrounded = true;
        } else {
            playerState.isGrounded = false;
        }
        playerState.position.copyFrom(nextPos);
    }

    // Attack Animation - Vertical Swing (Top to Bottom, front-facing)
    if (playerState.isAttacking && playerState.hand) {
        const speed = playerState.equippedWeapon.attackSpeed * 0.15;
        playerState.attackTimer += speed;

        const t = playerState.attackTimer;

        if (t < 0.35) {
            const p = t / 0.35;
            const easeP = 1 - (1 - p) * (1 - p);
            playerState.hand.rotation.x = -1.5 + (2.3 * easeP);
            playerState.hand.rotation.y = 0;
            playerState.hand.rotation.z = 0;
        } else {
            const p = (t - 0.35) / 0.65;
            const easeP = p * p;
            playerState.hand.rotation.x = 0.8 * (1 - easeP);
            playerState.hand.rotation.y = 0;
            playerState.hand.rotation.z = 0;
        }

        if (playerState.attackTimer >= 1) {
            playerState.isAttacking = false;
            playerState.hand.rotation.set(0, 0, 0);
        }
    }

    player.position.copyFrom(playerState.position);
    
    // Update camera position (third person)
    const dist = 43;
    const camPos = playerState.position
        .add(cameraState.forward.scale(-dist * Math.cos(cameraState.pitch)))
        .add(playerState.up.scale(dist * Math.sin(cameraState.pitch)));
    
    camera.position = BABYLON.Vector3.Lerp(camera.position, camPos, 0.1);
    camera.upVector.copyFrom(playerState.up);
    camera.setTarget(playerState.position);
}

function checkCollision(nextPos) {
    const pRad = 1.0;
    for (let t of trees) {
        if (BABYLON.Vector3.Distance(nextPos, t.position) < pRad + 1.2) return true;
    }
    for (let b of buildings) {
        const bRadius = (b.metadata && b.metadata.radius) ? b.metadata.radius : 3.5;
        if (BABYLON.Vector3.Distance(nextPos, b.position) < pRad + bRadius) return true;
    }
    // 고장난 우주선 충돌 판정
    if (crashedShip && checkCapsuleCollision(nextPos, crashedShip, pRad)) return true;
    return false;
}

/**
 * 캡슐 형태의 충돌 판정
 */
function checkCapsuleCollision(point, ship, pointRadius) {
    const capsuleRadius = 1.8;
    const capsuleHalfHeight = 2.0;
    
    const localTop = new BABYLON.Vector3(0, capsuleHalfHeight, 2);
    const localBottom = new BABYLON.Vector3(0, -capsuleHalfHeight, 2);
    
    const worldMatrix = ship.getWorldMatrix();
    const worldTop = BABYLON.Vector3.TransformCoordinates(localTop, worldMatrix);
    const worldBottom = BABYLON.Vector3.TransformCoordinates(localBottom, worldMatrix);
    
    const dist = distanceToLineSegment(point, worldTop, worldBottom);
    
    return dist < (capsuleRadius + pointRadius);
}

/**
 * 점에서 선분까지의 최단 거리 계산
 */
function distanceToLineSegment(point, lineStart, lineEnd) {
    const line = lineEnd.subtract(lineStart);
    const len = line.length();
    const lineNorm = line.normalize();
    
    const toPoint = point.subtract(lineStart);
    const projection = BABYLON.Vector3.Dot(toPoint, lineNorm);
    
    if (projection <= 0) {
        return BABYLON.Vector3.Distance(point, lineStart);
    } else if (projection >= len) {
        return BABYLON.Vector3.Distance(point, lineEnd);
    } else {
        const closestPoint = lineStart.add(lineNorm.scale(projection));
        return BABYLON.Vector3.Distance(point, closestPoint);
    }
}
