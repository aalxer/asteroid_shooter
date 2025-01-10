import * as THREE from 'three'
import {MTLLoader, OBJLoader} from "three/addons";
import * as dat from "three/addons/libs/lil-gui.module.min";
import {getSmokeParticleSystem} from '../libs/getSmokeParticleSystem';
import {getExplosionParticleSystem} from '../libs/getExplosionParticleSystem';
import {getFireParticleSystem} from '../libs/getFireParticleSystem';
import {getLaserParticleSystem} from '../libs/getLaserParticleSystem';

// ---------------------------------------------------------------------------------------------------------------------
// MAIN CONTEXT
// ---------------------------------------------------------------------------------------------------------------------

// create context:
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
// Größe des Spielfelds wie das Display:
const fieldWidth = window.innerWidth;
const fieldHeight = window.innerHeight;
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
})

renderer.shadowMap.enabled = true;

// Orthogonale Kamera ist ideal füe dieses Spiel, weil die Tiefe in der Darstellung irrelevant ist
// und wir nur eine zum Spielfeld orthogonale Ansicht benötigen :
const camera = new THREE.OrthographicCamera(
    -fieldWidth / 2,
    fieldWidth / 2,
    fieldHeight / 2,
    -fieldHeight / 2,
    0.1,
    1000
);
// Camera auf z=800 platzieren, alle anderen Objekte werden auf z=150 platziert:
camera.position.set(0, 0, 800);

// Plane für den Hintergrund erstellen, um flexible Animationen und Effekte unabhängig
// vom restlichen Spielfeld zu ermöglichen:
const textureLoader = new THREE.TextureLoader();
const bgPlaneTextureMap = textureLoader.load('../assets/textures/starsTexture.jpg', () => {
    console.log('Texture loaded successfully');

}, undefined, (err) => {
    console.error('Error loading texture', err);
});

// Der Hintergrund bewegt sich in -y und wiederholt sich nahtlos durch RepeatWrapping,
// um das gesamte Display abzudecken:
bgPlaneTextureMap.wrapS = THREE.RepeatWrapping;
bgPlaneTextureMap.wrapT = THREE.RepeatWrapping;

// Die optimale Anzahl an Wiederholungen der Textur berechnen, sodass sie sich gleichmäßig
// über die gesamte Plane erstreckt, ohne gestreckt oder verzerrt zu werden, basierend auf der Displaygröße:
bgPlaneTextureMap.repeat.set(
    fieldWidth / 300,
    fieldHeight / 300
);
bgPlaneTextureMap.minFilter = THREE.LinearFilter;
bgPlaneTextureMap.magFilter = THREE.LinearFilter;

const bgPlaneGeometry = new THREE.PlaneGeometry(
    fieldWidth,
    fieldHeight
);

const bgPlaneMaterial = new THREE.MeshStandardMaterial({
    map: bgPlaneTextureMap,
    side: THREE.DoubleSide
});

const backgroundPlane = new THREE.Mesh(bgPlaneGeometry, bgPlaneMaterial);
backgroundPlane.receiveShadow = true;
// plane hinter allen objekten platzieren, alle anderen sind ab z=150 platziert:
backgroundPlane.position.z = -50;
scene.add(backgroundPlane);

// ---------------------------------------------------------------------------------------------------------------------
// LIGHTS
// ---------------------------------------------------------------------------------------------------------------------

// Allgemeine Beleuchtung für die gesamte Szene:
const ambientLight = new THREE.AmbientLight(0xffffff, 5);
scene.add(ambientLight);

// Lichtquelle für gezielte Beleuchtung und Schatten, um Details der Objekte hervorzuheben:
const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
directionalLight.position.set(65, 240, 800);
directionalLight.target = backgroundPlane;
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -fieldWidth / 2;
directionalLight.shadow.camera.right = fieldWidth / 2;
directionalLight.shadow.camera.top = fieldHeight / 2;
directionalLight.shadow.camera.bottom = -fieldHeight / 2;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 1500;
scene.add(directionalLight);
scene.add(directionalLight.target);

// (Spotlight für die Scene hat leider nicht geklappt, alle mögliche Konfigurationen wurden bereits probiert)
const spotLight = new THREE.SpotLight(0xffffff, 20, 300);
spotLight.position.set(50, 100, 150);
spotLight.castShadow = true;
scene.add(spotLight);

