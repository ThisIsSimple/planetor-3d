import { gameState } from '../core/GameState.js';
import { ITEM_DB } from '../data/Items.js';
import { BUILDING_DB } from '../data/Buildings.js';
import { refreshBuildList, updatePreviewMesh, removePreviewMesh, selectCategory } from '../systems/Building.js';
import { on } from '../core/Input.js';

export function initUI() {
    const hotbarEl = document.getElementById('hotbar');
    hotbarEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.dataset.index = i;
        slot.onclick = () => selectHotbarSlot(i);
        slot.innerHTML = `<span class="slot-num">${i + 1}</span><span class="slot-content"></span>`;
        hotbarEl.appendChild(slot);
    }
    updateInventoryUI();

    // Expose functions to window for HTML onclick handlers
    window.selectCategory = selectCategory;

    on('mousemove', (e) => {
        const el = document.getElementById('cursor-item');
        if (el && gameState.cursorItem) {
            el.style.left = `${e.clientX}px`;
            el.style.top = `${e.clientY}px`;
        }
    });
}

export function updateInventoryUI() {
    for (let i = 0; i < 9; i++) {
        const slotEl = document.querySelector(`#hotbar .inv-slot[data-index="${i}"]`);
        if (slotEl) {
            if (i === gameState.selectedSlot) slotEl.classList.add('selected');
            else slotEl.classList.remove('selected');
            renderSlotContent(slotEl, gameState.inventory[i]);
        }
    }
    if (gameState.mode === 'inventory') {
        const bagGrid = document.getElementById('inv-bag-grid');
        const hotbarGrid = document.getElementById('inv-hotbar-grid');
        if (bagGrid && hotbarGrid) {
            bagGrid.innerHTML = '';
            hotbarGrid.innerHTML = '';
            for (let i = 9; i < 27; i++) bagGrid.appendChild(createInvSlotElement(i));
            for (let i = 0; i < 9; i++) hotbarGrid.appendChild(createInvSlotElement(i));
        }
    }
}

function createInvSlotElement(index) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.onclick = () => handleInventorySlotClick(index);
    renderSlotContent(slot, gameState.inventory[index]);
    return slot;
}

function renderSlotContent(el, item) {
    const content = el.querySelector('.slot-content') || el;
    const num = el.querySelector('.slot-num');
    content.innerHTML = '';
    if (num) content.appendChild(num);
    if (item) {
        const icon = document.createElement('span');
        icon.innerText = ITEM_DB[item.id].icon;
        content.appendChild(icon);
        if (item.count > 1) {
            const count = document.createElement('span');
            count.className = 'slot-count';
            count.innerText = item.count;
            content.appendChild(count);
        }
    }
}

export function selectHotbarSlot(index, isBuildMode = false) {
    if (isBuildMode) {
        // Handled in Building.js or Game.js?
        // Original: if mode==build, 1-9 selects build item.
        // This function is for inventory selection.
        // We should separate them.
        // But UIManager handles the click on hotbar.
        // If we click hotbar in build mode, what happens?
        // Original: hotbar is visible in build mode?
        // Original: `toggleMode` hides hotbar? No, `hotbar` is in `main-hud`.
        // `main-hud` is always visible?
        // `toggleMode` shows/hides `build-window` and `inventory-window`.
        // If in build mode, hotbar selection might be disabled or different?
        // Original `handleKeyDown` distinguished them.
        // `selectHotbarSlot` was only called for normal mode in `handleKeyDown`.
        // But `onclick` on hotbar calls `selectHotbarSlot`.
        // So clicking hotbar always selects slot.
        gameState.selectedSlot = index;
        updateInventoryUI();
    } else {
        gameState.selectedSlot = index;
        updateInventoryUI();
    }
}

function handleInventorySlotClick(index) {
    const clickedItem = gameState.inventory[index];
    const cursor = gameState.cursorItem;
    if (!cursor) {
        if (clickedItem) { gameState.cursorItem = clickedItem; gameState.inventory[index] = null; }
    } else {
        if (!clickedItem) { gameState.inventory[index] = cursor; gameState.cursorItem = null; }
        else {
            if (clickedItem.id === cursor.id) {
                gameState.inventory[index].count += cursor.count; gameState.cursorItem = null;
            } else {
                gameState.inventory[index] = cursor; gameState.cursorItem = clickedItem;
            }
        }
    }
    updateInventoryUI();
    updateCursorItemUI();
}

export function updateCursorItemUI() {
    const el = document.getElementById('cursor-item');
    if (gameState.cursorItem) {
        el.style.display = 'block';
        el.innerText = ITEM_DB[gameState.cursorItem.id].icon;
    } else {
        el.style.display = 'none';
    }
}

export function showMessage(text, color) {
    const el = document.getElementById('message');
    el.innerText = text;
    el.style.color = color;
    el.style.opacity = 1;
    if (el.timer) clearTimeout(el.timer);
    el.timer = setTimeout(() => el.style.opacity = 0, 1500);
}

export function updateControlsGuide() {
    const el = document.getElementById('controls-left');
    if (gameState.mode === 'build') {
        el.innerHTML = `<div><span class="key">Q</span> 종료</div><div><span class="key">Tab</span> 카테고리</div><div><span class="key">휠</span> 건물선택</div><div><span class="key">SPC</span> 건설</div>`;
    } else if (gameState.mode === 'inventory') {
        el.innerHTML = `<div><span class="key">E</span> / <span class="key">ESC</span> 닫기</div><div><span class="key">클릭</span> 이동</div>`;
    } else {
        el.innerHTML = `<div><span class="key">W</span><span class="key">S</span> 이동</div><div><span class="key">A</span><span class="key">D</span> 좌우이동</div><div><span class="key">마우스</span> 시점</div><div><span class="key">SPC(꾹)</span> 액션</div>`;
    }
}

export function toggleMode(modeName, force = false) {
    // This logic was in index.html.
    // It needs to be somewhere. UIManager seems appropriate for UI changes.
    // But it also affects game state (pointer lock).
    // Let's put the UI part here and the logic in Game.js?
    // Or just import safeRequestPointerLock from Game.js?
    // I'll export a function to update UI for mode change.
}
