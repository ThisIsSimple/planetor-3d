import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene } from '../world/Scene.js';
import { gameState } from '../core/GameState.js';
import { camera, cameraState } from '../core/Camera.js';
import { keys } from '../core/Input.js';
import { trees } from '../world/Environment.js';
import { buildings } from '../systems/Building.js';

export let player;
export const playerState = {
    position: new THREE.Vector3(0, 40, 0),
    forward: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
    radius: 1.0
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
    return player;
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

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const targetLookAt = playerState.position.clone().add(moveDir);
        const m = new THREE.Matrix4();
        m.lookAt(playerState.position, targetLookAt, playerState.up);
        player.quaternion.setFromRotationMatrix(m);

        const moveVec = moveDir.clone().multiplyScalar(gameState.moveSpeed);
        const nextPos = playerState.position.clone().add(moveVec);
        nextPos.normalize().multiplyScalar(gameState.planetRadius + 1.6);

        if (!checkCollision(nextPos)) {
            playerState.position.copy(nextPos);
            const newUp = playerState.position.clone().normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(playerState.up, newUp);
            cameraState.forward.applyQuaternion(q);
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
    return false;
}
