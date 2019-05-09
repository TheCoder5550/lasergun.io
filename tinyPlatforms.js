function TinyPlatforms() {
    this.platforms = [];
    this.nonstaticPlatforms = [];
    this.gravity = .3;

    this.add = platform => {
        if (!platform.isStatic) this.nonstaticPlatforms.push(platform);
        this.platforms.push(platform);
    }

    this.run = function(dt) {
        for (var i = 0; i < this.nonstaticPlatforms.length; i++) {
            var p1 = this.nonstaticPlatforms[i];
            p1.x += p1.vx * dt;
            p1.y += p1.vy * dt;
            p1.vy += this.gravity * dt;
            p1.isTouchingGround = false;

            for (var j = 0; j < this.platforms.length; j++) {
                var p = this.platforms[j];
                if (p1 != p) {
                    if (p1.x + p1.width > p.x && p1.x < p.x + p.width && p1.y + p1.height > p.y && p1.y < p.y + p.height) {
                        var edges = [{x: p.x + 1, y: p.y},
                                    {x: p.x + p.width - 1, y: p.y},
                                    {x: p.x + p.width, y: p.y + 1},
                                    {x: p.x + p.width, y: p.y + p.height - 1},
                                    {x: p.x + 1, y: p.y + p.height},
                                    {x: p.x + p.width - 1, y: p.y + p.height},
                                    {x: p.x, y: p.y + 1},
                                    {x: p.x, y: p.y + p.height - 1}];

                        var closestDistance = Infinity;
                        var closestEdge = -1;

                        for (var k = 0; k < edges.length; k++) {
                            var e = edges[k];
                            var a = p1.x + p1.width / 2 - e.x;
                            var b = p1.y + p1.height / 2 - e.y;
                            var d = a * a + b * b; //We don't need to square this because we just need to get largest distance
                            if (d < closestDistance) {
                                closestDistance = d;
                                closestEdge = k / 2 >> 0;
                            }
                        }

                        !(closestEdge % 2) && (p1.vy = 0);
                        !(closestEdge + 1 % 2) && (p1.vx = 0);

                        switch (closestEdge) {
                            case 0:
                                p1.isTouchingGround = true;
                                p1.y = p.y - p1.height;
                                break;
                            case 1:
                                p1.x = p.x + p.width;
                                if (!p.isStatic) p.x--;
                                break;
                            case 2:
                                p1.y = p.y + p.height;
                                break;
                            case 3:
                                p1.x = p.x - p1.width;
                                if (!p.isStatic) p.x++;
                                break;
                        }
                    }
                }
            }
        }
    }

    this.getPlatforms = () => this.platforms;
}

function Platform(x, y, w, h, isStatic = true) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = w;
    this.height = h;
    this.isStatic = isStatic;
    this.isTouchingGround = false;
}