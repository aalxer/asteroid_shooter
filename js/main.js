import * as THREE from 'three'
import {FBXLoader, MTLLoader, OBJLoader} from "three/addons";

// ---------------------------------------------------------------------------------------------------------------------
// MAIN CONTEXT
// ---------------------------------------------------------------------------------------------------------------------

// create context:
const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
})
const scene = new THREE.Scene();
const fieldWidth = window.innerWidth;
const fieldHeight = window.innerHeight;

renderer.shadowMap.enabled = true;

const camera = new THREE.OrthographicCamera(
    -fieldWidth / 2,
    fieldWidth / 2,
    fieldHeight / 2,
    -fieldHeight / 2,
    0.1,
    1000
);
camera.position.set(0, 0, 200);

// create Plane für den Hintergrund:
const textureLoader = new THREE.TextureLoader();
const bgPlaneTextureMap = textureLoader.load('../assets/textures/starsTexture.jpg', () => {
    console.log('Texture loaded successfully');

}, undefined, (err) => {
    console.error('Error loading texture', err);
});

bgPlaneTextureMap.wrapS = THREE.RepeatWrapping;
bgPlaneTextureMap.wrapT = THREE.RepeatWrapping;
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
    side: THREE.DoubleSide,
    //color: 0x999999
});

const backgroundPlane = new THREE.Mesh(bgPlaneGeometry, bgPlaneMaterial);
backgroundPlane.receiveShadow = true;

scene.add(backgroundPlane);

// ---------------------------------------------------------------------------------------------------------------------
// LIGHTS
// ---------------------------------------------------------------------------------------------------------------------

const ambientLight = new THREE.AmbientLight(0xffffff, 5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 30);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 5, 100);
pointLight.position.set(0, 0, 0);
pointLight.layers.disable(0);
scene.add(pointLight);

// ---------------------------------------------------------------------------------------------------------------------
// SPACESHIP
// ---------------------------------------------------------------------------------------------------------------------

let spaceshipObj = null;
const spaceshipLoader = new OBJLoader();
const spaceshipMtlLoader = new MTLLoader();

spaceshipMtlLoader.load('../assets/Spaceship.mtl', (materials) => {

    console.log("Design (.mtl) for Spaceship was loaded successfully !")
    materials.preload();
    spaceshipLoader.setMaterials(materials);

    spaceshipLoader.load('../assets/Spaceship.obj', (spaceship) => {

        console.log("Spaceship was loaded successfully !")

        const yPos = (-fieldHeight / 2) + 100;
        spaceship.position.set(0, yPos, 150);
        spaceship.scale.set(1, 1, 1);
        spaceship.rotation.set(0, 0, 0)
        spaceship.renderOrder = 1;
        spaceship.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });

        // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        // Lichtquelle für Segment-3:
        const spotLight = new THREE.SpotLight(
            0xffffff,
            2,
            200
        );
        spotLight.castShadow = true;
        // Spotlight an die Seg3-Spitze setzen (y-achse):
        spotLight.position.set(0, yPos, 150);
        // Spotlight als ChildElement von Seg3 (für automatische Transformation):
        spaceship.add(spotLight);

        // Spotlight ausrichten:
        const spotLightTarget = new THREE.Object3D();
        spotLightTarget.position.set(0, 0, 200);
        spaceship.add(spotLightTarget);
        spotLight.target = spotLightTarget;

        // ZUM TESTEN, Light-Helper für die Lichtquelle von Seg3:
        const spotLightHelper = new THREE.CameraHelper(spotLight.shadow.camera);
        scene.add(spotLightHelper);
        // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

        scene.add(spaceship);
        spaceshipObj = spaceship;

        // Maus Steuerung:
        document.addEventListener('mousemove', (event) => {
            mouseEventHandler(event, spaceship);
        });

        // Tastatur Steuerung:
        document.addEventListener('keydown', (event) => {
            keyboardEventHandler(event, spaceship);
        });
    });
})

// ---------------------------------------------------------------------------------------------------------------------
// COINS
// ---------------------------------------------------------------------------------------------------------------------

let coins = [];
let score = 0;

function updateScore() {
    console.log(score);
}

function checkCollision(obj1, obj2) {
    // Erstelle eine BoundingBox für beide Objekte
    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);

    // Überprüfe, ob die Boxen sich überschneiden (Kollision)
    return box1.intersectsBox(box2);
}

/**
 * Erzeugt ein einfaches 3D-Objekt (Cube) mit einer zufälligen Größe und Farbe:
 */
