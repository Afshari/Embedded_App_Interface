const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain, remote } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;


module.exports = {
    init,
    isActive,
    deactivate
}

var _isActive = false;
var _isConnected = false;

function init(win) {

    mainWindow = win

}

function isActive() {
    return _isActive;
}

function deactivate() {

    if(_isActive == true)        
        _isActive = false;

    if(_isConnected == true) {

        _isConnected = false;
        client.end();
        client.destroy();
    }
}

var client = new net.Socket();

function connect(ip, port) {
    // client.connect(5091, '127.0.0.1', function() {
    client.connect(port, ip, function() {
        _isConnected = true;
        console.log('Connected');
    });
}

ipcMain.on('pf_localization:tcp:connect', (event, ip, port) => {

    connect(ip, port);
});

ipcMain.on('pf_localization:tcp:send:prior', (event, u) => {

    if(_isConnected == true) {
        // console.log(u);
        let request = `100:${u}`;
        request = `${request.length}:${request}`;
        client.write(request);
    }
})

ipcMain.on('pf_localization:tcp:send:measurements', (event, u, robot_measure, particles_measure) => {

    if(_isConnected == true) {
        // console.log('u ', u);
        let request = `101:${u}:${robot_measure}:${particles_measure}`;
        request = `${request.length}:${request}`;
        // console.log('request len: ', request.length);
        client.write(request);
    }
})

client.on('data', function(data) {

    data = data.toString();
    // console.log('received: ', data.length)
    
    mainWindow.webContents.send('pf_localization:draw', data );
})


client.on('close', function() {
    _isConnected = false;
	console.log('Connection closed');
});
