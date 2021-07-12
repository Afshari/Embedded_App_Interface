const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;


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
        // client.write('29:-');
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

ipcMain.on('estimating_passive_suspension:connect', (event) => {

    connect();
})

ipcMain.on('estimating_passive_suspension:send:measurements', (event, data, rnd) => {

    let dataStr = "";
    // console.log(data.length);

    for(var i = (rnd - 1) * 1000; i < rnd * 1000; i++) {

        if(dataStr !== "")
            dataStr += ",";
        dataStr += data[i];
    }

    dataStr = `101:${dataStr}`
    // console.log(dataStr.length);
    // console.log(dataStr);
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


