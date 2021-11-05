
const THREE = require('three');
const { Matrix } = require('ml-matrix');


var Enum = require('enum');

var State = new Enum( { 
    'ready': 1,
    'sendingMeasurements': 2,
    'running': 3,
    'pause': 4,
    'finish': 5
})

class InvertedPendulum {

    constructor(  x0, wr, t ) {

        this.x0         =   x0
        this.wr         =   wr
        this.t          =   t

        this.m          =   1
        this.M          =   5
        this.L          =   2
        this.g          =   -10
        this.d          =   1

        this.K          =  new Matrix( [ [ -31.6228,  -61.4401,  647.0460,  250.0313 ] ] )

        this.y = []
        this.y_remote = []
    }

    getY(idx) {
        return this.y[idx]
    }
    getRemote(idx) {
        return this.y_remote[idx]
    }

    u( y ) {

        var res = Matrix.sub( y, this.wr )
        res = this.K.mmul(res)
        res.mul(-1)
        return res.get(0, 0)
    }

    pendcart(x) {
    
        var u = this.u(x)
            
        var Sx = Math.sin(x.get(2, 0))
        var Cx = Math.cos(x.get(2, 0));
        var D = this.m * this.L * this.L * (this.M + this.m * ( 1 - Cx**2 ))


        var dx = [0, 0, 0, 0]
        dx[0] = x.get(1, 0)
        dx[1] = (1/D)*(-(this.m**2) * this.L**2 * this.g * Cx * Sx + this.m * this.L**2 * (this.m * this.L * x.get(3, 0)**2 * Sx - this.d * x.get(1, 0))) + this.m * this.L * this.L * (1/D) * u
        dx[2] = x.get(3, 0)
        dx[3] = (1/D) * ((this.m + this.M) * this.m * this.g * this.L * Sx - this.m * this.L * Cx *(this.m * this.L *x.get(3, 0)**2 * Sx - this.d * x.get(1, 0))) - this.m * this.L * Cx * (1/D) * u
        return new Matrix( [dx] ).transpose()
    }

    rungekutta4(y0, h, n) {

        var k1, k2, k3, k4
        this.y = []
        this.y.push( y0 )
        for(var i = 0; i < n-1; i++) {

            k1 = this.pendcart(this.y[i])
            k2 = this.pendcart( Matrix.add( Matrix.div( Matrix.mul( k1, h ), 2.0 ), this.y[i] ) )
            k3 = this.pendcart( Matrix.add( Matrix.div( Matrix.mul( k2, h ), 2.0 ), this.y[i] ) )
            k4 = this.pendcart( Matrix.add( Matrix.mul( k3, h ), this.y[i] ) )
            var t_y = Matrix.add( Matrix.add( k1, Matrix.mul( k2, 2 ), Matrix.mul( k3, 2 ) ), k4 )
            this.y.push( Matrix.add( this.y[i], Matrix.mul( t_y, (h/6.0) ) ) )
        }

        return this.y
    }

}


class HandleWorkFlow {

    constructor( inverted_pendulum, ipcRenderer, windowWidth ) {

        this.state              =   State.ready;
        this.inverted_pendulum  =   inverted_pendulum;
        this.ipcRenderer        =   ipcRenderer;
        this.windowWidth        =   windowWidth;
        this.counter            =   windowWidth;
        this.rnd                =   0;
        this.isReadyToDraw      = false;
    }

