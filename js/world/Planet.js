import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene } from './Scene.js';
import { gameState } from '../core/GameState.js';

export let planet;

export function createPlanet() {
    const geometry = new THREE.SphereGeometry(gameState.planetRadius, 64, 64);
    const material = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9, metalness: 0.1 });
    planet = new THREE.Mesh(geometry, material);
    planet.receiveShadow = true;
    scene.add(planet);
    return planet;
}
