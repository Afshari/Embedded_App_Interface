
const THREE = require('three');
const { Matrix } = require('ml-matrix');


var Enum = require('enum');

let State = Object.freeze({
    NotConnected:                   'Disconnect',
    Connecting:                     'Connecting ...',
    Connected:                      'Connected',
    ConnectionCheck:                'Connection Check',
    Ready:                          'Ready to Run',
    Running:                        'Calculating ...',
    Drawing:                        'Visualizing Result',
    DrawFinished:                   'Visualization Finished',
});

let Trigger = Object.freeze({
    Connect:                        'Connect',
    ConnectionFail:                 'ConnectionFail',
    ConnectionPass:                 'ConnectionPass',
    ConnectionTest:                 'ConnectionTest',
    SendData:                       'SendData',
    ComputationCompleted:           'ComputationCompleted',
    Draw:                           'Draw',
    DrawEnd:                        'DrawEnd',
    Replay:                         'Replay',
    Reset:                          'Reset',
    Disconnect:                     'Disconnect',
});


let rules = {};
rules[State.NotConnected] = {
    Connect:  State.Connecting
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
    ComputationCompleted:   State.Drawing,
    ConnectionFail:         State.NotConnected
};
rules[State.Drawing] = {
    Reset:              State.Ready,
    DrawEnd:            State.DrawFinished,
    ConnectionFail:     State.Drawing
};
rules[State.DrawFinished] = {
    Replay:             State.Drawing,
    Reset:              State.Ready,
    ConnectionFail:     State.DrawFinished,
    ConnectionTest:     State.ConnectionCheck
};
rules[State.ConnectionCheck] = {
    ConnectionFail:     State.NotConnected,
    ConnectionPass:     State.Ready
};


// This class is just for Testing Algorithm
// The Result will come from C++ Application
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

    constructor(inverted_pendulum, ipcRenderer, windowWidth, showFlashMessage, setWorkflow) {

        this.state              =   State.NotConnected;
        this.inverted_pendulum  =   inverted_pendulum;
        this.ipcRenderer        =   ipcRenderer;
        this.windowWidth        =   windowWidth;
        this.showFlashMessage   =   showFlashMessage;
        this.setWorkflow        =   setWorkflow;

        this.isReadyToDraw      = false;
        this.counter_remote     = -40

        this.ipcRenderer.on('inverted_pendulum:connection:fail', (event, values) => {

            if(this.state != State.NotConnected) {
                this.state = rules[this.state][Trigger.ConnectionFail]
                this.setWorkflow(this.state)
                this.showFlashMessage("Connection Lost", "ERROR")
            }
        });
        this.ipcRenderer.on('inverted_pendulum:connection:pass', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionPass]
            this.setWorkflow(this.state)
            this.showFlashMessage("Successfully Connected to the Server", "INFO")
        });
        this.ipcRenderer.on('inverted_pendulum:get:values', (event, values, isFinished) => {

            this.handleReceivedValues( values, isFinished )
        });
    }

    handleConnect(ip, port) {

        if(this.state == State.NotConnected) {
            this.state = rules[this.state][Trigger.Connect]
            this.setWorkflow(this.state)
            this.ipcRenderer.send('inverted_pendulum:connect', ip, port);
        } else {
            this.showFlashMessage("Already Connected", "WARNING")
        }
    }

    handleRun(ref_pos, x0, n_, h_) {

        if(this.state == State.Ready || this.state == State.Connected) {

            this.state = rules[this.state][Trigger.SendData]
            this.setWorkflow(this.state)
            this.inverted_pendulum.y_remote = []
            this.ipcRenderer.send('inverted_pendulum:tcp:send:state', 210, ref_pos.data, x0.data, n_, h_ );

        } else if(this.state == State.NotConnected) {
            this.showFlashMessage("Doesn't Connect to the Server", "WARNING")
        } else if(this.state == State.Running || this.state == State.Drawing) {
            this.showFlashMessage("Already Running", "WARNING")
            this.showFlashMessage("If You want to Run with different Parameters, First Reset", "INFO")
        } else if(this.state == State.DrawFinished) {
            this.showFlashMessage("First you should 'Reset' before Running Again", "WARNING")
        }
    }

    handleReplay() {
        
        if(this.state == State.DrawFinished) {
            this.state = rules[this.state][Trigger.Replay]
            this.setWorkflow(this.state)
            this.counter_remote = -40
        } else {
            this.showFlashMessage("Action is Not Possible", "WARNING")
        }
    }

    handleReset(x0, angle, drawBackground, drawCart) {
            
        if(this.state == State.Drawing || this.state == State.DrawFinished) {
            
            this.state = rules[this.state][Trigger.Reset]
            this.setWorkflow(this.state)

            this.counter_remote = -40
            this.isReadyToDraw = false
            x0 = new Matrix( [ [0, 0, Math.PI - (angle/100), 0] ] ).transpose()
            drawBackground();
            drawCart(x0.get(0, 0), x0.get(2, 0))
        }
        return x0;
    }

    handleAngle(x0, angle, drawBackground, drawCart) {

        if(this.state == State.Connected || this.state == State.Ready || this.state == State.NotConnected) {

            x0 = new Matrix( [ [0, 0, Math.PI - (angle/100), 0] ] ).transpose()
            drawBackground();
            drawCart(x0.get(0, 0), x0.get(2, 0))
        }
        return x0;
    }

    handleReceivedValues( values, isFinished ) {

        if(this.state == State.Running) {

            if(isFinished == true) {

                this.counter_remote = -40
                this.isReadyToDraw = true
                this.state = rules[this.state][Trigger.ComputationCompleted]
                this.setWorkflow(this.state)

            } else {
                values = values.split(';')
                for(var i = 0; i < values.length; i++) {
                    var arr = values[i].split(',')
                    this.inverted_pendulum.y_remote.push( [ parseFloat(arr[0]), parseFloat(arr[1]) ] )
                }
                this.ipcRenderer.send('inverted_pendulum:tcp:send:state', 211)
            }
        }
    }

    isDrawing() { return this.state == State.Drawing; }
    isConnected() { return this.state == State.Connected;}
    isReady() { return this.state == State.Ready; }
    finishDraw() {
        if(this.state == State.Drawing) {
            this.state = rules[this.state][Trigger.DrawEnd];
            this.setWorkflow(this.state);
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
    HandleWorkFlow
}





