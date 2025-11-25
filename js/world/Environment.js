import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene } from './Scene.js';
import { gameState } from '../core/GameState.js';
import { getRandomPositionOnSphere } from '../utils/MathUtils.js';
import { ITEM_DB } from '../data/Items.js';
import { addItem } from '../systems/Inventory.js';
import { showMessage } from '../ui/UIManager.js';

export let trees = [], particles = [], drops = [];

export function spawnTree() {
    createTreeMesh(getRandomPositionOnSphere(gameState.planetRadius));
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

    scene.add(tree);
    trees.push(tree);
    return tree;
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
        p.life -= 0.02;
        p.mesh.position.add(p.vel);
        p.mesh.scale.setScalar(p.life);
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
