const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');
// const contextMenu = require('electron-context-menu');
const SerialPort = require('serialport');
// const fs = require('fs');
// const lineReader = require('line-reader');
var linearAlgebra = require('linear-algebra')(),     // initialise it
					Vector = linearAlgebra.Vector,
					Matrix = linearAlgebra.Matrix;


let mainWindow
var _isActive = false
let port;

module.exports = {
	init,
	isActive,
	deactivate
}					

let intervalObj;

function init(win) {

    mainWindow = win
	_isActive = true
}

// function exitApp() {

//     if(_isActive == true) {
//         deactivate();
//     }
// }


function deactivate() {
    _isActive = false;
	clearInterval(intervalObj);
}

function isActive() {
    return _isActive;
}



ipcMain.on('rls:ready:receive', (event, uart) => {

	if ( typeof port === 'undefined' ) {

		port = new SerialPort(uart, { baudRate: 115200 });

		port.on('error', function(err) {
			console.log('Error: ', err.message);
		});

		port.on('data', function(data){
			// console.log("Received Data: ", data.toString());
			let result = data.toString().split(" ");
			event.reply('rls:x:data', [result[0], result[1]]);
		});
	}

	function sendCmdRLS(data) {
		port.write(data, (err) => {
			if (err) console.log('Error on write: ', err.message);
			// console.log("Sending: ", data);
		});
	}

	let x = new Matrix([[10], [5]]);
	let xhat = new Matrix([[8], [7]]);
	let R = new Matrix([[ Math.sqrt(0.1) ]]);
	var k = 1;

	// H = np.array([[1, 0.99**(k-1)]])
	var H = new Matrix([[1, Math.pow(0.99, k-1)]]);
	k += 1;
	//  y = H @ x + np.sqrt(R) * np.random.randn()
	let rnd = new Matrix([[ Math.random() ]]);
	var y = H.dot(x).plus( R.dot(rnd) );
	// console.log("H: ", H);
	// console.log("y: ", y);

	// event.reply('rls:x:data', [10, 20]);
	strH = H.data[0][1].toFixed(4).toString();
	strY = y.data[0][0].toFixed(4).padStart(7, "0");
	sendCmdRLS(`${strH} ${strY}`);

	var timeCounter = 0;
	intervalObj = setInterval(() => {

		H = new Matrix([[1, Math.pow(0.99, k-1)]]);
		k += 1;
		rnd = new Matrix([[ Math.random() ]]);
		y = H.dot(x).plus( R.dot(rnd) );

		strH = H.data[0][1].toFixed(4).toString();
		strY = y.data[0][0].toFixed(4).padStart(7, "0");
		// console.log(`H: ${strH} -- y: ${strY}`);

		// console.log(`${strH} ${strY}`);
		sendCmdRLS(`${strH} ${strY}`);

		// event.reply('rls:x:data', [10, 20]);
		timeCounter += 1;
		if(timeCounter > 80)
			clearInterval(intervalObj);

	}, 200);

});


//ipcMain.on('data:submit', (event, input_path, output_path, uart) => {
//
//	if ( typeof port === 'undefined' ) {
//		port = new SerialPort(uart, { baudRate: 115200 });
//
//		port.on('error', function(err) {
//			console.log('Error: ', err.message);
//		});
//		port.on('data', function(data){
//			let result = data.toString()
//			if(result == outputData[dataIndex]) {
//				if(result == "1,0")
//					event.reply('TBL:update', 1);
//				else
//					event.reply('TBL:update', 4);
//			} else {
//				if(result == "1,0")
//					event.reply('TBL:update', 3);
//				else
//					event.reply('TBL:update', 2);
//			}
//			dataIndex += 1;
//			if(dataIndex >= inputData.length) {
//				clearInterval(intervalObj);
//				console.log("Finished");
//			}
//		});
//	}
//	function sendCommand(data) {
//		port.write(data, (err) => {
//			if (err) console.log('Error on write: ', err.message);
//		});
//	}
//
//	function sendData() {
//		inputData[dataIndex].split(',').forEach( (value) => {
//			let fValue = parseFloat(value);
//			if(fValue >= 0) {
//				value = value.replace('-', '');
//				value = "+" + value;
//			}
//			sendCommand(value);
//		});
//	}
//
//
//	if(inputData.length === 0) {
//
//		function readInputFile() {
//			lineReader.eachLine(input_path, function(line, last) {
//				inputData.push(line);
//				if(last) {
//					readOutputFile();
//				}
//			});
//		}
//
//		function readOutputFile() {
//			lineReader.eachLine(output_path, function(line, last) {
//				outputData.push(line);
//				if(last) {
//					intervalObj = setInterval(() => {
//						sendData();
//					}, 200);
//				}
//			});
//		}
//
//		readInputFile();
//
//	} else {
//		sendData();
//	}
//
//});







