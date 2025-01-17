import * as THREE from 'three';

const _VS = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 aColor;

varying vec4 vColor;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  vAngle = vec2(cos(angle), sin(angle));
  vColor = aColor;
}`;

const _FS = `
uniform sampler2D diffuseTexture;

varying vec4 vColor;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColor;
}`;

function getLinearSpline(lerp) {

    const points = [];
    const _lerp = lerp;

    function addPoint(t, d) {
        points.push([t, d]);
    }

    function getValueAt(t) {
        let p1 = 0;

        for (let i = 0; i < points.length; i++) {
            if (points[i][0] >= t) {
                break;
            }
            p1 = i;
        }

        const p2 = Math.min(points.length - 1, p1 + 1);

        if (p1 == p2) {
            return points[p1][1];
        }

        return _lerp(
            (t - points[p1][0]) / (
                points[p2][0] - points[p1][0]),
            points[p1][1], points[p2][1]);
    }
    return { addPoint, getValueAt };
}

function getSmokeParticleSystem(params) {

    let _emitParticles = true;
    const { camera, emitter, parent, rate, texture } = params;
    const uniforms = {
        diffuseTexture: {
            value: new THREE.TextureLoader().load(texture)
        },
        pointMultiplier: {
            value: window.innerHeight / (2.0 * Math.tan(30.0 * Math.PI / 180.0))
        }
    };
    const _material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: _VS,
        fragmentShader: _FS,
        // -------------------------------------------------------------------------------------------------------------
        // AHMED HAMID KADHUM

        // Blending entfernt:
        //blending: THREE.AdditiveBlending,

        // -------------------------------------------------------------------------------------------------------------
        depthTest: true,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });

    let _particles = [];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute([], 4));
    geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));

    const _points = new THREE.Points(geometry, _material);

    parent.add(_points);

    const alphaSpline = getLinearSpline((t, a, b) => {
        return a + t * (b - a);
    });

    alphaSpline.addPoint(0.0, 0.0);
    alphaSpline.addPoint(0.6, 1.0);
    alphaSpline.addPoint(1.0, 0.0);

    const colorSpline = getLinearSpline((t, a, b) => {
        const c = a.clone();
        return c.lerp(b, t);
    });

    // -----------------------------------------------------------------------------------------------------------------
    // AHMED HAMID KADHUM

    // eine einzige Farbe in allen Punkten:
    colorSpline.addPoint(0.0, new THREE.Color(0xFFFFFF));
    //colorSpline.addPoint(1.0, new THREE.Color(0xff8080));

    const sizeSpline = getLinearSpline((t, a, b) => {
        return a + t * (b - a);
    });

    // Mehrere Punkte wurden hinzugefügt, um dynamische Größen für einen realistischen
    // Rauch-Effekt hinter der Rakete zu erzeugen. Vorher waren nur 2 größen im Zeitintervall [0 - 1]
    sizeSpline.addPoint(0.0, 0.1);
    sizeSpline.addPoint(0.1, 0.2);
    sizeSpline.addPoint(0.2, 0.3);
    sizeSpline.addPoint(0.3, 0.4);
    sizeSpline.addPoint(0.4, 0.4);
    sizeSpline.addPoint(0.6, 0.5);
    sizeSpline.addPoint(0.8, 0.5);
    sizeSpline.addPoint(1.0, 0.6);
    sizeSpline.addPoint(1.2, 0.6);
    const radius = 0.5;

    // maxLife von 1.5 auf 10 erhöht damit mehr Rauch in der Szene zu sehen wird:
    const maxLife = 10;

    // maxSize von 3 auf .8 reduziert damit es schmaler wird:
    const maxSize = .8;

    let gdfsghk = 0.0;
    function _AddParticles(timeElapsed) {

        // _emitParticles wird auf false gestate, wenn das Emit-Objekt nicht mehr in der Szene ist
        // und der Effekt gestoppt werden muss:
        if (!_emitParticles) {
            return;
        }
    // -----------------------------------------------------------------------------------------------------------------

        gdfsghk += timeElapsed;
        const n = Math.floor(gdfsghk * rate);
        gdfsghk -= n / rate;
        for (let i = 0; i < n; i += 1) {
            const life = (Math.random() * 0.75 + 0.25) * maxLife;
            _particles.push({
                position: new THREE.Vector3(
                    (Math.random() * 2 - 1) * radius,
                    (Math.random() * 2 - 1) * radius,
                    (Math.random() * 2 - 1) * radius).add(emitter.position),
                size: (Math.random() * 0.5 + 0.5) * maxSize,
                colour: new THREE.Color(),
                alpha: 1.0,
                life: life,
                maxLife: life,
                rotation: Math.random() * 2.0 * Math.PI,
                rotationRate: Math.random() * 0.01 - 0.005,
                // -----------------------------------------------------------------------------------------------------
                // AHMED HAMID KADHUM

                // Richtung des Effekts geändert damit es hinter der Rakete geschossen wird:
                velocity: new THREE.Vector3(
                    0,
                    -25,
                    0
                ),

                // -----------------------------------------------------------------------------------------------------
            });
        }
    }

    function _UpdateGeometry() {
        const positions = [];
        const sizes = [];
        const colours = [];
        const angles = [];

        for (let p of _particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
            colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
            sizes.push(p.currentSize);
            angles.push(p.rotation);
        }

        geometry.setAttribute(
            'position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute(
            'size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute(
            'aColor', new THREE.Float32BufferAttribute(colours, 4));
        geometry.setAttribute(
            'angle', new THREE.Float32BufferAttribute(angles, 1));

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
        geometry.attributes.aColor.needsUpdate = true;
        geometry.attributes.angle.needsUpdate = true;
    }
    _UpdateGeometry();

    function _UpdateParticles(timeElapsed) {
        for (let p of _particles) {
            p.life -= timeElapsed;
        }

        _particles = _particles.filter(p => {
            return p.life > 0.0;
        });

        for (let p of _particles) {
            const t = 1.0 - p.life / p.maxLife;
            p.rotation += p.rotationRate;
            p.alpha = alphaSpline.getValueAt(t);
            p.currentSize = p.size * sizeSpline.getValueAt(t);
            p.colour.copy(colorSpline.getValueAt(t));

            p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

            const drag = p.velocity.clone();
            drag.multiplyScalar(timeElapsed * 0.1);
            drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
            drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
            drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
            p.velocity.sub(drag);
        }

        _particles.sort((a, b) => {
            const d1 = camera.position.distanceTo(a.position);
            const d2 = camera.position.distanceTo(b.position);

            if (d1 > d2) {
                return -1;
            }
            if (d1 < d2) {
                return 1;
            }
            return 0;
        });
    }

    function update(timeElapsed) {
        _AddParticles(timeElapsed);
        _UpdateParticles(timeElapsed);
        _UpdateGeometry();
    }

    // -----------------------------------------------------------------------------------------------------------------
    // AHMED HAMID KADHUM

    // eine Stop-Funktion wurde ergänzt um der Effekt jederzeit zu stoppen,
    // sonst würde weiterhin erzeugt werden, auch wenn das Objekt nicht mehr ind er Szene ist:
    function stop() {
        _emitParticles = false;
    }

    return { update, stop };

    // -----------------------------------------------------------------------------------------------------------------
}

export { getSmokeParticleSystem };