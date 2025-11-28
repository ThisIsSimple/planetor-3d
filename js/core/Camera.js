// Babylon.js Camera Setup
import { scene } from '../world/Scene.js';

export let camera;
export const cameraState = {
    forward: null, // Will be initialized as BABYLON.Vector3
    pitch: 0.95
};

export function initCamera() {
    // Create a FreeCamera for manual control
    camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 50, -50), scene);
    camera.fov = 0.87; // ~50 degrees (Babylon uses radians)
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    
    // Disable default camera controls (we handle input manually)
    camera.inputs.clear();
    
    // Initialize camera state forward vector
    cameraState.forward = new BABYLON.Vector3(0, 0, 1);
    
    return camera;
}
