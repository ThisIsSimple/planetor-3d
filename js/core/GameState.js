export const gameState = {
    wood: 0,
    hunger: 100, maxHunger: 100,

    isMoving: false, moveSpeed: 0.25, baseMoveSpeed: 0.25,
    planet: null, camDist: 25, camHeight: 35,

    // 우주력 (모든 행성에서 통용되는 시간 시스템)
    cosmicTime: 0, // 우주 전체 통용 시간 (초 단위)
    cosmicDayDuration: 600, // 우주력 1일 = 실제 몇 초 (기본값: 600초 = 10분)
    cosmicDay: 1, // 우주력 날짜

    // 기존 totalTime은 cosmicTime과 동일하게 관리
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
