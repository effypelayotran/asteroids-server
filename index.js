import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });
console.log(`✅ Server running on port ${port}`);

const clients = {};       // id -> ws
const shipStates = {};    // id -> { x, y, vx, vy, angle }

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
    console.log(`New connection: ${id}`);

    // Send the assigned ID to the client
    ws.send(JSON.stringify({ type: "init", id }));

    ws.on('message', (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch {
            console.warn("Invalid JSON:", msg);
            return;
        }

        if (data.type === "input" && shipStates[id]) {
            const ship = shipStates[id];
            switch (data.key) {
                case "ArrowLeft":
                    ship.angle -= 5;
                    break;
                case "ArrowRight":
                    ship.angle += 5;
                    break;
                case "ArrowUp": {
                    const thrust = 0.5;
                    ship.vx += thrust * Math.sin(-ship.angle * Math.PI / 180);
                    ship.vy += thrust * Math.cos(-ship.angle * Math.PI / 180);

                    // Limit speed
                    const maxSpeed = 5;
                    const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
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
        console.log(`Disconnected: ${id}`);
        delete clients[id];
        delete shipStates[id];
    });
});

setInterval(() => {
    for (const id in shipStates) {
        const ship = shipStates[id];
        ship.x += ship.vx;
        ship.y += ship.vy;

        if (ship.x < 0) ship.x += 1024;
        if (ship.x > 1024) ship.x -= 1024;
        if (ship.y < 0) ship.y += 768;
        if (ship.y > 768) ship.y -= 768;
    }

    const stateMsg = JSON.stringify({ type: "state", ships: shipStates });

    for (const id in clients) {
        try {
            clients[id].send(stateMsg);
        } catch (err) {
            console.warn(`Failed to send to ${id}`);
        }
    }
}, 1000 / 30);  // 30 FPS
