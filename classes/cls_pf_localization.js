
require('../ekf_localization/GLTFLoader');
require('../ekf_localization/OrbitControls');
require('../ekf_localization/RoomEnvironment');

const Ammo = require('../ekf_localization/ammo');
require('../ekf_localization/Detector');
require('../ekf_localization/stats.min');


class Particle {

    constructor( x, y, theta ) {

        this.x = x;
        this.y = y;
        this.theta = theta;
    }
}

class Robot {

    constructor( x, y, theta ) {

        this.x = x;
        this.y = y;
        this.theta = theta;
    }
}

class RenderHelper {

    constructor( scene, canvas ) {

        this.scene = scene;
        this.canvas = canvas;

        this.windowWidth = 900;
        this.windowHeight = 600;
    
        this.shouldMoveCar = false;
        this.enableGUI = true;

        this.cameraOffset = 22;

        this.loader = new THREE.GLTFLoader();
        this.clock = new THREE.Clock();
        this.car = null;
        this.time = 0;
        this.tyres = []

        this.initRenderer();
        this.initTextures();
        this.initScene();
        this.addCar();
        this.addWall();
        this.addPoles();

        this.addLight();
        this.addFloor();
        this.addCamera();
        this.addOrbitControl();

        this.initPhysicsGraphics();

        this.actions = {};
        this.keysActions = {
            "KeyW": 'acceleration',
            "KeyS": 'braking',
            "KeyA": 'left',
            "KeyD": 'right'
        };
    
    }

    createChassisMesh(w, l, h) {
        var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
        var mesh = new THREE.Mesh(shape, this.materialInteractive);
        this.scene.add(mesh);
        return mesh;
    }

    createWheelMesh(radius, width) {
        var t = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
        t.rotateZ(Math.PI / 2);
        var mesh = new THREE.Mesh(t, this.materialInteractive);
        mesh.add(new THREE.Mesh(new THREE.BoxGeometry(width * 1.5, radius * 1.75, radius*.25, 1, 1, 1), this.materialInteractive));
        scene.add(mesh);
        return mesh;
    }

    initPhysicsGraphics() {

        this.materialDynamic = new THREE.MeshPhongMaterial( { color:0xfca400 } );
        this.materialStatic = new THREE.MeshPhongMaterial( { color:0x999999 } );
        this.materialInteractive =new THREE.MeshPhongMaterial( { color:0x990000 } );

        this.materialDynamic.wireframe = true;
        this.materialStatic.wireframe = true;
        this.materialInteractive.wireframe = true;

        this.materialDynamic.visible = false;
        this.materialStatic.visible = false;
        this.materialInteractive.visible = false;

    }


    initTextures() {

        this.textureLoader = new THREE.TextureLoader();
        this.groundTexture = this.textureLoader.load( '../ekf_localization/textures/granite_seamless_gravel.jpg' );

        this.groundTexture.wrapS = this.groundTexture.wrapT = THREE.RepeatWrapping;
        this.groundTexture.repeat.set( 200, 200 );
        this.groundTexture.anisotropy = 100;
        this.groundTexture.encoding = THREE.sRGBEncoding;

        this.groundMaterial = new THREE.MeshLambertMaterial( { map: this.groundTexture } );
        // this.groundMaterial = new THREE.MeshLambertMaterial( { color: 'gray' }  );
    }

    initRenderer() {

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.renderer.setSize(this.windowWidth, this.windowHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
    }


    initScene() {

        this.scene.background = new THREE.Color( 0xcce0ff );
        this.scene.fog = new THREE.Fog( 0xcce0ff, 10, 2500 );
    }

    addFloor() {

        // Floor 
        this.floor = new THREE.Mesh( new THREE.PlaneGeometry( 4000, 4000 ), this.groundMaterial );
        // floor.position.y = - 250;
        // floor.material.visible = false;
        this.floor.rotation.x = - Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add( this.floor );
    }

    addGUI() {

        const dat = require('dat.gui');
        this.gui = new dat.GUI();
    
        // dummy variables
        let params = { x: 1, y: 1, z: 1, w: 1, t: 1, f: 1 }
        this.gui.add(params, 'x').min(1).max(50).step(1);
        this.gui.add(params, 'y').min(1).max(50).step(1);

        let that = this;
        let debugObj = { 

            show: function() {

                console.log( that.camera.position );
                console.log( that.camera.rotation );
            }
        };
        this.gui.add(debugObj, 'show');
    }


    addLight() {

        var ambient = new THREE.AmbientLight( 0x666666 );
        this.scene.add( ambient );
        
        const light = new THREE.DirectionalLight( 0xdfebff, 1 );
        light.position.set( 50, 200, 100 );
        light.position.multiplyScalar( 1.3 );
        
        light.castShadow = true;
        
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        
        const d = 300;
        
        light.shadow.camera.left = - d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = - d;
        
        light.shadow.camera.far = 1000;
        
        this.scene.add( light );

        var quaternion = new THREE.Quaternion(0, 0, 0, 1);
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        
        this.pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.environment = this.pmremGenerator.fromScene( new THREE.RoomEnvironment(), 0.4 ).texture;
    }

    addCamera() {

        this.camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 2500 );

        // this.camera.position.set( 77.40, 3.29, -41.42 );
        // this.camera.rotation.set( -3.07, 0.07, 3.13 );   

        this.camera.position.set( 688, 114, 0 );
    }

    getCamera() {

        return this.camera;
    }

    addOrbitControl() {

        this.controls = new THREE.OrbitControls( this.getCamera(), this.canvas )
        this.controls.maxPolarAngle = Math.PI * 0.45;
        this.controls.minPolarAngle = Math.PI * 0.2;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 700;
    }

