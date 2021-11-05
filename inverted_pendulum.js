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

ipcMain.on('inverted_pendulum:connect', (event, ip, port) => {

    connect(ip, port);
})



ipcMain.on('inverted_pendulum:tcp:send:state', (event, code, wr, y0, n, h) => {

    let dataStr = "";

    if(code == 111) {
        wr = new Matrix( wr )
        y0 = new Matrix( y0 )
        // console.log(code, wr, y0, n, h)
    
        let str_wr = `${wr.get(0, 0)},${wr.get(1, 0)},${wr.get(2, 0).toFixed(4)},${wr.get(3, 0)}`
        let str_y0 = `${y0.get(0, 0)},${y0.get(1, 0)},${y0.get(2, 0)},${y0.get(3, 0)}`
        dataStr = `${code}:${str_wr}:${str_y0}:${n},${h}`
        dataStr = `S${dataStr.length}:${dataStr}E`
        console.log(dataStr)
        client.write(dataStr)
    
    } else if(code == 112) {
        dataStr = '112:'
        dataStr = `S${dataStr.length}:${dataStr}E`
        client.write(dataStr)
    }
})




client.on('data', function(data) {

    data = data.toString();
    if(data == 'finished' || data.length == 8) {
        console.log(data)
        console.log('finished')
        mainWindow.webContents.send('inverted_pendulum:get:values', [], true );
    } else {
        console.log(data.length)
        // console.log(data)
        // console.log('---------------------')    
        mainWindow.webContents.send('inverted_pendulum:get:values', data, false );
    }
    
});