// Helpers (fürs Testen):
/*
const spotLightHelper = new THREE.SpotLightHelper(spotLight)
scene.add(spotLightHelper)
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 30)
scene.add(directionalLightHelper);
const axesHelper = new THREE.AxesHelper(300);
scene.add(axesHelper);
 */

// ---------------------------------------------------------------------------------------------------------------------
// SPACESHIP OBJECT
// ---------------------------------------------------------------------------------------------------------------------

let spaceshipObj = null;
const spaceshipLoader = new OBJLoader();
const spaceshipMtlLoader = new MTLLoader();
const spaceshipSize = .5;
// Steuerung des Raumschiffs wird erst aktiviert, wenn es vollständig geladen ist
// und deaktiviert, wenn er explodiert wurde:
let spaceshipControlsEnabled = false;
const spaceshipYPos = (-fieldHeight / 2) + 50;

spaceshipMtlLoader.load('../assets/RaiderStarship.mtl', (materials) => {

    console.log(".mtl File for Spaceship was loaded successfully !")
    materials.preload();
    // Die geladenen Materialien dem Loader zugewiesen, um sie auf das Objekt anzuwenden:
    spaceshipLoader.setMaterials(materials);

    // Spaceship mit den geladenen Materialien laden:
    spaceshipLoader.load('../assets/RaiderStarship.obj', (spaceship) => {

        console.log("Spaceship Object was loaded successfully !")

        spaceship.position.set(0, spaceshipYPos, 150);
        spaceship.scale.set(spaceshipSize, spaceshipSize, spaceshipSize);
        spaceship.rotation.set(0.3, 3.13, 0);
        // Alle Meshes im Spaceship werden so konfiguriert, dass sie Schatten werfen:
        spaceship.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });

        // Hinzufügen eines Spotlights, um das Raumschiff auszustrahlen (hat leider auch nicht funktioniert):
        const spotLight = new THREE.SpotLight(
            0xffffff,
            10,
            200
        );
        spotLight.castShadow = true;
        spotLight.position.set(0, 0, 0);
        spaceship.add(spotLight);
        //const spotLightHelper = new THREE.CameraHelper(spotLight.shadow.camera);
        //scene.add(spotLightHelper);

        scene.add(spaceship);
        spaceshipControlsEnabled = true;
        // Spaceship in der globalen Variable für späteren Zugriff speichern:
        spaceshipObj = spaceship;

        // Maus Steuerung:
        document.addEventListener('mousemove', (event) => {
            moveUsingMaus(event, spaceship);
        });

        // Tastatur Steuerung:
        document.addEventListener('keydown', (event) => {
            moveUsingKeyboard(event, spaceship);
        });

        // Schießen, bei einem Mausklick wird das Raumschiff feuern:
        document.addEventListener('click', (event) => {
            if (!isGameOver) {
                shoot(spaceship);
            }
        });

        // GUI-Controller für das manuelle Anpassen (zum Testen);
        spaceshipFolder.add(spaceshipObj.rotation, 'x', 0, Math.PI * 2).name('Rotate X');
        spaceshipFolder.add(spaceshipObj.rotation, 'y', 0, Math.PI * 2).name('Rotate Y');
        spaceshipFolder.add(spaceshipObj.rotation, 'z', 0, Math.PI * 2).name('Rotate Z');
    });
})

// ---------------------------------------------------------------------------------------------------------------------
// ENEMIES OBJECTS (Blade-Object)
// ---------------------------------------------------------------------------------------------------------------------

const enemyObjLoader = new OBJLoader();
const enemyMtlLoader = new MTLLoader();
const bladeSize = 45;

/**
 * Erstellt ein Enemy-Objekt (Blade) und setzt ihm einen Interval zum schiessen
 */
