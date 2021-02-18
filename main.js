const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');
const contextMenu = require('electron-context-menu');
const SerialPort = require('serialport');
const fs = require('fs');
const lineReader = require('line-reader');


// SerialPort.list().then(function(ports){
//   ports.forEach(function(port){
//     console.log("Port: ", port);
//   })
// });

function createWindow (ports) {
  const win = new BrowserWindow({
    webPreferences: {
			enableRemoteModule: true,
      nodeIntegration: true
    }
  })
	win.maximize()
  win.loadFile('front_end/ids.ejs', {query: {"ports": JSON.stringify(ports)}})
}

let port;

ipcMain.on('data:submit', (event, input_path, output_path, uart) => {

	if ( typeof port === 'undefined' ) {
		port = new SerialPort(uart, { baudRate: 115200 });

		port.on('error', function(err) {
			console.log('Error: ', err.message);
		});
		port.on('data', function(data){
			console.log("Received Data => ", data.toString());
		});
	}
	function sendCommand(data){
		port.write(data, (err) => {
			if (err) console.log('Error on write: ', err.message);
			console.log(data);
		});
	}

	lineReader.eachLine(input_path, function(line, last) {
		// console.log(line.length);
		// console.log(line.split(','));
		// do whatever you want with line...
		if(last){
			// or check if it's the last one
			console.log("Sent");
			sendCommand("Hello");
		}
	});
});

app.whenReady().then(function() {
	SerialPort.list().then(function(ports){
		createWindow(ports)
	});
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
		SerialPort.list().then(function(ports){
			createWindow(ports)
		});
  }
})
