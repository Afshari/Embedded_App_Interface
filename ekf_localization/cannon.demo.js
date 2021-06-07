/* global CANNON,THREE,Detector */

CANNON = CANNON || {};


CANNON.Demo = function(pScene, pLight, pCamera, pControls, pRenderer, pAmbient, options) {

    var that = this;
    this.scene = pScene;
    this.light = pLight;
    this.camera = pCamera;
    this.controls = pControls;
    this.renderer = pRenderer;
    this.ambient = pAmbient;

    // API
    this.addScene = addScene;
    this.restartCurrentScene = restartCurrentScene;
    this.animate = animate;
    
    this.start = start;

    // Global settings
    var settings = this.settings = {
        stepFrequency: 60,
        quatNormalizeSkip: 2,
        quatNormalizeFast: true,
        gx: 0,
        gy: 0,
        gz: 0,
        iterations: 3,
        tolerance: 0.0001,
        k: 1e6,
        d: 3,
        scene: 0,
        paused: false,
        rendermode: "solid",
        constraints: false,
        contacts: false,  // Contact points
        cm2contact: false, // center of mass to contact points
        normals: false, // contact normals
        axes: false, // "local" frame axes
        particleSize: 0.1,
        shadows: false,
        aabbs: false,
        profiling: false,
        maxSubSteps:3
    };

    // Extend settings with options
    options = options || { };
    for(var key in options) {
        if(key in settings) {
            settings[key] = options[key];
        }
    }

    if(settings.stepFrequency % 60 !== 0) {
        throw new Error("stepFrequency must be a multiple of 60.");
    }

    var bodies = this.bodies = [];
    var visuals = this.visuals = [];

    var gui = null;

    // Material
    var materialColor = 0xdddddd;
    var solidMaterial = new THREE.MeshLambertMaterial( { color: materialColor } );

    var wireframeMaterial = new THREE.MeshLambertMaterial( { color: 0xffffff, wireframe:true } );
    this.currentMaterial = solidMaterial;


    // Create physics world
    var world = this.world = new CANNON.World();
    world.broadphase = new CANNON.NaiveBroadphase();

    var renderModes = [ "solid", "wireframe" ];

    function updategui() {
        if(gui) {
            // First level
            for (var i in gui.__controllers) {
                gui.__controllers[i].updateDisplay();
            }

            // Second level
            for (var f in gui.__folders) {
                for (var i in gui.__folders[f].__controllers) {
                    gui.__folders[f].__controllers[i].updateDisplay();
                }
            }
        }
    }

    var initfunc;

    function setRenderMode(mode) {

        if(renderModes.indexOf(mode) === -1) {
            throw new Error("Render mode " + mode + " not found!");
        }

        switch(mode) {

            case "solid":
                that.currentMaterial = solidMaterial;
                this.light.intensity = 1;
                ambient.color.setHex(0x222222);
                break;
            case "wireframe":
                that.currentMaterial = wireframeMaterial;
                this.light.intensity = 0;
                ambient.color.setHex(0xffffff);
                break;
        }

        function setMaterial(node,mat) {
            if(node.material) {
                node.material = mat;
            }
            for(var i = 0; i < node.children.length; i++) {
                setMaterial(node.children[i],mat);
            }
        }
        for(var i = 0; i < visuals.length; i++) {
            setMaterial(visuals[i],that.currentMaterial);
        }
        settings.rendermode = mode;
    }

    function addScene(pInitfunc) {

        initfunc = pInitfunc;
    }

    function restartCurrentScene() {

        var N = bodies.length;
        for(var i = 0; i < N; i++) {
            var b = bodies[i];
            b.position.copy(b.initPosition);
            b.velocity.copy(b.initVelocity);
            if(b.initAngularVelocity) {
                b.angularVelocity.copy(b.initAngularVelocity);
                b.quaternion.copy(b.initQuaternion);
            }
        }
    }


    function updateVisuals() {

        var N = bodies.length;

        // Read position data into visuals
        for(var i=0; i < N; i++){
            var b = bodies[i], visual = visuals[i];
            visual.position.copy(b.position);
            if(b.quaternion){
                visual.quaternion.copy(b.quaternion);
            }
        }

    }

    if (!Detector.webgl){
        Detector.addGetWebGLMessage();
    }

    init();
    // animate();

    function init() {
        
        //light.shadowCameraVisible = true;
        world.doProfiling = false;

    }


    function animate() {

        // requestAnimationFrame( animate );
        if(!settings.paused) {
            updateVisuals();
            updatePhysics();
            // console.log("Animate")
        }
        // render();
    }

    var lastCallTime = 0;
    function updatePhysics() {
        // Step world
        var timeStep = 1 / settings.stepFrequency;

        var now = Date.now() / 1000;

        if(!lastCallTime) {
            // last call time not saved, cant guess elapsed time. Take a simple step.
            world.step(timeStep);
            lastCallTime = now;
            return;
        }

        var timeSinceLastCall = now - lastCallTime;

        world.step(timeStep, timeSinceLastCall, settings.maxSubSteps);

        lastCallTime = now;
    }


    function render() {

        // this.controls.update();
        // this.renderer.clear();
        // this.renderer.render( this.scene, this.camera );
    }

    document.addEventListener('keypress',function(e) {

        if(e.keyCode){
            switch(e.keyCode){
            case 32: // Space - restart
                restartCurrentScene();
                break;

            case 99: // c - constraints
                settings.constraints = !settings.constraints;
                updategui();
                break;

            case 112: // p
                settings.paused = !settings.paused;
                updategui();
                break;

            case 115: // s
                var timeStep = 1 / settings.stepFrequency;
                world.step(timeStep);
                updateVisuals();
                break;

            case 109: // m - toggle materials
                var idx = renderModes.indexOf(settings.rendermode);
                idx++;
                idx = idx % renderModes.length; // begin at 0 if we exceeded number of modes
                setRenderMode(renderModes[idx]);
                updategui();
                break;

            }
        }
    });



    function start() {
    
        // Remove current bodies and visuals
        var num = visuals.length;
        for(var i=0; i<num; i++) {
            world.remove(bodies.pop());
            var mesh = visuals.pop();
            that.scene.remove(mesh);
        }
        // Remove all constraints
        while(world.constraints.length) {
            world.removeConstraint(world.constraints[0]);
        }

        // Run the user defined "build scene" function
        initfunc();

        // Read the newly set data to the gui
        settings.iterations = world.solver.iterations;
        settings.gx = world.gravity.x+0.0;
        settings.gy = world.gravity.y+0.0;
        settings.gz = world.gravity.z+0.0;
        settings.quatNormalizeSkip = world.quatNormalizeSkip;
        settings.quatNormalizeFast = world.quatNormalizeFast;
        updategui();

    }

};

