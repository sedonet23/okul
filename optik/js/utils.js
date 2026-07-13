// utils.js

export function showStatus(message) {
    const el = document.getElementById("statusText");
    if (el) {
        el.textContent = message;
    }
}

export function distance(p1, p2) {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2)
    );
}

export function sortCorners(points) {

    const sorted = [...points];

    sorted.sort((a, b) => a.y - b.y);

    const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

    return {
        topLeft: top[0],
        topRight: top[1],
        bottomLeft: bottom[0],
        bottomRight: bottom[1]
    };
}