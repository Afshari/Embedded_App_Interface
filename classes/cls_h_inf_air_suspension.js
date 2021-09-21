
const THREE = require('three');


class RenderHelper {

    constructor( scene, canvas ) {

        this.scene = scene;
        this.canvas = canvas;

        this.windowWidth = 600;
        this.windowHeight = 400;
    
        this.shouldMoveCar = false;
        this.enableGUI = true;

        this.cameraOffset = 22;

        if(this.enableGUI) {
            this.addGUI();

            this.gui.add(this, 'cameraOffset').min(0).max(30).step(0.1).name('Camera Offset');
        }


        this.loader = new THREE.GLTFLoader();

        this.initRenderer();
        this.initTextures();
        this.initScene();

        this.pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.environment = this.pmremGenerator.fromScene( new THREE.RoomEnvironment(), 0.4 ).texture;

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
        this.scene.fog = new THREE.Fog( 0xcce0ff, 10, 1500 );
    }

    addFloor() {

        // Floor 
        this.floor = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), this.groundMaterial );
        // floor.position.y = - 250;
        // floor.material.visible = false;
        this.floor.rotation.x = - Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add( this.floor );
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
    
            // tyre_fl.add( axesHelper );
    
            that.tyre_fr.rotation.order = 'YZX';
            that.tyre_fl.rotation.order = 'YZX';
            that.tyre_bl.rotation.order = 'YZX';
            that.tyre_br.rotation.order = 'YZX';
    
            console.log(that.tyre_fl);
            that.tyre_fl.material.transparent = true;
            that.tyre_fl.opacity = 0.1;

            // tyres.push(tyre_fr)
            // tyres.push(tyre_fl)
            // tyres.push(tyre_bl)
            // tyres.push(tyre_br)
    
            that.scene.add(that.car);
            that.alignCameraWithCar();

            // console.log( that.car.position );
            // console.log( 'front right: ', that.tyre_fr.position );
            // console.log( 'front left:',   that.tyre_fl.position );
            // console.log( 'back left: ',   that.tyre_bl.position );
            // console.log( 'back right: ',  that.tyre_br.position );

            if(that.enableGUI) {

                that.gui.add(that.car.position, 'x').min(0).max(20).step(0.1).name('Car Pos x');
                that.gui.add(that.car.position, 'y').min(-10).max(10).step(0.1).name('Car Pos y');
                that.gui.add(that.car.position, 'z').min(-100).max(100).step(1).name('Car Pos z');
                


                // that.ll = new THREE.Vector3( that.car.position.x, that.car.position.y + 8, that.car.position.z );
                that.ll = new THREE.Vector3( that.car.position.x + 14, that.car.position.y + 3.5, -7 );
                // that.cc = new THREE.Vector3( that.cylinder.position.x, that.cylinder.position.y, that.cylinder.position.z );
                that.cc = new THREE.Vector3( that.cylinder.position.x, that.cylinder.position.y, -7 );
                // that.ll = that.car.position;

                that.gui.add(that.tyre_fl.position, 'x').min(-100).max(100).step(0.1).name('Tyre Left x');
                that.gui.add(that.tyre_fl.position, 'y').min(-100).max(100).step(0.1).name('Tyre Left y');
                that.gui.add(that.tyre_fl.position, 'z').min(-100).max(100).step(0.1).name('Tyre Left z');

                that.gui.add(that.cylinder.position, 'x').min(-100).max(100).step(0.1).name('Cylin Left x');
                that.gui.add(that.cylinder.position, 'y').min(-100).max(100).step(0.1).name('Cylin Left y');
                that.gui.add(that.cylinder.position, 'z').min(-100).max(100).step(0.1).name('Cylin Left z');


                that.gui.add(that.ll, 'x').min(0).max(20).step(0.1).name('ll x');
                that.gui.add(that.ll, 'y').min(0).max(20).step(0.1).name('ll y');

                that.gui.add(that.ll, 'z').min(-100).max(100).step(0.1).name('ll z');
                that.gui.add(that.cc, 'z').min(-100).max(100).step(0.1).name('cc z');
                // that.gui.add(cylinder.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01).name('Cylin Rot z');
            }

        
        }, undefined, function ( error ) {
            console.error( error );
        } );        

    }

    moveCar() {

        if(this.car !== undefined && this.shouldMoveCar === true) {

            this.car.position.x += 0.20;
            this.alignCameraWithCar();
            
            this.tyre_fr.rotation.x += this.tyreRotationSpeed;
            this.tyre_fl.rotation.x += this.tyreRotationSpeed;
            this.tyre_bl.rotation.x += this.tyreRotationSpeed;
            this.tyre_br.rotation.x += this.tyreRotationSpeed;
        }
    }

    resetCarPosition() {

        this.car.position.x = 0;
        this.car.position.y = -0.6;
    }

    alignCameraWithCar() {

        this.camera.position.x = this.car.position.x + this.cameraOffset;
    }

    addCylinder() {

        const geometry = new THREE.CylinderGeometry( 2.5, 2.5, 20, 32 );
        const material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
        // material.wireframe = true;
        this.cylinder = new THREE.Mesh( geometry, material );
        this.cylinder.rotation.x = -Math.PI/2;
        this.cylinder.position.x = 50;
        // this.cylinder.wireframe = true;
        this.scene.add( this.cylinder );

        if(this.enableGUI) {

            // this.gui.add(this.cylinder.position, 'y').min(-10).max(10).step(0.1).name('Cylin Pos y');
            // this.gui.add(this.cylinder.position, 'x').min(-100).max(100).step(1).name('Cylin Pos x');
            // this.gui.add(this.cylinder.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.01).name('Cylin Rot x');
            // this.gui.add(this.cylinder.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01).name('Cylin Rot z');
        }
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

        this.camera.position.set( 77.40, 3.29, -41.42 );
        this.camera.rotation.set( -3.07, 0.07, 3.13 );   
    }

    getCamera() {

        return this.camera;
    }

    addOrbitControl() {

        this.controls = new THREE.OrbitControls( this.getCamera(), this.canvas )
        // this.controls.maxPolarAngle = Math.PI * 0.45;
        // this.controls.minPolarAngle = Math.PI * 0.2;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 700;
    }

    render() {

        this.renderer.render( this.scene, this.camera );

        if(this.car !== undefined) {

            if(this.line !== undefined)
                this.scene.remove( this.line );

            this.ll = new THREE.Vector3( this.car.position.x + 13.8, this.car.position.y + 3.6, -7 );

            const points = [];
            points.push( this.cc );
            points.push( this.ll );

            if(this.shouldMoveCar === true) {

                if(this.cc.distanceTo( this.ll ) < 5.5) {
                
                    // console.log(this.cc.distanceTo( this.ll ));
                    this.car.position.y += 5.5 - this.cc.distanceTo( this.ll );
    
                } else if(  this.cc.distanceTo( this.ll ) > 5.5 && 
                            this.cc.distanceTo( this.ll ) < 6 && 
                            this.car.position.y > -0.6) {
    
                    this.car.position.y -=  this.cc.distanceTo( this.ll ) - 5.5;
                } else if( this.cc.distanceTo( this.ll ) > 6 ) {

                    this.car.position.y = -0.6;
                }
            }
            
            var geometry = new THREE.BufferGeometry().setFromPoints( points );

            var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
            this.line = new THREE.Line( geometry, material );
            this.scene.add( this.line );
        }
            
    }

}



module.exports = {
    RenderHelper,
}





