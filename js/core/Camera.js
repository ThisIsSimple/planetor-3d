import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export let camera;
export const cameraState = {
    forward: new THREE.Vector3(0, 0, 1),
    pitch: 0.95
};

export function initCamera() {
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    return camera;
}
