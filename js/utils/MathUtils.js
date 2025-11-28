// Babylon.js Math Utilities

export function getRandomPositionOnSphere(r) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    return new BABYLON.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta)
    );
}

// Helper to rotate a vector around an axis
export function rotateVectorAroundAxis(vector, axis, angle) {
    const quaternion = BABYLON.Quaternion.RotationAxis(axis, angle);
    const matrix = new BABYLON.Matrix();
    quaternion.toRotationMatrix(matrix);
    return BABYLON.Vector3.TransformCoordinates(vector, matrix);
}

// Helper to create rotation matrix from basis vectors
export function matrixFromBasis(xAxis, yAxis, zAxis) {
    const matrix = BABYLON.Matrix.Identity();
    matrix.setRowFromFloats(0, xAxis.x, xAxis.y, xAxis.z, 0);
    matrix.setRowFromFloats(1, yAxis.x, yAxis.y, yAxis.z, 0);
    matrix.setRowFromFloats(2, zAxis.x, zAxis.y, zAxis.z, 0);
    return matrix;
}
