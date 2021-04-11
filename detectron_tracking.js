const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')

let mainWindow

module.exports = {
    init
}

function init(win) {

    mainWindow = win
    const timeoutObj = setTimeout(function () {
        
        connect()

        // listOfData = readDataFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        // prior = getPrior('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        
        // listOfGroundTruth = readGroundTruthFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/ground_truth.txt')
        // loopThroughSplittedText(listOfData, listOfGroundTruth)

        // sendPrior(prior)

        sendData("Let's Start")
        clearTimeout(timeoutObj)

    }, 2000)
}

function sendData(data) {
    client.write(data)
}

ipcMain.on('tracking:send', (event, data) => {
    sendData(data)
})


ipcMain.on('tracking:connection:close', (event) => {
    sendData('EOF')
    client.end()
    client.destroy()
})

var client = new net.Socket();

function connect() {
    client.connect(6070, '127.0.0.1', function() {
        console.log('Connected');
    });
}

client.on('data', function(data) {
    // console.log('Received: ' + data)
    mainWindow.webContents.send('tracking:data:get', String(data).split(','))
    
})

client.on('close', function() {
	console.log('Connection closed');
});

client.on('error', function(err) {
    // client.destroy()
    console.log('Connection error');
});