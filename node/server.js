var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer();
server.listen({ port: process.env.PORT || 1337 }, function () {
    console.log("Running on address: ", server.address());
});

// create the server
wss = new WebSocketServer({ httpServer: server });

console.log("Webserver started!");

var clients = [];
var bullets = [];
var platforms = [];

var maze = new Maze(10, 10);
maze.generate();
for (var y = 0; y < maze.height; y++) {
    for (var x = 0; x < maze.width; x++) {
        var cell = maze.grid[x][y];
        if (x > maze.width / 2 - 3 && x < maze.width / 2 + 3 && y > maze.height / 2 - 3 && y < maze.height / 2 + 3) {
            cell.sides = [false, false, false, false];
        }
    }
}

var scale = 200;

for (var y = 0; y < maze.height; y++) {
    for (var x = 0; x < maze.width; x++) {
        var cell = maze.grid[x][y];
        for (var i = 0; i < 4; i++) {
            if (cell.sides[i]) {
                var angle = i * Math.PI * 0.5 - Math.PI * 0.75 + (i >= 2 ? Math.PI * 0.5 : 0);
                platforms.push({x: (x + 0.5) * scale + Math.cos(angle) * 1.41 * scale / 2, y: (y + 0.5) * scale + Math.sin(angle) * 1.41 * scale / 2, width: !(i % 2) ? scale : 30, height: !((i + 1) % 2) ? scale : 30, type: "world"});
            }
        }
    }
}

wss.on('request', function (request) {
    var connection = request.accept(null, request.origin);

    connection.isOnline = true;
    connection.health = 100;
    connection.player = {x: 0, y: 0, health: 100};
    connection.survivalTime = 0;
    var clientIndex = clients.push(connection) - 1;

    console.log("New connection: " + connection.remoteAddress);

    connection.sendUTF(JSON.stringify({type: "updateWorld", world: platforms}));

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            var data = JSON.parse(message.utf8Data);

            if (data.type == "updateplayer") {
                connection.player = data.player;

                if (data.player.speed != 2) { /* Hacking */
                    connection.close();
                }
                else {
                    //Get players
                    var d = [];
                    for (var i = 0; i < clients.length; i++) {
                        var c = clients[i];
                        if (c.isOnline)
                            d.push({player: c.player});
                    }
                    connection.sendUTF(JSON.stringify({ players: d, bullets: bullets, type: "serverUpdate" }));
                }
            }
            else if (data.type == "addBullet") {
                bullets.push(new Bullet(data.x, data.y, data.vx, data.vy, data.playerId, data.damage));
            }
            else if (data.type == "getLeaderboard") {
                var copyClients = [...clients];
                copyClients.sort(function(a, b) {
                    return a.survivalTime < b.survivalTime;
                });
                var leaderboard = [];
                for (var i = 0; i < copyClients.length; i++) {
                    var c = copyClients[i];
                    if (c && c.isOnline) {
                        leaderboard.push({name: c.player.name || "UNKNOWN", score: c.survivalTime});
                    }
                    if (leaderboard.length >= 5) break;
                }
                connection.sendUTF(JSON.stringify({type: "getLeaderboard", leaderboard: leaderboard}));
            }
        }
    });

    connection.on('close', function (connection) {
        console.log("User left!");
        for (var i = 0; i < clients.length; i++) {
            var c = clients[i];
            c.sendUTF(JSON.stringify({ id: clients[clientIndex].player.id, type: "playerleft" }));
        }
        clients[clientIndex].isOnline = false;
    });
});

setInterval(function() {
    topBulletLoop: for (var j = 0; j < bullets.length; j++) {
        var b = bullets[j];

        for (var co = 0; co < b.iterations; co++) {
            b.run();

            for (var i = 0; i < platforms.length; i++) {
                var p = platforms[i];
                if (b.checkCollision(p.x, p.y, p.width, p.height)) break topBulletLoop;
            }

            for (var i = 0; i < clients.length; i++) {
                var c = clients[i];
                if (c.isOnline && c.player && b.playerId != c.player.id) {
                    if (b.checkCollision(c.player.x, c.player.y, c.player.width, c.player.height)) {
                        c.player.health -= b.damage;
                        c.sendUTF(JSON.stringify({type: "takeDamage", damage: b.damage}));

                        if (c.player.health <= 0) {
                            c.survivalTime = 0;
                            c.sendUTF(JSON.stringify({type: "die"}));
                        }

                        break topBulletLoop;
                    }
                }
            }
        }
    }
}, 16);

setInterval(function() {
    for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        if (c.isOnline) {
            c.survivalTime++;
        }
    }
}, 1000);

function Bullet(x, y, vx, vy, playerId, damage) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.iterations = 10;
    this.playerId = playerId;
    this.damage = damage;

    this.run = function() {
        this.x += this.vx / this.iterations;
        this.y += this.vy / this.iterations;
    }

    this.checkCollision = function(x, y, w, h) {
        if (this.x > x && this.x < x + w && this.y > y && this.y < y + h) {
            bullets.splice(bullets.indexOf(this), 1);
            return true;
        }
        return false;
    }
}

function Maze(w, h, scale) {
    this.width = w;
    this.height = h;
    this.scale = scale || 20;
    this.grid = createMaze(this.width, this.height);
    this.currentCell = this.grid[0][0];
    this.currentCell.visited = true;
    this.stack = [this.currentCell];

    this.generate = function() {
        while (this.stack.length > 0) {
            var unvisitedNeighbors = [];
            var coords = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            for (var i = 0; i < coords.length; i++) {
                var c = coords[i];
                if (!this.isNeighborVisited(this.currentCell.x + c[0], this.currentCell.y + c[1]))
                    unvisitedNeighbors.push(this.grid[this.currentCell.x + c[0]][this.currentCell.y + c[1]]);
            }
            
            if (unvisitedNeighbors.length > 0) {
                var randomNeighbor = unvisitedNeighbors[(Math.random() * unvisitedNeighbors.length) >> 0];
                var vecX = this.currentCell.x - randomNeighbor.x;
                var vecY = this.currentCell.y - randomNeighbor.y;
                if (vecX) {
                    this.currentCell.sides[vecX < 0 ? 1 : 3] = false;
                    randomNeighbor.sides[vecX < 0 ? 3 : 1] = false;
                }
                else if (vecY) {
                    this.currentCell.sides[vecY < 0 ? 2 : 0] = false;
                    randomNeighbor.sides[vecY < 0 ? 0 : 2] = false;
                }
                randomNeighbor.visited = true;
                this.stack.push(randomNeighbor);
                this.currentCell = randomNeighbor;
            }
            else {
                this.currentCell = this.stack.splice(-1, 1)[0];
            }
        }
    }

    this.isNeighborVisited = (x, y) => this.grid[x] && this.grid[x][y] ? this.grid[x][y].visited : true;

    function createMaze(w, h) {
        var a = new Array(w);
        for (var i = 0; i < a.length; i++) {
            a[i] = new Array(h);
            for (var j = 0; j < a[i].length; j++)
                a[i][j] = new Cell(i, j);
        }
        return a;
    }

    function Cell(x, y) {
        this.x = x;
        this.y = y;
        this.sides = [true, true, true, true];
        this.visited = false;
    }
}