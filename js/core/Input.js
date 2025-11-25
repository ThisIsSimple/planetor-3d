export const keys = { w: false, a: false, s: false, d: false, q: false, e: false, space: false, spaceHandled: false };
export const mouse = { x: 0, y: 0, isDragging: false, lastX: 0 };

const callbacks = {
    keydown: [],
    keyup: [],
    scroll: [],
    mousemove: []
};

export function on(event, fn) {
    if (callbacks[event]) callbacks[event].push(fn);
}

export function initInput() {
    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        keys[k] = true;
        callbacks.keydown.forEach(fn => fn(k, e));
    });
    window.addEventListener('keyup', e => {
        const k = e.key.toLowerCase();
        keys[k] = false;
        callbacks.keyup.forEach(fn => fn(k, e));
    });
    window.addEventListener('wheel', e => {
        callbacks.scroll.forEach(fn => fn(e));
    });
    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        callbacks.mousemove.forEach(fn => fn(e));
    });
    document.addEventListener('mousedown', e => {
        if (e.target.closest('.inv-slot') || e.target.closest('.menu-btn') || e.target.closest('.build-item') || e.target.closest('.cat-btn')) return;
        mouse.isDragging = true;
        mouse.lastX = e.touches ? e.touches[0].clientX : e.clientX;
    });
    document.addEventListener('mouseup', () => mouse.isDragging = false);
}
