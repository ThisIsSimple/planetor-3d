export const gameState = {
    wood: 0,
    hunger: 100, maxHunger: 100,

    isMoving: false, moveSpeed: 0.25, baseMoveSpeed: 0.25,
    planetRadius: 40, camDist: 25, camHeight: 35,

    totalTime: 0, dayDuration: 600, currentDay: 1,

    isPaused: true,
    justExitedBuild: false,

    mode: 'normal',
    buildCat: 'housing',
    buildId: 1,
    buildRotation: 0,
    previewMesh: null,

    inventory: Array(27).fill(null),
    selectedSlot: 0,
    cursorItem: null
};
