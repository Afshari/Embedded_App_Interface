
const { ipcMain } = require('electron');

const  net = require('net');

var mainWindow;
var _isActive = false;
var _isConnected = false;


module.exports = {
    init,
    isActive,
    deactivate
}
		

function isActive() { return _isActive; }

// function deactivate() { _isActive = false; }

function deactivate() {

    if(_isActive == true)        
        _isActive = false;

    if(_isConnected == true) {

        _isConnected = false;
        // client.write('29:-');
        client.end();
        client.destroy();
    }
}


function init(win) {

    mainWindow = win;
	_isActive = true;
}


var client;

function connect(ip, port) {

    client = new net.Socket();

    client.on('error', function(ex) {
        _isConnected = false;
        mainWindow.webContents.send('kf_tracking:connection:fail');
    });
    client.on('close', function() {
        _isConnected = false;
        mainWindow.webContents.send('kf_tracking:connection:fail');
    });

    client.connect(port, ip, function() {
        _isConnected = true;
        mainWindow.webContents.send('kf_tracking:connection:pass');
    });

    client.on('data', function(data) {

        data = data.toString();
        // console.log(data);
        mainWindow.webContents.send('kf_tracking:result', data);
    })    
}

ipcMain.on('kf_tracking:connect', (event, ip, port) => {
    connect(ip, port);
});

ipcMain.on('kf_tracking:tcp:send:measurements', (event, code, data) => {

    let strData = `${code}:${data}`;
    strData = `S${strData.length}:${strData}E`;
    client.write(strData);
});








