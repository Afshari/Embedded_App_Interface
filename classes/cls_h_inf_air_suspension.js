
const THREE = require('three');
const { Matrix } = require('ml-matrix');


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

class HandleWorkFlow {

    constructor( estimator, ipcRenderer, windowWidth ) {

        this.state = State.ready;
        this.estimator = estimator;
        this.ipcRenderer = ipcRenderer;
        this.windowWidth = windowWidth;
        this.counter = windowWidth;
        // this.rnd = 1;
        this.rnd = 0;
        this.connection_type = "";
        this.uart = "";

    }

    handleConnect(ip, port) {
        this.ipcRenderer.send('estimating_passive_suspension:connect', ip, port);
    }

    handleStep() {

        if( this.isStatePause() ) {

            if( this.counter < this.estimator.n - 15 )
                this.counter += 15;
        } else if( this.isStateRunning() ) {
            
            window.showFlashMessage( "Algorithm is Running", "WARNING" )
        }
    }

    handlePause() {

        if( this.isStateRunning() ) {
            
            this.state2Pause();
            window.frameRate(4);
        }
    }

    handleRun( c_type, c_uart, tm ) {

        if( this.isStateReady() ) {

            this.state2SendingMeasurements();
            this.connection_type = c_type;
            this.uart = c_uart;
            this.estimator.init( parseInt(tm) )

            if(this.connection_type === "tcp")
                this.ipcRenderer.send('estimating_passive_suspension:tcp:send:measurements', estimator.Y.data[0], this.rnd, this.estimator.ITEM_PER_STEP );
            else if(this.connection_type === "uart")
                this.ipcRenderer.send('estimating_passive_suspension:uart:send:measurements', this.uart, 120, estimator.Y.data[0], this.rnd, this.estimator.ITEM_PER_STEP );

        } else if( this.isStatePause() ) {

            this.state2Running();
            window.frameRate(40);
        }
    }

    handleReset() {

    }

    handleReceivedValues( values ) {

        console.log(values)
        // console.log("rnd ", this.rnd)
        // console.log(this.isStateSendingMeasurements())
        // if(this.rnd <= this.estimator.Tf && this.isStateSendingMeasurements() ) {
        if(this.rnd <= (this.estimator.n - 1) && this.isStateSendingMeasurements() ) {

            for(var i = 0; i < values.length; i++) {    
                if(this.connection_type === "tcp") {
                    this.estimator.setTyreEstimated( this.rnd + i, parseInt( values[i].split(',')[1] ) );
                    this.estimator.setSuspensionEstimated( this.rnd + i, parseInt( values[i].split(',')[0] ) );
                } else if(this.connection_type === "uart") {
                    this.estimator.setTyreEstimated( this.rnd + i, parseInt( values[i] ) );
                    this.estimator.setSuspensionEstimated( this.rnd + i, parseInt( values[i] ) );
                }
            }
            
            console.log("rnd ", this.rnd)
            if(this.rnd < this.estimator.n - this.estimator.ITEM_PER_STEP - 1) {

                if(this.connection_type === "tcp") {
                    this.rnd += this.estimator.ITEM_PER_STEP;
                    this.ipcRenderer.send('estimating_passive_suspension:tcp:send:measurements', estimator.Y.data[0], this.rnd, this.estimator.ITEM_PER_STEP );
                } else if(this.connection_type === "uart") {
                    this.rnd += this.estimator.ITEM_PER_STEP;
                    this.ipcRenderer.send('estimating_passive_suspension:uart:send:measurements', this.uart, 121, estimator.Y.data[0], this.rnd, this.estimator.ITEM_PER_STEP );
                }


                // this.ipcRenderer.send('estimating_passive_suspension:send:measurements', this.estimator.Y.data[0], this.rnd);
            } else {
    
                this.state2Running();
                window.frameRate(40);
            }
        } 
    }


    isStateReady() { return this.state == State.ready; }

