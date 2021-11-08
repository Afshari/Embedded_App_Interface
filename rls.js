const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');

// const  SerialPort = require('serialport');
// const  ByteLength = require('@serialport/parser-byte-length');

const net = require('net')
var linearAlgebra = require('linear-algebra')(),     // initialise it
					Vector = linearAlgebra.Vector,
					Matrix = linearAlgebra.Matrix;


let mainWindow
var _isActive = false
var _isConnected = false;
let port;
let intervalObj;

const UART_DATA_LENGTH = 300;
const UART_RECV_LENGTH = 30;

module.exports = {
	init,
	isActive,
	deactivate
}					

function init(win) {

    mainWindow = win
	_isActive = true
}

function deactivate() {
    _isActive = false;
	clearInterval(intervalObj);
}

function isActive() {
    return _isActive;
}

var client = new net.Socket();

function connect(ip, port) {
    client.connect(port, ip, function() {
        _isConnected = true;
        console.log('Connected');
    });
}

ipcMain.on('rls:tcp:connect', (event, ip, port) => {

    connect(ip, port);
})

ipcMain.on('rls:tcp:send:state', (event, code, w, ms, rnd, ITEM_PER_STEP) => {

    let dataStr = "";

    w = new Matrix( w.data );
    ms = new Matrix( ms.data );
    for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

        if(dataStr !== "")
            dataStr += ",";
        dataStr += `${w.get(0, i).toFixed(4)},${ms.get(0, i).toFixed(1)}`
    }

    dataStr = `${code}:${dataStr}`
    dataStr = `S${dataStr.length}:${dataStr}E`
    client.write(dataStr)
})


client.on('data', function(data) {

    data = data.toString();
    // console.log(data.length)
    mainWindow.webContents.send('rls:get:values', data );
});


function sendCommandUart(code, measurement) {

    let strData = `${code}:${measurement}`;
    strData = `${strData.length}:${strData}`;
	console.log('strData ', strData)
    for(var i = strData.length; i < UART_DATA_LENGTH; i++) {
        strData += "_";
    }

    // port.write(strData, (err) => {
    //     if(err) 
    //         console.log('Error on write: ', err.message);
    // });
}


var k = 1;
// let R = new Matrix([[ Math.sqrt(0.1) ]]);
let R = new Matrix([[ 0.1 ]]);
let xhat = new Matrix([[8], [7]]);
let x = new Matrix([[10], [5]]);


function prepareData() {

	if(k === 1)
		sendCommandUart(110, `${xhat.data[0]},${xhat.data[1]},${R.data[0][0].toFixed(4)}`);
	else {
		// H = np.array([[1, 0.99**(k-1)]])
		var H = new Matrix([[1, Math.pow(0.99, k-1)]]);
		//  y = H @ x + np.sqrt(R) * np.random.randn()
		let rnd = new Matrix([[ Math.random() ]]);
		var y = H.dot(x).plus( R.dot(rnd) );

		strH1 = H.data[0][0];
		strH2 = H.data[0][1].toFixed(2).toString();
		strY = y.data[0][0].toFixed(2).toString();

		sendCommandUart(111, `${strH1},${strH2},${strY}`);
	}
	k += 1;
}



let finished = false;
ipcMain.on('rls:ready:receive', (event, uart) => {

	if ( typeof port === 'undefined' ) {

		port = new SerialPort(uart, { baudRate: 115200 });
		const parser = port.pipe( new ByteLength( { length: UART_RECV_LENGTH } ) );

		finished = false;
		port.on('error', function(err) {
			console.log('Error: ', err.message);
		});

		parser.on('data', function(data){

			let currData = data.toString();
			console.log("currData ", currData);

            if( currData.indexOf("corrupted") !== -1 ) {

                mainWindow.webContents.send('rls:x:data', -1, -1);
                
            } else {

			    currData = currData.replace(/_/g,"");
                currData = currData.split(',');
                // console.log(data)
                var x = parseFloat( currData[0] )
                var y = parseFloat( currData[1] )
				console.log(k, x, y)
                
                if(Number.isNaN(x) == false && Number.isNaN(y) == false)
					event.reply('rls:x:data', [x, y]);

				if(x === 10 && y === 5) {
					console.log("Finished");
					finished = true;
				} else if(finished == false && k < 280) {
					prepareData();
				}

			}

		});

		prepareData();
	}
});









