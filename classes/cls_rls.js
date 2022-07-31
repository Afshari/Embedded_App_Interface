

var linearAlgebra = require('linear-algebra')(),
                    Matrix = linearAlgebra.Matrix;


let State = Object.freeze({
    NotConnected:                   'Disconnect',
    Connecting:                     'Connecting ...',
    Connected:                      'Connected',
    Ready:                          'Ready to Run',
    Running:                        'Calculating ...',
    Completed:                      'Completed',
});

let Trigger = Object.freeze({
    Connect:                        'Connect',
    ConnectionFail:                 'ConnectionFail',
    ConnectionPass:                 'ConnectionPass',
    SendData:                       'SendData',
    ComputationCompleted:           'ComputationCompleted',
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
    ComputationCompleted:   State.Completed,
    ConnectionFail:         State.NotConnected
};
rules[State.Completed] = {
    Reset:                  State.Ready,
    ConnectionFail:         State.Completed
};

class HandleWorkFlow {

    constructor(ipcRenderer, chart, showFlashMessage, setWorkflow) {

        this.state              = State.NotConnected;
        this.ipcRenderer        = ipcRenderer;
        this.chart              = chart;
        this.showFlashMessage   = showFlashMessage;
        this.setWorkflow        = setWorkflow;

        this.data_generator = new RLSDataGenerator();

        this.ipcRenderer.on('rls:connection:fail', (event, values) => {

            if(this.state != State.NotConnected) {
                this.state = rules[this.state][Trigger.ConnectionFail]
                this.setWorkflow(this.state)
                this.showFlashMessage("Connection Lost", "ERROR")
            }
        });
        this.ipcRenderer.on('rls:connection:pass', (event, values) => {
            this.state = rules[this.state][Trigger.ConnectionPass]
            this.setWorkflow(this.state)
            this.showFlashMessage("Successfully Connected to the Server", "INFO")
        });

        var that = this;
        this.ipcRenderer.on('rls:receive:result', function (event, x) {

			if(typeof that.chart.data.labels !== "undefined" && that.chart.data.labels.length < 10) {
				var labels = [];
				for(var i = 0; i < 300; i++)
					labels.push("");
                that.chart.data.labels = labels;
			}

			x = x.split(',')
			that.chart.data.datasets[0].data.push(x[0]);
			that.chart.data.datasets[1].data.push(x[1]);
			that.chart.update();
			
			let x0 = parseFloat(x[0]).toFixed(2);
			let x1 = parseFloat(x[1]).toFixed(2);

			var element_xhat = document.getElementById("xhat_value");
			that.katex.render(String.raw`  \hat{x}_{k} = \begin{bmatrix} ${x0} \\ ${x1} \end{bmatrix}  `, element_xhat, {
				displayMode: true,
				throwOnError: false
			});

            if(that.data_generator.hasData() == true && that.state == State.Running) {
                that.ipcRenderer.send('rls:send:data', that.data_generator.getCode(), that.data_generator.generateData());
            } else {
                that.state = rules[that.state][Trigger.ComputationCompleted]
                that.setWorkflow(that.state)
            }
		});
    }

    setkatex(katex) {
        this.katex = katex;
    }

    handleConnect(ip, port) {

        if(this.state == State.NotConnected) {
            this.state = rules[this.state][Trigger.Connect]
            this.setWorkflow(this.state)
            this.ipcRenderer.send('rls:tcp:connect', ip, port);
        } else {
            this.showFlashMessage("Already Connected", "WARNING")   
        }
    }

    handleRun() {

        if(this.state == State.Ready || this.state == State.Connected) {

			this.chart.data.datasets[0].data = [];
			this.chart.data.datasets[1].data = [];
			this.chart.update();

            this.data_generator.initialize();
            this.state = rules[this.state][Trigger.SendData]
            this.setWorkflow(this.state)
            this.ipcRenderer.send('rls:send:data', this.data_generator.getCode(), this.data_generator.generateData());
            
        } else if(this.state == State.NotConnected) {
            this.showFlashMessage("Doesn't Connect to the Server", "WARNING")
        } else if(this.state == State.Running) {
            this.showFlashMessage("Already Running", "WARNING")
            this.showFlashMessage("If You want to Run with different Parameters, First Reset", "INFO")
        } else if(this.state == State.Completed) {
            this.showFlashMessage("First you should 'Reset' before Running Again", "WARNING")
        }
    }

    handleReset() {

        if(this.state == State.Completed) {
            
            this.state = rules[this.state][Trigger.Reset]
            this.setWorkflow(this.state)
        } else if(this.state == State.Running) {
            this.showFlashMessage("Algorithm is Running ...", "WARNING")
        }
    }

}

class RLSDataGenerator {

    constructor() {

        this.initialize();
    }

    initialize() {

        this.k              = 1;
        this.R              = new Matrix([[ 0.1 ]]);
        this.xhat           = new Matrix([[8], [7]]);
        this.x              = new Matrix([[10], [5]]);
        this.MAX_COUNTER    = 120;
    }

    getCode() {
        if(this.k === 1)    return 100;
        else                return 101;
    }

    hasData() {
        return (this.k < this.MAX_COUNTER);
    }

    generateData() {

        if(this.k === 1) {
            this.k += 1;
            return `${this.xhat.data[0]},${this.xhat.data[1]},${this.R.data[0][0].toFixed(4)}`;
        } else {
            // H = np.array([[1, 0.99**(k-1)]])
            var H = new Matrix([[1, Math.pow(0.99, this.k-1)]]);
            //  y = H @ x + np.sqrt(R) * np.random.randn()
            let rnd = new Matrix([[ Math.random() ]]);
            var y = H.dot(this.x).plus( this.R.dot(rnd) );
    
            let strH1 = H.data[0][0];
            let strH2 = H.data[0][1].toFixed(2).toString();
            let strY = y.data[0][0].toFixed(2).toString();
    
            this.k += 1;
            return `${strH1},${strH2},${strY}`
        }
    }

}

module.exports = {
    HandleWorkFlow,
}

