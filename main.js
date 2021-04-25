const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');
const contextMenu = require('electron-context-menu');
const SerialPort = require('serialport');
const fs = require('fs');
const lineReader = require('line-reader');
var linearAlgebra = require('linear-algebra')(),  
					Vector = linearAlgebra.Vector,
					Matrix = linearAlgebra.Matrix;

const sot = require('./sot');
const rls = require('./rls');
const detectron_tracking = require('./detectron_tracking');


let win;
var lastPage = '';


function createWindow() {
	win = new BrowserWindow({
		webPreferences: {
				enableRemoteModule: true,
			nodeIntegration: true
		}
	})

	win.maximize();
	
	win.loadFile('front_end/detectron_tracking.ejs');
	lastPage = 'detectron_tracking.ejs';
	detectron_tracking.init(win);

}

let port;
var inputData = [];
var outputData = [];
var dataIndex = 0;

let intervalObj;

ipcMain.on("menu:page:change", function(event, addr) {

	console.log(addr);

	if(lastPage === 'rls.ejs') {

		rls.deactivate();

	} else if(lastPage == 'sot.ejs') {

		sot.deactivate();

	} else if(lastPage === 'detectron_tracking.ejs') {

		detectron_tracking.deactivate();

	}

	if(addr === 'rls.ejs') {

		rls.init(win)
		win.loadFile('front_end/rls.ejs');

	} else if(addr === 'sot.ejs') {

		sot.init(win);
		win.loadFile('front_end/sot.ejs');

	} else if(addr === 'detectron_tracking.ejs') {

		detectron_tracking.init(win);
		win.loadFile('front_end/detectron_tracking.ejs');

	}
})

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
		// console.log(ports)
		event.reply('uart:data', ports);
	});
});



app.whenReady().then(function() {
	createWindow()
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
	detectron_tracking.deactivate();
	rls.deactivate();
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
  }
})
