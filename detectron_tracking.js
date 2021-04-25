const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
// const  fs = require('fs')
const net = require('net')

let mainWindow
var _isActive = false;
var _isVisionConnected = false;
var _isTrackingConnected = false;

module.exports = {
    init,
    isActive,
    deactivate
}

function init(win) {

    mainWindow = win
    _isActive = true

    // const timeoutObj = setTimeout(function () {
        
        // connect()


        // listOfData = readDataFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        // prior = getPrior('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        
        // listOfGroundTruth = readGroundTruthFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/ground_truth.txt')
        // loopThroughSplittedText(listOfData, listOfGroundTruth)

        // sendPrior(prior)

        // sendDataVision("Let's Start")
        // clearTimeout(timeoutObj)

    // }, 2000)
}

function sendDataVision(data) {

    clientVision.write(data)
}

function sendDataTracking(data) {

    clientTracking.write(data)
}


function isActive() {
    return _isActive;
}

function deactivate() {

    if(_isActive == true) {
        
        _isActive = false;
    }

    if(_isVisionConnected == true) {

        _isVisionConnected = false;
        sendDataVision('EOF');
        clientVision.end();
        clientVision.destroy();
    }

    if(_isTrackingConnected == true) {

        _isTrackingConnected = false;
        sendDataTracking('EOF');
        clientTracking.end();
        clientTracking.destroy();
    }

}

ipcMain.on('tracking:vision:send', (event, data) => {

    sendDataVision(data)
})

ipcMain.on('tracking:tracking:send', (event, data) => {

    sendDataTracking(data)
})


var clientVision = new net.Socket()
var clientTracking = new net.Socket()

ipcMain.on('tracking:connection:close', (event) => {

    deactivate();
})

// function connect() {

//     clientVision.connect(6070, '127.0.0.1', function() {
//         console.log('Connected to Vision');
//     })

//     clientTracking.connect(6060, '127.0.0.1', function() {
//         console.log('Connected to Tracking');
//     })
// }


ipcMain.on('tracking:connect:detectron', (event, ip, port) => {

    clientVision.connect(port, ip, function() {
        _isVisionConnected = true;
        mainWindow.webContents.send('tracking:connection:status:detectron', 'connected')
    })
})

ipcMain.on('tracking:connect:jpda', (event, ip, port) => {

    clientTracking.connect(port, ip, function() {
        _isTrackingConnected = true;
        mainWindow.webContents.send('tracking:connection:status:jpda', 'connected')
    })
})

clientVision.on('data', function(data) {

    mainWindow.webContents.send('tracking:vision:data:get', String(data))
    // mainWindow.webContents.send('tracking:vision:data:get', String(data).split(','))
})

clientTracking.on('data', function(data) {

    mainWindow.webContents.send('tracking:tracking:data:get', String(data))
})


clientVision.on('close', function() {
    _isVisionConnected = false;
	console.log('Vision Connection closed');
});

clientVision.on('error', function(err) {
    console.log('Vision Connection error');
});

clientTracking.on('close', function() {
    _isTrackingConnected = false;
	console.log('Tracking Connection closed');
});

clientTracking.on('error', function(err) {
    console.log('Tracking Connection error');
});