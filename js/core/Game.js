import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { gameState } from './GameState.js';
import { initInput, keys, on } from './Input.js';
import { initCamera, camera, cameraState } from './Camera.js';
import { initScene, scene, renderer, sunPivot } from '../world/Scene.js';
import { Planet } from '../world/Planet.js';
import { createPlayer, updatePlayerMovement, playerState, player, jump, attack, equipWeapon, unequipWeapon } from '../entities/Player.js';
import { spawnTree, updateParticles, updateDrops, updateEnvironment } from '../world/Environment.js';
import { initUI, showMessage, updateInventoryUI, updateControlsGuide, selectHotbarSlot } from '../ui/UIManager.js';
import { addItem } from '../systems/Inventory.js';
import { handleInteraction, updateCrops, checkAttackHit } from '../systems/Interaction.js';
import { refreshBuildList, updatePreviewMesh, updatePreviewTransform, removePreviewMesh, selectCategory, currentBuildList } from '../systems/Building.js';

let clock;

export function init() {
    initScene();
    clock = new THREE.Clock();
    initCamera();
    gameState.planet = new Planet({
        name: "Terra Nova",
        description: "A lush green planet suitable for life.",
        size: 80,
        gravity: 0.02
    });
    createPlayer();

    for (let i = 0; i < 40; i++) spawnTree();

    initInput();
    setupInputHandlers();

    document.getElementById('blocker').addEventListener('click', function () {
        safeRequestPointerLock();
    });

    initUI();
    updateControlsGuide();

    addItem('axe', 1);

    document.getElementById('btn-menu-build').onclick = () => toggleMode('build');
    document.getElementById('btn-menu-inv').onclick = () => toggleMode('inventory');
    document.getElementById('btn-main-action').onclick = () => {
        handleInteraction();
    };

    animate();
}

function setupInputHandlers() {
    on('keydown', (k, e) => {
        if (k >= '1' && k <= '9') {
            if (gameState.mode === 'build') {
                if (currentBuildList.length >= parseInt(k)) {
                    gameState.buildId = currentBuildList[parseInt(k) - 1];
                    refreshBuildList();
                    updatePreviewMesh();
                }
            } else {
                selectHotbarSlot(parseInt(k) - 1);
                const item = gameState.inventory[parseInt(k) - 1];
                if (item) equipWeapon(item.id);
                else unequipWeapon();
            }
        }
        if (k === 'tab' && gameState.mode === 'build') {
            e.preventDefault();
            if (gameState.buildCat === 'housing') selectCategory('farming');
            else if (gameState.buildCat === 'farming') selectCategory('deco');
            else selectCategory('housing');
        }
        if (k === 'q') toggleMode('build');
        if (k === 'e') toggleMode('inventory');
        if (k === 'f') handleInteraction();
        if (k === ' ') jump();
        if (k === 'escape') {
            if (gameState.mode === 'build') {
                gameState.justExitedBuild = true;
                toggleMode('normal', true);
            } else if (gameState.mode === 'inventory') {
                toggleMode('normal');
            } else if (gameState.mode === 'normal') {
                if (document.getElementById('blocker').style.display === 'none') {
                    document.exitPointerLock();
                } else {
                    safeRequestPointerLock();
                }
            }
        }
        if (gameState.mode === 'build') {
            if (k === 'r') gameState.buildRotation += 0.1;
            if (k === 'f') gameState.buildRotation -= 0.1;
        }
    });

    on('scroll', (e) => {
        if (gameState.mode === 'build') {
            const currentIndex = currentBuildList.indexOf(gameState.buildId);
            if (currentIndex === -1) return;
            let nextIndex = currentIndex + (e.deltaY > 0 ? 1 : -1);
            if (nextIndex >= currentBuildList.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = currentBuildList.length - 1;
            gameState.buildId = currentBuildList[nextIndex];
            refreshBuildList();
            updatePreviewMesh();
        } else {
            let next = gameState.selectedSlot + (e.deltaY > 0 ? 1 : -1);
            if (next > 8) next = 0; if (next < 0) next = 8;
            selectHotbarSlot(next);
            const item = gameState.inventory[next];
            if (item) equipWeapon(item.id);
            else unequipWeapon();
        }
    });

    on('mousemove', (e) => {
        if (!gameState.isPaused && document.pointerLockElement === document.body) {
            const rotSpeed = -0.002;
            cameraState.forward.applyAxisAngle(playerState.up, e.movementX * rotSpeed).normalize();

            cameraState.pitch -= e.movementY * rotSpeed;
            cameraState.pitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraState.pitch));
        }
    });

    on('mousedown', (e) => {
        if (!gameState.isPaused && document.pointerLockElement === document.body) {
            if (e.button === 0) attack(); // Left click
        }
    });

    document.addEventListener('pointerlockchange', onPointerLockChange);
}

