import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene } from './Scene.js';

export class Planet {
    constructor(params = {}) {
        this.name = params.name || "Unknown Planet";
        this.description = params.description || "No description available.";
        this.position = params.position || new THREE.Vector3(0, 0, 0);
        this.size = params.size || 80; // Diameter
        this.gravity = params.gravity || 0.02; // Game units per frame

        this.radius = this.size / 2;
        this.mesh = null;

        this.init();
    }

    init() {
        const geometry = new THREE.SphereGeometry(this.radius, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0x4ade80,
            roughness: 0.9,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
    }
}
