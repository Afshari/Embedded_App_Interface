const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;

module.exports = {
    init,
    connect,
    isActive,
    deactivate
}


var _isActive = false;
var _isConnected = false;

function init(win) {

    mainWindow = win

    const timeoutObj = setTimeout(function () {
        
        // connect()

        _isActive = true;
        clearTimeout(timeoutObj)

    }, 2000)
}



function isActive() {
    return _isActive;
}

function deactivate() {

    if(_isActive == true)        
        _isActive = false;

    if(_isConnected == true) {

        _isConnected = false;
        // client.write('EOF');
        client.end();
        client.destroy();
    }
}


var client = new net.Socket();

function connect() {
    client.connect(6060, '127.0.0.1', function() {
        _isConnected = true;
        console.log('Connected');
    });
}

ipcMain.on('path_finding:server:connect', (event, data) => {

    connect();
})

ipcMain.on('path_finding:send:size', (event, data) => {

    client.write('1:' + data)
})

ipcMain.on('path_finding:send:data', (event, data) => {

    client.write('2:' + data)
})

ipcMain.on('path_finding:send:run', (event) => {
    client.write('4:')
})

// ipcMain.on('path_finding:send:end', (event) => {
//     client.write('3:')
// })

ipcMain.on('path_finding:server:disconnect', (event, data) => {

    disconnect();
})

function disconnect() {

    if(_isConnected) {
        _isConnected = false;
        client.end();
    }
}


client.on('data', function(message) {

    message = message.toString();
    var code = message.split(':')[0]
    var data = message.split(':')[1]

    // console.log(code)
    // console.log(data)
    
    if(code === "10") {

        mainWindow.webContents.send('path_finding:draw:step', data);

    } else if(code === "12") {
        mainWindow.webContents.send('path_finding:draw:path', data);
        disconnect();
        // _isConnected = false;
        // client.end();
    } else if(code === "13") {
        console.log("No Solution")
        disconnect();
    }
})
