
const { Matrix } = require('ml-matrix');


// [ ] - Create disable & enable function for DrawHelper

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

/////////////////////////////////////////////////////////////////////////
let DrawState = Object.freeze({
    Ready:                      'Ready',
    Drawing:                    'Drawing',
    SetInit:                    'SetInit',
    Disabled:                   'Disabled'
});

let DrawTrigger = Object.freeze({
    Draw:                       'Draw',
    StopDraw:                   'StopDraw',
    AddPoint:                   'AddPoint',
    PointAdded:                 'PointAdded',
    Disable:                    'Disable',
    Enable:                     'Enable'
});

let draw_rules = {};
draw_rules[DrawState.Ready] = {
    Draw:                   DrawState.Drawing,
    AddPoint:               DrawState.SetInit,
    Disable:                DrawState.Disabled,
}
draw_rules[DrawState.SetInit] = {
    PointAdded:             DrawState.Ready,
    // Draw:                   DrawState.Drawing,
    Disable:                DrawState.Disabled,
}
draw_rules[DrawState.Drawing] = {
    StopDraw:               DrawState.Ready
}
draw_rules[DrawState.Disabled] = {
    Enable:                 DrawState.Ready
}


class HandleWorkFlow {

    constructor(ipcRenderer, drawHelper, windowWidth, showFlashMessage, setWorkflow) {

        this.state = State.NotConnected;
        this.drawHelper = drawHelper;

        this.ipcRenderer = ipcRenderer;
        this.showFlashMessage = showFlashMessage;
        this.setWorkflow = setWorkflow;

        // this.windowWidth = 900;
        // this.windowHeight = 600;
        this.windowWidth = windowWidth;
        this.kfResults = []

        this.groundTruthX = 0
        this.groundTruthY = 0
        this.CLUTTER_PER_STEP = 1;

        this.init_x = 0;
        this.init_y = 0;
        this.std_x  = 0.1;
        this.std_y  = 0.1;
        this.process_noise  = 1;
        this.dt  = 0.1;

        this.HH = new Matrix([  [1., 0., 0., 0.],
                                [0., 1., 0., 0.] ])

        this.arrayMaxIndex = function(array) {
            return array.indexOf(Math.max.apply(null, array));
        };
        this.arrayMinIndex = function(array) {
            return array.indexOf(Math.min.apply(null, array));
        };

        this.ipcRenderer.on('kf_tracking:connection:fail', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionFail]
            this.setWorkflow(this.state)
            this.showFlashMessage("Connection Lost", "ERROR")
        });
        this.ipcRenderer.on('kf_tracking:connection:pass', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionPass]
            this.setWorkflow(this.state)
            this.showFlashMessage("Successfully Connected to the Server", "INFO")
        });

        this.ipcRenderer.on('kf_tracking:result', (event, x, y) => {

            console.log("Result: ", x, y)
            if(x == -1 && y == -1) {
    
                this.sendData(101, pathMeasurements[stepPointer]);
    
            } else {
    
                this.kfResults.push([x, y])
                if(this.state == State.Running && stepPointer < points.length - 1) {
    
                    stepPointer += 1;
                    this.sendData(101, pathMeasurements[stepPointer]);
    
                } else {
                    this.state = rules[this.state][Trigger.ComputationCompleted]
                    this.setWorkflow(this.state)
                    // showFlashMessage('There is not Data for Tracking', 'WARNING');
                }
            }
        })
    
    }

    sendData(code, params) {

        this.ipcRenderer.send('kf_tracking:tcp:send:measurements', code, params);
    }

    getWidthHeightOrient(covar, HH) {

        var e = new EigenvalueDecomposition( HH.mmul( covar.mmul( HH.transpose() ) ) );
        var w = e.realEigenvalues;
        // console.log(w)
        var v = e.eigenvectorMatrix;
        // console.log(v)
        max_ind = this.arrayMaxIndex(w)
        min_ind = this.arrayMinIndex(w)
    
        var width  = 2 * Math.sqrt(w[max_ind])
        var height = 2 * Math.sqrt(w[min_ind])
    
        var orientation = Math.atan2( v.data[1][max_ind], v.data[0][max_ind])
        
        return { width: width, height: height, orientation: orientation }
    }

    handleConnect(ip, port) {

        if(this.state == State.NotConnected) {
            this.state = rules[this.state][Trigger.Connect]
            this.setWorkflow(this.state)
            this.ipcRenderer.send('kf_tracking:connect', ip, port);
        } else {
            this.showFlashMessage("Already Connected", "WARNING")   
        }
    }

    handleRun(params) {

        if(this.state == State.Connected || this.state == State.Ready) {
            
            this.drawHelper.disable();
            this.state = rules[this.state][Trigger.SendData]
            this.setWorkflow(this.state)
            this.sendData(100, params);
            window.frameRate(4);
            

        } else if(this.state == State.NotConnected) {
            this.showFlashMessage("Doesn't Connect to the Server", "WARNING")
        }
        
        // else if(state == State.pause || state == State.step) {
        //     window.frameRate(4);
        //     state = State.running;
        // } else if(this.state == State.running) {
        //     this.showFlashMessage('Already Running', 'INFO');
        // }
    }
}


class DrawHelper {

    constructor() {

        this.draw_state = DrawState.Ready;
    }

    disable() {
        if(this.draw_state == DrawState.Ready || this.draw_state == DrawState.SetInit) {
            this.draw_state = draw_rules[this.draw_state][DrawTrigger.Disable];
        }
    }

    enable() {
        if(this.draw_state == DrawState.Disabled)
            this.draw_state = draw_rules[this.draw_state][DrawTrigger.Enable];
    }

    canDraw() {
        return this.draw_state == DrawState.Ready;
    }
    canErase() {
        return (this.draw_state == DrawState.Ready || this.draw_state == DrawState.SetInit)
    }
    canMeasure() {
        return (this.draw_state == DrawState.Ready || this.draw_state == DrawState.SetInit)
    }
    canInit() {
        return this.draw_state == DrawState.Ready;
    }
    isDrawingActive() {
        return this.draw_state == DrawState.Drawing;
    }
    isInitActive() {
        return this.draw_state == DrawState.SetInit;
    }
}


module.exports = {
    DrawHelper,
    HandleWorkFlow,
    DrawState,
    DrawTrigger,
    draw_rules
}
