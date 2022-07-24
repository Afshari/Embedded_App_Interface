
const THREE = require('three');
const { Matrix } = require('ml-matrix');


var Enum = require('enum');

let State = Object.freeze({
    NotConnected:                   'Disconnect',
    Connecting:                     'Connecting',
    Connected:                      'Connected',
    Ready:                          'Ready to Run',
    Running:                        'Calculating',
    Drawing:                        'Visualizing Result',
    DrawFinished:                   'Visualization Finished',
    Pause:                          'Paused',
});

let Trigger = Object.freeze({
    Connect:                        'Connect',
    ConnectionFail:                 'ConnectionFail',
    ConnectionPass:                 'ConnectionPass',
    SendData:                       'SendData',
    ComputationCompleted:           'ComputationCompleted',
    Draw:                           'Draw',
    DrawEnd:                        'DrawEnd',
    Replay:                         'Replay',
    Reset:                          'Reset',
    Resume:                         'Resume',
    Pause:                          'Pause'
});

let rules = {};
rules[State.NotConnected] = {
    Connect:            State.Connecting
};
rules[State.Connecting] = {
    ConnectionFail:     State.NotConnected,
    ConnectionPass:     State.Connected
};
rules[State.Connected] = {
    SendData:           State.Running,
    ConnectionFail:     State.NotConnected
};
rules[State.Ready] = {
    SendData:           State.Running,
    ConnectionFail:     State.NotConnected
};
rules[State.Running] = {
    Pause:                  State.Running,
    ComputationCompleted:   State.Drawing,
    ConnectionFail:         State.NotConnected
};
rules[State.Drawing] = {
    Reset:                  State.Ready,
    DrawEnd:                State.DrawFinished,
    Pause:                  State.Pause,
    Replay:                 State.Drawing,
    ConnectionFail:         State.Drawing
};
rules[State.Pause] = {
    Resume:                 State.Drawing,
    Reset:                  State.Ready,
    ConnectionFail:         State.Pause
};
rules[State.DrawFinished] = {
    Replay:                 State.Drawing,
    Reset:                  State.Ready,
    ConnectionFail:         State.DrawFinished,
};
rules[State.ConnectionCheck] = {
    ConnectionFail:         State.NotConnected,
    ConnectionPass:         State.Ready
}

// var State = new Enum( { 
//     'ready': 1,
//     'sendingMeasurements': 2,
//     'running': 3,
//     'pause': 4,
//     'finish': 5
// })



class HandleWorkFlow {

    constructor(controller, ipcRenderer, windowWidth, showFlashMessage, setWorkflow) {

        this.state              =   State.NotConnected;
        this.controller         =   controller;
        this.ipcRenderer        =   ipcRenderer;
        this.windowWidth        =   windowWidth;
        this.counter            =   windowWidth;
        this.rnd                =   0;
        this.isReadyToDraw      =   false;
        this.showFlashMessage   =   showFlashMessage;
        this.setWorkflow        =   setWorkflow;

        this.ipcRenderer.on('robust_suspension:connection:fail', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionFail]
            this.setWorkflow(this.state)
            this.showFlashMessage("Connection Lost", "ERROR")
        });
        this.ipcRenderer.on('robust_suspension:connection:pass', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionPass]
            this.setWorkflow(this.state)
            this.showFlashMessage("Successfully Connected to the Server", "INFO")
        });
        this.ipcRenderer.on('robust_suspension:get:values', (event, values) => {

            this.handleReceivedValues(values);
        });
    }

    handleConnect(ip, port) {

        if(this.state == State.NotConnected) {
            this.state = rules[this.state][Trigger.Connect]
            this.setWorkflow(this.state)
            this.ipcRenderer.send('robust_suspension:connect', ip, port);
        } else {
            this.showFlashMessage("Already Connected", "WARNING")   
        }
    }

    handleReplay(counter) {

        if(this.state == State.Drawing) {
            this.state = rules[this.state][Trigger.Replay];
            this.setWorkflow(this.state);
            return this.windowWidth;
        } else if(this.state == State.DrawFinished) {
            this.state = rules[this.state][Trigger.Replay];
            this.setWorkflow(this.state);
            return this.windowWidth;
        }
        return counter;
    }

    handlePause() {

        if(this.state == State.Drawing) {
            this.state = rules[this.state][Trigger.Pause];
            window.frameRate(4);
            this.setWorkflow(this.state);
        } else if(this.state == State.Pause) {
            this.state = rules[this.state][Trigger.Resume];
            window.frameRate(40);
            this.setWorkflow(this.state);
        }
    }

    handleRun(counter, a, l, drawBackground, drawLegends) {

        if(this.state == State.Ready || this.state == State.Connected) {

            this.state = rules[this.state][Trigger.SendData]
            this.setWorkflow(this.state)
            this.rnd = 0
            drawBackground();
            drawLegends();
            this.controller.init(a, l);
            this.ipcRenderer.send('robust_suspension:tcp:send:state', 101,
                this.controller.w, this.controller.ms, this.rnd, this.controller.ITEM_PER_STEP );
            
            return this.windowWidth;
            
        }  else if(this.state == State.NotConnected) {
            this.showFlashMessage("Doesn't Connect to the Server", "WARNING")
        } else if(this.state == State.Running || this.state == State.Drawing) {
            this.showFlashMessage("Already Running", "WARNING")
            this.showFlashMessage("If You want to Run with different Parameters, First Reset", "INFO")
        } else if(this.state == State.DrawFinished || this.state == State.Pause) {
            this.showFlashMessage("First you should 'Reset' before Running Again", "WARNING")
        }
        return counter;
    }

    handleReset() {

        if(this.state == State.Drawing || this.state == State.DrawFinished || this.state == State.Pause) {
            
            this.state = rules[this.state][Trigger.Reset]
            this.setWorkflow(this.state)
        }
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
            
            if(this.rnd < this.controller.nt - this.controller.ITEM_PER_STEP - 1) {

                this.rnd += this.controller.ITEM_PER_STEP;
                this.ipcRenderer.send('robust_suspension:tcp:send:state', 102,
                    this.controller.w, this.controller.ms, this.rnd, this.controller.ITEM_PER_STEP );

            } else {
    
                this.controller.addStarterValues(this.windowWidth)
                this.isReadyToDraw = true;
                this.state = rules[this.state][Trigger.ComputationCompleted]
                this.setWorkflow(this.state)
                window.frameRate(40);
            }
        } 
    }

    isDrawing() { return this.state == State.Drawing; }

    finishDraw() {
        if(this.state == State.Drawing) {
            this.state = rules[this.state][Trigger.DrawEnd];
            this.setWorkflow(this.state);
        }
    }

    // isStateReady() { return this.state == State.ready; }

    // isStateSendingMeasurements() { return this.state == State.sendingMeasurements; }

    // isStateRunning() { return this.state == State.running; }

    // isStatePause() { return this.state == State.pause; }

    // isStateFinish() { return this.state == State.finish; }

    // state2Pause() { this.state = State.pause; }

    // state2Running() { this.state = State.running; }

    // state2SendingMeasurements() { this.state = State.sendingMeasurements; }

    // state2Finish() { this.state = State.finish; }


}