    isStateSendingMeasurements() { return this.state == State.sendingMeasurements; }

    isStateRunning() { return this.state == State.running; }

    isStatePause() { return this.state == State.pause; }

    isStateFinish() { return this.state == State.finish; }

    state2Pause() { this.state = State.pause; }

    state2Running() { this.state = State.running; }

    state2SendingMeasurements() { this.state = State.sendingMeasurements; }

    state2Finish() { this.state = State.finish; }


}

class SuspensionController {

    static scl = 333;

    constructor() {

        this.init( 12 )
    }

    init( tm ) {

        this.passiveSuspension      = []
        this.passiveTyre            = []
        this.activeSuspnsion        = []
        this.activeTyre             = []
        this.zr                     = []
        this.zrFile                 = []
        this.zrdot                  = []
        this.zrdotFile              = []

        this.meter2Pixel = 500;

        
        this.dt = 0.001;
        this.tf = 20;
        this.t  = []
        this.nt = this.tf / this.dt;
        var tmp_t = 0;
        for(var i = 0; i <= this.nt; i++) {
            this.t.push( tmp_t );
            tmp_t += this.dt;
        }

        this.nu = 1;
        this.nx = 4;
        this.nz = 3;

        this.a      = 0.1;
        this.l      = 2;
        this.v0     = 45/3.6;
        this.nb     = 0;
        this.zr     = [];
        this.zrdot  = [];

        this.generateBumpRoad();

        this.ms     =   Matrix.ones(1, this.nt).mul( 572.2 );
        this.x1r    =   Matrix.ones(1, this.nt).mul( 0.01 );
        this.xr     =   new Matrix( [ [1], [-3.9559*1e-6], [0], [0] ] ).mmul(this.x1r);
        this.ur     =   this.x1r.mul( 42720 );
        
        this.x  =   Matrix.zeros(this.nx,  this.nt+1);
        this.xp =   Matrix.zeros(this.nx,  this.nt+1);           // initialization of the state vector (passive suspension)
        this.u  =   Matrix.zeros(this.nu,  this.nt);             // initialization of the input
        this.z  =   Matrix.zeros(this.nz,  this.nt);             // controlled output of the active suspension
        this.zp =   Matrix.zeros(this.nz,  this.nt);             // controlled output of the passive suspension

        this.mu =   113.6;                   // unsprung mass
        this.ks =   42719.6;                 // stiffness of passive suspension
        this.cs =   1095;                    // damping of passive suspension
        this.kt =   101115;                  // stiffness of pneumatic tire
        this.ct =   14.6;                    // damping of pneumatic tire


        this.alpha  =   21;                     // positive weighting for suspension deflection
        this.beta   =   42;                     // positive weighting for tire deflection

        this.D = new Matrix( [ [ 0, -1, 0, this.ct/this.mu ] ] ).transpose()
        
        this.w = new Matrix( [ this.zrdot ] );


        for(var i = 0; i < this.nt; i++) {

            this.A = new Matrix( [  
                [ 0,                            0,                      1,                           -1 ],
                [ 0,                            0,                      0,                            1 ],
                [-this.ks/this.ms.get(0, i),    0,                      -this.cs/this.ms.get(0, i),   this.cs/this.ms.get(0, i) ],
                [this.ks/this.mu,               -this.kt/this.mu,        this.cs/this.mu,           -(this.cs+this.ct)/this.mu] ]);

            this.B  =  new Matrix( [ [0], [0], [1/this.ms.get(0, i)], [-1/this.mu] ]);

            this.C1 =  new Matrix( [ 
                [  -this.ks/this.ms.get(0, i),  0,          -this.cs/this.ms.get(0, i),     this.cs/this.ms.get(0, i) ],
                [   this.alpha,                 0,          0,                              0 ],
                [   0,                          this.beta,  0,                              0 ] ] );

            this.D12 = new Matrix( [ [1/this.ms.get(0, i)], [0], [0] ] );

            // xp(:, i + 1) = xp(:,i) + ( A * xp(:,i) + D * w(i) ) * dt
            // var col3 = two_d.map(function(value,index) { return value[2]; });
            var curr_xp = new Matrix( [ this.xp.data.map(function(value, index) { return value[i]; }) ] ).transpose();
            var tmp_xp = Matrix.add( curr_xp, Matrix.add( this.A.mmul( curr_xp ), Matrix.mul( this.D, this.w.get(0, i) ) ).mul( this.dt ) );
            for(var j = 0; j < tmp_xp.rows; j++) {
                this.xp.set(j, i+1, tmp_xp.get(j, 0))
            }
        }

        // console.log('xp ', this.xp);
        console.log('ms ', this.ms.get(0, 0))
        console.log('A ', this.A)
        this.xp_suspension      = Object.values( this.xp.data[0] )
        this.xp_tyre            = Object.values( this.xp.data[1] )

        // const dt = 0.001;
        // this.ITEM_PER_STEP = 50;
        // this.Tf = tm;
        // // this.Tf = 3;
        // this.n = this.Tf / dt;

        // this.F =  new Matrix( [ [ 9.99790784e-01,  4.43388313e-04,  9.94567510e-04, -9.94355552e-04],
        //                         [ 1.87325040e-04,  9.99556443e-01,  4.86406564e-06,  9.94923911e-04],
        //                         [-4.37024544e-02, -5.05893846e-04,  9.98857916e-01,  1.14184268e-03],
        //                         [ 3.73930206e-01, -8.85578620e-01,  9.77200224e-03,  9.89656572e-01] ] );

        // this.H = Matrix.reshapeFrom( [1, 0, 0, 0], 1, 4 );
        // this.R = new Matrix( [ (1e-3)**2 ] );

        // this.nx = this.F.rows;
        // this.ny = this.H.rows;

        // this.x = Matrix.zero(this.nx, this.n);
        // this.xhat = Matrix.zero(this.nx, this.n);
        // this.Y = Matrix.zero(this.ny, this.n);

        // SuspensionEstimator.replaceMatrixColumn(this.x, [0.1, 0, 0, 0], 0);

        // for(var i = 0; i < this.n - 1; i++)
        //     SuspensionEstimator.genData(this.F, this.x, i);
            
        // for(i = 0; i < this.n; i++)
        //     SuspensionEstimator.setMeasurement(this.H, this.x, this.Y, i);
    }

