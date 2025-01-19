import * as THREE from 'three'
import {MTLLoader, OBJLoader} from "three/addons";
import * as dat from "three/addons/libs/lil-gui.module.min";
import {getSmokeParticleSystem} from '../libs/getSmokeParticleSystem';
import {getExplosionParticleSystem} from '../libs/getExplosionParticleSystem';
import {getFireParticleSystem} from '../libs/getFireParticleSystem';
import {getLaserParticleSystem} from '../libs/getLaserParticleSystem';

const startBtn = document.getElementById('startBtn');
const homepage = document.getElementById('homepageContainer');
const gamePage = document.getElementById('gameContainer');

startBtn.addEventListener("click", () => {
    homepage.classList.add("hidden");
    gamePage.classList.remove("hidden");
    startGame();
})

function startGame() {

// ---------------------------------------------------------------------------------------------------------------------
// MAIN CONTEXT
// ---------------------------------------------------------------------------------------------------------------------

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

    // Orthogonale Kamera ist ideal für dieses Spiel, weil die Tiefe in der Darstellung nicht relevant ist
    // und wir nur eine zum Spielfeld orthogonale Ansicht benötigen:
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

            // ein Spotlight hinzufügen, um das Raumschiff auszustrahlen (hat leider auch nicht funktioniert):
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
            // Spaceship in der globalen Variable für die Spiellogik speichern:
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
                if (event.clientY > 50 && !isGameOver && spaceshipControlsEnabled) {
                    shoot(spaceship);
                }
            });

            // GUI-Controller für das manuelle Anpassen der Rotation (zum Testen):
            spaceshipFolder.add(spaceshipObj.rotation, 'x', 0, Math.PI * 2).name('Rotate X');
            spaceshipFolder.add(spaceshipObj.rotation, 'y', 0, Math.PI * 2).name('Rotate Y');
            spaceshipFolder.add(spaceshipObj.rotation, 'z', 0, Math.PI * 2).name('Rotate Z');
        });
    })

    // ---------------------------------------------------------------------------------------------------------------------
    // ENEMIES OBJECTS (Blade)
    // ---------------------------------------------------------------------------------------------------------------------

    const enemyObjLoader = new OBJLoader();
    const enemyMtlLoader = new MTLLoader();
    const bladeSize = 45;

    /**
     * Erstellt ein Enemy-Objekt (Blade) und setzt ihm ein Interval zum schiessen
     */
    function createEnemyObject() {
        enemyMtlLoader.load('../assets/Blade.mtl', (materials) => {

            materials.preload();
            // Die geladenen Materialien dem Loader zugewiesen, um sie auf das Objekt anzuwenden:
            enemyObjLoader.setMaterials(materials);

            // Objekt mit den geladenen Materialien laden:
            enemyObjLoader.load('../assets/Blade.obj', (blade) => {

                // Die Position des Enemy-Objekts wird auf einem zufaelligen X-Wert gesetzt,
                // der innerhalb des sichtbaren Bereichs des Displays liegt,
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

                // Ein Intervall wird gesetzt, um alle 2 Sekunden einen Schuss vom Objekt abzufeuern:
                const enemyInterval = setInterval(() => {

                    if (isPaused) return;

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
                }, 2000);

            });
        })
    }

    /**
     * Bewegt alle Enemy-Objekte im Spiel nach unten und entfernt sie, wenn sie das Display verlassen und
     * ueberprüft auf Kollisionen mit dem Spaceship und beendet das Spiel bei Kollision
     */
    function animateEnemiesObjects() {

        for (let i = 0; i < enemiesList.length; i++) {

            if (isPaused) return

            const obj = enemiesList[i];

            // Auf Kollisionen mit dem Spaceship ueberpruefen und das Spiel bei Kollision beenden:
            if (!isGameOver && obj.position.y <= kollisionCheckingPosition && checkCollision(spaceshipObj, obj)) {
                handleGameOver();
            }

            // Das Objekt in -y bewegen, solange er im sichtbaren Bereich ist, sonst wird geloescht:
            if (obj.position.y > -fieldHeight / 2) {
                obj.position.y -= 1.5;
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

            if(isPaused) return

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
     * @param missile: Rakete die ein Laser bekommen soll
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
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        laser.position.set(missile.position.x, fieldHeight / 2, -1);

        scene.add(laser);
        // Animation fuer den Blinkeffekt des Lasers starten:
        startLaserBlink(laserMaterial);

        // Setzt einen Timeout, um den Laser nach 10 Sekunden aus der Szene zu entferne:
        setTimeout(() => {
            scene.remove(laser);
        }, 10000);
    }

    /**
     * Erzeugt Animation fuer Laser
     * @param laserMaterial: Material die animiert wird
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

        // Blinkeffekt alle 10ms wiederholen:
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

                // Die Position der Rakete wird auf einem zufaelligen X-Wert gesetzt,
                // der innerhalb des sichtbaren Bereichs des Displays liegt,
                // Y-Position wird auf den oberen Rand des Displays gesetzt, damit die Rakete von oben nach unten faellt:
                missile.position.set(
                    Math.random() * fieldWidth - fieldWidth / 2,
                    fieldHeight,
                    150
                );

                // der Rakete ein Laser hinzufuegen:
                createLaser(missile);

                missile.scale.set(23, 23, 23);
                missile.rotation.x = Math.PI;
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

            if (isPaused) return

            const obj = missileObjects[i];
            // Auf Kollisionen mit dem Spaceship ueberpruefen und das Spiel bei Kollision beenden:
            if (!isGameOver && obj.position.y <= (spaceshipYPos + 300) && checkCollision(spaceshipObj, obj)) {
                console.log("Spaceship was hit by a Missile");
                handleGameOver();
            }

            // Das Objekt in -y bewegen, solange er im sichtbaren Bereich ist, sonst wird geloescht:
            if (obj.position.y > -fieldHeight / 2) {
                obj.position.y -= 2.4;
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
    const kollisionCheckingPosition = spaceshipYPos + 50; // ab welche y-Position soll das kollisionChecking beginnen
    let isGameOver = false;
    let isPaused = false;
    let timer = 0;
    let killsCounter = 0;
    let coinsCounter = 0;
    let enemiesList = [];
    let coinsList = [];
    let missileObjects = [];

    /**
     * Aktualisiert den CoinsCounter in Display
     */
    function updateScore() {
        let element = document.getElementById('coinsState');
        element.innerText = coinsCounter;
    }

    /**
     * Bewegt das Zielobjekt horizontal basierend auf der Tastatureingabe
     * @param event: Das Tastaturereignis
     * @param target: Das Zielobjekt, dessen Position geändert wird
     */
    function moveUsingKeyboard(event, target) {

        if (!spaceshipControlsEnabled) return

        const moveSpeed = 10;

        if (target) {
            if (event.key === 'ArrowLeft') {
                target.position.x -= moveSpeed;
            } else if (event.key === 'ArrowRight') {
                target.position.x += moveSpeed;
            }
            // Zielobjektposition einschränken, damit er das Display nicht verlässt:
            constrainObjectPosition(target);
        }
    }

    /**
     * Bewegt ein Zielobjekt basierend auf der Mausposition
     * @param event: Das Tastaturereignis
     * @param target: Das Zielobjekt, dessen Position geändert wird
     */
    function moveUsingMaus(event, target) {

        if (!spaceshipControlsEnabled) return

        // Mausposition auf der x-Achse in -1 oder 1 umwandeln:
        let mouseX = 0;
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;

        if (target) {
            // berechnete X-Mausposition auf die Spielfeldbreite skalieren,
            // um die tatsächliche X-Koordinate des Zielobjekts ui bestimmen:
            target.position.x = mouseX * fieldWidth / 2;
            // Zielobjektposition einschränken, damit er das Display nicht verlässt:
            constrainObjectPosition(target);
        }
    }

    /**
     * Löst Schüsse vom Raumschiff aus
     * @param spaceship: Objekt, aus dem Schüsse ausgelöst werden
     */
    function shoot(spaceship) {

        // Schuss erstellen:
        const color = new THREE.Color(0xff9e13);
        const shot = createBullet(color, 15);
        shot.position.set(spaceship.position.x, spaceship.position.y, spaceship.position.z);

        // animierter Feuereffekt anwenden:
        getFireEffect(shot);

        scene.add(shot);

        // Schuss nach oben bewegen:
        const animateShot = () => {

            // wenn das Spiel pausiert ist, Schleife läuft weiter, aber keine Bewegung:
            if (isPaused) {
                requestAnimationFrame(animateShot);
                return;
            }

            shot.position.y += 10;

            // Schuss weiter bewegen, wenn er im sichtbaren Bereich ist, sonst löschen:
            if (shot.position.y < 1000) {
                requestAnimationFrame(animateShot);
            } else {
                scene.remove(shot);
            }

            // Kollision an jeder Stelle mit Gegnern überprüfen:
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

        // Animation des Schusses starten:
        animateShot();
    }

    /**
     * Löst Schüsse vom einem Blade aus
     * @param blade: Objekt, aus dem Schüsse ausgelöst werden
     */
    function enemyShoot(blade) {

        const startShootPosition = (fieldHeight / 2) - 50;

        // Schuss erstellen:
        const color = new THREE.Color(0x3dbcff);
        const shot = createBullet(color, 7);
        shot.position.set(blade.position.x, blade.position.y, blade.position.z);
        // Lasereffekt am Schuss anwenden:
        let laser = getLaserEffect(shot);
        blade.add(shot);
        scene.add(shot);

        // Schuss nach unten bewegen:
        const animateShot = () => {

            // wenn das Spiel pausiert ist, Schleife läuft weiter, aber keine Bewegung:
            if (isPaused) {
                requestAnimationFrame(animateShot);
                return;
            }

            // Kollision mit dem Raumschiff überprüfen:
            if (!isGameOver && shot.position.y <= kollisionCheckingPosition && checkCollision(spaceshipObj, shot)) {
                console.log("Spaceship was shot by a Blade");
                handleGameOver();
            }

            shot.position.y -= 10;

            // Schuss weiter bewegen, wenn er im sichtbaren Bereich ist, sonst löschen:
            if (shot.position.y > (-fieldHeight / 2) && blade.position.y < startShootPosition) {
                requestAnimationFrame(animateShot);
            } else {
                laser.stop();
                scene.remove(shot);
                blade.remove(shot);
            }
        }

        // Animation des Schusses starten:
        animateShot();
    }

    /**
     * handelt GameOver
     */
    function handleGameOver() {

        if (isGameOver) return

        console.log("Game Over !");
        isGameOver = true;
        spaceshipControlsEnabled = false;

        // Explosionseffekt an Spaceship anwenden:
        getExplosionEffect(spaceshipObj);

        // nach 3s wird die GameOver-Page angezeigt:
        setTimeout(() => {

            console.log("Cleaning Scene and display GameOver-Page .. ");

            scene.remove(spaceshipObj);
            spaceshipObj = null;

            // GameOver-Page einblenden::
            const statebarContainer = document.getElementById('statebarContainer');
            statebarContainer.classList.add('hideContainer');

            const gameOverContainer = document.getElementById('gameOverContainer');
            gameOverContainer.classList.add('displayContainer');

            // Punktestand, Münzen und Kills anzeigen:
            const scoreElement = document.getElementById('scoreGameOverPage');
            const coinsElement = document.getElementById('coinsGameOverPage');
            const killsElement = document.getElementById('killsGameOverPage');

            scoreElement.innerText = timer;
            coinsElement.innerText = coinsCounter;
            killsElement.innerText = killsCounter;
        }, 3000);
    }

    /**
     * Schränkt die Position eines Objekts auf Spielfeldgrenzen ein
     * @param object: Das Objekt deren Position eingeschränkt werden soll
     */
    function constrainObjectPosition(object) {

        if (object) {
            // BoundingBox des Objekts berechnen:
            const boundingBox = new THREE.Box3().setFromObject(object);
            const width = boundingBox.max.x - boundingBox.min.x;
            // Grenzen auf Basis der Fensterbreite berechnen:
            const minX = -window.innerWidth / 2 + width / 2;
            const maxX = window.innerWidth / 2 - width / 2;

            // Position auf die berechneten Grenzen beschränken:
            if (object.position.x < minX) {
                object.position.x = minX;
            } else if (object.position.x > maxX) {
                object.position.x = maxX;
            }
        }
    }

    /**
     * Prüft, ob zwei Objekte kollidieren
     * @returns ein Boolean, ob sich die Objekte überschneiden
     */
    function checkCollision(obj1, obj2) {

        // BoundingBoxen für beide Objekte erstellen:
        const box1 = new THREE.Box3().setFromObject(obj1);
        const box2 = new THREE.Box3().setFromObject(obj2);

        // Prüfen ob sie sich überschneiden:
        return box1.intersectsBox(box2);
    }

    /**
     * Erstellt ein Schuss mit bestimmter Farbe und Größe
     * @param color: Farbe der Kugel
     * @param size: Größe der Kugel
     * @returns ein Kugel-Objekt
     */
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

    /**
     * Startet das Bewegen vom Hintergrund auf y-achse
     */
    function startAnimateBackground() {

        // wenn das Spiel pausiert ist, Schleife läuft weiter, aber keine Bewegung:
        if (isPaused) {
            requestAnimationFrame(startAnimateBackground);
            return;
        }

        bgPlaneTextureMap.offset.y += speed;

        if (bgPlaneTextureMap.offset.x <= -1) {
            bgPlaneTextureMap.offset.x = 0;
        }

        // Szene rendern und Animation wiederholen:
        renderer.render(scene, camera);
        requestAnimationFrame(startAnimateBackground);
    }

    /**
     * Startet den Timer in einem Interval und zeigt den auf dem Display an
     */
    const startTimer = () => {
        const interval = setInterval(() => {

            if(isPaused) return;

            // Timer stoppen, wenn das Spiel vorbei ist:
            if (isGameOver) {
                clearInterval(interval);
                console.log('Timer gestoppt, is GameOver');
            }

            timer++;
            let element = document.getElementById('timer');
            element.innerText = timer;
        }, 50);

    };

    /**
     * Startet die Erstellung von Münzen in einem bestimmten Intervall
     */
    function startCoinsCreation() {
        console.log("Coins Creation started .. ");
        setInterval(() => {
            if (isPaused) return
            createCoinsObject();
        }, Math.random() * 300 + 1000);
    }

    /**
     * Startet die Erstellung von Gegner-Objekten in einem bestimmten Intervall
     */
    function startEnemiesCreation() {
        console.log("Enemies Creation started .. ");
        setInterval(() => {
            if (isPaused) return
            createEnemyObject();
        }, 3500);
    }

    /**
     * Startet die Erstellung von Raketen in einem bestimmten Intervall
     */
    function startMissilesCreation() {
        console.log("Missiles Creation started .. ");
        setInterval(() => {
            if (isPaused) return
            createMissilesObject();
        }, Math.random() * 1000 + 14000);
    }

    startAnimateBackground();
    startTimer();
    startCoinsCreation();
    startEnemiesCreation();
    startMissilesCreation();

    // ---------------------------------------------------------------------------------------------------------------------
    // PARTICLE SYSTEM
    // Zur Erzeugung animierter Effekte im Spiel, wie Rauch- und Explosionseffekte.
    // Jedes Partikelsystem ist in einem separaten Modul implementiert, um sie unabhängig flexibel voneinander anzupassen.
    // Die Module befinden sich in ./libs/ und basieren auf einem Modul aus einem externen Git-Repo.
    // Das Modul wurde speziell für verschiedene Effekte wie Rauch, Feuer, Laser und Explosionen angepasst.
    // ---------------------------------------------------------------------------------------------------------------------

    function getSmokeEffect(object) {

        // Kontext für das Partikelsystem definieren:
        let smokeEffectContext = {
            camera, // Kamera, die die Partikel zeigt
            emitter: object, // Objekt, das den Rauch ausstößt
            parent: scene, // Szene als Elternknoten
            rate: 30, // Erzeugungsrate der Partikel
            texture: '../assets/img/smoke.png' // Textur für die Partikel
        }

        // Partikelsystem für den definierten Kontext erstellen:
        const smokeEffect = getSmokeParticleSystem(smokeEffectContext);

        const animateEffect = () => {

            // Effekt stoppen, wenn das Objekt nicht mehr im Spielfeld ist:
            if (!missileObjects.includes(object)) {
                smokeEffect.stop();
            }
            requestAnimationFrame(animateEffect);

            // Partikelsystem aktualisieren, update():
            // Fügt neue Partikel hinzu, basierend auf der definierten Rate und Emissionseinstellungen.
            // Animiert bestehende Partikel, Position, Lebenszeit, Bewegung.
            // Ändert die Geometrie, damit Änderungen im Partikelsystem visualisiert werden.
            smokeEffect.update(0.016);
        }

        animateEffect();
    }

    /**
     * Explosionseffekt für ein Objekt erzeugen
     * @param object: Objekt, an dem der Effekt angewendet wird
     */
    function getExplosionEffect(object) {

        // Kontext für das Partikelsystem definieren:
        let ExplosionEffectContext = {
            camera, // Kamera, die die Partikel zeigt
            emitter: object, // Objekt, das den Rauch ausstößt
            parent: scene, // Szene als Elternknoten
            rate: 20, // Erzeugungsrate der Partikel
            texture: '../assets/img/explosion.png' // Textur für die Partikel
        }

        // Partikelsystem für den definierten Kontext erstellen:
        const explosionEffect = getExplosionParticleSystem(ExplosionEffectContext);

        const animateEffect = () => {

            // Effekt stoppen, wenn das Objekt nicht mehr im Spielfeld ist:
            if (spaceshipObj == null) {
                explosionEffect.stop();
            }
            requestAnimationFrame(animateEffect);

            // Partikelsystem aktualisieren, update():
            // Fügt neue Partikel hinzu, basierend auf der definierten Rate und Emissionseinstellungen.
            // Animiert bestehende Partikel, Position, Lebenszeit, Bewegung.
            // Ändert die Geometrie, damit Änderungen im Partikelsystem visualisiert werden.
            explosionEffect.update(0.016);
        }

        animateEffect();
    }

    /**
     * Feuereffek für ein Objekt erzeugen
     * @param object: Objekt, an dem der Effekt angewendet wird
     */
    function getFireEffect(object) {

        // Kontext für das Partikelsystem definieren:
        let FireEffectContext = {
            camera, // Kamera, die die Partikel zeigt
            emitter: object, // Objekt, das den Rauch ausstößt
            parent: scene, // Szene als Elternknoten
            rate: 70, // Erzeugungsrate der Partikel
            texture: '../assets/img/fire.png' // Textur für die Partikel
        }

        const fireEffect = getFireParticleSystem(FireEffectContext);

        const animateEffect = () => {

            // Effekt stoppen, wenn das Objekt nicht mehr im Spielfeld ist:
            if (spaceshipObj == null) {
                fireEffect.stop();
            }
            requestAnimationFrame(animateEffect);

            // Partikelsystem aktualisieren, update():
            // Fügt neue Partikel hinzu, basierend auf der definierten Rate und Emissionseinstellungen.
            // Animiert bestehende Partikel, Position, Lebenszeit, Bewegung.
            // Ändert die Geometrie, damit Änderungen im Partikelsystem visualisiert werden.
            fireEffect.update(0.016);
        }

        animateEffect();
    }

    /**
     * Lasereffek für ein Objekt erzeugen
     * @param object: Objekt, an dem der Effekt angewendet wird
     */
    function getLaserEffect(object) {

        // Kontext für das Partikelsystem definieren:
        let laserEffectContext = {
            camera, // Kamera, die die Partikel zeigt
            emitter: object, // Objekt, das den Rauch ausstößt
            parent: scene, // Szene als Elternknoten
            rate: 25, // Erzeugungsrate der Partikel
            texture: '../assets/img/laser.png' // Textur für die Partikel
        }

        const laserEffect = getLaserParticleSystem(laserEffectContext);

        const animateEffect = () => {

            // Effekt stoppen, wenn das Objekt nicht mehr im Spielfeld ist:
            if (spaceshipObj == null) {
                laserEffect.stop();
            }
            requestAnimationFrame(animateEffect);

            // Partikelsystem aktualisieren, update():
            // Fügt neue Partikel hinzu, basierend auf der definierten Rate und Emissionseinstellungen.
            // Animiert bestehende Partikel, Position, Lebenszeit, Bewegung.
            // Ändert die Geometrie, damit Änderungen im Partikelsystem visualisiert werden.
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
    // GUI CONTROLLER
    // ---------------------------------------------------------------------------------------------------------------------

    const gui = new dat.GUI();
    const spaceshipFolder = gui.addFolder('Spaceship');
    const directionalLightFolder = gui.addFolder('Directional Light');
    const spotLightFolder = gui.addFolder('Spotlight');
    const ambientLightFolder = gui.addFolder('Ambient Light');
    const settingIcon = document.getElementById('setting');
    const pauseIcon = document.getElementById('pause');

    pauseIcon.addEventListener("click", () => {
        togglePauseGame();
    })

    settingIcon.addEventListener("click",(event) => {
        toggleControlpanel();
    });

    document.addEventListener("keydown", (event) => {
        if(event.code === "Space") {
            togglePauseGame();
        }
    })

    document.addEventListener("keydown", (event) => {
        if(event.code === "ControlLeft" || event.code === "ControlRight") {
            toggleControlpanel();
        }
    })

    directionalLightFolder.add(directionalLight.position, 'x', -500, 1000);
    directionalLightFolder.add(directionalLight.position, 'y', -500, 1000);
    directionalLightFolder.add(directionalLight.position, 'z', -500, 1000);
    directionalLightFolder.add(directionalLight, 'intensity', 0, 50);
    spotLightFolder.add(spotLight.position, 'x', -500, 800);
    spotLightFolder.add(spotLight.position, 'y', -500, 800);
    spotLightFolder.add(spotLight.position, 'z', -500, 800);
    spotLightFolder.add(spotLight, 'intensity', 0, 50);
    ambientLightFolder.add(ambientLight, 'intensity', 0, 50);
    gui.domElement.style.display = 'none';
    gui.domElement.style.marginTop = '35px';

    /**
     * blendet die Controlpanel im Display ein bzw aus
     */
    function toggleControlpanel() {
        gui.domElement.style.display = gui.domElement.style.display === 'none' ? 'block' : 'none';
    }

    /**
     * Pausiert das Spiel, wenn es läuft sonst wird fortgesetzt
     */
    function togglePauseGame() {
        isPaused = !isPaused;
        spaceshipControlsEnabled = !spaceshipControlsEnabled;
    }
}