CANNON.Demo.prototype = new CANNON.EventTarget();
CANNON.Demo.constructor = CANNON.Demo;

CANNON.Demo.prototype.setGlobalSpookParams = function(k, d, h) {

    var world = this.world;

    // Set for all constraints
    for(var i=0; i<world.constraints.length; i++){
        var c = world.constraints[i];
        for(var j=0; j<c.equations.length; j++){
            var eq = c.equations[j];
            eq.setSpookParams(k,d,h);
        }
    }

    // Set for all contact materals
    for(var i=0; i<world.contactmaterials.length; i++){
        var cm = world.contactmaterials[i];
        cm.contactEquationStiffness = k;
        cm.frictionEquationStiffness = k;
        cm.contactEquationRelaxation = d;
        cm.frictionEquationRelaxation = d;
    }

    world.defaultContactMaterial.contactEquationStiffness = k;
    world.defaultContactMaterial.frictionEquationStiffness = k;
    world.defaultContactMaterial.contactEquationRelaxation = d;
    world.defaultContactMaterial.frictionEquationRelaxation = d;
};

CANNON.Demo.prototype.getWorld = function() {
    return this.world;
};

CANNON.Demo.prototype.addVisual = function(body) {
    var s = this.settings;
    // What geometry should be used?
    var mesh;
    if(body instanceof CANNON.Body){
        mesh = this.shape2mesh(body);
    }
    if(mesh) {
        // Add body
        this.bodies.push(body);
        this.visuals.push(mesh);
        body.visualref = mesh;
        body.visualref.visualId = this.bodies.length - 1;
        //mesh.useQuaternion = true;
        this.scene.add(mesh);
    }
};