function createEnemyObject() {
    enemyMtlLoader.load('../assets/Blade.mtl', (materials) => {

        materials.preload();
        // Die geladenen Materialien dem Loader zugewiesen, um sie auf das Objekt anzuwenden:
        enemyObjLoader.setMaterials(materials);

        // Objekt mit den geladenen Materialien laden:
        enemyObjLoader.load('../assets/Blade.obj', (blade) => {

            // Die Position des Enemy-Objekts wird auf einem zufaelligen X-Wert gesetzt, der innerhalb des sichtbaren Bereichs des Displays liegt,
            // Y-Position wird auf den oberen Rand des Displays gesetzt, damit das Objekt von oben nach unten faellt:
            blade.position.set(
                Math.random() * fieldWidth - fieldWidth / 2,
                fieldHeight,
                150
            );
            blade.scale.set(bladeSize, bladeSize, bladeSize);
            blade.rotation.set(-100, 0, 0)
            blade.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            scene.add(blade);
            enemiesList.push(blade);

            // Ein Intervall wird gesetzt, um alle 5 Sekunden einen Schuss vom Objekt abzufeuern:
            const enemyInterval = setInterval(() => {

                // Interval stoppen, wenn das Spiel zu Ende ist:
                if (isGameOver) {
                    clearInterval(enemyInterval);
                    console.log("Enemy Shooting Intervall gestoppt.");
                    return;
                }

                // Das Objekt darf schießen, solange es im Spiel(Display) ist:
                if (enemiesList.includes(blade)) {
                    enemyShoot(blade);
                }
            }, 5000);

        });
    })
}

/**
 * Bewegt alle Enemy-Objekte im Spiel nach unten und entfernt sie, wenn sie das Display verlassen und
 * ueberprüft auf Kollisionen mit dem Spaceship und beendet das Spiel bei Kollision
 */
