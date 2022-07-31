const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')
const { Matrix } = require('ml-matrix');

// [ ] - Create class for StrategyNetwork
// [ ] - Create class for StrategyFile
// [ ] - Create class for Proxy
// [ ] - Add functions of reading data file
// [ ] - Add drawing function to Renderer File
// [ ] - Add Reset Button
// [ ] - 


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

var client;
var pack_counter = 0;

function connect(ip, port) {

    client = new net.Socket();

    client.on('error', function(ex) {
        _isConnected = false;
        mainWindow.webContents.send('robust_suspension:connection:fail');
    });
    client.on('close', function() {
        _isConnected = false;
        mainWindow.webContents.send('robust_suspension:connection:fail');
    });

    client.connect(port, ip, function() {
        _isConnected = true;
        mainWindow.webContents.send('robust_suspension:connection:pass');
    });

    client.on('data', function(data) {

        data = data.toString();
        pack_counter += 1;
        mainWindow.webContents.send('robust_suspension:get:values', data );
    });
}

ipcMain.on('robust_suspension:connect', (event, ip, port) => {

    connect(ip, port);
})



ipcMain.on('robust_suspension:tcp:send:state', (event, code, w, ms, rnd, ITEM_PER_STEP) => {

    let dataStr = "";

    w = new Matrix( w.data );
    ms = new Matrix( ms.data );
    for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

        if(dataStr !== "")
            dataStr += ",";
        dataStr += `${w.get(0, i).toFixed(4)},${ms.get(0, i).toFixed(1)}`
    }

    dataStr = `${code}:${dataStr}`
    dataStr = `S${dataStr.length}:${dataStr}E`
    client.write(dataStr)
})



