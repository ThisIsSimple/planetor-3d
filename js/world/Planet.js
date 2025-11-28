// Babylon.js Planet Class
import { scene } from './Scene.js';

export class Planet {
    constructor(params = {}) {
        this.name = params.name || "Unknown Planet";
        this.description = params.description || "No description available.";
        this.position = params.position || new BABYLON.Vector3(0, 0, 0);
        this.size = params.size || 80; // Diameter
        this.gravity = params.gravity || 0.02; // Game units per frame

        // 시간 관련 속성
        this.dayDuration = params.dayDuration || 600; // 하루가 실제 몇 초인지 (기본값: 600초 = 10분)
        this.daysPerMonth = params.daysPerMonth || 30; // 한 달이 며칠인지
        this.monthsPerYear = params.monthsPerYear || 12; // 1년이 몇 달인지
        this.startYear = params.startYear ?? 0; // 시작 연도 (기본값: 0년)
        
        this.localTime = params.localTime || 0; // 해당 행성의 누적 시간 (초 단위)
        this.localDay = 1; // 현재 날짜 (총 일수)

        this.radius = this.size / 2;
        this.mesh = null;

        this.init();
    }

    init() {
        // Create sphere mesh
        this.mesh = BABYLON.MeshBuilder.CreateSphere("planet", {
            diameter: this.size,
            segments: 64
        }, scene);
        
        // Position the planet
        this.mesh.position.copyFrom(this.position);
        
        // Create material
        const material = new BABYLON.StandardMaterial("planetMat", scene);
        material.diffuseColor = new BABYLON.Color3(0.290, 0.855, 0.502); // #4ade80
        material.roughness = 0.9;
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        this.mesh.material = material;
        
        // Enable shadow receiving
        this.mesh.receiveShadows = true;
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
     * 현재 행성 날짜 반환 (총 일수)
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

    /**
     * 현재 날짜를 년, 월, 일로 분해하여 반환
     * @returns {{year: number, month: number, day: number}} - 년, 월, 일 객체
     */
    getDateComponents() {
        const totalDays = this.localDay - 1; // 0부터 시작하여 계산
        const daysPerYear = this.daysPerMonth * this.monthsPerYear;
        
        const year = this.startYear + Math.floor(totalDays / daysPerYear);
        const remainingDays = totalDays % daysPerYear;
        const month = Math.floor(remainingDays / this.daysPerMonth) + 1; // 1월부터 시작
        const day = (remainingDays % this.daysPerMonth) + 1; // 1일부터 시작
        
        return { year, month, day };
    }

    /**
     * 포맷된 날짜 문자열 반환
     * @returns {string} - "00년 00월 00일" 형식
     */
    getFormattedDate() {
        const { year, month, day } = this.getDateComponents();
        return `${year}년 ${month}월 ${day}일`;
    }
}
