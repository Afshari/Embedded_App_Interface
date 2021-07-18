const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
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

function connect() {
    client.connect(5091, '127.0.0.1', function() {
        _isConnected = true;
        console.log('Connected');
    });
}