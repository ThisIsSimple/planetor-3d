import * as THREE from 'https://unpkg.com/three@0.181.0/build/three.module.js';

export function getRandomPositionOnSphere(r) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    return new THREE.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta)
    );
}
