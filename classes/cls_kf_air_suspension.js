
var linearAlgebra = require('linear-algebra')(),     // initialise it
                    Vector = linearAlgebra.Vector,
                    Matrix = linearAlgebra.Matrix;

var Enum = require('enum');


var State = new Enum( { 

    'ready': 1,
    'sendingMeasurements': 2,
    'running': 3,
    'pause': 4,
    'finish': 5
})


class SuspensionEstimator {

    static scl = 333;

    constructor() {

        // Model Parameters
        const ms = 972.2;                  // Sprung mass
        const mu = 113.6;                  // Unsprung mass
        const ks = 42719.6;                // Stiffness of the suspension
        const kt = 101115;                 // Compressibility of the Tyre
        const cs = 1095;                   // Damping of the suspension
        const ct = 14.6;                   // Damping of the pneumatic Tyre


        const A = new Matrix([  [   0,       0,       1,       -1           ],
                                [   0,       0,       0,        1           ],
                                [  -ks/ms,   0,       -cs/ms,   cs/ms       ],
                                [   ks/mu,  -kt/mu,   cs/mu,    -(cs+ct)/mu ] ]);

        const L = Matrix.reshapeFrom( [ 0, -1, 0, ct/mu ], 4, 1 );
        const dt = 0.001;
        this.Tf = 12;
        this.n = this.Tf / dt;

        // Process noise variance
        const n0 = 0.1;                      // Reference spatial frequency
        const V  = 25/3.6;                   // Vehicle forward velocity (m/s)
        const Gqn0 = 16*1e-6;                // Road roughness coefficient
        const Qc = 4 * Math.PI * Gqn0 * ( n0 ** 2 ) * V;
        this.F =  new Matrix( [ [ 9.99790784e-01,  4.43388313e-04,  9.94567510e-04, -9.94355552e-04],
                                [ 1.87325040e-04,  9.99556443e-01,  4.86406564e-06,  9.94923911e-04],
                                [-4.37024544e-02, -5.05893846e-04,  9.98857916e-01,  1.14184268e-03],
                                [ 3.73930206e-01, -8.85578620e-01,  9.77200224e-03,  9.89656572e-01] ] );

        this.Q   =  new Matrix([  [  0.0000,    0.0000,   -0.0000,   -0.0000],
                                  [  0.0000,    0.2233,   -0.0001,   -0.1276],
                                  [ -0.0000,   -0.0001,    0.0000,    0.0000],
                                  [ -0.0000,   -0.1276,    0.0000,    0.0875] ] );
        // this.Q = this.Q * 1e-6;

        this.H = Matrix.reshapeFrom( [1, 0, 0, 0], 1, 4 );
        this.R = new Matrix( [ (1e-3)**2 ] );

        this.nx = this.F.rows;
        this.ny = this.H.rows;

        this.x = Matrix.zero(this.nx, this.n);
        this.xhat = Matrix.zero(this.nx, this.n);
        this.Y = Matrix.zero(this.ny, this.n);

        // Initial guesses for the state mean and covariance.
        this.m = new Matrix( [0, 0, 0, 0] );
        this.C = Matrix.zero( 4 );
        this.C.data[0][0] = 0.1;

    }

    init() {

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

    getSuspensionEstimated(i, value) {
        return -this.xhat.data[0][i];
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

        Y.data[0][idx] = parseInt( ( t_x[0][0] + ( (Math.random()-0.5) * 0.01 ) ) * SuspensionEstimator.scl );
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

    constructor( estimator, ipcRenderer, windowWidth ) {

        this.state = State.ready;
        this.estimator = estimator;
        this.ipcRenderer = ipcRenderer;
        this.windowWidth = windowWidth;
        this.counter = windowWidth;
        this.rnd = 1;

    }

    handleConnect() {
        this.ipcRenderer.send('estimating_air_suspension:connect');
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

    handleRun( ) {

        if( this.isStateReady() ) {

            this.state2SendingMeasurements();
            this.ipcRenderer.send('estimating_air_suspension:send:measurements', estimator.Y.data[0], this.rnd);

        } else if( this.isStatePause() ) {

            this.state2Running();
            window.frameRate(40);
        }
    }

    handleReset() {
        
    }

    handleReceivedValues( values ) {

        if(this.rnd <= this.estimator.Tf && this.isStateSendingMeasurements() ) {

            for(var i = 0; i < 1000; i++) {
    
                this.estimator.setTyreEstimated( ((this.rnd-1)*1000) + i, parseInt( values[i].split(',')[1] ) );
                this.estimator.setSuspensionEstimated( ((this.rnd-1)*1000) + i, parseInt( values[i].split(',')[0] ) );
            }
            if(this.rnd < this.estimator.Tf) {

                this.rnd += 1;
                this.ipcRenderer.send('estimating_air_suspension:send:measurements', this.estimator.Y.data[0], this.rnd);
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