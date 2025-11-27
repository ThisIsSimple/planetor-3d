import * as THREE from 'https://unpkg.com/three@0.181.0/build/three.module.js';
import { scene } from '../world/Scene.js';
import { gameState } from '../core/GameState.js';
import { camera, cameraState } from '../core/Camera.js';
import { keys } from '../core/Input.js';
import { trees, crashedShip } from '../world/Environment.js';
import { buildings } from '../systems/Building.js';
import { ITEM_DB } from '../data/Items.js';

export let player;
export const playerState = {
    position: new THREE.Vector3(0, 40, 0),
    forward: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
    radius: 1.0,
    verticalVelocity: 0,
    isGrounded: false,
    hand: null,
    equippedWeapon: null,
    isAttacking: false,
    attackTimer: 0,
    attackHitChecked: false
};

export function createPlayer() {
    const geometry = new THREE.BoxGeometry(2, 3, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    player = new THREE.Mesh(geometry, material);
    player.castShadow = true;
    scene.add(player);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    eyes.position.set(0, 0.5, -1);
    player.add(eyes);

    // Right Hand
    const handGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(1.2, 0, -0.5);
    player.add(hand);
    playerState.hand = hand;

    return player;
}

export function equipWeapon(itemId) {
    if (!playerState.hand) return;
    unequipWeapon();
    const item = ITEM_DB[itemId];
    if (item && item.type === 'weapon') {
        playerState.equippedWeapon = item;
        // Create simple weapon visual - Larger size as requested
        const weaponGeo = new THREE.BoxGeometry(0.3, 0.3, 2.5);
        const weaponMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
        weaponMesh.position.set(0, 0, -1.0);
        playerState.hand.add(weaponMesh);
    }
}

export function unequipWeapon() {
    if (playerState.hand) {
        while (playerState.hand.children.length > 0) {
            playerState.hand.remove(playerState.hand.children[0]);
        }
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
 * @returns {THREE.Vector3} - 정규화된 방향 벡터
 */
export function getLookDirection() {
    if (!player) return new THREE.Vector3(0, 0, -1);
    // 플레이어의 로컬 -Z 방향이 바라보는 방향
    const lookDir = new THREE.Vector3(0, 0, -1);
    lookDir.applyQuaternion(player.quaternion);
    return lookDir.normalize();
}

export function updatePlayerMovement() {
    playerState.up.copy(playerState.position).normalize();
    const right = new THREE.Vector3().crossVectors(cameraState.forward, playerState.up).normalize();
    cameraState.forward.crossVectors(playerState.up, right).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (keys.w) moveDir.add(cameraState.forward);
    if (keys.s) moveDir.sub(cameraState.forward);
    if (keys.d) moveDir.add(right);
    if (keys.a) moveDir.sub(right);

    // Gravity
    const gravity = -gameState.planet.gravity;
    playerState.verticalVelocity += gravity;
    const verticalMove = playerState.up.clone().multiplyScalar(playerState.verticalVelocity);

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const targetLookAt = playerState.position.clone().add(moveDir);
        const m = new THREE.Matrix4();
        m.lookAt(playerState.position, targetLookAt, playerState.up);
        player.quaternion.setFromRotationMatrix(m);

        const moveVec = moveDir.clone().multiplyScalar(gameState.moveSpeed);
        const nextPos = playerState.position.clone().add(moveVec).add(verticalMove);

        // Simple ground collision
        const distToCenter = nextPos.length();
        if (distToCenter < gameState.planet.radius + 1.5) {
            nextPos.normalize().multiplyScalar(gameState.planet.radius + 1.5);
            playerState.verticalVelocity = 0;
            playerState.isGrounded = true;
        } else {
            playerState.isGrounded = false;
        }

        if (!checkCollision(nextPos)) {
            playerState.position.copy(nextPos);
            const newUp = playerState.position.clone().normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(playerState.up, newUp);
            cameraState.forward.applyQuaternion(q);
        }
    } else {
        // Apply gravity even if not moving horizontally
        const nextPos = playerState.position.clone().add(verticalMove);
        const distToCenter = nextPos.length();
        if (distToCenter < gameState.planet.radius + 1.5) {
            nextPos.normalize().multiplyScalar(gameState.planet.radius + 1.5);
            playerState.verticalVelocity = 0;
            playerState.isGrounded = true;
        } else {
            playerState.isGrounded = false;
        }
        playerState.position.copy(nextPos);
    }

    // Attack Animation - Vertical Swing (Top to Bottom, front-facing)
    if (playerState.isAttacking && playerState.hand) {
        const speed = playerState.equippedWeapon.attackSpeed * 0.15;
        playerState.attackTimer += speed;

        const t = playerState.attackTimer;

        // Swing phase: 0.0 to 0.35 (Fast Swing Down), 0.35 to 1.0 (Return)
        // Direction: Top (RotX = -1.5) -> Bottom (RotX = 0.8)

        if (t < 0.35) {
            const p = t / 0.35; // 0 to 1
            // Using easeOutQuad for punchy hit
            const easeP = 1 - (1 - p) * (1 - p);

            // 위에서 아래로 휘두르기 (X축 회전만 사용)
            playerState.hand.rotation.x = -1.5 + (2.3 * easeP);
            playerState.hand.rotation.y = 0;
            playerState.hand.rotation.z = 0;
        } else {
            // Return to neutral
            const p = (t - 0.35) / 0.65; // 0 to 1
            const easeP = p * p; // easeInQuad for smooth return
            
            playerState.hand.rotation.x = 0.8 * (1 - easeP);
            playerState.hand.rotation.y = 0;
            playerState.hand.rotation.z = 0;
        }

        if (playerState.attackTimer >= 1) {
            playerState.isAttacking = false;
            playerState.hand.rotation.set(0, 0, 0);
        }
    }

    player.position.copy(playerState.position);
    player.up.copy(playerState.up);
    const dist = 43; // Approx sqrt(35^2 + 25^2)
    const camPos = playerState.position.clone()
        .add(cameraState.forward.clone().multiplyScalar(-dist * Math.cos(cameraState.pitch)))
        .add(playerState.up.clone().multiplyScalar(dist * Math.sin(cameraState.pitch)));
    camera.position.lerp(camPos, 0.1);
    camera.up.copy(playerState.up);
    camera.lookAt(playerState.position);
}

function checkCollision(nextPos) {
    const pRad = 1.0;
    for (let t of trees) { if (nextPos.distanceTo(t.position) < pRad + 1.2) return true; }
    for (let b of buildings) { if (nextPos.distanceTo(b.position) < pRad + (b.userData.radius || 3.5)) return true; }
    // 고장난 우주선 충돌 판정 (캡슐 형태)
    if (crashedShip && checkCapsuleCollision(nextPos, crashedShip, pRad)) return true;
    return false;
}

/**
 * 캡슐 형태의 충돌 판정
 * @param {THREE.Vector3} point - 체크할 위치
 * @param {THREE.Group} ship - 우주선 그룹
 * @param {number} pointRadius - 점의 반경
 * @returns {boolean} - 충돌 여부
 */
function checkCapsuleCollision(point, ship, pointRadius) {
    // 캡슐 파라미터 (CapsuleGeometry(1.8, 4, 8, 16)와 동일)
    const capsuleRadius = 1.8;
    const capsuleHalfHeight = 2.0; // 캡슐 높이의 절반
    
    // 우주선 로컬 좌표에서 캡슐의 두 끝점 (Y축 방향)
    const localTop = new THREE.Vector3(0, capsuleHalfHeight, 2); // z=2는 body.position.z
    const localBottom = new THREE.Vector3(0, -capsuleHalfHeight, 2);
    
    // 월드 좌표로 변환
    const worldTop = localTop.clone().applyMatrix4(ship.matrixWorld);
    const worldBottom = localBottom.clone().applyMatrix4(ship.matrixWorld);
    
    // 점에서 선분까지의 최단 거리 계산
    const dist = distanceToLineSegment(point, worldTop, worldBottom);
    
    return dist < (capsuleRadius + pointRadius);
}

/**
 * 점에서 선분까지의 최단 거리 계산
 */
function distanceToLineSegment(point, lineStart, lineEnd) {
    const line = lineEnd.clone().sub(lineStart);
    const len = line.length();
    line.normalize();
    
    const toPoint = point.clone().sub(lineStart);
    const projection = toPoint.dot(line);
    
    if (projection <= 0) {
        // 선분 시작점이 가장 가까움
        return point.distanceTo(lineStart);
    } else if (projection >= len) {
        // 선분 끝점이 가장 가까움
        return point.distanceTo(lineEnd);
    } else {
        // 선분 위의 점이 가장 가까움
        const closestPoint = lineStart.clone().add(line.multiplyScalar(projection));
        return point.distanceTo(closestPoint);
    }
}
