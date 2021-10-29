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

    // dataStr = `101:${dataStr}`
    dataStr = `${code}:${dataStr}`
    dataStr = `S${dataStr.length}:${dataStr}E`
    // console.log('Data Length: ', dataStr.length)
    client.write(dataStr)
})

function readFile(filepath) {

    fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err){
            console.log("An error ocurred reading the file :" + err.message);
            return;
        }
    
        mainWindow.webContents.send('robust_suspension:draw', data.toString() );
        // console.log("The file content is : " + data);
    });
}


client.on('data', function(data) {

    data = data.toString();
    console.log(data.length)
    mainWindow.webContents.send('robust_suspension:get:values', data );
});

// ipcMain.on('robust_suspension:request:read', (event, filename) => {

//     const filepath = `suspension/data/${filename}.txt`;
//     readFile( filepath );
// })