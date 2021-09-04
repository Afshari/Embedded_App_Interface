const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;
// const SERVER_IP = '127.0.0.1';
const SERVER_IP = '192.168.1.104';
const SERVER_PORT = 5091;


module.exports = {
    init,
    // connect,
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
    client.connect(SERVER_PORT, SERVER_IP, function() {
        _isConnected = true;
        console.log('Connected');
    });
}

ipcMain.on('estimating_passive_suspension:connect', (event) => {

    connect();
})

ipcMain.on('estimating_passive_suspension:send:measurements', (event, data, rnd) => {

    let dataStr = "";
    const ITEM_PER_STEP = 100;

    for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

        if(dataStr !== "")
            dataStr += ",";
        dataStr += data[i];
    }

    dataStr = `101:${dataStr}`
    client.write(dataStr)
})

client.on('data', function(data) {

    data = data.toString();
    mainWindow.webContents.send('estimating_passive_suspension:get:values', data );
    // console.log(data);
});


client.on('close', function() {
	console.log('Connection closed');
});


