const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
// const  fs = require('fs')
const net = require('net')

let mainWindow
var isActive = false

module.exports = {
    init,
    exitApp
}

function init(win) {

    mainWindow = win
    const timeoutObj = setTimeout(function () {
        
        connect()
        isActive = true

        // listOfData = readDataFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        // prior = getPrior('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        
        // listOfGroundTruth = readGroundTruthFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/ground_truth.txt')
        // loopThroughSplittedText(listOfData, listOfGroundTruth)

        // sendPrior(prior)

        sendDataVision("Let's Start")
        clearTimeout(timeoutObj)

    }, 2000)
}

function sendDataVision(data) {

    clientVision.write(data)
}

function sendDataTracking(data) {

    clientTracking.write(data)
}

function exitApp() {

    if(isActive == true) {

        sendDataVision('EOF')
        sendDataTracking('EOF')
        clientVision.end()
        clientTracking.end()
        clientVision.destroy()
        clientTracking.destroy()
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

    sendDataVision('EOF')
    sendDataTracking('EOF')
    clientVision.end()
    clientTracking.end()
    clientVision.destroy()
    clientTracking.destroy()
})

function connect() {

    clientVision.connect(6070, '127.0.0.1', function() {
        console.log('Connected to Vision');
    })

    clientTracking.connect(6060, '127.0.0.1', function() {
        console.log('Connected to Tracking');
    })
}

clientVision.on('data', function(data) {

    mainWindow.webContents.send('tracking:vision:data:get', String(data))
    // mainWindow.webContents.send('tracking:vision:data:get', String(data).split(','))
})

clientTracking.on('data', function(data) {

    mainWindow.webContents.send('tracking:tracking:data:get', String(data))
})


clientVision.on('close', function() {
	console.log('Vision Connection closed');
});

clientVision.on('error', function(err) {
    console.log('Vision Connection error');
});

clientTracking.on('close', function() {
	console.log('Tracking Connection closed');
});

clientTracking.on('error', function(err) {
    console.log('Tracking Connection error');
});