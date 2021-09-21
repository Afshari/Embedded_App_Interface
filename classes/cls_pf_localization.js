
require('../ekf_localization/GLTFLoader');
require('../ekf_localization/OrbitControls');
require('../ekf_localization/RoomEnvironment');

const Ammo = require('../ekf_localization/ammo');
require('../ekf_localization/Detector');
require('../ekf_localization/stats.min');


class RenderHelper {

    constructor( scene, canvas ) {

        this.scene = scene;
        this.canvas = canvas;

        this.windowWidth = 900;
        this.windowHeight = 600;
    
        this.shouldMoveCar = false;
        this.enableGUI = true;

        this.cameraOffset = 22;

        if(this.enableGUI) {
            this.addGUI();

            this.gui.add(this, 'cameraOffset').min(0).max(30).step(0.1).name('Camera Offset');
        }

        this.loader = new THREE.GLTFLoader();
        this.clock = new THREE.Clock();
        this.car = null;
        this.time = 0;
        this.tyres = []

        this.initRenderer();
        this.initTextures();
        this.initScene();
        // this.addCar();
        this.addWall();
        // this.addPoles();

        this.addLight();
        this.addFloor();
        this.addCamera();
        this.addOrbitControl();


        this.initPhysicsGraphics();
        this.initPhysics();
        this.addBoxes();

        this.actions = {};
        this.keysActions = {
            "KeyW": 'acceleration',
            "KeyS": 'braking',
            "KeyA": 'left',
            "KeyD": 'right'
        };
    

        var quaternion = new THREE.Quaternion(0, 0, 0, 1);
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        
        // this.createVehicle(new THREE.Vector3(0, 5, 0), quaternion);
    

        this.pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.environment = this.pmremGenerator.fromScene( new THREE.RoomEnvironment(), 0.4 ).texture;

    }

    initPhysicsGraphics() {

        this.materialDynamic = new THREE.MeshPhongMaterial( { color: 0xfca400 } );
        this.materialStatic = new THREE.MeshPhongMaterial( { color: 0x999999 } );
        this.materialInteractive =new THREE.MeshPhongMaterial( { color: 0x990000 } );

        this.materialDynamic.wireframe = true;
        this.materialStatic.wireframe = true;
        this.materialInteractive.wireframe = true;

        this.materialDynamic.visible = true;
        this.materialStatic.visible = true;
        this.materialInteractive.visible = true;

        let that = this;
        window.addEventListener( 'keydown', function(e) {
            if(that.keysActions[e.code]) {
                that.actions[that.keysActions[e.code]] = false;
                e.preventDefault();
                e.stopPropagation();
                return false;
            }    
        });
        window.addEventListener( 'keyup', function(e) {
            if(that.keysActions[e.code]) {
                that.actions[that.keysActions[e.code]] = true;
                e.preventDefault();
                e.stopPropagation();
                return false;
            }    
        }); 
    }

