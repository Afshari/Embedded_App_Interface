const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');
const contextMenu = require('electron-context-menu');
const SerialPort = require('serialport');
const fs = require('fs');
const lineReader = require('line-reader');
var linearAlgebra = require('linear-algebra')(),  
					Vector = linearAlgebra.Vector,
					Matrix = linearAlgebra.Matrix;

const sot = require('./sot')



// sot.connect()


function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
			enableRemoteModule: true,
      nodeIntegration: true
    }
  })
	win.maximize()
  win.loadFile('front_end/sot.ejs')

  sot.init(win)
//   sot.readFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')

}

let port;
var inputData = [];
var outputData = [];
var dataIndex = 0;

let intervalObj;

ipcMain.on('data:submit', (event, input_path, output_path, uart) => {

	if ( typeof port === 'undefined' ) {
		port = new SerialPort(uart, { baudRate: 115200 });

		port.on('error', function(err) {
			console.log('Error: ', err.message);
		});
		port.on('data', function(data){
			let result = data.toString()
			if(result == outputData[dataIndex]) {
				if(result == "1,0")
					event.reply('TBL:update', 1);
				else
					event.reply('TBL:update', 4);
			} else {
				if(result == "1,0")
					event.reply('TBL:update', 3);
				else
					event.reply('TBL:update', 2);
			}
			dataIndex += 1;
			if(dataIndex >= inputData.length) {
				clearInterval(intervalObj);
				console.log("Finished");
			}
		});
	}
	function sendCommand(data) {
		port.write(data, (err) => {
			if (err) console.log('Error on write: ', err.message);
		});
	}

	function sendData() {
		inputData[dataIndex].split(',').forEach( (value) => {
			let fValue = parseFloat(value);
			if(fValue >= 0) {
				value = value.replace('-', '');
				value = "+" + value;
			}
			sendCommand(value);
		});
	}


	if(inputData.length === 0) {

		function readInputFile() {
			lineReader.eachLine(input_path, function(line, last) {
				inputData.push(line);
				if(last) {
					readOutputFile();
				}
			});
		}

		function readOutputFile() {
			lineReader.eachLine(output_path, function(line, last) {
				outputData.push(line);
				if(last) {
					intervalObj = setInterval(() => {
						sendData();
					}, 200);
				}
			});
		}

		readInputFile();

	} else {
		sendData();
	}

});

ipcMain.on('uart:reload', (event) => {
	SerialPort.list().then(function(ports){
		event.reply('uart:data', ports);
	});
});


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

	// console.log("x: ", x);
	// console.log("xhat: ", xhat);
	// console.log("R: ", R);
	// H = np.array([[1, 0.99**(k-1)]])
	var H = new Matrix([[1, Math.pow(0.99, k-1)]]);
	k += 1;
	//  y = H @ x + np.sqrt(R) * np.random.randn()
	let rnd = new Matrix([[ Math.random() ]]);
	var y = H.dot(x).plus( R.dot(rnd) );
	console.log("H: ", H);
	console.log("y: ", y);

	// event.reply('rls:x:data', [10, 20]);
	strH = H.data[0][1].toFixed(4).toString();
	strY = y.data[0][0].toFixed(4).padStart(7, "0");
	sendCmdRLS(`${strH} ${strY}`);

	var timeCounter = 0;
	let interval = setInterval(() => {

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
		if(timeCounter > 100)
			clearInterval(interval);
	}, 1000);

});


app.whenReady().then(function() {
	createWindow()
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
  }
})