    addCar() {

        this.tyreRotationSpeed = 0.065;

        let that = this;
        that.loader.load( '../ekf_localization/truck_gmc/truck.gltf', function ( gltf ) {
        
            that.car = gltf.scene;
            that.car.rotation.y = Math.PI/2;
            that.car.position.y = -0.6;

            gltf.scene.scale.set(0.1, 0.1, 0.1);
            gltf.scene.scale.set(0.2, 0.2, 0.2);
            
            that.tyre_fr = that.car.children[0].children[0].children[0].children[0].children[0].children[1];
            that.tyre_fl = that.car.children[0].children[0].children[0].children[0].children[0].children[4];
            that.tyre_bl = that.car.children[0].children[0].children[0].children[0].children[0].children[2];
            that.tyre_br = that.car.children[0].children[0].children[0].children[0].children[0].children[3];
        
            that.tyre_fr.rotation.order = 'YZX';
            that.tyre_fl.rotation.order = 'YZX';
            that.tyre_bl.rotation.order = 'YZX';
            that.tyre_br.rotation.order = 'YZX';
    
            that.tyres.push(that.tyre_fr)
            that.tyres.push(that.tyre_fl)
            that.tyres.push(that.tyre_bl)
            that.tyres.push(that.tyre_br)
    
            that.scene.add(that.car);
        
        }, undefined, function ( error ) {
            console.error( error );
        } );        
    }

    addWall() {

        let that = this;
        that.loader.load( '../ekf_localization/damaged_wall/scene.gltf', function ( gltf ) {

            gltf.scene.rotation.y = Math.PI/2;
    
            let wall = gltf.scene;
    
            for(var i = 0; i < 13; i++) {
    
                let wall_back = wall.clone();
                wall_back.scale.set(0.2, 0.2, 0.2);
                wall_back.position.set(260, 0, (i*40)-240);
                that.scene.add(wall_back);
    
                let wall_front = wall.clone();
                wall_front.scale.set(0.2, 0.2, 0.2);
                wall_front.position.set(-260, 0, (i*40)-240);
                that.scene.add(wall_front);
    
                let wall_left = wall.clone();
                wall_left.rotation.y = Math.PI;
                wall_left.scale.set(0.2, 0.2, 0.2);
                // wall_left.position.set(-250, 0, (i*40)-240);
                wall_left.position.set(-(i*40)+240, 0, -260);
                that.scene.add(wall_left);
    
    
                let wall_right = wall.clone();
                wall_right.rotation.y = Math.PI;
                wall_right.scale.set(0.2, 0.2, 0.2);
                wall_right.position.set((i*40)-240, 0, 260);
                that.scene.add(wall_right);
    
            }
    
        }, undefined, function ( error ) {
            console.error( error );
        } );    
    }

    addCube(cube, x, z, y=300) {
        cube.position.x = x
        cube.position.y = y
        cube.position.z = z
        this.scene.add(cube);
    }

    addPoles() {

        let that = this;
        that.loader.load( '../ekf_localization/concrete_road_divider__game/scene.gltf', function ( gltf ) {

            gltf.scene.rotation.y = Math.PI/2;
            
            var bx = gltf.scene;
            bx.scale.set(20, 20, 20);
            
            var cube_1 = gltf.scene.clone();
            var cube_2 = gltf.scene.clone();
            var cube_3 = gltf.scene.clone();
            var cube_4 = gltf.scene.clone();
            var cube_5 = gltf.scene.clone();
    
            that.addCube(cube_1, -50, 200, 0);
            that.addCube(cube_2, -34, 200, 0);
            that.addCube(cube_3, -66, 200, 0);
            that.addCube(cube_4, -82, 200, 0);
            that.addCube(cube_5, -18, 200, 0);        
    
        }, undefined, function ( error ) {
            console.error( error );
        } );

        that.loader.load( '../ekf_localization/dirty_brick_mats/scene.gltf', function ( gltf ) {

            gltf.scene.rotation.y = Math.PI/2;
    
            let cube_1 = gltf.scene.children[0].children[0].children[0].children[0];
            let cube_2 = gltf.scene.children[0].children[0].children[0].children[1];
    
            cube_1.scale.set(0.05, 0.05, 0.05);
            cube_2.scale.set(0.1, 0.1, 0.1);
            cube_2.position.y = 300;
    
            var cube_1_1 = cube_1.clone();
            var cube_1_2 = cube_1.clone();
            var cube_1_3 = cube_1.clone();
            var cube_1_4 = cube_1.clone();
    
            that.addCube(cube_1_1, 100, 60, 7);        
            that.addCube(cube_1_2, 100, 70, 7);
            that.addCube(cube_1_3, 100, 80, 7);
            that.addCube(cube_1_4, 100, 67, 14);
    
    
            that.addCube(cube_2.clone(), 90, -90, 10);
    
        }, undefined, function ( error ) {
            console.error( error );
        } );
    
        that.loader.load( '../ekf_localization/concrete_block_low_poly/scene.gltf', function ( gltf ) {
                
            var bx = gltf.scene;
            bx.scale.set(10, 10, 10);
            
            var cube_1 = gltf.scene.clone();
            var cube_2 = gltf.scene.clone();
            var cube_3 = gltf.scene.clone();
    
            that.addCube(cube_1, -140, -60,  5);
            that.addCube(cube_2, -140, -100, 5);
            that.addCube(cube_3, -140, -80,  5);
        
        }, undefined, function ( error ) {
            console.error( error );
        } );
    
    }

}


module.exports = {
    RenderHelper,
    Particle,
    Robot
}