    // Active Tyre
    setActiveTyre(i, value) {        
        // this.xhat.data[1][i] = value;
    }
    getActiveTyre(i) {
        // return -this.xhat.data[1][i];
        return this.activeTyre[i] * this.meter2Pixel;
    }

    // Passive Tyre
    setPassiveTyre(i, value) {        
        // this.xhat.data[1][i] = value;
    }
    getPassiveTyre(i) {
        return this.xp_tyre[i] * this.meter2Pixel;
    }
    getPassiveTyreFile(i) {
        return this.passiveTyre[i] * this.meter2Pixel;
    }

    // Active Suspension
    setActiveSuspension(i, value) {        
        // this.xhat.data[0][i] = value;
    }
    getActiveSuspension(i) {
        // return -this.x.data[0][i] * SuspensionEstimator.scl;
        return this.activeSuspension[i] * this.meter2Pixel;
    }

    // Passive Suspension
    setPassiveSuspension(i, value) {        
        // this.xhat.data[0][i] = value;
    }
    getPassiveSuspension(i) {
        return this.xp_suspension[i] * this.meter2Pixel;
    }
    getPassiveSuspensionFile(i) {
        return this.passiveSuspension[i] * this.meter2Pixel;
    }


    getZr(i) {
        return -this.zr[i] * this.meter2Pixel;
    }
    getZrFile(i) {
        return -this.zrFile[i] * this.meter2Pixel;
    }
    getZrdotFile(i) {
        return this.zrdotFile[i] * 50;
    }
    getZrdot(i) {
        return this.zrdot[i] * 50;
    }


