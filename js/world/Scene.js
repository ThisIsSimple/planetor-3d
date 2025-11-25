import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export let scene, renderer, sunPivot;

export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 60, 180);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    sunPivot = new THREE.Group();
    scene.add(sunPivot);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
    sunLight.position.set(120, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunPivot.add(sunLight);

    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffddaa }));
    sunMesh.position.set(120, 0, 0);
    sunPivot.add(sunMesh);

    const sunPt = new THREE.PointLight(0xffddaa, 0.8, 250);
    sunPt.position.set(120, 0, 0);
    sunPivot.add(sunPt);

    return { scene, renderer, sunPivot };
}
