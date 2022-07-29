
const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');

const  net = require('net');
// const  SerialPort = require('serialport');
// const  ByteLength = require('@serialport/parser-byte-length');

// [✓] - Create a file in cls directory for kf_tracking
// [✓] - Test TCP Connection
// [✓] - Create a function for TCP Connect
// [✓] - Send TCP Connect Request from ejs to backend js
// [✓] - Find Init Code & Send Measurement Code
// [✓] - Create a class for HandleDraw


var mainWindow;
var _isActive = false;
var _isConnected = false;
// let intervalObj;


module.exports = {
    init,
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
	// clearInterval(intervalObj);
}

function isActive() {
    return _isActive;
}


var client;

function connect(ip, port) {

    client = new net.Socket();

    client.on('error', function(ex) {
        mainWindow.webContents.send('kf_tracking:connection:fail');
    });

    client.connect(port, ip, function() {
        _isConnected = true;
        mainWindow.webContents.send('kf_tracking:connection:pass');
        console.log('Connected');
    });

    client.on('data', function(data) {

        data = data.toString();
    
        if(data === "corrupted") {
            mainWindow.webContents.send('kf_tracking:result', -1, -1);
        } else {
            data = data.toString().split(',');
            var x = parseInt( data[0] )
            var y = parseInt( data[1] )
            
            mainWindow.webContents.send('kf_tracking:result', x, y);
        }
    })
    
    client.on('close', function() {
        _isConnected = false;
        console.log('Connection closed');
    });
}

ipcMain.on('kf_tracking:connect', (event, ip, port) => {
    connect(ip, port);
});

ipcMain.on('kf_tracking:tcp:send:measurements', (event, code, data) => {

    let strData = `${code}:${data}`;
    strData = `S${strData.length}:${strData}E`;
    client.write(strData);
});








