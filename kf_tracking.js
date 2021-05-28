
const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');

const  net = require('net');
const SerialPort = require('serialport');

// var linearAlgebra = require('linear-algebra')(),     // initialise it
// 					Vector = linearAlgebra.Vector,
// 					Matrix = linearAlgebra.Matrix;


let mainWindow
var _isActive = false;
var _isConnected = false;
let intervalObj;

const SERVER_IP = '127.0.0.1';
const SERVER_PORT = 5090;
var client = new net.Socket();
let port;


module.exports = {
    init,
    connect,
    isActive,
    deactivate
}
		

function isActive() {
    return _isActive;
}

function deactivate() {

    if(_isActive == true)        
        _isActive = false;

    if(_isConnected == true) {

        _isConnected = false;
        client.write('29:-');
        client.end();
        client.destroy();
    }
}


function init(win) {

    mainWindow = win;
	_isActive = true;
}


function deactivate() {
    _isActive = false;
	clearInterval(intervalObj);
}

function isActive() {
    return _isActive;
}



function connect() {

    client.connect(SERVER_PORT, SERVER_IP, function() {
        _isConnected = true;
        console.log('Connected');
    });
}


ipcMain.on('kf_tracking:tcp:send:measurements', (event, code, measurement) => {

	console.log(measurement);

    if(_isConnected == false) {

        client.connect(SERVER_PORT, SERVER_IP, function() {
        
            _isConnected = true;
            console.log('Connected');

            client.write(`${code}:${measurement}`);
        
        });

    } else {

        client.write(`${code}:${measurement}`);
    }
});

ipcMain.on('kf_tracking:uart:send:measurements', (event, code, uart, measurement) => {

	console.log(measurement);

	if ( typeof port === 'undefined' ) {

		console.log("UART Initialization ...")
		port = new SerialPort(uart, { baudRate: 115200 });

		port.on('error', function(err) {
			console.log('Error: ', err.message);
		});

		port.on('data', function(data) {
			let result = data.toString().split(",");
			var x = result[0];
			var y = result[1];
			console.log(result);
			mainWindow.webContents.send('kf_tracking:result', x, y);
		});
	}

	var strMessage = "";
	for(var i = 0; i < measurement.length; i++) {
		if(strMessage != "")
			strMessage += ",";
		strMessage += measurement[i];
	}
	for(var i = strMessage.length; i < 50; i++) {
		strMessage += "_";
	}

	strMessage = `${code}:${strMessage}`;
	console.log(strMessage);

	port.write(strMessage, (err) => {
		if (err) console.log('Error on write: ', err.message);
		console.log("Sending: ", strMessage);
	});

});


client.on('data', function(data) {

    data = data.toString().split(',');
    var x = parseInt( data[0] )
    var y = parseInt( data[1] )
    
    mainWindow.webContents.send('kf_tracking:result', x, y);

})



client.on('close', function() {

    _isConnected = false;
	console.log('Connection closed');

});



// ipcMain.on('rls:ready:receive', (event, uart) => {

// 	if ( typeof port === 'undefined' ) {

// 		port = new SerialPort(uart, { baudRate: 115200 });

// 		port.on('error', function(err) {
// 			console.log('Error: ', err.message);
// 		});

// 		port.on('data', function(data){
// 			// console.log("Received Data: ", data.toString());
// 			let result = data.toString().split(" ");
// 			event.reply('rls:x:data', [result[0], result[1]]);
// 		});
// 	}

// 	function sendCmdRLS(data) {

// 		port.write(data, (err) => {
// 			if (err) console.log('Error on write: ', err.message);
// 			// console.log("Sending: ", data);
// 		});

// 	}

// 	let x = new Matrix([[10], [5]]);
// 	let xhat = new Matrix([[8], [7]]);
// 	let R = new Matrix([[ Math.sqrt(0.1) ]]);
// 	var k = 1;

// 	// H = np.array([[1, 0.99**(k-1)]])
// 	var H = new Matrix([[1, Math.pow(0.99, k-1)]]);
// 	k += 1;
// 	//  y = H @ x + np.sqrt(R) * np.random.randn()
// 	let rnd = new Matrix([[ Math.random() ]]);
// 	var y = H.dot(x).plus( R.dot(rnd) );
// 	// console.log("H: ", H);
// 	// console.log("y: ", y);

// 	// event.reply('rls:x:data', [10, 20]);
// 	strH = H.data[0][1].toFixed(4).toString();
// 	strY = y.data[0][0].toFixed(4).padStart(7, "0");
// 	sendCmdRLS(`${strH} ${strY}`);

// 	var timeCounter = 0;

// 	intervalObj = setInterval(() => {

// 		H = new Matrix([[1, Math.pow(0.99, k-1)]]);
// 		k += 1;
// 		rnd = new Matrix([[ Math.random() ]]);
// 		y = H.dot(x).plus( R.dot(rnd) );

// 		strH = H.data[0][1].toFixed(4).toString();
// 		strY = y.data[0][0].toFixed(4).padStart(7, "0");
// 		// console.log(`H: ${strH} -- y: ${strY}`);

// 		// console.log(`${strH} ${strY}`);
// 		sendCmdRLS(`${strH} ${strY}`);

// 		// event.reply('rls:x:data', [10, 20]);
// 		timeCounter += 1;
// 		if(timeCounter > 80)
// 			clearInterval(intervalObj);

// 	}, 200);

// });












