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
const lite_ids = require('./lite_ids');
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

// let port;
// var inputData = [];
// var outputData = [];
// var dataIndex = 0;

// let intervalObj;

ipcMain.on("menu:page:change", function(event, addr) {

	console.log(addr);

	if(lastPage === 'rls.ejs') {

		rls.deactivate();

	} else if(lastPage == 'sot.ejs') {

		sot.deactivate();

	} else if(lastPage === 'detectron_tracking.ejs') {

		detectron_tracking.deactivate();

	} else if(lastPage === 'lite_ids.ejs') {

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

	} else if(addr === 'lite_ids.ejs') {

		lite_ids.init(win);
		win.loadFile('front_end/lite_ids.ejs');

	}

	lastPage = addr;

})


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
	sot.deactivate();
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
  }
})
