import { Hono } from 'hono'
import { createBunWebSocket } from 'hono/bun'
import { serve, type ServerWebSocket } from 'bun'
import { WSContext } from 'hono/ws';

const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>()
const wsStore = new Set<WSContext<ServerWebSocket>>();

const canvasWidth = 500;
const canvasHeight = 300;
const squareSize = 20;

let intervalId: NodeJS.Timer;
let x = Math.round(Math.random() * (canvasWidth - squareSize));
let y = Math.round(Math.random() * (canvasHeight - squareSize));
let xSpeed = 1;
let ySpeed = 1;

app.get('/ws', upgradeWebSocket(c => {
    return {
        onOpen(_evt, ws) {
            ws.send('hello');
        },
        onMessage(evt, ws) {
            ws.send('pong');
            if (evt.data.toString().startsWith('sp')) {
                const [,x,y] = evt.data.toString().split(';');
                xSpeed = Number(x);
                ySpeed = Number(y);
                console.log('Updated');
            }
            if (evt.data.toString() === 'sub') {
                wsStore.add(ws);
                console.log('Subscribed');
            }
            if (evt.data.toString() === 'stop') {
                stopInterval();
                console.log('Interval stopped');
            }
        },
    };
}));

function startInterval() {
    if (intervalId) return;

    intervalId = setInterval(() => {
        x += xSpeed;
        y += ySpeed;

        if (x <= 0 || x + squareSize >= canvasWidth) {
            xSpeed = -xSpeed;
        }
        if (y <= 0 || y + squareSize >= canvasHeight) {
            ySpeed = -ySpeed;
        }

        const pos = `${x};${y}`;

        for (let ws of wsStore) {
            ws.send(pos);
        }
        // console.log(pos);
    }, 1000 / 60);
}

function stopInterval() {
    if (intervalId) {
        clearInterval(intervalId);
    }
}

startInterval();


serve({
    fetch: app.fetch,
    port: 3312,
    websocket,
})
