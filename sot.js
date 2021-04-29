const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;

module.exports = {
    init,
    readDataFile,
    connect,
    isActive,
    deactivate
}

let listOfData
var dataCounter = 0
let prior
let listOfGroundTruth
var isAc
var _isActive = false;
var _isConnected = false;

function init(win) {

    mainWindow = win

    const timeoutObj = setTimeout(function () {
        
        connect()

        // listOfData = readDataFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        // prior = getPrior('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        
        // listOfGroundTruth = readGroundTruthFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/ground_truth.txt')
        // loopThroughSplittedText(listOfData, listOfGroundTruth)

        // sendPrior(prior)
        
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
        client.write('EOF');
        client.end();
        client.destroy();
    }
}
 
  
function loopThroughSplittedText(values, ground_truth) {
    // for (var i = 0; i < values.length; i++) {
    for (var i = 0; i < 2; i++) {
        // for each iteration console.log a word
        // and make a pause after it
        (function (i) {
            setTimeout(function () {

                mainWindow.webContents.send('sot:draw', { 
                    type: 'circle', 
                    x: values[i]['x'], 
                    y: values[i]['y'], 
                    r: 5,
                    covar: values[i]['covar'],
                    measurements: values[i]['measurements'],
                    truthX: ground_truth[i]['x'],
                    truthY: ground_truth[i]['y']
                })

            }, 1000 * i);
        })(i);
    };
}

function getPrior(path) {

    const data = fs.readFileSync(path, 'utf-8')
    arr = data.split('\r\n')
    return [ arr[0].replace('x: ', ''), arr[1].replace('P: ', '') ]
}


function readDataFile(path) {

    var listOfData = []

    const data = fs.readFileSync(path, 'utf-8')
   

    arr = data.split('\r\n')

    console.log(typeof arr)
    for(var i = 0; i < arr.length; i++) {
        if(arr[i].includes('dt')) {

            var dt = arr[i].replace('dt: ', '')
            var measurements = arr[i+1].replace('measurements: ', '')
            var mean = arr[i+2].replace('mean: ', '').split(',')
            var covar = arr[i+3].replace('covar: ', '')
            

            listOfData.push({ 
                x: parseFloat(mean[0]), 
                y: parseFloat(mean[2]), 
                covar: covar,
                measurements: measurements,
                dt: dt
            })
            
        }
    }
    return listOfData;
}


function readGroundTruthFile(path) {

    var listOfData = []

    const data = fs.readFileSync(path, 'utf-8')
   

    arr = data.split('\r\n')
    for(var i = 0; i < arr.length; i++) {

        if(arr[i].length > 0) {

            var state = arr[i].split(':')[2]
            
            state = state.split(',')
            listOfData.push({ 
                x: parseFloat(state[0]),
                y: parseFloat(state[2])
            })
        }        

    }
    return listOfData;
}


var client = new net.Socket();

function connect() {
    client.connect(6060, '127.0.0.1', function() {
        _isConnected = true;
        console.log('Connected');
    });
}


function sendPrior(prior) {
    // client.write(prior[0] + '|' + prior[1] + '|40:')
    // client.write('prior: ' + prior)
}

ipcMain.on('tracking:send:prior', (event, data) => {

    client.write('prior: ' + data)
})

ipcMain.on('tracking:send:measurements', (event, data) => {

    client.write('measurements: ' + data)
})


function sendMeasurement(measurement, dt) {
    client.write(measurement + '|24:' + dt + '|89:')
}


client.on('data', function(data) {

    data = data.toString().split(',')
    // console.log()
    // console.log(parseInt(data[0]), parseInt(data[1]))
    mainWindow.webContents.send('sot:draw', parseInt(data[0]), parseInt(data[1]));


})


// client.on('data', function(data) {
	
//     if(data == '50') {
//         console.log("State 1 Finished")
        
//         sendMeasurement(listOfData[dataCounter]['measurements'], listOfData[dataCounter]['dt'])

//     } else {

//         data = data.toString()
//         data = data.split('|')
//         var x = data[0].replaceAll('\n', ' ')
//         x = x.split(' ').filter( element => element != '')
//         var covar = data[1].replaceAll('\n', ' ')
//         covar = covar.split(' ').filter( element => element != '')
//         covar = covar.join(', ')
        
//         mainWindow.webContents.send('sot:draw', { 
//             type: 'circle', 
//             x: x[0],
//             y: x[2],
//             r: 5,
//             covar: covar,
//             measurements: listOfData[dataCounter]['measurements'], 
//             truthX: listOfGroundTruth[dataCounter]['x'],
//             truthY: listOfGroundTruth[dataCounter]['y']
//         })

        
//         dataCounter += 1
//         if(dataCounter < listOfData.length) {

//             const timeoutObj = setTimeout(function () {
        
//                 sendMeasurement(listOfData[dataCounter]['measurements'], listOfData[dataCounter]['dt']) 
//                 clearTimeout(timeoutObj)
        
//             }, 1000)

//             // sendMeasurement(listOfData[dataCounter]['measurements'], listOfData[dataCounter]['dt'])

//         } else {
//             console.log("Operation Finished")
//             client.destroy(); // kill client after server's response
//         }
//     }
	
// });

client.on('close', function() {
	console.log('Connection closed');
});