    addStarterValues( count ) {
        let zeroArray = []
        for(var i = 0; i < count; i++) {
            zeroArray.push(0)
        }
        this.activeTyre         = zeroArray.concat(this.activeTyre)
        this.passiveTyre        = zeroArray.concat(this.passiveTyre)
        this.activeSuspension   = zeroArray.concat(this.activeSuspension)
        this.passiveSuspension  = zeroArray.concat(this.passiveSuspension)

        this.zr         = zeroArray.concat(this.zr)
        this.zrFile     = zeroArray.concat(this.zrFile)
        this.zrdot      = zeroArray.concat(this.zrdot)
        this.zrdotFile  = zeroArray.concat(this.zrdotFile)

        
        this.xp_suspension = zeroArray.concat(this.xp_suspension)
        this.xp_tyre = zeroArray.concat(this.xp_tyre)
    }

    generateBumpRoad() {

        const gv = this.l / this.v0;
        var vl = 0;

        for(var i = 0; i < this.t.length; i++) {
            if(this.t[i] < gv && vl < this.t[i]) {
                vl = this.t[i];
                this.nb = i;
            }
        }

        for(var i = 0; i < this.nb; i++) {
            var theta = 2 * Math.PI * this.v0 * this.t[i] / this.l;
            this.zr.push( 0.5 * this.a * (1-Math.cos(theta)) );
        }
        for(var i = this.nb; i < this.nt; i++) {
            this.zr.push( 0 );
        }

        
        for(var i = 0; i < this.nb; i++) {
            var theta = 2 * Math.PI * this.v0 * this.t[i] / this.l;
            this.zrdot.push( this.a * Math.PI * this.v0 / this.l * Math.sin(theta) );
        }
        for(var i = this.nb; i < this.nt; i++) {
            this.zrdot.push( 0 );
        }
    }

    drawZrdot( counter, windowWidth ) {

        var firstValue = counter - windowWidth;
        for(var i = counter - windowWidth; i < counter; i++) {
            window.stroke(0);
            window.point(i - firstValue, this.getZrdotFile(i));
            window.stroke(255, 0, 0);
            window.point(i - firstValue, this.getZrdot(i) - 100);
        }
    }

    drawZr( counter, windowWidth ) {

        var firstValue = counter - windowWidth;
        for(var i = counter - windowWidth; i < counter; i++) {
            window.stroke(0);
            window.point(i - firstValue, this.getZrFile(i));
            window.stroke(255, 0, 0);
            window.point(i - firstValue, this.getZr(i) - 100);
        }

    }

    getSuspensionMeasurement(i) {
        // return -this.Y.data[0][i] * SuspensionEstimator.scl;
    }

    static replaceMatrixColumn(arr, val, idx) {

        // arr.data[0][idx] = val[0];
        // arr.data[1][idx] = val[1];
        // arr.data[2][idx] = val[2];
        // arr.data[3][idx] = val[3];
    }

    static setMeasurement(H, x, Y, idx) {

        // let n_x = Matrix.reshapeFrom( [ x.data[0][idx], x.data[1][idx], x.data[2][idx], x.data[3][idx] ], 4, 1 );

        // let t_x = H.dot( n_x ).data;

        // Y.data[0][idx] = parseInt( ( t_x[0][0] + ( (Math.random()-0.5) * 0.04 ) ) * SuspensionEstimator.scl );
    }

    static genData(F, x, idx) {

        // let n_x = Matrix.reshapeFrom( [ x.data[0][idx], x.data[1][idx], x.data[2][idx], x.data[3][idx] ], 4, 1 );

        // let t_x = F.dot( n_x ).data;

        // x.data[0][idx+1] = t_x[0][0] + ( (Math.random()-0.5) * 0.005 );
        // x.data[1][idx+1] = t_x[1][0] + ( (Math.random()-0.5) * 0.005 );
        // x.data[2][idx+1] = t_x[2][0] + ( (Math.random()-0.5) * 0.005 );
        // x.data[3][idx+1] = t_x[3][0] + ( (Math.random()-0.5) * 0.005 );
    }
}


