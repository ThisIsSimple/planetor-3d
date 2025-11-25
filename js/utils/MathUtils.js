import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export function getRandomPositionOnSphere(r) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    return new THREE.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta)
    );
}
