main();

function main() {

    // -------------------------------------------------------------------------------------------------------
    // Scene Grundaufbau
    // -------------------------------------------------------------------------------------------------------

    let stats = initStats();

    // create context:
    const canvas = document.querySelector("#c");
    const gl = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });
    gl.shadowMap.enabled = true;

    // create camera:
    const angleOfView = 55;
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    const nearPlane = 0.1;
    const farPlane = 100;
    const camera = new THREE.PerspectiveCamera(
        angleOfView,
        aspectRatio,
        nearPlane,
        farPlane
    );
    camera.position.set(35, 20, 20);


    // create the scene:
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0.3, 0.5, 0.8);
    const fog = new THREE.Fog("grey", 1,90);
    scene.fog = fog;

    // -------------------------------------------------------------------------------------------------------
    // Objekte in der Szene
    // -------------------------------------------------------------------------------------------------------

    // GEOMETRY
    // create the cube:
    const cubeSize = 4;
    const cubeGeometry = new THREE.BoxGeometry(
        cubeSize,
        cubeSize,
        cubeSize
    );  

    // Create the Sphere:
    const sphereRadius = 3;
    const sphereWidthSegments = 32;
    const sphereHeightSegments = 16;
    const sphereGeometry = new THREE.SphereGeometry(
        sphereRadius,
        sphereWidthSegments,
        sphereHeightSegments
    );

    // Create the upright plane:
    const planeWidth = 256;
    const planeHeight =  128;
    const planeGeometry = new THREE.PlaneGeometry(
        planeWidth,
        planeHeight
    );

    // MATERIALS
    const textureLoader = new THREE.TextureLoader();

    const cubeMaterial = new THREE.MeshPhongMaterial({
        color: 'pink'
    });

    const sphereNormalMap = textureLoader.load('textures/sphere_normal.png');
    sphereNormalMap.wrapS = THREE.RepeatWrapping;
    sphereNormalMap.wrapT = THREE.RepeatWrapping;
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 'tan',
        normalMap: sphereNormalMap
    });

    const planeTextureMap = textureLoader.load('textures/pebbles.jpg');
    planeTextureMap.wrapS = THREE.RepeatWrapping;
    planeTextureMap.wrapT = THREE.RepeatWrapping;
    planeTextureMap.repeat.set(16, 16);
    //planeTextureMap.magFilter = THREE.NearestFilter;
    planeTextureMap.minFilter = THREE.NearestFilter;
    planeTextureMap.anisotropy = gl.getMaxAnisotropy();
    const planeNorm = textureLoader.load('textures/pebbles_normal.png');
    planeNorm.wrapS = THREE.RepeatWrapping;
    planeNorm.wrapT = THREE.RepeatWrapping;
    planeNorm.minFilter = THREE.NearestFilter;
    planeNorm.repeat.set(16, 16);
    const planeMaterial = new THREE.MeshStandardMaterial({
        map: planeTextureMap,
        side: THREE.DoubleSide,
        normalMap: planeNorm
    });

    // MESHES
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    //cube.position.set(cubeSize + 1, cubeSize + 1, 0);
    cube.position.set(0, cubeSize - 1, -25);
    scene.add(cube);

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    //sphere.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
    sphere.position.set(0, sphereRadius, -15);
    scene.add(sphere);

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // TEAPOT
    var texture = textureLoader.load('assets/stone.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    var loader = new THREE.OBJLoader();

    loader.load('assets/teapot.obj',
        function(mesh) {
            var material = new THREE.MeshPhongMaterial({map:texture});

            mesh.children.forEach(function(child) {
                child.material = material;
                child.castShadow = true;
            });

            //mesh.position.set(-15, 2, 0);
            mesh.position.set(0, 2, -6);
            mesh.rotation.set(-Math.PI / 2, 0, 0);
            mesh.scale.set(0.006, 0.006, 0.006);
            scene.add(mesh);
        },
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.log(error);
            console.log( 'An error happened' );
        }
    );

    // ROBOT
    // Robot segmente definieren:
    let h1 = 1;
    let h2 = 0.8;
    let h3 = 0.6;

    let seg1 = addSeg(scene, h1, 0);
    let seg2 = addSeg(seg1, h2, h1);
    let seg3 = addSeg(seg2, h3, h2);

    // Lichtquelle für Segment-3:
    const spotLight = new THREE.SpotLight(0xffffff, 2, 200);
    spotLight.castShadow = true;
    // Spotlight an die Seg3-Spitze setzen (y-achse):
    spotLight.position.set(0, h3, 0);
    // Spotlight als ChildElement von Seg3 (für automatische Transformation):
    seg3.add(spotLight);

    // Spotlight ausrichten:
    const spotLightTarget = new THREE.Object3D();
    spotLightTarget.position.set(0, 0, -15);
    seg3.add(spotLightTarget);
    spotLight.target = spotLightTarget;

    // Robot der Szene hinzufügen:
    scene.add(seg1);

    // ZUM TESTEN, Light-Helper für die Lichtquelle von Seg3:
    //const spotLightHelper = new THREE.CameraHelper(spotLight.shadow.camera);
    //scene.add(spotLightHelper);

    // SCENE LIGHTS
    const color = 0xffffff;
    const intensity = .1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.target = plane;
    light.position.set(0, 30, 30);
    scene.add(light);
    scene.add(light.target);

    // -------------------------------------------------------------------------------------------------------
    // GUI
    // -------------------------------------------------------------------------------------------------------

    var controls = new function () {
        this.rotationSpeed = 0.02;
        this.rotY1 = 0;
        this.rotZ1 = 0;
        this.rotZ2 = 0;
        this.rotZ3 = 0;
    };

    var gui = new dat.GUI();
    gui.add(controls, 'rotationSpeed', 0, 0.5);
    gui.add(controls, 'rotY1', 0, 2 * Math.PI);
    gui.add(controls, 'rotZ1', 0, 2 * Math.PI);
    gui.add(controls, 'rotZ2', 0, 2 * Math.PI);
    gui.add(controls, 'rotZ3', 0, 2 * Math.PI);

    var trackballControls = initTrackballControls(camera, gl);
    var clock = new THREE.Clock();

    // -------------------------------------------------------------------------------------------------------
    // Draw
    // -------------------------------------------------------------------------------------------------------

    function draw(time){
        time *= 0.001;

        trackballControls.update(clock.getDelta());
        stats.update();

        if (resizeGLToDisplaySize(gl)) {
            const canvas = gl.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        cube.rotation.x += controls.rotationSpeed;
        cube.rotation.y += controls.rotationSpeed;
        cube.rotation.z += controls.rotationSpeed;

        sphere.rotation.x += controls.rotationSpeed;
        sphere.rotation.y += controls.rotationSpeed;
        sphere.rotation.y += controls.rotationSpeed;

        seg1.rotation.y = controls.rotY1;
        seg1.rotation.z = controls.rotZ1;
        seg2.rotation.z = controls.rotZ2;
        seg3.rotation.z = controls.rotZ3;

        //light.position.x = 20*Math.cos(time);
        //light.position.y = 20*Math.sin(time);
        gl.render(scene, camera);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
}

// -------------------------------------------------------------------------------------------------------
// Helper-Functions
// -------------------------------------------------------------------------------------------------------

// Update resize
function resizeGLToDisplaySize(gl) {
    const canvas = gl.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width != width || canvas.height != height;
    if (needResize) {
        gl.setSize(width, height, false);
    }
    return needResize;
}

// Add new segment:
function addSeg(parent, height, posY) {

    var axisSphere = new THREE.Group();
    axisSphere.position.y = posY;
    parent.add(axisSphere);

    var sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
    var sphereMaterial = new THREE.MeshLambertMaterial({ color: 0x7777ff });
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    sphere.scale.set(0.5, 0.5, 0.5);
    sphere.position.set(0, height / 2, 0);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    axisSphere.add(sphere);

    /*
    // Roboter Körper:
    var segmentGeometry = new THREE.CylinderGeometry(1, 1, height, 16);
    var segmentMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    var segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    axisSphere.add(segment);
     */

    const tripod = new THREE.AxesHelper(5);
    axisSphere.add(tripod);

    return axisSphere;
}