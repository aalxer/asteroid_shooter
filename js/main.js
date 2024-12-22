import * as THREE from 'three'
import {FBXLoader, MTLLoader, OBJLoader} from "three/addons";
import * as dat from "three/addons/libs/lil-gui.module.min";
import {Color} from "three";

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
camera.position.set(0, 0, 800);

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
    side: THREE.DoubleSide
});

const backgroundPlane = new THREE.Mesh(bgPlaneGeometry, bgPlaneMaterial);
backgroundPlane.receiveShadow = true;
backgroundPlane.position.z = -50;
scene.add(backgroundPlane);

// ---------------------------------------------------------------------------------------------------------------------
// LIGHTS
// ---------------------------------------------------------------------------------------------------------------------

const ambientLight = new THREE.AmbientLight(0xffffff, 5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
directionalLight.position.set(65,240, 800);
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

const spotLight = new THREE.SpotLight(0xffffff, 20, 300);
spotLight.position.set(50, 100, 150);
spotLight.castShadow = true;
scene.add(spotLight);
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight.target);

// Helpers:
const spotLightHelper = new THREE.SpotLightHelper(spotLight)
//scene.add(spotLightHelper)
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 30)
//scene.add(directionalLightHelper);
const axesHelper = new THREE.AxesHelper(300);
//scene.add(axesHelper);

// ---------------------------------------------------------------------------------------------------------------------
// SPACESHIP
// ---------------------------------------------------------------------------------------------------------------------

let spaceshipObj = null;
const spaceshipLoader = new OBJLoader();
const spaceshipMtlLoader = new MTLLoader();
const spaceshipSize = .5;
let spaceshipControlsEnabled = false;
const spaceshipYPos = (-fieldHeight / 2) + 50;

spaceshipMtlLoader.load('../assets/RaiderStarship.mtl', (materials) => {

    console.log("Design (.mtl) for Spaceship was loaded successfully !")
    materials.preload();
    spaceshipLoader.setMaterials(materials);

    spaceshipLoader.load('../assets/RaiderStarship.obj', (spaceship) => {

        console.log("Spaceship was loaded successfully !")

        spaceship.position.set(0, spaceshipYPos, 150);
        spaceship.scale.set(spaceshipSize, spaceshipSize, spaceshipSize);
        spaceship.rotation.set(0.3, 3.13, 0);
        spaceship.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });

        // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        // Lichtquelle Spaceship
        // Cube
        /*
        const cubeGeometry = new THREE.BoxGeometry(80   , 80, 80);
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(0, 50, 0);
        cube.castShadow = true; // Der Würfel wirft Schatten
        scene.add(cube);

        const spotlight = new THREE.SpotLight(0xffffff, 1);  // Weißes Licht mit Intensität 1
        spotlight.position.set(0, 100, 0);  // Position des Spotlights
        spotlight.castShadow = true;  // Spotlight wirft Schatten
        scene.add(spotlight);

        const spotlightHelper = new THREE.SpotLightHelper(spotlight);
        scene.add(spotlightHelper);
         */
        const spotLight = new THREE.SpotLight(
            0xffffff,
            10,
            200
        );
        spotLight.castShadow = true;
        spotLight.position.set(0, 0, 0);
        spaceship.add(spotLight);

       const spotLightHelper = new THREE.CameraHelper(spotLight.shadow.camera);
       //scene.add(spotLightHelper);

        // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

        scene.add(spaceship);
        spaceshipControlsEnabled = true;
        spaceshipObj = spaceship;

        // Maus Steuerung:
        document.addEventListener('mousemove', (event) => {
            moveUsingMaus(event, spaceship);
        });

        // Tastatur Steuerung:
        document.addEventListener('keydown', (event) => {
            moveUsingKeyboard(event, spaceship);
        });

        document.addEventListener('click', (event) => {
            shoot(spaceship);
        });

        // GUI Controller:
        spaceshipFolder.add(spaceshipObj.rotation, 'x', 0, Math.PI * 2).name('Rotate X');
        spaceshipFolder.add(spaceshipObj.rotation, 'y', 0, Math.PI * 2).name('Rotate Y');
        spaceshipFolder.add(spaceshipObj.rotation, 'z', 0, Math.PI * 2).name('Rotate Z');
    });
})

