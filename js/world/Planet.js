import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene } from './Scene.js';

export class Planet {
    constructor(params = {}) {
        this.name = params.name || "Unknown Planet";
        this.description = params.description || "No description available.";
        this.position = params.position || new THREE.Vector3(0, 0, 0);
        this.size = params.size || 80; // Diameter
        this.gravity = params.gravity || 0.02; // Game units per frame

        // 시간 관련 속성
        this.dayDuration = params.dayDuration || 600; // 하루가 실제 몇 초인지 (기본값: 600초 = 10분)
        this.localTime = params.localTime || 0; // 해당 행성의 누적 시간 (초 단위)
        this.localDay = 1; // 현재 날짜

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

    /**
     * 시간 업데이트 - 경과 시간만큼 localTime 증가, localDay 계산
     * @param {number} delta - 경과 시간 (초)
     * @returns {boolean} - 날짜가 변경되었으면 true
     */
    updateTime(delta) {
        this.localTime += delta;
        const newDay = Math.floor(this.localTime / this.dayDuration) + 1;
        const dayChanged = newDay !== this.localDay;
        this.localDay = newDay;
        return dayChanged;
    }

    /**
     * 현재 행성 날짜 반환
     * @returns {number} - 현재 날짜
     */
    getLocalDay() {
        return this.localDay;
    }

    /**
     * 하루 중 진행률 반환 (0~1)
     * @returns {number} - 하루 진행률
     */
    getDayProgress() {
        return (this.localTime % this.dayDuration) / this.dayDuration;
    }
}
