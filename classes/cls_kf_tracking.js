
const { Matrix } = require('ml-matrix');



let State = Object.freeze({
    NotConnected:                   'Disconnect',
    Connecting:                     'Connecting ...',
    Connected:                      'Connected',
    Ready:                          'Ready to Run',
    Running:                        'Calculating ...',
    Visualization:                  'Visualization',
});

let Trigger = Object.freeze({
    Connect:                        'Connect',
    ConnectionFail:                 'ConnectionFail',
    ConnectionPass:                 'ConnectionPass',
    SendData:                       'SendData',
    ComputationCompleted:           'ComputationCompleted',
    Draw:                           'Draw',
    Reset:                          'Reset',
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
    Reset:                  State.Ready,
    ComputationCompleted:   State.Visualization,
    ConnectionFail:         State.NotConnected
};
rules[State.Visualization] = {
    Reset:                  State.Ready,
    ConnectionFail:         State.Visualization
};

// DrawState, DrawTrigger, DrawRules
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

        this.windowWidth = windowWidth;
        this.kfResults = []

        this.groundTruthX = 0
        this.groundTruthY = 0
        this.CLUTTER_PER_STEP = 1;
        this.ITEM_PER_STEP = 15;

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

            if(this.state != State.NotConnected) {
                this.state = rules[this.state][Trigger.ConnectionFail]
                this.setWorkflow(this.state)
                this.showFlashMessage("Connection Lost", "ERROR")
            }
        });
        this.ipcRenderer.on('kf_tracking:connection:pass', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionPass]
            this.setWorkflow(this.state)
            this.showFlashMessage("Successfully Connected to the Server", "INFO")
        });

        this.ipcRenderer.on('kf_tracking:result', (event, data) => {

            data = data.split(";")
            for(var i = 0; i < data.length; i++) {
                
                var curr_data = data[i].split(',')
                var x = parseInt(curr_data[0])
                var y = parseInt(curr_data[1])
                this.kfResults.push([x, y])
            }

            if(this.state == State.Running && this.stepPointer < this.pathMeasurements.length - 1) {

                var diff = Math.min(this.ITEM_PER_STEP, this.pathMeasurements.length - this.stepPointer)
                var meas = "";
                for(var i = this.stepPointer; i < (diff + this.stepPointer); i++) {
                    if(meas != "")  meas += ";";
                    var curr_meas = this.pathMeasurements[i];
                    meas += `${curr_meas[0]},${curr_meas[1]}`
                }
                this.stepPointer += diff;
                // console.log(meas)
                this.sendData(111, meas);

            } else if(this.state == State.Running) {
                this.state = rules[this.state][Trigger.ComputationCompleted]
                this.setWorkflow(this.state)
            }
        })
    }

    sendData(code, params) {

        if(this.state == State.Running)
            this.ipcRenderer.send('kf_tracking:tcp:send:measurements', code, params);
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

    handleRun(params, pathMeasurements) {

        if(this.state == State.Connected || this.state == State.Ready) {
            
            this.drawHelper.disable();
            this.pathMeasurements = pathMeasurements;
            this.stepPointer = 0;
            this.state = rules[this.state][Trigger.SendData]
            this.setWorkflow(this.state)
            this.sendData(110, params);
            window.frameRate(4);
            
        } else if(this.state == State.NotConnected) {
            this.showFlashMessage("Doesn't Connect to the Server", "WARNING")
        } else if(this.state == State.Running) {
            this.showFlashMessage("Already Running", "WARNING")
        } else if(this.state == State.Visualization) {
            this.showFlashMessage("First You have to Reset, before Running again", "WARNING")
        }
    }
    canReset() {
        return this.state == State.Visualization || this.state == State.Running;
    }
    setReady() {
        if(this.canReset() == true) {
            this.state = rules[this.state][Trigger.Reset]
            this.drawHelper.enable();
            this.setWorkflow(this.state)
        }
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
