// 1. HACEMOS EL SOCKET GLOBAL (Quitamos el 'const')
window.socket = io(); 

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusDiv = document.getElementById("status");
const box = 20;
const MAP_SIZE = 2000; 

let allPlayers = {}; 
let allFoods = []; 
// Cambiamos STAY por null o dirección inicial para que el primer clic funcione
window.lastSentDir = "STAY"; 

socket.on('connect', () => {
    if (statusDiv) statusDiv.innerText = "¡Conectado! Sonora te espera.";
});

socket.on('updateState', (data) => {
    allPlayers = data.players;
    allFoods = data.foods || [];
});

// FUNCIÓN MAESTRA DE MOVIMIENTO (Para teclado y botones)
window.enviarMovimiento = function(newDir) {
    if (newDir && newDir !== window.lastSentDir) {
        // Bloqueo de 180 grados (Anti-suicidio)
        if (newDir === "LEFT" && window.lastSentDir === "RIGHT") return;
        if (newDir === "RIGHT" && window.lastSentDir === "LEFT") return;
        if (newDir === "UP" && window.lastSentDir === "DOWN") return;
        if (newDir === "DOWN" && window.lastSentDir === "UP") return;

        window.lastSentDir = newDir;
        // IMPORTANTE: Tu servidor espera un objeto { dir: ... }
        socket.emit('movimiento', { dir: newDir });
    }
};

// MOVILIDAD: Teclado (Dell Studio)
document.addEventListener("keydown", (e) => {
    let keyDir = null;
    const k = e.keyCode;

    if (k == 37 || k == 65) keyDir = "LEFT";
    else if (k == 38 || k == 87) keyDir = "UP";
    else if (k == 39 || k == 68) keyDir = "RIGHT";
    else if (k == 40 || k == 83) keyDir = "DOWN";

    if (keyDir) window.enviarMovimiento(keyDir);
});

function draw() {
    // 1. Limpieza total
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. CÁMARA
    const me = allPlayers[socket.id];
    if (me && me.body[0]) {
        let camX = Math.floor(-me.body[0].x + canvas.width / 2);
        let camY = Math.floor(-me.body[0].y + canvas.height / 2);
        ctx.translate(camX, camY);
    }

    // 3. LÍMITES
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

    // 4. COMIDA
    ctx.fillStyle = "#ff0000";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "red";
    allFoods.forEach(f => {
        ctx.fillRect(f.x + 1, f.y + 1, box - 2, box - 2);
    });
    ctx.shadowBlur = 0;

    // 5. JUGADORES
    for (let id in allPlayers) {
        let p = allPlayers[id];
        p.body.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? p.color : p.color.replace('100%', '70%');
            ctx.fillRect(segment.x, segment.y, box - 1, box - 1);

            if (id === socket.id && index === 0) {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2;
                ctx.strokeRect(segment.x, segment.y, box - 1, box - 1);
            }
        });
    }

    // 6. MARCADOR
    if (statusDiv && me) {
        statusDiv.innerText = `Puntos: ${(me.body.length - 1) * 10} | Jugadores: ${Object.keys(allPlayers).length}`;
    }

    requestAnimationFrame(draw); 
}

draw();
