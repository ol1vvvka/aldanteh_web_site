(() => {
    const vertexSource = `
        attribute vec2 a_position;
        void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;
    const fragmentSource = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_dark;
        uniform vec2 u_pointer;

        vec2 flow(vec2 p, float t) {
            return vec2(
                sin(p.y * 2.3 + t) + cos(p.x * 1.6 - p.y * 1.2 - t * 0.7),
                sin(p.x * 2.1 - t * 0.8) + cos(p.y * 1.7 + p.x * 1.3 + t * 0.6)
            ) * 0.22;
        }
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
            float t = u_time * 0.18;
            vec2 p = uv + flow(uv, t);
            vec2 q = p + flow(p * 1.4, -t * 0.65) * 0.55;
            float r = length(uv);
            float angle = atan(uv.y, uv.x);
            float edge = 0.64 + sin(angle * 3.0 + t * 0.55) * 0.08
                       + sin(angle * 5.0 - t * 0.4) * 0.045;
            float cloud = 1.0 - smoothstep(edge - 0.16, edge + 0.24, r);
            float field = sin(q.x * 3.4 + q.y * 2.3 + t * 0.3)
                        + cos(q.y * 3.7 - q.x * 1.8 - t * 0.4);
            float veil = sin(p.x * 2.2 - p.y * 3.0 + t * 0.5);
            float luminous = smoothstep(-0.7, 1.1, field);
            float overlap = smoothstep(-1.0, 1.0, veil);
            vec3 deep = vec3(0.04, 0.19, 0.83);
            vec3 blue = vec3(0.025, 0.43, 0.97);
            vec3 cyan = vec3(0.17, 0.67, 1.0);
            vec3 color = mix(deep, blue, luminous);
            color = mix(color, cyan, overlap * 0.40);
            float density = 0.48 + luminous * 0.17;
            gl_FragColor = vec4(color, cloud * density);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
        gl.deleteShader(shader);
        return null;
    }

    document.querySelectorAll('.core-object').forEach(object => {
        const canvas = document.createElement('canvas');
        canvas.className = 'fluid-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
        if (!gl) return;
        const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
        const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
        if (!vertex || !fragment) {
            if (vertex) gl.deleteShader(vertex);
            if (fragment) gl.deleteShader(fragment);
            return;
        }
        const program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
            gl.deleteProgram(program);
            return;
        }
        gl.useProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        const uniforms = Object.fromEntries(['resolution', 'time', 'dark', 'pointer'].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
        const finePointer = matchMedia('(pointer: fine)');
        const art = object.closest('.hero-art');
        let isVisible = false;
        let hasContext = true;
        let frame = 0;
        let previousTime = 0;
        let previousDraw = 0;
        let animationTime = 0;
        const notes = [...art.querySelectorAll('.core-note')].map(element => ({ element, x: 0, y: 0, tx: 0, ty: 0, left: 0, top: 0, width: 0, height: 0 }));
        art.classList.add('has-anchors');
        function measureNotes() {
            notes.forEach(note => {
                note.left = note.element.offsetLeft;
                note.top = note.element.offsetTop;
                note.width = note.element.offsetWidth;
                note.height = note.element.offsetHeight;
                note.x = note.y = note.tx = note.ty = 0;
                note.element.style.translate = '0px 0px';
            });
        }
        function updateNotes(delta) {
            const width = art.clientWidth;
            const height = art.clientHeight;
            notes.forEach(note => {
                const blend = 1 - Math.exp(-9 * delta);
                note.x += (note.tx - note.x) * blend;
                note.y += (note.ty - note.y) * blend;
                note.element.style.translate = `${note.x}px ${note.y}px`;
            });
        }
        const pointer = { x: 0, y: 0, velocityX: 0, velocityY: 0, targetX: 0, targetY: 0 };
        object.append(canvas);
        object.classList.add('has-fluid');

        function draw() {
            if (!hasContext) return;
            gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
            gl.uniform1f(uniforms.time, animationTime);
            gl.uniform1f(uniforms.dark, document.documentElement.dataset.theme === 'dark' ? 1 : 0);
            gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        function resize() {
            const resolution = Math.round(Math.min(object.clientWidth, 520) * Math.min(devicePixelRatio || 1, 1.25));
            canvas.width = Math.max(1, resolution);
            canvas.height = Math.max(1, resolution);
            gl.viewport(0, 0, canvas.width, canvas.height);
            measureNotes();
            updateNotes(0);
            draw();
        }
        function updatePointer(delta) {
            const response = 11;
            const decay = Math.exp(-response * delta);
            for (const [position, velocity, target] of [['x', 'velocityX', 'targetX'], ['y', 'velocityY', 'targetY']]) {
                const offset = pointer[position] - pointer[target];
                const momentum = (pointer[velocity] + response * offset) * delta;
                pointer[position] = pointer[target] + (offset + momentum) * decay;
                pointer[velocity] = (pointer[velocity] - response * momentum) * decay;
                if (Math.abs(pointer[position] - pointer[target]) < .00001 && Math.abs(pointer[velocity]) < .00001) {
                    pointer[position] = pointer[target];
                    pointer[velocity] = 0;
                }
            }
            art.style.setProperty('--tilt-x', `${pointer.x * 18}deg`);
            art.style.setProperty('--tilt-y', `${pointer.y * 12}deg`);
        }
        function tick(now) {
            const delta = Math.min((now - previousTime) / 1000, .05);
            previousTime = now;
            animationTime += delta;
            updatePointer(delta);
            updateNotes(delta);
            if (now - previousDraw >= 1000 / 30) {
                previousDraw = now;
                draw();
            }
            frame = requestAnimationFrame(tick);
        }
        function updatePlayback() {
            cancelAnimationFrame(frame);
            if (!hasContext || !isVisible || document.hidden || reducedMotion.matches) {
                draw();
                return;
            }
            previousTime = performance.now();
            frame = requestAnimationFrame(tick);
        }
        art.addEventListener('pointermove', event => {
            if (reducedMotion.matches || !finePointer.matches) return;
            const bounds = art.getBoundingClientRect();
            const mx = event.clientX - bounds.left;
            const my = event.clientY - bounds.top;
            notes.forEach(note => {
                const dx = note.left + note.width / 2 + note.x - mx;
                const dy = note.top + note.height / 2 + note.y - my;
                const distance = Math.hypot(dx, dy);
                if (distance > 150) return;
                const force = (1 - distance / 150) * 65;
                const nx = distance > 1 ? dx / distance : 1;
                const ny = distance > 1 ? dy / distance : 0;
                note.tx = Math.max(-note.left + 8, Math.min(art.clientWidth - note.left - note.width - 8, note.x + nx * force));
                note.ty = Math.max(-note.top + 8, Math.min(art.clientHeight - note.top - note.height - 8, note.y + ny * force));
            });
            pointer.targetX = (event.clientX - bounds.left) / bounds.width - .5;
            pointer.targetY = .5 - (event.clientY - bounds.top) / bounds.height;
        });
        function releasePointer() {
            pointer.targetX = 0;
            pointer.targetY = 0;
        }
        art.addEventListener('pointerleave', releasePointer);
        addEventListener('blur', releasePointer);
        reducedMotion.addEventListener('change', () => {
            releasePointer();
            pointer.x = pointer.y = pointer.velocityX = pointer.velocityY = 0;
            updatePointer(0);
            measureNotes();
            updateNotes(0);
        });
        canvas.addEventListener('webglcontextlost', event => {
            event.preventDefault();
            hasContext = false;
            cancelAnimationFrame(frame);
            object.classList.remove('has-fluid');
        });
        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(object);
        else addEventListener('resize', resize);
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                isVisible = entries[0].isIntersecting;
                updatePlayback();
            }).observe(object);
        } else isVisible = true;
        reducedMotion.addEventListener('change', updatePlayback);
        document.addEventListener('visibilitychange', updatePlayback);
        document.addEventListener('themechange', draw);
        resize();
        updatePlayback();
    });
})();