class SuspensionController {

    static scl = 333;

    constructor() {

        this.init( 0.1, 2 )
    }

    init( a, l ) {

        this.passiveSuspension      = []
        this.passiveTyre            = []
        this.activeSuspnsion        = []
        this.activeTyre             = []
        this.zr                     = []
        this.zrFile                 = []
        this.zrdot                  = []
        this.zrdotFile              = []

        this.meter2Pixel = 200;

        
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

        this.a      = a;                  // 0.1;              // Height of the Bump
        this.l      = l;                  // 2;                // Length of the Bump
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
        this.kt =   101115;                  // stiffness of pneumatic tyre
        this.ct =   14.6;                    // damping of pneumatic tyre


        this.alpha  =   21;                     // positive weighting for suspension deflection
        this.beta   =   42;                     // positive weighting for tyre deflection

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
        // console.log('nb ', this.nb)

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

        var minPart = this.controller.getPassiveTyre(counter-this.halfWidth) - 50
        var tSuspensionY = this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 125
        tSuspensionY = ( tSuspensionY < minPart ) ? tSuspensionY : minPart

        window.line(this.windowWidth/2+35, this.controller.getPassiveSuspension(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2+35, tSuspensionY );
        window.line(this.windowWidth/2+25, tSuspensionY, 
                    this.windowWidth/2+45, tSuspensionY );
    }

    drawPassiveBottomSuspension( counter ) {

        const tyreOffset = this.tyreOffset();

        var maxPart = this.controller.getPassiveSuspension(counter-this.halfWidth) + this.suspensionOffset() + 25
        var bSuspensionY = this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset - 225
        bSuspensionY = ( bSuspensionY > maxPart ) ? bSuspensionY : maxPart

        window.line(this.windowWidth/2+25, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+25, bSuspensionY );
        window.line(this.windowWidth/2+45, this.controller.getPassiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+45, bSuspensionY );
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
        
        if( pUp < pBottom ) {

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

        var minPart = this.controller.getActiveTyre(counter-this.halfWidth) - 50
        var tSuspensionY = this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 125
        tSuspensionY = ( tSuspensionY < minPart ) ? tSuspensionY : minPart

        window.line(this.windowWidth/2+35, this.controller.getActiveSuspension(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2+35, tSuspensionY );
        window.line(this.windowWidth/2+25, tSuspensionY, 
                    this.windowWidth/2+45, tSuspensionY );
    }

    drawActiveBottomSuspension( counter ) {

        const tyreOffset = this.tyreOffset();

        var maxPart = this.controller.getActiveSuspension(counter-this.halfWidth) + this.suspensionOffset() + 25
        var bSuspensionY = this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset - 225
        bSuspensionY = ( bSuspensionY > maxPart ) ? bSuspensionY : maxPart

        window.line(this.windowWidth/2+25, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+25, bSuspensionY );
        window.line(this.windowWidth/2+45, this.controller.getActiveTyre(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+45, bSuspensionY );

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
        
        if( pUp < pBottom ) {
            
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
    DrawHelper,
    SuspensionController,
    HandleWorkFlow
}