    initPhysics() {

        let that = this;
        // Physics configuration
        Ammo().then(function(Ammo) {

            that.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            that.dispatcher = new Ammo.btCollisionDispatcher( that.collisionConfiguration );
            that.broadphase = new Ammo.btDbvtBroadphase();
            that.solver = new Ammo.btSequentialImpulseConstraintSolver();
            that.physicsWorld = new Ammo.btDiscreteDynamicsWorld( that.dispatcher, that.broadphase, that.solver, that.collisionConfiguration );
            that.physicsWorld.setGravity( new Ammo.btVector3( 0, -9.82, 0 ) );

            // - Global variables -
            that.TRANSFORM_AUX = new Ammo.btTransform();

        });

        this.DISABLE_DEACTIVATION = 4;
        this.ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);
        this.syncList = [];
    }

    createBox(pos, quat, w, l, h, mass, friction) {

        let that = this;
        Ammo().then(function(Ammo) {

            var material = mass > 0 ? that.materialDynamic : that.materialStatic;
            var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
            var geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));

            if(!mass) mass = 0;
            if(!friction) friction = 1;

            var mesh = new THREE.Mesh(shape, material);
            mesh.position.copy(pos);
            mesh.quaternion.copy(quat);
            that.scene.add( mesh );

            var transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
            transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            var motionState = new Ammo.btDefaultMotionState(transform);

            var localInertia = new Ammo.btVector3(0, 0, 0);
            geometry.calculateLocalInertia(mass, localInertia);

            var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
            var body = new Ammo.btRigidBody(rbInfo);

            body.setFriction(friction);
            //body.setRestitution(.9);
            //body.setDamping(0.2, 0.2);

            that.physicsWorld.addRigidBody( body );

            if (mass > 0) {
                body.setActivationState(that.DISABLE_DEACTIVATION);
                // Sync physics and graphics
                function sync(dt) {
                    var ms = body.getMotionState();
                    if (ms) {
                        ms.getWorldTransform(TRANSFORM_AUX);
                        var p = TRANSFORM_AUX.getOrigin();
                        var q = TRANSFORM_AUX.getRotation();
                        mesh.position.set(p.x(), p.y(), p.z());
                        mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
                    }
                }

                that.syncList.push(sync);
            }
        });
    }

    addBoxes() {

        this.createBox(new THREE.Vector3(0, -0.5, 0), this.ZERO_QUATERNION, 550, 5, 550, 0, 2);

        this.createBox(new THREE.Vector3(100, 7, 70), this.ZERO_QUATERNION, 10, 10, 30, 0, 0);
        this.createBox(new THREE.Vector3(-140, 5, -80), this.ZERO_QUATERNION, 10, 10, 60, 0, 0);
        this.createBox(new THREE.Vector3(-50, 3, 200), this.ZERO_QUATERNION, 80, 5, 5, 0, 0);
        this.createBox(new THREE.Vector3(90, 7, -90), this.ZERO_QUATERNION, 20, 20, 20, 0, 0);

        this.createBox(new THREE.Vector3(260, 5, 5), this.ZERO_QUATERNION, 10, 15, 500, 0, 0);
        this.createBox(new THREE.Vector3(-260, 5, 5), this.ZERO_QUATERNION, 10, 15, 500, 0, 0);
        this.createBox(new THREE.Vector3(5, 5, -260), this.ZERO_QUATERNION, 500, 15, 10, 0, 0);
        this.createBox(new THREE.Vector3(5, 5, 260), this.ZERO_QUATERNION, 500, 15, 10, 0, 0);
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


    createVehicle(pos, quat) {

        let that = this;
        Ammo().then(function(Ammo) {

            var chassisWidth = 16;
            var chassisHeight = 2.5;
            var chassisLength = 40;
            var massVehicle = 800;

            var wheelAxisPositionBack = -12;
            var wheelHalfTrackBack = 8;
            var wheelAxisHeightBack = -1;
            var wheelRadiusBack = 2;
            var wheelWidthBack = 1;

            var wheelAxisFrontPosition = 12;
            var wheelHalfTrackFront = 8;
            var wheelAxisHeightFront = -1;
            var wheelRadiusFront = 2;
            var wheelWidthFront = 1;

            var friction = 100;
            var suspensionStiffness = 20.0;
            var suspensionDamping = 2.3;
            var suspensionCompression = 4.4;
            var suspensionRestLength = 0.6;
            // var rollInfluence = 0.2;
            var rollInfluence = 0.1;

            var steeringIncrement = .04;
            var steeringClamp = .5;
            var maxEngineForce = 700;
            var maxBreakingForce = 100;


            // Chassis
            var geometry = new Ammo.btBoxShape(new Ammo.btVector3(chassisWidth * .5, chassisHeight * .5, chassisLength * .5));
            var transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
            transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            var motionState = new Ammo.btDefaultMotionState(transform);
            var localInertia = new Ammo.btVector3(0, 0, 0);
            geometry.calculateLocalInertia(massVehicle, localInertia);
            var body = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(massVehicle, motionState, geometry, localInertia));
            body.setActivationState(that.DISABLE_DEACTIVATION);
            that.physicsWorld.addRigidBody(body);
            var chassisMesh = that.createChassisMesh(chassisWidth, chassisHeight, chassisLength);

            // Raycast Vehicle
            var engineForce = 0;
            var vehicleSteering = 0;
            var breakingForce = 0;
            var tuning = new Ammo.btVehicleTuning();
            var rayCaster = new Ammo.btDefaultVehicleRaycaster(that.physicsWorld);
            that.vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
            // window.vehicle = vehicle;
            that.vehicle.setCoordinateSystem(0, 1, 2);
            // that.physicsWorld.addAction(vehicle);

            // Wheels
            var FRONT_LEFT = 0;
            var FRONT_RIGHT = 1;
            var BACK_LEFT = 2;
            var BACK_RIGHT = 3;
            var wheelMeshes = [];
            var wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
            var wheelAxleCS = new Ammo.btVector3(-1, 0, 0);

            function addWheel(isFront, pos, radius, width, index) {

                var wheelInfo = that.vehicle.addWheel(
                        pos,
                        wheelDirectionCS0,
                        wheelAxleCS,
                        suspensionRestLength,
                        radius,
                        tuning,
                        isFront);

                wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
                wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
                wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
                wheelInfo.set_m_frictionSlip(friction);
                wheelInfo.set_m_rollInfluence(rollInfluence);

                wheelMeshes[index] = that.createWheelMesh(radius, width);
            }


            addWheel(true, new Ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_LEFT);
            addWheel(true, new Ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT);
            addWheel(false, new Ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_LEFT);
            addWheel(false, new Ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_RIGHT);

            window.wheels = wheelMeshes;
            var lastCoeff = 0;

            // Sync keybord actions and physics and graphics
            function sync(dt) {

                var speed = that.vehicle.getCurrentSpeedKmHour();
                // console.log(speed);

                // speedometer.innerHTML = (speed < 0 ? '(R) ' : '') + Math.abs(speed).toFixed(1) + ' km/h';

                breakingForce = 0;
                engineForce = 0;

                if (that.actions.acceleration) {
                    if (speed < -1)
                        breakingForce = maxBreakingForce;
                    else engineForce = maxEngineForce;
                }
                if (that.actions.braking) {
                    if (speed > 1)
                        breakingForce = maxBreakingForce;
                    else engineForce = -maxEngineForce / 2;
                }
                if (that.actions.left) {
                    if (vehicleSteering < steeringClamp)
                        vehicleSteering += steeringIncrement;
                }
                else {
                    if (that.actions.right) {
                        if (vehicleSteering > -steeringClamp)
                            vehicleSteering -= steeringIncrement;
                    }
                    else {
                        if (vehicleSteering < -steeringIncrement)
                            vehicleSteering += steeringIncrement;
                        else {
                            if (vehicleSteering > steeringIncrement)
                                vehicleSteering -= steeringIncrement;
                            else {
                                vehicleSteering = 0;
                            }
                        }
                    }
                }


                // if(speed > 900) 
                    // engineForce = 0;

                console.log(engineForce, vehicleSteering)

                that.vehicle.applyEngineForce(engineForce, BACK_LEFT);
                that.vehicle.applyEngineForce(engineForce, BACK_RIGHT);

                that.vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
                that.vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
                that.vehicle.setBrake(breakingForce, BACK_LEFT);
                that.vehicle.setBrake(breakingForce, BACK_RIGHT);

                that.vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
                that.vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);


                let pre_fr_y = wheelMeshes[0].rotation.y;

                var tm, p, q, i;
                var n = that.vehicle.getNumWheels();
                for (i = 0; i < n; i++) {
                    that.vehicle.updateWheelTransform(i, true);
                    tm = that.vehicle.getWheelTransformWS(i);
                    p = tm.getOrigin();
                    q = tm.getRotation();
                    wheelMeshes[i].position.set(p.x(), p.y(), p.z());
                    wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
                    

                    if(that.tyres.length == 0)
                        continue;


                    if(i < 2) {
                        if(vehicleSteering > 0)
                            that.tyres[i].rotation.z = Math.PI / 6;
                        else if(vehicleSteering < 0)
                            that.tyres[i].rotation.z = -Math.PI / 6;
                        else
                            that.tyres[i].rotation.z = 0;
                    }


                    if(Math.abs(speed) < 1.2)
                        continue;

                    var sclRotation = 0.02 * ( (speed / 15) + 1 );
                    if(engineForce > 0) {
                        that.tyres[i].rotation.x += sclRotation;
                        lastCoeff = 1;
                    } else if(engineForce < 0) {
                        that.tyres[i].rotation.x -= sclRotation;
                        lastCoeff = -1;
                    } else {
                        that.tyres[i].rotation.x += lastCoeff * sclRotation;
                    }
                    // tyres[i].rotation.y = Math.PI / 6;
                }

                tm = that.vehicle.getChassisWorldTransform();
                p = tm.getOrigin();
                q = tm.getRotation();
                chassisMesh.position.set(p.x(), p.y(), p.z());
                chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }

            that.syncList.push(sync);
        });
    }

    initTextures() {

        this.textureLoader = new THREE.TextureLoader();
        this.groundTexture = textureLoader.load( '../ekf_localization/textures/granite_seamless_gravel.jpg' );

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
    
            that.tyres.push(tyre_fr)
            that.tyres.push(tyre_fl)
            that.tyres.push(tyre_bl)
            that.tyres.push(tyre_br)
    
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

    render() {

        let that = this;

        Ammo().then(function(Ammo) {

            // requestAnimationFrame(animate);
            var quaternion = new THREE.Quaternion(0, 0, 0, 1);
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    
            that.createVehicle(new THREE.Vector3(0, 5, 0), quaternion);
            that.physicsWorld.addAction(that.vehicle);

            // var dt = that.clock.getDelta();
            // for (var i = 0; i < this.syncList.length; i++)
            //     this.syncList[i](dt);

            // that.physicsWorld.stepSimulation( dt, 10 );
            // that.controls.update( dt );

            // let vPos = that.vehicle.getChassisWorldTransform().getOrigin();
            // let vRot = that.vehicle.getChassisWorldTransform().getRotation();
            // chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
            // if(that.car !== null) {
            //     that.car.position.set(vPos.x(), vPos.y()-5, vPos.z());
            //     that.car.quaternion.set(vRot.x(), vRot.y(), vRot.z(), vRot.w());
            // }

            // that.renderer.render( that.scene, that.camera );
            // that.time += dt;

            var animate = function () {

                requestAnimationFrame(animate);

                var dt = that.clock.getDelta();

                for (var i = 0; i < that.syncList.length; i++)
                    that.syncList[i](dt);

                if( typeof(that.physicsWorld) != "undefined" ) {
                    // console.log('not that.physicsWorld ', that.physicsWorld)
                    that.physicsWorld.stepSimulation( dt, 10 );
                } else
                    console.log('that.physicsWorld ', that.physicsWorld)
                    
                that.renderer.render( that.scene, that.camera );
                time += dt;
            };

            animate();
        });
            
    }

}


module.exports = {
    RenderHelper,
}