function onPointerLockChange() {
    if (document.pointerLockElement === document.body) {
        gameState.isPaused = false;
        gameState.justExitedBuild = false;
        document.getElementById('blocker').style.display = 'none';
    } else {
        if (gameState.mode === 'inventory') {
        } else if (gameState.justExitedBuild) {
            gameState.isPaused = true;
            gameState.justExitedBuild = false;
            document.getElementById('blocker').style.display = 'none';
        } else {
            gameState.isPaused = true;
            gameState.mode = 'normal';

            document.getElementById('build-window').style.display = 'none';
            document.getElementById('inventory-window').style.display = 'none';
            document.getElementById('btn-menu-build').classList.remove('active');
            document.getElementById('btn-menu-inv').classList.remove('active');
            removePreviewMesh();

            document.getElementById('blocker').style.display = 'flex';

            for (let k in keys) keys[k] = false;
        }
    }
}

function safeRequestPointerLock() {
    if (document.pointerLockElement === document.body) return;
    const promise = document.body.requestPointerLock();
    if (promise) {
        promise.catch(err => { });
    }
}

function toggleMode(modeName, force = false) {
    if (gameState.mode === 'build') removePreviewMesh();

    if (gameState.mode === modeName) {
        gameState.mode = 'normal';
        safeRequestPointerLock();
    } else {
        gameState.mode = modeName;
        if (modeName === 'inventory') {
            document.exitPointerLock();
        } else if (modeName === 'build') {
            safeRequestPointerLock();
        } else if (modeName === 'normal') {
            safeRequestPointerLock();
        }
    }

    document.getElementById('build-window').style.display = (gameState.mode === 'build') ? 'flex' : 'none';
    document.getElementById('inventory-window').style.display = (gameState.mode === 'inventory') ? 'flex' : 'none';

    document.getElementById('btn-menu-build').classList.toggle('active', gameState.mode === 'build');
    document.getElementById('btn-menu-inv').classList.toggle('active', gameState.mode === 'inventory');

    if (gameState.mode === 'build') {
        refreshBuildList();
        updatePreviewMesh();
        showMessage("건설 모드 (휠: 선택, Tab: 변경)", "#4ade80");
    } else if (gameState.mode === 'inventory') {
        updateInventoryUI();
    }
    updateControlsGuide();
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState.isPaused) {
        renderer.render(scene, camera);
        return;
    }

    const delta = clock.getDelta();
    gameState.totalTime += delta;

    const day = Math.floor(gameState.totalTime / gameState.dayDuration) + 1;
    if (day !== gameState.currentDay) {
        gameState.currentDay = day;
        document.getElementById('day-display').innerText = `Day ${day}`;
        showMessage(`Day ${day} 시작`, "#ffd700");
    }
    const dayProgress = (gameState.totalTime % gameState.dayDuration) / gameState.dayDuration;
    document.getElementById('time-bar-fill').style.width = `${dayProgress * 100}%`;
    sunPivot.rotation.z = (gameState.totalTime / gameState.dayDuration) * Math.PI * 2;

    const hungerLoss = (100 / (gameState.dayDuration * 3)) * delta;
    gameState.hunger = Math.max(0, gameState.hunger - hungerLoss);
    if (gameState.hunger <= 0) gameState.moveSpeed = gameState.baseMoveSpeed * 0.5;
    else gameState.moveSpeed = gameState.baseMoveSpeed;
    document.getElementById('hunger-fill').style.width = `${gameState.hunger}%`;

    updatePlayerMovement();

    // Check attack hit
    if (playerState.isAttacking && !playerState.attackHitChecked && playerState.attackTimer > 0.5) {
        checkAttackHit();
        playerState.attackHitChecked = true;
    }

    updatePreviewTransform();

    // Update Environment (Particles, Tree Health Bars)
    updateEnvironment(player.position, camera);

    if (player) updateDrops(player);
    updateCrops(delta);

    document.getElementById('action-progress-container').style.display = 'none';

    renderer.render(scene, camera);
}
