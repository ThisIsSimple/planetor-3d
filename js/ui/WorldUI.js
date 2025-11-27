import * as THREE from 'https://unpkg.com/three@0.181.0/build/three.module.js';
import { scene } from '../world/Scene.js';

export class HealthBar {
    constructor(target, offset = 7, width = 2, height = 0.3) {
        this.target = target;
        this.offset = offset; // Scalar offset along up vector
        this.width = width;
        this.height = height;

        this.group = new THREE.Group();

        // Background
        const bgGeo = new THREE.PlaneGeometry(width, height);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
        this.bg = new THREE.Mesh(bgGeo, bgMat);
        this.group.add(this.bg);

        // Fill
        const fillGeo = new THREE.PlaneGeometry(width - 0.1, height - 0.1);
        const fillMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
        this.fill = new THREE.Mesh(fillGeo, fillMat);
        this.fill.position.z = 0.01; // Slightly in front
        this.group.add(this.fill);

        this.group.visible = false;
        this.group.renderOrder = 999; // Ensure it renders on top

        // Add to scene directly to avoid parent rotation issues
        scene.add(this.group);
    }

    update(camera, currentHealth, maxHealth) {
        if (currentHealth < maxHealth && currentHealth > 0) {
            this.group.visible = true;

            // Position: Target Position + Up Vector * Offset
            // We assume target is a Group/Mesh on the planet surface.
            // Its position is the center. We need its "up" direction.
            // For a sphere, "up" is position.normalize().
            const up = this.target.position.clone().normalize();
            this.group.position.copy(this.target.position).add(up.multiplyScalar(this.offset));

            // Rotation: Screen-aligned billboard
            this.group.quaternion.copy(camera.quaternion);

            // Update fill
            const pct = Math.max(0, currentHealth / maxHealth);
            this.fill.scale.x = pct;

            // Color change based on health
            if (pct > 0.5) this.fill.material.color.setHex(0x00ff00);
            else if (pct > 0.2) this.fill.material.color.setHex(0xffff00);
            else this.fill.material.color.setHex(0xff0000);

        } else {
            this.group.visible = false;
        }
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    dispose() {
        scene.remove(this.group);
    }
}