class DrawHelper {

    constructor( controller, windowWidth ) {

        this.controller     = controller;
        this.windowWidth    = windowWidth;
        this.halfWidth      = windowWidth/2;
    }

    suspensionOffset() {
        return -225;
    }

    tyreOffset() {
        return -50;
    }

    // Passive
    drawPassiveTopSuspension( counter ) {

        const suspensionOffset = this.suspensionOffset();

        window.line(this.windowWidth/2+35, this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2+35, this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 125 );
        window.line(this.windowWidth/2+25, this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 125, 
                    this.windowWidth/2+45, this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 125 );
    }

    drawPassiveBottomSuspension( counter ) {

        const tyreOffset = this.tyreOffset();

        window.line(this.windowWidth/2+25, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+25, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset - 125 );
        window.line(this.windowWidth/2+45, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+45, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset - 125 );
        // window.stroke(0);
        // window.fill(0);
        window.rectMode(window.CORNER);
        window.rect(this.windowWidth/2+25, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset, 20, -10);
    }


    drawPassiveDamper( counter ) {

        const suspensionOffset = this.suspensionOffset();
        const tyreOffset = this.tyreOffset();
    
        window.line(this.windowWidth/2-35, this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2-35, this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 75 );
        window.line(this.windowWidth/2-35, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2-35, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset - 50 );
        
        var pUp     = this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 75;
        var pBottom = this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset - 50;
        
        var p1 = pBottom - Math.abs(pUp - pBottom)/9;
        var p2 = p1 - Math.abs(pUp - pBottom)/9;
        var p3 = p2 - Math.abs(pUp - pBottom)/9;
        var p4 = p3 - Math.abs(pUp - pBottom)/9;
        var p5 = p4 - Math.abs(pUp - pBottom)/9;
        var p6 = p5 - Math.abs(pUp - pBottom)/9;
        var p7 = p6 - Math.abs(pUp - pBottom)/9;
        var p8 = p7 - Math.abs(pUp - pBottom)/9;
        
        window.line(this.windowWidth/2-35, pBottom, this.windowWidth/2-45, p1);
        window.line(this.windowWidth/2-45, p1, this.windowWidth/2-25, p2);
        window.line(this.windowWidth/2-25, p2, this.windowWidth/2-45, p3);
        window.line(this.windowWidth/2-45, p3, this.windowWidth/2-25, p4);
        window.line(this.windowWidth/2-25, p4, this.windowWidth/2-45, p5);
        window.line(this.windowWidth/2-45, p5, this.windowWidth/2-25, p6);
        window.line(this.windowWidth/2-25, p6, this.windowWidth/2-45, p7);
        window.line(this.windowWidth/2-45, p7, this.windowWidth/2-25, p8);
        window.line(this.windowWidth/2-25, p8, this.windowWidth/2-35, pUp);
    }

    drawPassive( counter ) {

        window.fill(220, 128);
        window.stroke(255, 0, 0, 128);
        window.rectMode(window.CENTER);
        window.rect(this.windowWidth/2, this.controller.getPassiveSuspension(counter-this.halfWidth) + this.suspensionOffset(), 150, 50);
        window.ellipseMode(window.CENTER);
        window.fill(255, 0, 0, 128);
        window.circle(this.windowWidth/2, this.controller.getPassiveTyre(counter-this.halfWidth), 30);
        
        window.line(this.windowWidth/2-50, this.controller.getPassiveTyre(counter-this.halfWidth) - 50, 
                    this.windowWidth/2+50, this.controller.getPassiveTyre(counter-this.halfWidth) - 50 );
        
        window.line(this.windowWidth/2, this.controller.getPassiveTyre(counter-this.halfWidth), 
                    this.windowWidth/2, this.controller.getPassiveTyre(counter-this.halfWidth) - 50 );
            
        this.drawPassiveBottomSuspension( counter );
        this.drawPassiveTopSuspension( counter );
        this.drawPassiveDamper( counter );

    }
    

