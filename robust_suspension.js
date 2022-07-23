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

    // client = new net.Socket();
    client = net.connect(port, ip, function() {
        _isConnected = true;
        console.log("Connected");
    });
    console.log(ex);

    client.on('error', function(ex) {
        console.log("handled error");
        console.log(ex);
    });
    client.on('oncomplete', function() {
        console.log("handled complete");
        // console.log(ex);
    });
    client.on('data', function(data) {

        data = data.toString();
        pack_counter += 1;
        // console.log(pack_counter, data.length)
        mainWindow.webContents.send('robust_suspension:get:values', data );
    });
    // client.connect(port, ip, function() {
    //     _isConnected = true;
    //     console.log('Connected');
    // });
}
// client.on('error', function(ex) {
//     console.log("handled error");
//     console.log(ex);
// });

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