// ---------------------------------------------------------------------------------------------------------------------
// ENEMIES
// ---------------------------------------------------------------------------------------------------------------------

const ememyLoader = new OBJLoader();
const enemyMtlLoader = new MTLLoader();
const bladeSize = 45;
let enemiesObjects = [];

function createEnemyObject() {
    enemyMtlLoader.load('../assets/Blade.mtl', (materials) => {

        materials.preload();
        ememyLoader.setMaterials(materials);

        ememyLoader.load('../assets/Blade.obj', (blade) => {

            blade.position.set(
                Math.random() * fieldWidth - fieldWidth / 2,
                fieldHeight,
                150
            );
            blade.scale.set(bladeSize, bladeSize, bladeSize);
            blade.rotation.set(-100 , 0, 0)
            blade.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            scene.add(blade);
            enemiesObjects.push(blade);

            const enemyInterval = setInterval(() => {

                if (isGameOver) {
                    clearInterval(enemyInterval);
                    console.log("Enemey Shooting Intervall gestoppt.");
                    return;
                }

                if (enemiesObjects.includes(blade)) {
                    enemyShoot(blade);
                }
            }, 5000);

        });
    })
}

function animateEnemiesObjects() {

    for (let i = 0; i < enemiesObjects.length; i++) {

        const obj = enemiesObjects[i];

        if (!isGameOver && obj.position.y <= kollisionCheckingPosition && checkCollision(spaceshipObj, obj)) {
            handleGameOver();
        }

        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= .5;
            obj.rotation.y += 0.01;
        } else {
            scene.remove(obj);
            enemiesObjects.splice(i, 1);
            i--;
        }
    }
}

function startEnemiesCreation() {
    setInterval(() => {
        createEnemyObject();
    }, 8000);
}

startEnemiesCreation();

// ---------------------------------------------------------------------------------------------------------------------
// COINS
// ---------------------------------------------------------------------------------------------------------------------

let coins = [];
let coinsCounter = 0;

function updateScore() {
    let element = document.getElementById('coinsState');
    element.innerText = coinsCounter;
    console.log(coinsCounter);
}

function createCoinsObject() {

    const coinsObjectsLoader = new OBJLoader();
    const coinsObjectsMtlLoader = new MTLLoader();

    coinsObjectsMtlLoader.load('../assets/Coin.mtl', (material) => {

        material.preload();
        coinsObjectsLoader.setMaterials(material);

        coinsObjectsLoader.load('../assets/Coin.obj', (coin) => {

            coin.position.set(
                Math.random() * fieldWidth - fieldWidth / 2,
                fieldHeight / 2,
                150
            );
            coin.scale.set(15,15,15);
            scene.add(coin);
            coins.push(coin);

        });
    });
}

function animateCoinsObjects() {
    for (let i = 0; i < coins.length; i++) {
        const obj = coins[i];

        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= 2;
            obj.rotation.x += 0.05;
            obj.rotation.y += 0.05;
            obj.rotation.z += 0.05;
        } else {
            scene.remove(obj);
            coins.splice(i, 1);
            i--;
        }

        if (!isGameOver && obj.position.y <= kollisionCheckingPosition && checkCollision(obj, spaceshipObj)) {
            // Objekt entfernen und Score erhöhen
            scene.remove(obj);
            coins.splice(i, 1);
            i--;
            coinsCounter++;
            updateScore();
        }
    }
}

function startCoinsCreation() {
    setInterval(() => {
        createCoinsObject();
    }, Math.random() * 300 + 2000);
}

startCoinsCreation();

// ---------------------------------------------------------------------------------------------------------------------
// MISSILES
// ---------------------------------------------------------------------------------------------------------------------

let missileObjects = [];

