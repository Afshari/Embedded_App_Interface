
var linearAlgebra = require('linear-algebra')(),
                    Matrix = linearAlgebra.Matrix;

var Enum = require('enum');


let State = Object.freeze({
    NotConnected:                   'Disconnect',
    Connecting:                     'Connecting ...',
    Connected:                      'Connected',
    Ready:                          'Ready to Run',
    Running:                        'Calculating ...',
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


// This class is just for Testing Algorithm
// The Result will come from C++ Application
class SuspensionEstimator {

    static scl = 333;

    constructor() {

        this.init( 12 )
    }

    init( tm ) {

        const dt = 0.001;
        this.ITEM_PER_STEP = 20;
        this.Tf = tm;
        // this.Tf = 3;
        this.n = this.Tf / dt;

        this.F =  new Matrix( [ [ 9.99790784e-01,  4.43388313e-04,  9.94567510e-04, -9.94355552e-04],
                                [ 1.87325040e-04,  9.99556443e-01,  4.86406564e-06,  9.94923911e-04],
                                [-4.37024544e-02, -5.05893846e-04,  9.98857916e-01,  1.14184268e-03],
                                [ 3.73930206e-01, -8.85578620e-01,  9.77200224e-03,  9.89656572e-01] ] );

        this.H = Matrix.reshapeFrom( [1, 0, 0, 0], 1, 4 );
        this.R = new Matrix( [ (1e-3)**2 ] );

        this.nx = this.F.rows;
        this.ny = this.H.rows;

        this.x = Matrix.zero(this.nx, this.n);
        this.xhat = Matrix.zero(this.nx, this.n);
        this.Y = Matrix.zero(this.ny, this.n);

        SuspensionEstimator.replaceMatrixColumn(this.x, [0.1, 0, 0, 0], 0);

        for(var i = 0; i < this.n - 1; i++)
            SuspensionEstimator.genData(this.F, this.x, i);
            
        for(i = 0; i < this.n; i++)
            SuspensionEstimator.setMeasurement(this.H, this.x, this.Y, i);
    }

    getTyreTruth(i) {
        return -this.x.data[1][i] * SuspensionEstimator.scl;
    }

    setTyreEstimated(i, value) {        
        this.xhat.data[1][i] = value;
    }

    getTyreEstimated(i) {
        return -this.xhat.data[1][i];
    }

    getSuspensionTruth(i) {
        return -this.x.data[0][i] * SuspensionEstimator.scl;
    }

    setSuspensionEstimated(i, value) {        
        this.xhat.data[0][i] = value;
    }

    getSuspensionEstimated(i) {
        return -this.xhat.data[0][i];
    }

    getSuspensionMeasurement(i) {
        return -this.Y.data[0][i] * SuspensionEstimator.scl;
    }

    static replaceMatrixColumn(arr, val, idx) {

        arr.data[0][idx] = val[0];
        arr.data[1][idx] = val[1];
        arr.data[2][idx] = val[2];
        arr.data[3][idx] = val[3];
    }

    static setMeasurement(H, x, Y, idx) {

        let n_x = Matrix.reshapeFrom( [ x.data[0][idx], x.data[1][idx], x.data[2][idx], x.data[3][idx] ], 4, 1 );

        let t_x = H.dot( n_x ).data;

        // Y.data[0][idx] = parseInt( ( t_x[0][0] + ( (Math.random()-0.5) * 0.01 ) ) * SuspensionEstimator.scl );
        Y.data[0][idx] = parseInt( ( t_x[0][0] + ( (Math.random()-0.5) * 0.04 ) ) * SuspensionEstimator.scl );
    }

    static genData(F, x, idx) {

        let n_x = Matrix.reshapeFrom( [ x.data[0][idx], x.data[1][idx], x.data[2][idx], x.data[3][idx] ], 4, 1 );

        let t_x = F.dot( n_x ).data;

        x.data[0][idx+1] = t_x[0][0] + ( (Math.random()-0.5) * 0.005 );
        x.data[1][idx+1] = t_x[1][0] + ( (Math.random()-0.5) * 0.005 );
        x.data[2][idx+1] = t_x[2][0] + ( (Math.random()-0.5) * 0.005 );
        x.data[3][idx+1] = t_x[3][0] + ( (Math.random()-0.5) * 0.005 );
    }
}


class HandleWorkFlow {

    constructor(estimator, ipcRenderer, windowWidth, showFlashMessage, setWorkflow) {

        this.state              = State.NotConnected;
        this.estimator          = estimator;
        this.ipcRenderer        = ipcRenderer;
        this.windowWidth        = windowWidth;
        this.counter            = windowWidth;
        this.showFlashMessage   = showFlashMessage;
        this.setWorkflow        = setWorkflow;
        this.rnd                = 0;


        this.ipcRenderer.on('estimating_passive_suspension:connection:fail', (event, values) => {

            if(this.state != State.NotConnected) {
                this.state = rules[this.state][Trigger.ConnectionFail]
                this.setWorkflow(this.state)
                this.showFlashMessage("Connection Lost", "ERROR")
            }
        });
        this.ipcRenderer.on('estimating_passive_suspension:connection:pass', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionPass]
            this.setWorkflow(this.state)
            this.showFlashMessage("Successfully Connected to the Server", "INFO")
        });
        this.ipcRenderer.on('estimating_passive_suspension:get:values', (event, values) => {

            values = values.split(';');
            this.handleReceivedValues(values);
        });
    }

    handleConnect(ip, port) {

        if(this.state == State.NotConnected) {
            this.state = rules[this.state][Trigger.Connect]
            this.setWorkflow(this.state)
            this.ipcRenderer.send('estimating_passive_suspension:connect', ip, port);
        } else {
            this.showFlashMessage("Already Connected", "WARNING")
        }
    }

    handleReplay(counter) {

        if(this.state == State.Drawing) {
            this.state = rules[this.state][Trigger.Replay]
            this.setWorkflow(this.state)
            return this.windowWidth;
        } else if(this.state == State.DrawFinished) {
            this.state = rules[this.state][Trigger.Replay]
            this.setWorkflow(this.state)
            return this.windowWidth;
        }
        this.showFlashMessage("Action is Not Possible", "WARNING")
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

    handleRun(tm, counter) {

        if(this.state == State.Ready || this.state == State.Connected) {

            this.state = rules[this.state][Trigger.SendData]
            this.setWorkflow(this.state)
            this.rnd = 0;
            this.estimator.init(parseInt(tm))
            this.ipcRenderer.send('estimating_passive_suspension:tcp:send:measurements', 120, estimator.Y.data[0], this.rnd, this.estimator.ITEM_PER_STEP);
            return this.windowWidth;
            
        } else if(this.state == State.NotConnected) {
            this.showFlashMessage("Doesn't Connect to the Server", "WARNING")
        } else if(this.state == State.Running || this.state == State.Drawing) {
            this.showFlashMessage("Already Running", "WARNING")
            this.showFlashMessage("If You want to Run with different Parameters, First Reset", "INFO")
        } else if(this.state == State.DrawFinished) {
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

    handleReceivedValues(values) {

        if(this.rnd <= (this.estimator.n - 1) && this.state == State.Running) {

            for(var i = 0; i < values.length; i++) {    
                this.estimator.setTyreEstimated( this.rnd + i, parseInt( values[i].split(',')[1] ) );
                this.estimator.setSuspensionEstimated( this.rnd + i, parseInt( values[i].split(',')[0] ) );
            }
            
            if(this.rnd < this.estimator.n - this.estimator.ITEM_PER_STEP - 1) {

                this.rnd += this.estimator.ITEM_PER_STEP;
                if(this.state == State.Running)
                    this.ipcRenderer.send('estimating_passive_suspension:tcp:send:measurements', 121, estimator.Y.data[0], this.rnd, this.estimator.ITEM_PER_STEP);
            } else {
    
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
}

class DrawHelper {

    constructor( estimator, windowWidth ) {

        this.estimator = estimator;
        this.windowWidth = windowWidth;
        this.halfWidth = windowWidth/2;
    }

    suspensionOffset() {
        return -225;
    }

    tyreOffset() {
        return -50;
    }

    drawTopSuspension( counter ) {

        const suspensionOffset = this.suspensionOffset();

        window.line(this.windowWidth/2+35, this.estimator.getSuspensionTruth(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2+35, this.estimator.getSuspensionTruth(counter-this.halfWidth) + suspensionOffset + 125 );
        window.line(this.windowWidth/2+25, this.estimator.getSuspensionTruth(counter-this.halfWidth) + suspensionOffset + 125, 
                    this.windowWidth/2+45, this.estimator.getSuspensionTruth(counter-this.halfWidth) + suspensionOffset + 125 );
    }

    drawBottomSuspension( counter ) {

        const tyreOffset = this.tyreOffset();

        window.line(this.windowWidth/2+25, this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+25, this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset - 125 );
        window.line(this.windowWidth/2+45, this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2+45, this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset - 125 );
        window.stroke(0);
        window.fill(0);
        window.rectMode(window.CORNER);
        window.rect(this.windowWidth/2+25, this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset, 20, -10);
    }


    drawDamper( counter ) {

        const suspensionOffset = this.suspensionOffset();
        const tyreOffset = this.tyreOffset();
    
        window.line(this.windowWidth/2-35, this.estimator.getSuspensionTruth(counter-this.halfWidth) + suspensionOffset + 25, 
                    this.windowWidth/2-35, this.estimator.getSuspensionTruth(counter-this.halfWidth) + suspensionOffset + 75 );
        window.line(this.windowWidth/2-35, this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset, 
                    this.windowWidth/2-35, this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset - 50 );
        
        var pUp     = this.estimator.getSuspensionTruth(counter-this.halfWidth) + suspensionOffset + 75;
        var pBottom = this.estimator.getTyreTruth(counter-this.halfWidth) + tyreOffset - 50;
        
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


module.exports = {
    SuspensionEstimator,
    DrawHelper,
    HandleWorkFlow
}