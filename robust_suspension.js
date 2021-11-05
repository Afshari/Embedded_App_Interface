const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')
const { Matrix } = require('ml-matrix');


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
    client.connect(port, ip, function() {
        _isConnected = true;
        console.log('Connected');
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


var pack_counter = 0;
client.on('data', function(data) {

    data = data.toString();
    pack_counter += 1;
    console.log(pack_counter, data.length)
    mainWindow.webContents.send('robust_suspension:get:values', data );
});

