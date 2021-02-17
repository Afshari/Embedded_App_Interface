const { app, BrowserWindow } = require('electron')
const ejse = require('ejs-electron')
const contextMenu = require('electron-context-menu');
const SerialPort = require('serialport');
var nodeConsole = require('console');


contextMenu({
	prepend: (defaultActions, params, browserWindow) => [ {
			label: 'Rainbow',
			// Only show it when right-clicking images
			visible: params.mediaType === 'image'
		}, {
			label: 'Search Google for “{selection}”',
			// Only show it when right-clicking text
			visible: params.selectionText.trim().length > 0,
			click: () => {
				shell.openExternal(`https://google.com/search?q=${encodeURIComponent(params.selectionText)}`);
			}
		}
	]
});


var myConsole = new nodeConsole.Console(process.stdout, process.stderr);
console.log("TEST");
console.log(SerialPort.list());

SerialPort.list().then(function(ports){
  ports.forEach(function(port){
    console.log("Port: ", port);
  })
});

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

app.whenReady().then(function() {
	SerialPort.list().then(function(ports){
		createWindow(ports)
	});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
