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

    // w = new Matrix( w.data );
    // ms = new Matrix( ms.data );
    // for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

    //     if(dataStr !== "")
    //         dataStr += ",";
    //     dataStr += `${w.get(0, i).toFixed(4)},${ms.get(0, i).toFixed(1)}`
    // }

    // // dataStr = `101:${dataStr}`
    // dataStr = `${code}:${dataStr}`
    // dataStr = `S${dataStr.length}:${dataStr}E`
    // // console.log('Data Length: ', dataStr.length)
    // client.write(dataStr)
})

// function readFile(filepath) {

//     fs.readFile(filepath, 'utf-8', (err, data) => {
//         if(err){
//             console.log("An error ocurred reading the file :" + err.message);
//             return;
//         }
    
//         mainWindow.webContents.send( 'inverted_pendulum:draw', data );
//     });
// }


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


// ipcMain.on('inverted_pendulum:request:read', (event, filename) => {

//     const filepath = `inverted_pendulum/data/${filename}.txt`;
//     readFile( filepath );
// })