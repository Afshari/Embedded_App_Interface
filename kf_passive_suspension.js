// const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { ipcMain } = require('electron')
const  net = require('net')

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
    _isActive = true
}

function isActive() { return _isActive; }
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

function connect(ip, port) {
    
    client = new net.Socket();

    client.on('error', function(ex) {
        _isConnected = false;
        mainWindow.webContents.send('estimating_passive_suspension:connection:fail');
    });

    client.connect(port, ip, function() {
        _isConnected = true;
        mainWindow.webContents.send('estimating_passive_suspension:connection:pass');
        console.log('Connected');
    });

    client.on('data', function(data) {

        data = data.toString();
        mainWindow.webContents.send('estimating_passive_suspension:get:values', data);
    });
    
    client.on('close', function() {
        _isConnected = false;
        mainWindow.webContents.send('estimating_passive_suspension:connection:fail');
        console.log('Connection closed');
    });
}

ipcMain.on('estimating_passive_suspension:connect', (event, ip, port) => {

    connect(ip, port);
})

ipcMain.on('estimating_passive_suspension:tcp:send:measurements', (event, code, data, rnd, ITEM_PER_STEP) => {

    let dataStr = "";

    for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

        if(dataStr !== "")
            dataStr += ",";
        dataStr += data[i];
    }

    dataStr = `${code}:${dataStr}`
    dataStr = `S${dataStr.length}:${dataStr}E`
    client.write(dataStr)
})

