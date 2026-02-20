const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusDiv = document.getElementById("status");
const box = 20;
const MAP_SIZE = 2000; 

let allPlayers = {}; 
let allFoods = []; 
let lastSentDir = "STAY";

socket.on('connect', () => {
    if (statusDiv) statusDiv.innerText = "¡Conectado! Sonora te espera.";
});

socket.on('updateState', (data) => {
    allPlayers = data.players;
    allFoods = data.foods || [];
});

// MOVILIDAD: Captura instantánea de dirección
document.addEventListener("keydown", (e) => {
    let newDir = null;
    const k = e.keyCode;

    // WASD o Flechas
    if (k == 37 || k == 65) newDir = "LEFT";
    else if (k == 38 || k == 87) newDir = "UP";
    else if (k == 39 || k == 68) newDir = "RIGHT";
    else if (k == 40 || k == 83) newDir = "DOWN";

    if (newDir && newDir !== lastSentDir) {
        // Bloqueo de 180 grados para evitar suicidios por lag
        if (newDir === "LEFT" && lastSentDir === "RIGHT") return;
        if (newDir === "RIGHT" && lastSentDir === "LEFT") return;
        if (newDir === "UP" && lastSentDir === "DOWN") return;
        if (newDir === "DOWN" && lastSentDir === "UP") return;

        lastSentDir = newDir;
        socket.emit('movimiento', { dir: newDir });
    }
});

function draw() {
    // 1. Limpieza total con fondo negro puro
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. CÁMARA (Suavizada para evitar mareos al girar)
    const me = allPlayers[socket.id];
    if (me && me.body[0]) {
        // Math.floor ayuda a que no se vea borroso al moverte
        let camX = Math.floor(-me.body[0].x + canvas.width / 2);
        let camY = Math.floor(-me.body[0].y + canvas.height / 2);
        ctx.translate(camX, camY);
    }

    // 3. LÍMITES DEL MUNDO
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

    // 4. MANZANAS CUADRADAS (Más fáciles de interceptar)
    ctx.fillStyle = "#ff0000";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "red";
    allFoods.forEach(f => {
        // Cuadro sólido de 18x18 dentro del espacio de 20x20
        ctx.fillRect(f.x + 1, f.y + 1, box - 2, box - 2);
    });
    ctx.shadowBlur = 0;

    // 5. JUGADORES (Estilo Clásico)
    for (let id in allPlayers) {
        let p = allPlayers[id];
        
        p.body.forEach((segment, index) => {
            // Cuerpo sólido
            ctx.fillStyle = index === 0 ? p.color : p.color.replace('100%', '70%');
            ctx.fillRect(segment.x, segment.y, box - 1, box - 1);

            // Marca blanca solo para tu cabeza
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