    handleConnect(ip, port) {
        this.ipcRenderer.send('inverted_pendulum:connect', ip, port);
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

    handleRun( ref_pos, x0, n_, h_ ) {

        if( this.isStateReady() ) {

            this.state2SendingMeasurements();
            // this.connection_type = c_type;
            // this.uart = c_uart;
            // this.estimator.init( )

            this.ipcRenderer.send('inverted_pendulum:tcp:send:state', 111, ref_pos.data, x0.data, n_, h_ );

        } else if( this.isStatePause() ) {

            this.state2Running();
            window.frameRate(40);
        }
    }

    handleReset() {

    }

    handleReceivedValues( values ) {

        values = values.split(',')
        if(this.rnd <= (this.controller.nt - 1)) { // && this.isStateSendingMeasurements() ) {

            for(var i = 0; i < values.length; i += 2) {    
                
                // this.controller.setPassiveSuspension( this.rnd + (i/2), parseFloat( values[i] ) );
                // this.controller.setPassiveTyre( this.rnd + (i/2), parseFloat( values[i+1] ) );
                this.controller.setActiveSuspension( this.rnd + (i/2), parseFloat( values[i] ) );
                this.controller.setActiveTyre( this.rnd + (i/2), parseFloat( values[i+1] ) );
            }
            
            // console.log("rnd ", this.rnd)
            if(this.rnd < this.controller.nt - this.controller.ITEM_PER_STEP - 1) {

                this.rnd += this.controller.ITEM_PER_STEP;
                this.ipcRenderer.send('robust_suspension:tcp:send:state', 102,
                    this.controller.w, this.controller.ms, this.rnd, this.controller.ITEM_PER_STEP );

            } else {
    
                this.controller.addStarterValues(this.windowWidth)
                this.isReadyToDraw = true;
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
        console.log('nt ', this.nt)
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

        this.K = new Matrix( [ [ -90156, 23219, -34989, 1148.4 ] ] );

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

        this.generatePassive();
        // this.xp_suspension   =   []
        // this.xp_tyre         =   []

        // this.generateActive();
        // for(var i = 0; i < 500; i++) {
        //     console.log(i, this.w.get(0, i), 'x', this.x.data[0][i], this.x.data[1][i], this.x.data[2][i], this.x.data[3][i])
        // }
        this.x_suspension      = []
        this.x_tyre            = []

        this.ITEM_PER_STEP = 50;
    }

    isDataReady() {
        return (this.x_suspension.length >= this.nt - 1) && (this.xp_suspension.length >= this.nt - 1)
    }

    generatePassive() {

        for(var i = 0; i < this.nt; i++) {

            this.A = new Matrix( [  
                [ 0,                            0,                      1,                           -1 ],
                [ 0,                            0,                      0,                            1 ],
                [-this.ks/this.ms.get(0, i),    0,                      -this.cs/this.ms.get(0, i),   this.cs/this.ms.get(0, i) ],
                [this.ks/this.mu,               -this.kt/this.mu,        this.cs/this.mu,           -(this.cs+this.ct)/this.mu] ]);


            // xp(:, i + 1) = xp(:,i) + ( A * xp(:,i) + D * w(i) ) * dt
            var curr_xp = new Matrix( [ this.xp.data.map(function(value, index) { return value[i]; }) ] ).transpose();
            var tmp_xp = Matrix.add( curr_xp, Matrix.add( this.A.mmul( curr_xp ), Matrix.mul( this.D, this.w.get(0, i) ) ).mul( this.dt ) );
            for(var j = 0; j < tmp_xp.rows; j++) {
                this.xp.set(j, i+1, tmp_xp.get(j, 0))
            }

            // zp(:,i) = C1 * xp(:,i);
            var tmp_zp = this.C1 * curr_xp;
            for(var j = 0; j < tmp_zp.rows; j++) {
                this.zp.set(j, i, tmp_zp.get(j, 0))
            }
        }

        this.xp_suspension      = Object.values( this.xp.data[0] )
        this.xp_tyre            = Object.values( this.xp.data[1] )
    }

    generateActive() {
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


            // u(i) = ur(i) + K * (x(:,i) - xr(:,i));
            var curr_x  = new Matrix( [ this.x.data.map(function(value, index) { return value[i]; }) ] ).transpose();
            var curr_xr = new Matrix( [ this.xr.data.map(function(value, index) { return value[i]; }) ] ).transpose();
            this.u.set(0, i, Matrix.add( this.K.mmul( Matrix.sub( curr_x, curr_xr ) ), this.ur.get(0, i) ).get(0, 0) );
            
            
            // x(:,i+1) = x(:,i) + ( A * x(:,i) + B * u(i) + D * w(i) ) * dt ;
            var tmp_x = Matrix.add( Matrix.add( this.A.mmul(curr_x), Matrix.mul( this.B, this.u.get(0, i) ) ), Matrix.mul( this.D, this.w.get(0, i) ) ).mul( this.dt );
            tmp_x = Matrix.add( curr_x, tmp_x )
            for(var j = 0; j < tmp_x.rows; j++) {
                this.x.set(j, i+1, tmp_x.get(j, 0))
            }
        }

        this.x_suspension      = Object.values( this.x.data[0] )
        this.x_tyre            = Object.values( this.x.data[1] )
    }

    // Active Tyre
    setActiveTyre(i, value) {        
        this.x_tyre.push(value)
    }
    getActiveTyre(i) {
        return this.x_tyre[i] * this.meter2Pixel;
    }

    // Passive Tyre
    setPassiveTyre(i, value) {        
        this.xp_tyre.push(value)
    }
    getPassiveTyre(i) {
        return this.xp_tyre[i] * this.meter2Pixel;
    }

    // Active Suspension
    setActiveSuspension(i, value) {        
        this.x_suspension.push(value);
    }
    getActiveSuspension(i) {
        return this.x_suspension[i] * this.meter2Pixel;
    }

    // Passive Suspension
    setPassiveSuspension(i, value) {        
        this.xp_suspension.push(value)
    }
    getPassiveSuspension(i) {
        return this.xp_suspension[i] * this.meter2Pixel;
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

        // this.zr         = zeroArray.concat(this.zr)
        // this.zrFile     = zeroArray.concat(this.zrFile)
        // this.zrdot      = zeroArray.concat(this.zrdot)
        // this.zrdotFile  = zeroArray.concat(this.zrdotFile)
        
        this.xp_suspension = zeroArray.concat(this.xp_suspension)
        this.xp_tyre = zeroArray.concat(this.xp_tyre)
        this.x_suspension = zeroArray.concat(this.x_suspension)
        this.x_tyre = zeroArray.concat(this.x_tyre)
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
    InvertedPendulum,
    DrawHelper,
    SuspensionController,
    HandleWorkFlow
}