function createCoinsObject() {

    const fbxLoader = new FBXLoader();
    fbxLoader.load('../assets/Dollar_Coin.fbx', (coin) => {
        coin.position.set(
            Math.random() * fieldWidth - fieldWidth / 2,
            fieldHeight / 2,
            50
        );
        coin.scale.set(0.2, 0.2, 0.2);

        scene.add(coin);
        coins.push(coin);
    });
}

/**
 * Iteriert über alle Objekte im fallingObjects Array und
 * bewegt jedes Objekt nach unten (reduziert die y-Position),
 * wenn ein Objekt den Boden erreicht, wird es aus der Szene entfernt
 */
function animateCoinsObjects() {
    for (let i = 0; i < coins.length; i++) {
        const obj = coins[i];

        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= 2; // Geschwindigkeit des Fallens
        } else {
            scene.remove(obj);
            coins.splice(i, 1);
            i--;
        }

        if (checkCollision(obj, spaceshipObj)) {
            // Objekt entfernen und Score erhöhen
            scene.remove(obj);
            coins.splice(i, 1);
            i--; // Index anpassen
            score++; // Erhöhe den Score
            updateScore(); // Update der Score-Anzeige
        }
    }
}

/**
 * Startet ein Intervall, das zufällig neue Objekte erstellt.
 * Die Intervalle sind zufällig und reichen von 1 bis 4 Sekunden
 */
function startCoinsCreation() {
    setInterval(() => {
        createCoinsObject();
    }, Math.random() * 3000 + 2000);
}

//startCoinsCreation();

// ---------------------------------------------------------------------------------------------------------------------
// MISSILES
// ---------------------------------------------------------------------------------------------------------------------

let missileObjects = [];

function createLaser(missile) {

    const laserGeometry = new THREE.CylinderGeometry(
        .5,
        .5,
        fieldHeight,
        5
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
    laser.position.set(0, fieldHeight / 2, -1);

    startLaserBlink(laserMaterial);

    return laser;
}

function startLaserBlink(laserMaterial) {

    const blinkSpeed = 0.02;
    let opacity = laserMaterial.opacity;
    let direction = -1;

    function animateOpacity() {
        opacity += direction * blinkSpeed;
        if (opacity <= 0.2 || opacity >= 0.8) {
            direction *= -1;
        }
        laserMaterial.opacity = opacity;
    }

    setInterval(animateOpacity, 16);
}

/**
 * lädt Missile Objekt aus .obj und .mtl und setzt einen Random-XWert
 */
function createMissilesObject() {

    const missilesObjectsLoader = new OBJLoader();
    const missilesObjectsMtlLoader = new MTLLoader();

    missilesObjectsMtlLoader.load('../assets/Missile.mtl', (material) => {

        material.preload();
        missilesObjectsLoader.setMaterials(material);

        missilesObjectsLoader.load('../assets/Missile.obj', (missile) => {

            missile.position.set(
                Math.random() * fieldWidth - fieldWidth / 2,
                fieldHeight / 1.4,
                100
            );
            missile.scale.set(23, 23, 23);
            missile.rotation.z = Math.PI;
            missile.castShadow = true;
            missile.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            let laser = createLaser(missile);
            missile.add(laser);

            scene.add(missile);
            missileObjects.push(missile);

        });
    });
}

/**
 * Iteriert über alle Objekte im Array und
 * bewegt jedes Objekt nach unten (reduziert die y-Position)
 */
function animateMissiles() {
    for (let i = 0; i < missileObjects.length; i++) {
        const obj = missileObjects[i];

        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= .5;
        } else {
            scene.remove(obj);
            missileObjects.splice(i, 1);
            i--;
        }

    }
}

/**
 * Startet ein Intervall, das zufällig neue Objekte erstellt
 */
function startMissilesCreation() {
    setInterval(() => {
        createMissilesObject();
    }, Math.random() * 6000 + 12000);
}

startMissilesCreation();

// ---------------------------------------------------------------------------------------------------------------------
// EVENT HANDLERS
// ---------------------------------------------------------------------------------------------------------------------

function keyboardEventHandler(event, target) {
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

function mouseEventHandler(event, target) {
    let mouseX = 0;
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    if (target) {
        target.position.x = mouseX * fieldWidth / 2;
        constrainObjectPosition(target);
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// RENDER
// ---------------------------------------------------------------------------------------------------------------------

function draw() {

    if (resizeCanvasToWindow()) {
        renderer.render(scene, camera);
    }
    animateCoinsObjects();
    animateMissiles()
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

const speed = 0.001;

function animateBackground() {

    bgPlaneTextureMap.offset.y += speed;

    if (bgPlaneTextureMap.offset.x <= -1) {
        bgPlaneTextureMap.offset.x = 0;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animateBackground);
}

animateBackground();

// ---------------------------------------------------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------------------------------------------------

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

function resizeCanvasToWindow() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}