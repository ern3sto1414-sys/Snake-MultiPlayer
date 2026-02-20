const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const MAP_SIZE = 2000; 
const box = 20;
const MAX_FOOD = 50; 

let players = {}; 
let foods = []; 

function spawnFood(customPos = null) {
    if (customPos) return customPos;
    return {
        x: Math.floor(Math.random() * (MAP_SIZE / box)) * box,
        y: Math.floor(Math.random() * (MAP_SIZE / box)) * box
    };
}

for (let i = 0; i < MAX_FOOD; i++) {
    foods.push(spawnFood());
}

io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        body: [spawnFood()],
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        dir: "STAY"
    };

    console.log(`📡 Jugador unido a la arena: ${socket.id}`);

    socket.on('movimiento', (data) => {
        if (players[socket.id]) {
            const d = data.dir;
            const currentDir = players[socket.id].dir;
            if (d === "LEFT" && currentDir !== "RIGHT") players[socket.id].dir = d;
            else if (d === "UP" && currentDir !== "DOWN") players[socket.id].dir = d;
            else if (d === "RIGHT" && currentDir !== "LEFT") players[socket.id].dir = d;
            else if (d === "DOWN" && currentDir !== "UP") players[socket.id].dir = d;
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    if (Object.keys(players).length === 0) return;

    for (let id in players) {
        let p = players[id];
        if (p.dir === "STAY") continue;

        let newHead = { x: p.body[0].x, y: p.body[0].y };
        if(p.dir === "LEFT") newHead.x -= box;
        if(p.dir === "UP") newHead.y -= box;
        if(p.dir === "RIGHT") newHead.x += box;
        if(p.dir === "DOWN") newHead.y += box;

        if(newHead.x < 0) newHead.x = MAP_SIZE - box; 
        if(newHead.x >= MAP_SIZE) newHead.x = 0;
        if(newHead.y < 0) newHead.y = MAP_SIZE - box; 
        if(newHead.y >= MAP_SIZE) newHead.y = 0;

        let died = false;
        for (let otherId in players) {
            if (id !== otherId) {
                players[otherId].body.forEach(segment => {
                    if (newHead.x === segment.x && newHead.y === segment.y) died = true;
                });
            }
        }

        if (died) {
            // --- NUEVA LÓGICA: SOLTAR COMIDA AL MORIR ---
            p.body.forEach((segment, index) => {
                // Solo soltamos comida cada 2 segmentos para no saturar el mapa
                if (index % 2 === 0) {
                    foods.push({ x: segment.x, y: segment.y });
                }
            });

            // Reaparecer
            p.body = [spawnFood()];
            p.dir = "STAY";
            continue;
        }

        p.body.unshift(newHead);

        let foodIndex = foods.findIndex(f => f.x === newHead.x && f.y === newHead.y);
        if(foodIndex !== -1) {
            foods.splice(foodIndex, 1);
            // Si el mapa tiene poca comida, generamos una nueva aleatoria
            if (foods.length < MAX_FOOD) {
                foods.push(spawnFood());
            }
        } else {
            p.body.pop(); 
        }
    }
    io.emit('updateState', { players, foods });
}, 60); 

const PORT = process.env.PORT || 3000; // Render te dará el puerto, si no, usa el 3000
http.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Arena 24/7 activa en puerto ${PORT}`); 
});