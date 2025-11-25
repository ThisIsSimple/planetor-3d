import { gameState } from '../core/GameState.js';
import { updateInventoryUI, showMessage } from '../ui/UIManager.js';

export function addItem(id, count) {
    for (let i = 0; i < 27; i++) {
        if (gameState.inventory[i] && gameState.inventory[i].id === id) {
            gameState.inventory[i].count += count;
            updateInventoryUI();
            return true;
        }
    }
    for (let i = 0; i < 27; i++) {
        if (!gameState.inventory[i]) {
            gameState.inventory[i] = { id: id, count: count };
            updateInventoryUI();
            return true;
        }
    }
    showMessage("가방이 가득 찼습니다!", "#ff6b6b");
    return false;
}

export function countItem(id) {
    let total = 0;
    for (let item of gameState.inventory) {
        if (item && item.id === id) total += item.count;
    }
    return total;
}

export function consumeItem(id, count) {
    let remain = count;
    for (let i = 0; i < 27; i++) {
        if (gameState.inventory[i] && gameState.inventory[i].id === id) {
            if (gameState.inventory[i].count > remain) {
                gameState.inventory[i].count -= remain;
                remain = 0;
            } else {
                remain -= gameState.inventory[i].count;
                gameState.inventory[i] = null;
            }
            if (remain <= 0) break;
        }
    }
    updateInventoryUI();
    return remain <= 0;
}
