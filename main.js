(function() {
    var gameCanvas = new GameCanvas("canvas");

    var tinyPlatforms = new TinyPlatforms();
    tinyPlatforms.gravity = 0;

    var camera = new Camera();
    window.onresize = function() {
        gameCanvas.canvas.width = window.width = window.innerWidth;
        gameCanvas.canvas.height = window.height = window.innerHeight;
        var max = Math.max(width, height);
        camera.scaleX = 1.5 * (max / 1536);
        camera.scaleY = 1.5 * (max / 1536);
    }

    var player = new Platform(40, 40, 30, 30, false);
    player.name = "Player_" + (Math.random() * 10000 >> 0);
    player.speed = 2;
    player.health = 100;
    player.inGame = false;
    player.id = Math.random() * 100000 >> 0;
    tinyPlatforms.add(player);
    
    var isConnecting = false;

    var guns = [{name: "Auto", bulletSpeed: 7, reloadTime: 1000, inMag: 30, magSize: 30, fireDelay: 100, isAuto: true, isShotgun: false, canFire: true, damage: 15},
                {name: "Sniper", bulletSpeed: 12, reloadTime: 2500, inMag: 5, magSize: 5, fireDelay: 1000, isAuto: false, isShotgun: false, canFire: true, damage: 80},
                {name: "Shotgun", bulletSpeed: 6, reloadTime: 2000, inMag: 2, magSize: 2, fireDelay: 750, isAuto: false, isShotgun: true, canFire: true, damage: 20}];

    var currentGun = guns[0];

    var bullets = [];

    var particles = [];

    var shootSound = new Audio("./sound/shoot.wav");
    var deathSound = new Audio("./sound/die.wav");

    var mainSocket;
    var otherPlayers = [];
    var otherBullets = [];
    var currentLeaderboard = [];

    var lastLoop = new Date();
    var dt = 1;
    var fps = 60;

    var menuUI = document.getElementById("menuUI");
    var playerNameInput = document.getElementById("name");
    playerNameInput.onkeypress = function(e) {
        if (e.keyCode == "13")
            play();
    }
    playerNameInput.value = localStorage.getItem("lastUsedPlayerName");
    var autoSelect = document.getElementById("autoSelect");
    var sniperSelect = document.getElementById("sniperSelect");
    var shotgunSelect = document.getElementById("shotgunSelect");
    var playButton = document.getElementById("play");

    var tick = 0;

    loop();
    function loop() {
        var thisLoop = new Date();
        fps = 1000 / (thisLoop - lastLoop);
        dt = 60 / fps;
        lastLoop = thisLoop;

        background("rgb(20, 20, 20)");

        if (player.inGame) {
            HandlePlayer();

            tinyPlatforms.run(dt);
            camera.run();

            //gameCanvas.ctx.shadowBlur = 5 * camera.scaleX;
            for (var i = 0; i < tinyPlatforms.platforms.length; i++) {
                var p = tinyPlatforms.platforms[i];

                var color = p == player ? "red" : "white";
                //gameCanvas.ctx.shadowColor = color;
                rectangle(width / 2 + (p.x - camera.x) * camera.scaleX, height / 2 + (p.y - camera.y) * camera.scaleY, p.width * camera.scaleX, p.height * camera.scaleY, color);
            }
            gameCanvas.ctx.shadowColor = "transparent";

            topBulletLoop: for (var j = 0; j < bullets.length; j++) {
                var b = bullets[j];

                for (var co = 0; co < b.iterations; co++) {
                    b.run();

                    for (var i = 0; i < tinyPlatforms.platforms.length; i++) {
                        var p = tinyPlatforms.platforms[i];
                        if (p != player) {
                            if (b.checkCollision(p.x, p.y, p.width, p.height)) break topBulletLoop;
                        }
                    }
                }

                b.render();
            }

            for (var i = 0; i < particles.length; i++) particles[i].run();
        }

        for (var i = 0; i < otherPlayers.length; i++) {
            var p = otherPlayers[i].player;
            
            if (p.id != player.id) {
                rectangle(width / 2 + (p.x - 10 - camera.x) * camera.scaleX, height / 2 + (p.y - 15 - camera.y) * camera.scaleY, 50 * camera.scaleX, 5 * camera.scaleY, "red");
                rectangle(width / 2 + (p.x - 10 - camera.x) * camera.scaleX, height / 2 + (p.y - 15 - camera.y) * camera.scaleY, p.health / 2 * camera.scaleX, 5 * camera.scaleY, "limegreen");

                textAlign("center");
                text(p.name, width / 2 + (p.x + player.width / 2 - camera.x) * camera.scaleX, height / 2 + (p.y - 25 - camera.y) * camera.scaleY, 10 * camera.scaleX, "white");
                textAlign("left");

                rectangle(width / 2 + (p.x - camera.x) * camera.scaleX, height / 2 + (p.y - camera.y) * camera.scaleY, p.width * camera.scaleX, p.height * camera.scaleY, "red");
            }
        }

        for (var i = 0; i < otherBullets.length; i++) {
            var p = otherBullets[i];
            rectangle(width / 2 + (p.x - camera.x) * camera.scaleX, height / 2 + (p.y - camera.y) * camera.scaleY, 5 * camera.scaleX, 5 * camera.scaleY, "red");
        }

        if (player.inGame) {
            textAlign("right");
            text("Leaderboard", width - 20, 40, 20 * camera.scaleX, "white");
            for (var i = 0; i < currentLeaderboard.length; i++) {
                var l = currentLeaderboard[i];
                text(l.name + " - " + l.score, width - 20, 70 + i * 30, 15 * camera.scaleX, "white");
            }

            if (currentGun.inMag <= 0) {
                gameCanvas.ctx.save();
                gameCanvas.ctx.translate(width - 200, height - 32);
                gameCanvas.ctx.rotate(tick / 20);
                textAlign("center");
                text("↻", 0, 12, 40, "white");
                gameCanvas.ctx.restore();
            }

            text(currentGun.inMag + " / " + currentGun.magSize + " |||", width - 20, height - 20, 26 * camera.scaleX, "white");

            textAlign("left");
        }

        tick++;
        requestAnimationFrame(loop);
    }

    play = function() {
        localStorage.setItem("lastUsedPlayerName", playerNameInput.value);
        if (!isConnecting)
            connectToServer();
    }

    function connectToServer() {
        mainSocket = new WebSocket("wss://tc5550-mazeshooter.herokuapp.com/");
        playButton.innerHTML = "Connecting...";
        isConnecting = true;

        mainSocket.onerror = function() {
            playButton.innerHTML = "Can't connect!";
            isConnecting = false;
        }

        mainSocket.onopen = function() {
            player.x = Math.random() * 2000;
            player.y = Math.random() * 2000;
            player.name = playerNameInput.value || "Player_" + (Math.random() * 10000 >> 0);
            var gunIndex = 0;
            if (autoSelect.checked) gunIndex = 0;
            if (sniperSelect.checked) gunIndex = 1;
            if (shotgunSelect.checked) gunIndex = 2;
            currentGun = guns[gunIndex];
            player.inGame = true;
            isConnecting = false;

            menuUI.style.visibility = "hidden";        

            setInterval(function() {
                if (mainSocket.readyState == 1) {
                    mainSocket.send(JSON.stringify({type: "updateplayer", player: player}));
                }
            }, 50);

            setInterval(function() {
                if (mainSocket.readyState == 1) {
                    mainSocket.send(JSON.stringify({type: "getLeaderboard"}));
                }
            }, 1000);
        }

        mainSocket.onmessage = function(message) {
            var parsed = JSON.parse(message.data);
            if (parsed.type == "updateWorld") {
                tinyPlatforms.platforms = [];
                tinyPlatforms.nonstaticPlatforms = [];
                for (var i = 0; i < parsed.world.length; i++) {
                    var d = parsed.world[i];
                    tinyPlatforms.add(new Platform(d.x, d.y, d.width, d.height));
                }
                tinyPlatforms.add(player);
            }
            else if (parsed.type == "serverUpdate") {
                otherPlayers = parsed.players;
                otherBullets = parsed.bullets;
            }
            else if (parsed.type == "takeDamage") {
                player.health -= parsed.damage;
            }
            else if (parsed.type == "die") {
                player.health = 100;
                deathSound.play();
                player.x = Math.random() * 2000;
                player.y = Math.random() * 2000;
            }
            else if (parsed.type == "getLeaderboard") {
                currentLeaderboard = parsed.leaderboard;
            }
        }
    }

    function HandlePlayer() {
        if (keys["w"])
            player.vy = -player.speed;
        else if (keys["s"])
            player.vy = player.speed;
        else
            player.vy = 0;
        if (keys["a"])
            player.vx = -player.speed;
        else if (keys["d"])
            player.vx = player.speed;
        else
            player.vx = 0;

        rectangle(width / 2 + (player.x - 10 - camera.x) * camera.scaleX, height / 2 + (player.y - 15 - camera.y) * camera.scaleY, 50 * camera.scaleX, 5 * camera.scaleY, "red");
        rectangle(width / 2 + (player.x - 10 - camera.x) * camera.scaleX, height / 2 + (player.y - 15 - camera.y) * camera.scaleY, player.health / 2 * camera.scaleX, 5 * camera.scaleY, "limegreen");

        textAlign("center");
        text(player.name, width / 2 + (player.x + player.width / 2 - camera.x) * camera.scaleX, height / 2 + (player.y - 25 - camera.y) * camera.scaleY, 10 * camera.scaleX, "white");
        textAlign("left");

        camera.targetX = player.x;
        camera.targetY = player.y;
    }

    document.onmousedown = function(e) {
        fireGun();
    }

    document.addEventListener("touchstart", fireGun);

    function fireGun() {
        if (currentGun.canFire && player.inGame) {
            currentGun.canFire = false;

            currentGun.inMag--;
            if (currentGun.inMag <= 0) {
                setTimeout(function() {
                    currentGun.canFire = true;
                    currentGun.inMag = currentGun.magSize;
                }, currentGun.reloadTime);
            }
            else {
                setTimeout(function() {
                    currentGun.canFire = true;
                }, currentGun.fireDelay);
            }

            for (var i = -3 * currentGun.isShotgun; i < 2 * currentGun.isShotgun + 1; i++) {
                var a = Math.atan2(mouse.y - (height / 2 + player.height / 2), mouse.x - (width / 2 + player.width / 2)) + i * 0.05 + (Math.random() - 0.5) * 0.2 * currentGun.isShotgun;
                var vx = Math.cos(a) * currentGun.bulletSpeed;
                var vy = Math.sin(a) * currentGun.bulletSpeed;
                if (mainSocket) mainSocket.send(JSON.stringify({type: "addBullet", x: player.x + player.width / 2, y: player.y + player.height / 2, vx: vx, vy: vy, playerId: player.id, damage: currentGun.damage}));
                bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, vx, vy));
            }

            shootSound.currentTime = 0;
            shootSound.play();
        }
    }

    function Camera() {
        this.x = 0;
        this.y = 0;
        var max = Math.max(width, height);
        this.scaleX = 1.5 * (max / 1536);
        this.scaleY = 1.5 * (max / 1536);
        this.targetX = 0;
        this.targetY = 0;
        this.moveSpeed = 5;

        this.run = function() {
            this.x += (this.targetX - this.x) / this.moveSpeed * dt;
            this.y += (this.targetY - this.y) / this.moveSpeed * dt;
        }
    }

    function Bullet(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.iterations = 10;

        this.run = function() {
            this.x += this.vx / this.iterations * dt;
            this.y += this.vy / this.iterations * dt;
        }

        this.render = function() {
            rectangle(width / 2 + (this.x - camera.x) * camera.scaleX, height / 2 + (this.y - camera.y) * camera.scaleY, 5 * camera.scaleX, 5 * camera.scaleY, "red");
        }

        this.checkCollision = function(x, y, w, h) {
            if (this.x > x && this.x < x + w && this.y > y && this.y < y + h) {
                bullets.splice(bullets.indexOf(this), 1);
                
                for (var i = 0; i < 10; i++) {
                    var a = Math.random() * Math.PI * 2;
                    var vx = Math.cos(a) * Math.random() * 2;
                    var vy = Math.sin(a) * Math.random() * 2;
                    particles.push(new Particle(this.x, this.y, vx, vy, 5, -0.1, 20, [200, 200, 200]));
                }

                return true;
            }
            return false;
        }
    }

    function Particle(x, y, vx, vy, size, vsize, health, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.vsize = vsize;
        this.health = health;
        this.maxHealth = health;
        this.color = color;

        this.run = function() {
            rectangle(width / 2 + (this.x - camera.x) * camera.scaleX, height / 2 + (this.y - camera.y) * camera.scaleY, this.size * camera.scaleX, this.size * camera.scaleY, "rgba(" + this.color[0] + "," + this.color[1] + "," + this.color[2] + "," + (this.health / this.maxHealth) + ")");
    
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.size += this.vsize * dt;

            this.health -= dt;
            if (this.health <= 0) {
                particles.splice(particles.indexOf(this), 1);
            }
        }
    }
})();