function GameCanvas(canvasId = "gc") {
    var canvas = this.canvas = document.getElementById(canvasId);
    updateWidth();
    var ctx = this.ctx = canvas.getContext("2d");

    window.mouse = {x: 0, y: 0};
    window.keys = [];

    window.clearScreen = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    window.background = function(color) {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    window.circle = function(x, y, radius, fillColor, strokeColor, lineWidth) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = lineWidth || 2;
        if (fillColor)
            ctx.fill();
        if (strokeColor)
            ctx.stroke();
    }

    window.ellipse = function(x, y, xradius, yradius, fillColor, strokeColor, lineWidth, rotation) {
        ctx.beginPath();
        ctx.ellipse(x, y, xradius, yradius, rotation || 0, 0, Math.PI * 2);
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = lineWidth || 2;
        if (fillColor)
            ctx.fill();
        if (strokeColor)
            ctx.stroke();
    }

    window.rectangle = function(x, y, w, h, fillColor, strokeColor, lineWidth) {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = lineWidth || 2;
        if (fillColor)
            ctx.fill();
        if (strokeColor)
            ctx.stroke();
    }

    window.line = function(x1, y1, x2, y2, color, lineWidth) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 2;
        ctx.stroke();
    }

    window.textAlign = function(mode) {
        ctx.textAlign = mode;
    }

    window.text = function(txt, x, y, font, fillColor, strokeColor, lineWidth) {
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = lineWidth || 2;
        ctx.font = !isNaN(font) ? font + "px Arial" : font;
        if (fillColor)
            ctx.fillText(txt, x, y);
        if (strokeColor)
            ctx.strokeText(txt, x, y);
    }

    window.getDistance = function(x1, y1, x2, y2) {
        var a = x1 - x2;
        var b = y1 - y2;
        return Math.sqrt(a * a + b * b);
    }

    document.onmousemove = e => {
        window.mouse.x = e.clientX;
        window.mouse.y = e.clientY;
    }

    document.ontouchmove = document.ontouchstart = e => {
        window.mouse.x = e.touches[0].pageX;
        window.mouse.y = e.touches[0].pageY;
    }

    document.onkeydown = document.onkeyup = e => window.keys[e.key] = window.keys[e.keyCode] = e.type.includes("d");

    function updateWidth() {
        canvas.width = window.width = window.innerWidth;
        canvas.height = window.height = window.innerHeight;
    }
    document.body.onresize = () => {updateWidth();};
}