function animateEnemiesObjects() {

    for (let i = 0; i < enemiesList.length; i++) {

        const obj = enemiesList[i];

        // Auf Kollisionen mit dem Spaceship ueberpruefen und das Spiel bei Kollision beenden:
        if (!isGameOver && obj.position.y <= kollisionCheckingPosition && checkCollision(spaceshipObj, obj)) {
            handleGameOver();
        }

        // Das Objekt in -y bewegen, solange er im sichtbaren Bereich ist, sonst wird gelöscht:
        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= .5;
            obj.rotation.y += 0.01;
        } else {
            scene.remove(obj);
            enemiesList.splice(i, 1);
            i--;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// COINS OBJECTS
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Erzeugt ein Muenzobjekt an zufaelliger Position
 */
function createCoinsObject() {

    const coinsObjectsLoader = new OBJLoader();
    const coinsObjectsMtlLoader = new MTLLoader();

    coinsObjectsMtlLoader.load('../assets/Coin.mtl', (material) => {

        material.preload();
        coinsObjectsLoader.setMaterials(material);

        coinsObjectsLoader.load('../assets/Coin.obj', (coin) => {

            // Die Position des Objekts wird auf einem zufaelligen X-Wert gesetzt, der innerhalb des sichtbaren
            // Bereichs des Displays liegt, Y-Position wird auf den oberen Rand des Displays gesetzt:
            coin.position.set(
                Math.random() * fieldWidth - fieldWidth / 2,
                fieldHeight / 2,
                150
            );
            coin.scale.set(15, 15, 15);
            scene.add(coin);
            coinsList.push(coin);

        });
    });
}

/**
 * Bewegt die Muenzen nach unten, dreht sie und entfernt sie, wenn sie den Bildschirm verlassen
 * oder das Spaceship treffen
 */
function animateCoinsObjects() {
    for (let i = 0; i < coinsList.length; i++) {
        const obj = coinsList[i];

        // Muenze in -y bewegen und rotieren, solange sie im sichtbaren Bereich sind, sonst entfernen:
        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= 2;
            obj.rotation.x += 0.05;
            obj.rotation.y += 0.05;
            obj.rotation.z += 0.05;
        } else {
            scene.remove(obj);
            coinsList.splice(i, 1);
            i--;
        }

        // Bei Collision mit dem Spaceship das Objekt entfernen und Coins-Zaehler hochzaehlen:
        if (!isGameOver && obj.position.y <= kollisionCheckingPosition && checkCollision(obj, spaceshipObj)) {
            scene.remove(obj);
            coinsList.splice(i, 1);
            i--;
            coinsCounter++;
            updateScore();
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// MISSILES OBJECTS
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Erstellt ein Laser für die uebergebene Rakete
 * @param missile: Rakete die einen Laser bekommen soll
 */
function createLaser(missile) {

    // Laser-Form definieren:
    const laserGeometry = new THREE.CylinderGeometry(
        2.5,
        2.5,
        fieldHeight * 2,
        10
    );
    const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        emissive: 0xff4500,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    laser.position.set(missile.position.x, fieldHeight / 2, -1);

    scene.add(laser);
    // Animation fuer den Blink-Effekt des Laser starten:
    startLaserBlink(laserMaterial);

    // Setzt einen Timeout, um den Laser nach 16 Sekunden aus der Szene zu entferne:
    setTimeout(() => {
        scene.remove(laser);
    }, 16000);
}

/**
 * Erzeugt Animation fuer Laser
 * @param laserMaterial: Material die animiert werden
 */
function startLaserBlink(laserMaterial) {

    const blinkSpeed = 0.02;
    let opacity = laserMaterial.opacity; // initiale Opazitaet des Lasers
    let direction = -1; // bestimmt, ob die Opazitaet erhoeht oder verringert wird

    function animateOpacity() {
        opacity += direction * blinkSpeed; // erhoeht oder verringert die Opazitaet

        // Wenn eine Grenze erreicht ist (0.2 oder 0.8), wird die Richtung umgekehrt
        // (die Richtung bestimmt, ob die Opazitaet erhoeht oder verringert wird):
        if (opacity <= 0.2 || opacity >= 0.8) {
            direction *= -1;
        }
        laserMaterial.opacity = opacity; // setzt die neue Opazitaet des Lasers
    }

    // Blink-Effekt alle 16ms wiederholen:
    setInterval(animateOpacity, 16);
}

/**
 * erzeugt eine Rakete und fuegt ihr Smoke-Effect hinzu
 */
function createMissilesObject() {

    const missilesObjectsLoader = new OBJLoader();
    const missilesObjectsMtlLoader = new MTLLoader();

    missilesObjectsMtlLoader.load('../assets/Missile.mtl', (material) => {

        material.preload();
        missilesObjectsLoader.setMaterials(material);

        missilesObjectsLoader.load('../assets/Missile.obj', (missile) => {

            // Die Position der Rakete wird auf einem zufaelligen X-Wert gesetzt, der innerhalb des sichtbaren Bereichs des Displays liegt,
            // Y-Position wird auf den oberen Rand des Displays gesetzt, damit die Rakete von oben nach unten faellt:
            missile.position.set(
                Math.random() * fieldWidth - fieldWidth / 2,
                fieldHeight,
                150
            );

            // der Rakete einen Laser hinzufuegen:
            createLaser(missile);

            missile.scale.set(23, 23, 23);
            missile.rotation.z = Math.PI;
            missile.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            missileObjects.push(missile);
            // einen Rauch-Effekt hinzufügen, der von hinten geschossen wird:
            getSmokeEffect(missile);
            scene.add(missile);

        });
    });
}

/**
 * Bewegt die Rakete nach unten und entfernt sie, wenn sie den Bildschirm verlaesst.
 * Checkt auf Kollisionen mit dem Spaceship
 */
function animateMissiles() {

    for (let i = 0; i < missileObjects.length; i++) {

        const obj = missileObjects[i];
        // Auf Kollisionen mit dem Spaceship ueberpruefen und das Spiel bei Kollision beenden:
        if (!isGameOver && obj.position.y <= (spaceshipYPos + 300) && checkCollision(spaceshipObj, obj)) {
            console.log("Spaceship was hit by a Missile");
            handleGameOver();
        }

        // Das Objekt in -y bewegen, solange er im sichtbaren Bereich ist, sonst wird geloescht:
        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= 1.4;
        } else {
            scene.remove(obj);
            missileObjects.splice(i, 1);
            i--;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// GAME LOGIC
// ---------------------------------------------------------------------------------------------------------------------

const speed = 0.005;
const kollisionCheckingPosition = spaceshipYPos + 50;
let isGameOver = false;
let timer = 0;
let killsCounter = 0;
let coinsCounter = 0;
let enemiesList = [];
let coinsList = [];
let enemyShotsList = [];
let missileObjects = [];

function updateScore() {
    let element = document.getElementById('coinsState');
    element.innerText = coinsCounter;
}

function moveUsingKeyboard(event, target) {

    if (!spaceshipControlsEnabled) return

    const moveSpeed = 10;
    if (target) {
        if (event.key === 'ArrowLeft') {
            target.position.x -= moveSpeed;
        } else if (event.key === 'ArrowRight') {
            target.position.x += moveSpeed;
        }
        constrainObjectPosition(target);
    }
}

function moveUsingMaus(event, target) {

    if (!spaceshipControlsEnabled) return

    let mouseX = 0;
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    if (target) {
        target.position.x = mouseX * fieldWidth / 2;
        constrainObjectPosition(target);
    }
}

function shoot(spaceship) {

    const color = new THREE.Color(0xff9e13);
    const shot = createBullet(color, 18);
    shot.position.set(spaceship.position.x, spaceship.position.y, spaceship.position.z);
    getFireEffect(shot);
    scene.add(shot);

    const animateShot = () => {

        shot.position.y += 10;
        if (shot.position.y < 1000) {
            requestAnimationFrame(animateShot);
        } else {
            scene.remove(shot);
        }

        for (let i = 0; i < enemiesList.length; i++) {
            let enemy = enemiesList[i];

            if (checkCollision(shot, enemy)) {
                killsCounter += 1;
                let element = document.getElementById('killsState');
                element.innerText = killsCounter;
                scene.remove(enemy);
                enemiesList.splice(i, 1);
                i--;
            }
        }

    };

    animateShot();
}

function enemyShoot(blade) {

    const color = new THREE.Color(0x3dbcff);
    const shot = createBullet(color, 10);
    const startShootPosition = (fieldHeight / 2) - 50;
    shot.position.set(blade.position.x, blade.position.y, blade.position.z);
    let laser = getLaserEffect(shot);
    blade.add(shot);
    scene.add(shot);

    const animateShot = () => {

        if (!isGameOver && shot.position.y <= kollisionCheckingPosition && checkCollision(spaceshipObj, shot)) {
            console.log("Spaceship was shot by a Blade");
            handleGameOver();
        }

        shot.position.y -= 10;

        if (shot.position.y > (-fieldHeight / 2) && blade.position.y < startShootPosition) {
            requestAnimationFrame(animateShot);

        } else {
            laser.stop();
            scene.remove(shot);
            blade.remove(shot);
        }
    }

    animateShot();
}

function handleGameOver() {

    if (isGameOver) return

    console.log("Game Over !");
    isGameOver = true;
    spaceshipControlsEnabled = false;
    getExplosionEffect(spaceshipObj);
    /*
    spaceshipObj.traverse((child) => {
        if (child.isMesh) {
            child.material.color.setHex(0x412200);
        }
    });

     */

    setTimeout(() => {

        console.log("Cleaning Scene and display GameOver-Page .. ");

        scene.remove(spaceshipObj);
        spaceshipObj = null;

        // GUI GameOver Page:
        const statebarContainer = document.getElementById('statebarContainer');
        statebarContainer.classList.add('hideContainer');

        const gameOverContainer = document.getElementById('gameOverContainer');
        gameOverContainer.classList.add('displayContainer');

        const scoreElement = document.getElementById('scoreGameOverPage');
        const coinsElement = document.getElementById('coinsGameOverPage');
        const killsElement = document.getElementById('killsGameOverPage');

        scoreElement.innerText = timer;
        coinsElement.innerText = coinsCounter;
        killsElement.innerText = killsCounter;
    }, 3000);
}

function constrainObjectPosition(object) {

    if (object) {
        const boundingBox = new THREE.Box3().setFromObject(object);
        const width = boundingBox.max.x - boundingBox.min.x;
        const minX = -window.innerWidth / 2 + width / 2;
        const maxX = window.innerWidth / 2 - width / 2;

        if (object.position.x < minX) {
            object.position.x = minX;
        } else if (object.position.x > maxX) {
            object.position.x = maxX;
        }
    }
}

function checkCollision(obj1, obj2) {

    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);

    return box1.intersectsBox(box2);
}

function createBullet(color, size) {

    const sphereGeometry = new THREE.SphereGeometry(
        size
    );

    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.8,
        roughness: 0.5
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    return sphere;
}

function startAnimateBackground() {

    bgPlaneTextureMap.offset.y += speed;

    if (bgPlaneTextureMap.offset.x <= -1) {
        bgPlaneTextureMap.offset.x = 0;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(startAnimateBackground);
}

const startTimer = () => {
    const interval = setInterval(() => {

        if (isGameOver) {
            clearInterval(interval);
            console.log('Timer gestoppt, is GameOver');
        }

        timer++;
        let element = document.getElementById('timer');
        element.innerText = timer;
    }, 50);

};

function startCoinsCreation() {
    console.log("Coins Creation started .. ");
    setInterval(() => {
        createCoinsObject();
    }, Math.random() * 300 + 1000);
}

function startEnemiesCreation() {
    console.log("Enemies Creation started .. ");
    setInterval(() => {
        createEnemyObject();
    }, 5000);
}

function startMissilesCreation() {
    console.log("Missiles Creation started .. ");
    setInterval(() => {
        createMissilesObject();
    }, Math.random() * 1000 + 16000);
}

startAnimateBackground();
startTimer();
startCoinsCreation();
startEnemiesCreation();
startMissilesCreation();

// ---------------------------------------------------------------------------------------------------------------------
// PARTICLE SYSTEM
// ---------------------------------------------------------------------------------------------------------------------

function getSmokeEffect(object) {

    let smokeEffectContext = {
        camera,
        emitter: object,
        parent: scene,
        rate: 8,
        texture: '../assets/img/smoke.png'
    }

    const smokeEffect = getSmokeParticleSystem(smokeEffectContext);

    const animateEffect = () => {

        if (!missileObjects.includes(object)) {
            smokeEffect.stop();
        }
        requestAnimationFrame(animateEffect);
        smokeEffect.update(0.016);
    }

    animateEffect();
}

function getExplosionEffect(object) {

    let ExplosionEffectContext = {
        camera,
        emitter: object,
        parent: scene,
        rate: 20,
        texture: '../assets/img/explosion.png'
    }

    const explosionEffect = getExplosionParticleSystem(ExplosionEffectContext);

    const animateEffect = () => {

        if (spaceshipObj == null) {
            explosionEffect.stop();
        }
        requestAnimationFrame(animateEffect);
        explosionEffect.update(0.016);
    }

    animateEffect();
}

function getFireEffect(object) {

    let FireEffectContext = {
        camera,
        emitter: object,
        parent: scene,
        rate: 70,
        texture: '../assets/img/fire.png'
    }

    const fireEffect = getFireParticleSystem(FireEffectContext);

    const animateEffect = () => {

        if (spaceshipObj == null) {
            fireEffect.stop();
        }
        requestAnimationFrame(animateEffect);
        fireEffect.update(0.016);
    }

    animateEffect();
}

function getLaserEffect(object) {

    let laserEffectContext = {
        camera,
        emitter: object,
        parent: scene,
        rate: 20,
        texture: '../assets/img/laser.png'
    }

    const laserEffect = getLaserParticleSystem(laserEffectContext);

    const animateEffect = () => {

        if (spaceshipObj == null) {
            laserEffect.stop();
        }
        requestAnimationFrame(animateEffect);
        laserEffect.update(0.016);
    }

    animateEffect();

    return laserEffect;
}

// ---------------------------------------------------------------------------------------------------------------------
// RENDER
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Passt die Größe des Canvas an die Displaygröße an
 */
function resizeCanvasToWindow() {

    const canvas = renderer.domElement;
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Überprüft, ob die aktuelle Größe mit der Fenstergröße übereinstimmt:
    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

/**
 * Rendert das Canvas-Objekt und wird die in jedem Frame aufgerufen.
 * Sie enthält alle Updates für das Rendering und die Animation der Objekte in der Scene
 */
function draw() {

    if (resizeCanvasToWindow()) {
        const canvas = renderer.domElement;
        // korrekte Ansicht basierend auf der Fenstergröße:
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    animateEnemiesObjects();
    animateCoinsObjects();
    animateMissiles();
    //spotLightHelper.update();
    requestAnimationFrame(draw);
}

// die draw() wird kontinuierlich wieder aufgerufen und die Animation läuft in einer Schleife:
requestAnimationFrame(draw);

// ---------------------------------------------------------------------------------------------------------------------
// GUI CONTROLLER (zum Testen)
// ---------------------------------------------------------------------------------------------------------------------

const gui = new dat.GUI();
const spaceshipFolder = gui.addFolder('Spaceship');
const directionalLightFolder = gui.addFolder('Directional Light');
const spotLightFolder = gui.addFolder('Spotlight');
const ambientLightFolder = gui.addFolder('Ambient Light');

directionalLightFolder.add(directionalLight.position, 'x', -500, 800);
directionalLightFolder.add(directionalLight.position, 'y', -500, 800);
directionalLightFolder.add(directionalLight.position, 'z', -500, 800);
directionalLightFolder.add(directionalLight, 'intensity', 0, 50);
spotLightFolder.add(spotLight.position, 'x', -500, 800);
spotLightFolder.add(spotLight.position, 'y', -500, 800);
spotLightFolder.add(spotLight.position, 'z', -500, 800);
spotLightFolder.add(spotLight, 'intensity', 0, 50);
ambientLightFolder.add(ambientLight, 'intensity', 0, 50);

spaceshipFolder.open();