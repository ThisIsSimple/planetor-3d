// Babylon.js Scene Setup
export let scene, engine, canvas, sunPivot, sunLight;

export function initScene() {
    canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    scene = new BABYLON.Scene(engine);
    
    // Background color
    scene.clearColor = new BABYLON.Color4(0.102, 0.102, 0.180, 1); // #1a1a2e
    
    // Fog
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogColor = new BABYLON.Color3(0.102, 0.102, 0.180);
    scene.fogStart = 60;
    scene.fogEnd = 180;

    // Ambient light (Hemispheric in Babylon.js)
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.3;
    ambientLight.diffuse = new BABYLON.Color3(1, 1, 1);
    ambientLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    // Sun pivot (TransformNode to rotate the sun around)
    sunPivot = new BABYLON.TransformNode("sunPivot", scene);

    // Directional light (Sun)
    sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-1, 0, 0), scene);
    sunLight.position = new BABYLON.Vector3(120, 0, 0);
    sunLight.intensity = 0.6;
    sunLight.parent = sunPivot;
    
    // Shadow generator
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, sunLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    scene.shadowGenerator = shadowGenerator;

    // Sun mesh (visual representation)
    const sunMesh = BABYLON.MeshBuilder.CreateSphere("sunMesh", { diameter: 16, segments: 16 }, scene);
    sunMesh.position = new BABYLON.Vector3(120, 0, 0);
    const sunMat = new BABYLON.StandardMaterial("sunMat", scene);
    sunMat.emissiveColor = new BABYLON.Color3(1, 0.867, 0.667); // #ffddaa
    sunMat.disableLighting = true;
    sunMesh.material = sunMat;
    sunMesh.parent = sunPivot;

    // Point light at sun position for additional glow
    const sunPointLight = new BABYLON.PointLight("sunPointLight", new BABYLON.Vector3(120, 0, 0), scene);
    sunPointLight.diffuse = new BABYLON.Color3(1, 0.867, 0.667);
    sunPointLight.intensity = 0.8;
    sunPointLight.range = 250;
    sunPointLight.parent = sunPivot;

    // Handle window resize
    window.addEventListener('resize', () => {
        engine.resize();
    });

    return { scene, engine, sunPivot };
}

// Helper function to add mesh to shadow caster
export function addShadowCaster(mesh) {
    if (scene.shadowGenerator) {
        scene.shadowGenerator.addShadowCaster(mesh);
    }
}