function createLaser(missile) {

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
    startLaserBlink(laserMaterial);

    setTimeout(() => {

        scene.remove(laser);

    }, 16000);
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

function createMissilesObject() {

    const missilesObjectsLoader = new OBJLoader();
    const missilesObjectsMtlLoader = new MTLLoader();

    missilesObjectsMtlLoader.load('../assets/Missile.mtl', (material) => {

        material.preload();
        missilesObjectsLoader.setMaterials(material);

        missilesObjectsLoader.load('../assets/Missile.obj', (missile) => {

            missile.position.set(
                Math.random() * fieldWidth - fieldWidth / 2,
                fieldHeight,
                150
            );

            createLaser(missile);

            missile.scale.set(23, 23, 23);
            missile.rotation.z = Math.PI;
            missile.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(missile);
            missileObjects.push(missile);

        });
    });
}

function animateMissiles() {

    for (let i = 0; i < missileObjects.length; i++) {

        const obj = missileObjects[i];

        if (!isGameOver && obj.position.y <= (spaceshipYPos + 300) && checkCollision(spaceshipObj, obj)) {
            handleGameOver();
        }


        if (obj.position.y > -fieldHeight / 2) {
            obj.position.y -= 1.4;
        } else {
            scene.remove(obj);
            missileObjects.splice(i, 1);
            i--;
        }
    }
}

function startMissilesCreation() {
    setInterval(() => {
        createMissilesObject();
    }, Math.random() * 1000 + 16000);
}

function createFireObject() {

    const fireObjectsLoader = new OBJLoader();
    const fireObjectsMtlLoader = new MTLLoader();

    fireObjectsMtlLoader.load('../assets/Ball.mtl', (material) => {

        material.preload();
        fireObjectsLoader.setMaterials(material);

        fireObjectsLoader.load('../assets/Ball.obj', (fire) => {

            fire.position.set(0, -100, 0);
            fire.scale.set(20, 20, 20);
            fire.rotation.set(Math.PI / 2, 0, 0);

            scene.add(fire);
        });
    });
}

//createFireObject();
startMissilesCreation();

// ---------------------------------------------------------------------------------------------------------------------
// GAME LOGIC
// ---------------------------------------------------------------------------------------------------------------------

let isGameOver = false;
let enemyShotsList = [];
let killsCounter = 0;
let timer = 0;
const kollisionCheckingPosition = spaceshipYPos + 50;

// Timer starten
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

startTimer();

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
    const shot = createBullet(color);
    shot.position.set(spaceship.position.x, spaceship.position.y, spaceship.position.z);
    scene.add(shot);

    const animateShot = () => {

        shot.position.y += 10;
        if (shot.position.y < 1000) {
            requestAnimationFrame(animateShot);
        }
        else {
            scene.remove(shot);
        }

        for (let i = 0; i < enemiesObjects.length; i++) {
            let enemy = enemiesObjects[i];

            if(checkCollision(shot, enemy)) {
                killsCounter += 1;
                let element = document.getElementById('killsState');
                element.innerText = killsCounter;
                scene.remove(enemy);
                enemiesObjects.splice(i, 1);
                i--;
            }
        }

    };

    animateShot();
}

function enemyShoot(blade) {

    const color = new THREE.Color(0x00e4ff);
    const shot = createBullet(color);
    const startShootPosition = (fieldHeight / 2) - 50;
    shot.position.set(blade.position.x, blade.position.y, blade.position.z);
    blade.add(shot);
    scene.add(shot);

    const animateShot = () => {

        if (!isGameOver && shot.position.y <= kollisionCheckingPosition && checkCollision(spaceshipObj, shot)) {
            handleGameOver();
        }

        shot.position.y -= 5;

        if (shot.position.y > (-fieldHeight / 2) && blade.position.y < startShootPosition) {
            requestAnimationFrame(animateShot);

        } else {
            scene.remove(shot);
            blade.remove(shot);
        }
    }

    animateShot();
}

function handleGameOver() {

    if (isGameOver) return

    isGameOver = true;
    spaceshipControlsEnabled = false;

    setTimeout(() => {
        scene.remove(spaceshipObj);
    }, 3000);

    console.log("Game Over");
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

function createBullet(color) {

    const sphereGeometry = new THREE.SphereGeometry(
        18
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

// ---------------------------------------------------------------------------------------------------------------------
// RENDER
// ---------------------------------------------------------------------------------------------------------------------

function draw() {

    if (resizeCanvasToWindow()) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    animateEnemiesObjects();
    animateCoinsObjects();
    animateMissiles();
    spotLightHelper.update();
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

function resizeCanvasToWindow() {

    const canvas = renderer.domElement;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

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
// GUI CONTROLLER
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