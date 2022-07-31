const {ipcMain } = require('electron');

const net = require('net')

let mainWindow;
var _isActive = false;
var _isConnected = false;


module.exports = {
	init,
	isActive,
	deactivate
}					

function init(win) {

    mainWindow = win;
	_isActive = true
}

function deactivate() { _isActive = false; }
function isActive()   { return _isActive;  }

var client;

function connect(ip, port) {

	client = new net.Socket();

    client.on('error', function(ex) {
        _isConnected = false;
        mainWindow.webContents.send('rls:connection:fail');
    });
    client.on('close', function() {
        _isConnected = false;
        mainWindow.webContents.send('rls:connection:fail');
    });

    client.connect(port, ip, function() {
        _isConnected = true;
		mainWindow.webContents.send('rls:connection:pass');
    });

	client.on('data', function(data) {

		data = data.toString();
        // console.log(data);
		mainWindow.webContents.send('rls:receive:result', data);
	});
}

ipcMain.on('rls:tcp:connect', (event, ip, port) => {

    connect(ip, port);
})


ipcMain.on('rls:send:data', (event, code, data)  => {

	let strData = `${code}:${data}`;
    strData = `S${strData.length}:${strData}E`;
    client.write(strData);
});







