const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');

const SerialPort = require('serialport');

var linearAlgebra = require('linear-algebra')(),     // initialise it
					Vector = linearAlgebra.Vector,
					Matrix = linearAlgebra.Matrix;


let mainWindow
var _isActive = false
var _isConnected = false;
let port;
let intervalObj;


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


function sendCommandUart(code, measurement) {

    let strData = `${code}:${measurement}`;
    strData = `${strData.length}:${strData}`;
    for(var i = strData.length; i < 54; i++) {
        strData += "_";
    }

    port.write(strData, (err) => {
        if(err) 
            console.log('Error on write: ', err.message);
    });
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

ipcMain.on('rls:ready:receive', (event, uart) => {

	if ( typeof port === 'undefined' ) {

		port = new SerialPort(uart, { baudRate: 115200 });

		port.on('error', function(err) {
			console.log('Error: ', err.message);
		});

		var wholeData = "";
		port.on('data', function(data){

			let currData = data.toString();

            if( currData.indexOf("corrupted") !== -1 ) {

                wholeData = "";
                mainWindow.webContents.send('rls:x:data', -1, -1);
                
            } else if( currData.indexOf('\r\n') !== -1 ) {
        
                wholeData += currData;
                wholeData = wholeData.toString().split(',');
                // console.log(data)
                var x = parseFloat( wholeData[0] )
                var y = parseFloat( wholeData[1] )
				console.log(x, y)
                wholeData = "";
                
                // mainWindow.webContents.send('rls:x:data', x, y);
				event.reply('rls:x:data', [x, y]);

				if(k < 280) {
					prepareData();
				}

            } else {

                wholeData += currData;
            }

			// console.log("Received Data: ", data.toString());
			// let result = data.toString().split(" ");
			// event.reply('rls:x:data', [result[0], result[1]]);
		});

		prepareData();
	}




});









