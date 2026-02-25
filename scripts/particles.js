(function() {
    const container = document.getElementById('particle-bg');
    if (!container) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    container.appendChild(canvas);

    let width, height;
    let particles = [];
    const particleCount = 60;
    const connectionDistance = 120;

    // Colors
    const accentColor = { r: 245, g: 158, b: 11 }; // #F59E0B
    const whiteColor = { r: 255, g: 255, b: 255 };

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2.5 + 1.5;
            this.isAccent = Math.random() < 0.2;
            this.baseAlpha = Math.random() * 0.4 + 0.6;
            this.pulseOffset = Math.random() * Math.PI * 2;
        }

        update(time) {
            const pulse = Math.sin(time * 0.002 + this.pulseOffset) * 0.2 + 0.8;
            this.alpha = this.baseAlpha * pulse;

            this.x += this.vx;
            this.y += this.vy;

            // Wrap around edges
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            const color = this.isAccent ? accentColor : whiteColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${this.alpha})`;
            ctx.fill();

            if (this.isAccent) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.radius * 3
                );
                gradient.addColorStop(0, `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.3)`);
                gradient.addColorStop(1, `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    const opacity = (1 - dist / connectionDistance) * 0.5;
                    const useAccent = particles[i].isAccent || particles[j].isAccent;
                    const color = useAccent ? accentColor : whiteColor;

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
                    ctx.lineWidth = useAccent ? 1.5 : 1;
                    ctx.stroke();
                }
            }
        }
    }

    function resize() {
        width = container.offsetWidth;
        height = container.offsetHeight;

        if (width === 0 || height === 0) return;

        canvas.width = width;
        canvas.height = height;

        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate(time) {
        if (width === 0 || height === 0) {
            resize();
        }

        ctx.clearRect(0, 0, width, height);
        drawConnections();

        particles.forEach(p => {
            p.update(time);
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate(0);
})();