    // Active
    drawActiveTopSuspension( counter ) {

        const suspensionOffset = this.suspensionOffset();

        window.line(this.windowWidth/2+35, this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2+35, this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 125 );
        window.line(this.windowWidth/2+25, this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 125, 
                    this.windowWidth/2+45, this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 125 );
    }

    drawActiveBottomSuspension( counter ) {

        const tyreOffset = this.tyreOffset();

        window.line(this.windowWidth/2+25, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+25, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset - 125 );
        window.line(this.windowWidth/2+45, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+45, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset - 125 );
        // window.stroke(0);
        // window.fill(0);
        window.rectMode(window.CORNER);
        window.rect(this.windowWidth/2+25, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset, 20, -10);
    }


    drawActiveDamper( counter ) {

        const suspensionOffset = this.suspensionOffset();
        const tyreOffset = this.tyreOffset();
    
        window.line(this.windowWidth/2-35, this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2-35, this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 75 );
        window.line(this.windowWidth/2-35, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2-35, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset - 50 );
        
        var pUp     = this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 75;
        var pBottom = this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset - 50;
        
        var p1 = pBottom - Math.abs(pUp - pBottom)/9;
        var p2 = p1 - Math.abs(pUp - pBottom)/9;
        var p3 = p2 - Math.abs(pUp - pBottom)/9;
        var p4 = p3 - Math.abs(pUp - pBottom)/9;
        var p5 = p4 - Math.abs(pUp - pBottom)/9;
        var p6 = p5 - Math.abs(pUp - pBottom)/9;
        var p7 = p6 - Math.abs(pUp - pBottom)/9;
        var p8 = p7 - Math.abs(pUp - pBottom)/9;
        
        window.line(this.windowWidth/2-35, pBottom, this.windowWidth/2-45, p1);
        window.line(this.windowWidth/2-45, p1, this.windowWidth/2-25, p2);
        window.line(this.windowWidth/2-25, p2, this.windowWidth/2-45, p3);
        window.line(this.windowWidth/2-45, p3, this.windowWidth/2-25, p4);
        window.line(this.windowWidth/2-25, p4, this.windowWidth/2-45, p5);
        window.line(this.windowWidth/2-45, p5, this.windowWidth/2-25, p6);
        window.line(this.windowWidth/2-25, p6, this.windowWidth/2-45, p7);
        window.line(this.windowWidth/2-45, p7, this.windowWidth/2-25, p8);
        window.line(this.windowWidth/2-25, p8, this.windowWidth/2-35, pUp);
    }


    drawActive( counter ) {

        window.fill(220, 128);
        window.stroke(0, 0, 255, 128);
        window.rectMode(window.CENTER);
        window.rect(this.windowWidth/2, this.controller.getActiveSuspension(counter-this.halfWidth) + this.suspensionOffset(), 150, 50);
        window.ellipseMode(window.CENTER);
        window.fill(0, 0, 255, 128);
        window.circle(this.windowWidth/2, this.controller.getActiveTyre(counter-this.halfWidth), 30);
        
        window.line(this.windowWidth/2-50, this.controller.getActiveTyre(counter-this.halfWidth) - 50, 
                    this.windowWidth/2+50, this.controller.getActiveTyre(counter-this.halfWidth) - 50 );
        
        window.line(this.windowWidth/2, this.controller.getActiveTyre(counter-this.halfWidth), 
                    this.windowWidth/2, this.controller.getActiveTyre(counter-this.halfWidth) - 50 );

        this.drawActiveBottomSuspension( counter );
        this.drawActiveTopSuspension( counter );
        this.drawActiveDamper( counter );

    }

}



module.exports = {
    RenderHelper,
    DrawHelper,
    SuspensionController,
    HandleWorkFlow
}





