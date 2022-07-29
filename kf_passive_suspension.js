const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
// const  fs = require('fs')
const  net = require('net')

// [✓] - Add two Code for PassiveSuspension --> 110, 111


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

function connect(ip, port) {
    
    client = new net.Socket();

    client.on('error', function(ex) {
        mainWindow.webContents.send('estimating_passive_suspension:connection:fail');
    });

    client.connect(port, ip, function() {
        _isConnected = true;
        mainWindow.webContents.send('estimating_passive_suspension:connection:pass');
        console.log('Connected');
    });

    client.on('data', function(data) {

        data = data.toString();
        console.log(data)
        mainWindow.webContents.send('estimating_passive_suspension:get:values', data);
    });
    
    client.on('close', function() {
        _isConnected = false;
        console.log('Connection closed');
    });
}

ipcMain.on('estimating_passive_suspension:connect', (event, ip, port) => {

    connect(ip, port);
})

ipcMain.on('estimating_passive_suspension:tcp:send:measurements', (event, code, data, rnd, ITEM_PER_STEP) => {

    let dataStr = "";
    // const ITEM_PER_STEP = 50;

    for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

        if(dataStr !== "")
            dataStr += ",";
        dataStr += data[i];
    }

    dataStr = `${code}:${dataStr}`
    dataStr = `S${dataStr.length}:${dataStr}E`
    // dataStr = `S101:${dataStr}E`
    client.write(dataStr)
})



// function sendCommandUart(data) {

//     port.write(data, (err) => {
//         if(err) 
//             console.log('Error on write: ', err.message);
//     });
// }

// ipcMain.on('estimating_passive_suspension:uart:send:measurements', (event, uart, code, data, rnd, ITEM_PER_STEP) => {


//     if ( typeof port === 'undefined' ) {

//         port = new SerialPort(uart, { baudRate: 115200 });
//         const parser = port.pipe( new ByteLength( { length: UART_RECV_LENGTH } ) );

//         port.on('error', function(err) {
//             console.log('Error: ', err.message);
//         });

//         // var wholeData = "";
//         parser.on('data', function(data) {

//             let currData = data.toString();
//             // console.log(currData);

//             if( currData.indexOf("corrupted") !== -1 ) {

//                 mainWindow.webContents.send('kf_tracking:result', -1, -1);
                
//             } else {
        
//                 mainWindow.webContents.send('estimating_passive_suspension:get:values', currData );
                
//                 // mainWindow.webContents.send('kf_tracking:result', x, y);

//             } 
//         });
//     }

//     let dataStr = "";

//     for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

//         if(dataStr !== "")
//             dataStr += ",";
//         dataStr += data[i];
//     }

//     // dataStr = `101:${dataStr}`

//     dataStr = `${code}:${dataStr}`;
//     dataStr = `${dataStr.length}:${dataStr}`;
//     for(var i = dataStr.length; i < UART_DATA_LENGTH; i++) {
//         dataStr += "_";
//     }
//     console.log(dataStr);
//     sendCommandUart(dataStr);
// });