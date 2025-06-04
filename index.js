import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// const wss = new WebSocketServer({ port: 8080 });
const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });
console.log(`WebSocket server listening on port ${port}`);

const clients = {};
const shipStates = {};

function initShip() {
    return {
        x: Math.random() * 1024,
        y: Math.random() * 768,
        vx: 0,
        vy: 0,
        angle: 0
    };
}

wss.on('connection', (ws) => {
    const id = uuidv4();
    clients[id] = ws;
    shipStates[id] = initShip();
    ws.send(JSON.stringify({ type: "init", id }));

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        const ship = shipStates[id];
        if (!ship) return;

        if (data.type === "input") {
            switch (data.key) {
                case "ArrowLeft":
                case "KeyA":
                    ship.angle -= 5;
                    break;
                case "ArrowRight":
                case "KeyD":
                    ship.angle += 5;
                    break;
                case "ArrowUp":
                case "KeyW": {
                    const thrust = 0.5;
                    ship.vx += thrust * Math.sin(-ship.angle * Math.PI / 180);
                    ship.vy += thrust * Math.cos(-ship.angle * Math.PI / 180);

                    // Limit speed
                    const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
                    const maxSpeed = 4;
                    if (speed > maxSpeed) {
                        ship.vx *= maxSpeed / speed;
                        ship.vy *= maxSpeed / speed;
                    }
                    break;
                }
            }
        }
    });

    ws.on('close', () => {
        delete clients[id];
        delete shipStates[id];
    });
});

setInterval(() => {
    for (let id in shipStates) {
        const ship = shipStates[id];
        ship.x += ship.vx;
        ship.y += ship.vy;

        // Wrap around screen
        if (ship.x < 0) ship.x += 1024;
        if (ship.x > 1024) ship.x -= 1024;
        if (ship.y < 0) ship.y += 768;
        if (ship.y > 768) ship.y -= 768;
    }

    const state = JSON.stringify({ type: "state", ships: shipStates });
    for (let id in clients) {
        clients[id].send(state);
    }
}, 1000 / 30); // 30 FPS