CANNON.Demo.prototype.shape2mesh = function(body) {
    var wireframe = this.settings.renderMode === "wireframe";
    var obj = new THREE.Object3D();

    for (var l = 0; l < body.shapes.length; l++) {
        var shape = body.shapes[l];

        var mesh;
        console.log('Shape Type: ', shape.type);
        console.log(shape);

        switch(shape.type){


        // case CANNON.Shape.types.CONVEXPOLYHEDRON:
        case CANNON.Shape.types.CYLINDER:
        case CANNON.Shape.types.SPHERE:
        case CANNON.Shape.types.BOX:
            var box_geometry = new THREE.BoxGeometry(  shape.halfExtents.x*2,
                                                        shape.halfExtents.y*2,
                                                        shape.halfExtents.z*2 );
            mesh = new THREE.Mesh( box_geometry, this.currentMaterial );
            break;

        case CANNON.Shape.types.CONVEXPOLYHEDRON:
            var geo = new THREE.BufferGeometry();

            // Add vertices
            var positions = new Float32Array( shape.vertices.length * 3 );
            for (var i = 0; i < shape.vertices.length; i++) {
                var v = shape.vertices[i];
                // geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
                var index = 3 * i;
                // positions
                positions[ index     ] = v.x;
                positions[ index + 1 ] = v.y;
                positions[ index + 2 ] = v.z;

            }

            // for(var i=0; i < shape.faces.length; i++){
            //     var face = shape.faces[i];

            //     // add triangles
            //     var a = face[0];
            //     for (var j = 1; j < face.length - 1; j++) {
            //         var b = face[j];
            //         var c = face[j + 1];
            //         geo.faces.push(new THREE.Face3(a, b, c));
            //     }
            // }
            geo.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

            geo.computeBoundingSphere();
            geo.computeFaceNormals();
            mesh = new THREE.Mesh( geo, this.currentMaterial );
            break;

        case CANNON.Shape.types.HEIGHTFIELD:
            // var geometry = new THREE.Geometry();

            // var v0 = new CANNON.Vec3();
            // var v1 = new CANNON.Vec3();
            // var v2 = new CANNON.Vec3();
            // for (var xi = 0; xi < shape.data.length - 1; xi++) {
            //     for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
            //         for (var k = 0; k < 2; k++) {
            //             shape.getConvexTrianglePillar(xi, yi, k===0);
            //             v0.copy(shape.pillarConvex.vertices[0]);
            //             v1.copy(shape.pillarConvex.vertices[1]);
            //             v2.copy(shape.pillarConvex.vertices[2]);
            //             v0.vadd(shape.pillarOffset, v0);
            //             v1.vadd(shape.pillarOffset, v1);
            //             v2.vadd(shape.pillarOffset, v2);
            //             geometry.vertices.push(
            //                 new THREE.Vector3(v0.x, v0.y, v0.z),
            //                 new THREE.Vector3(v1.x, v1.y, v1.z),
            //                 new THREE.Vector3(v2.x, v2.y, v2.z)
            //             );
            //             var i = geometry.vertices.length - 3;
            //             geometry.faces.push(new THREE.Face3(i, i+1, i+2));
            //         }
            //     }
            // }
            // geometry.computeBoundingSphere();
            // geometry.computeFaceNormals();
            // mesh = new THREE.Mesh(geometry, this.currentMaterial);
            break;


        }

        if(mesh) {
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            if(mesh.children){
                for(var i=0; i<mesh.children.length; i++){
                    mesh.children[i].castShadow = true;
                    mesh.children[i].receiveShadow = true;
                    if(mesh.children[i]){
                        for(var j=0; j<mesh.children[i].length; j++){
                            mesh.children[i].children[j].castShadow = true;
                            mesh.children[i].children[j].receiveShadow = true;
                            // mesh.children[i].children[j].wireframe = true;
                        }
                    }
                }
            }

            var o = body.shapeOffsets[l];
            var q = body.shapeOrientations[l];
            mesh.position.set(o.x, o.y, o.z);
            mesh.quaternion.set(q.x, q.y, q.z, q.w);
            // mesh.wireframe = true;
    
            obj.add(mesh);
    
        }

    }

    return obj;
};
