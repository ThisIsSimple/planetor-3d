// Babylon.js World UI - Health Bar
import { scene } from '../world/Scene.js';

export class HealthBar {
    constructor(target, offset = 7, width = 2, height = 0.3) {
        this.target = target;
        this.offset = offset; // Scalar offset along up vector
        this.width = width;
        this.height = height;

        // Create parent transform node
        this.node = new BABYLON.TransformNode("healthBarNode", scene);

        // Background plane
        this.bg = BABYLON.MeshBuilder.CreatePlane("healthBarBg", {
            width: width,
            height: height
        }, scene);
        this.bg.parent = this.node;
        
        const bgMat = new BABYLON.StandardMaterial("healthBarBgMat", scene);
        bgMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        bgMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
        bgMat.disableLighting = true;
        bgMat.backFaceCulling = false;
        this.bg.material = bgMat;
        this.bg.renderingGroupId = 3; // Render on top

        // Fill plane - in Babylon.js left-handed system, +Z is forward
        this.fill = BABYLON.MeshBuilder.CreatePlane("healthBarFill", {
            width: width - 0.1,
            height: height - 0.1
        }, scene);
        this.fill.parent = this.node;
        this.fill.position.z = 0.01; // Slightly in front
        
        this.fillMat = new BABYLON.StandardMaterial("healthBarFillMat", scene);
        this.fillMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        this.fillMat.emissiveColor = new BABYLON.Color3(0, 1, 0);
        this.fillMat.disableLighting = true;
        this.fillMat.backFaceCulling = false;
        this.fill.material = this.fillMat;
        this.fill.renderingGroupId = 3;

        this.node.setEnabled(false);
    }

    update(camera, currentHealth, maxHealth) {
        if (currentHealth < maxHealth && currentHealth > 0) {
            this.node.setEnabled(true);

            // Position: Target Position + Up Vector * Offset
            const surfaceUp = this.target.position.clone().normalize();
            const newPos = this.target.position.add(surfaceUp.scale(this.offset));
            this.node.position.copyFrom(newPos);

            // Billboard: face camera while respecting surface up vector
            // Calculate direction to camera projected onto surface tangent plane
            const dirToCamera = camera.position.subtract(this.node.position);
            
            // Create rotation that faces camera but keeps surface up as the up direction
            // For left-handed system: X = Y × Z (up × forward), Z = X × Y
            const forward = dirToCamera.normalize();
            let xAxis = BABYLON.Vector3.Cross(surfaceUp, forward);
            if (xAxis.lengthSquared() < 0.001) {
                xAxis = BABYLON.Vector3.Cross(surfaceUp, new BABYLON.Vector3(1, 0, 0));
            }
            xAxis.normalize();
            const zAxis = BABYLON.Vector3.Cross(xAxis, surfaceUp).normalize();
            
            // Build rotation matrix (column-major)
            const rotMatrix = BABYLON.Matrix.FromValues(
                xAxis.x, xAxis.y, xAxis.z, 0,
                surfaceUp.x, surfaceUp.y, surfaceUp.z, 0,
                zAxis.x, zAxis.y, zAxis.z, 0,
                0, 0, 0, 1
            );
            this.node.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);

            // Update fill scale based on health
            const pct = Math.max(0, currentHealth / maxHealth);
            this.fill.scaling.x = pct;
            // Offset to keep fill aligned to left
            this.fill.position.x = -(this.width - 0.1) * (1 - pct) / 2;

            // Color change based on health
            if (pct > 0.5) {
                this.fillMat.emissiveColor = new BABYLON.Color3(0, 1, 0);
                this.fillMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
            } else if (pct > 0.2) {
                this.fillMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
                this.fillMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
            } else {
                this.fillMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
                this.fillMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            }

        } else {
            this.node.setEnabled(false);
        }
    }

    setVisible(visible) {
        this.node.setEnabled(visible);
    }

    dispose() {
        this.bg.dispose();
        this.fill.dispose();
        this.node.dispose();
    }
}
