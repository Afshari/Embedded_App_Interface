const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;

// To export above functions:
module.exports = {
    init,
    readDataFile,
    connect
}

function init(win) {

    mainWindow = win
    const timeoutObj = setTimeout(function () {
        
        connect()

        const listOfData = readDataFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        const prior = getPrior('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/sot_data.txt')
        console.log(prior[0])
        console.log(prior[1])
        const listOfGroundTruth = readGroundTruthFile('/Users/mohsen/Documents/state_estimate_ws/MOT/stonesoup/PDA/ground_truth.txt')
        loopThroughSplittedText(listOfData, listOfGroundTruth)

        client.write(prior[0] + '|' + prior[1])

        clearTimeout(timeoutObj)

    }, 2000)

}

 
  
function loopThroughSplittedText(values, ground_truth) {
    for (var i = 0; i < values.length; i++) {
        // for each iteration console.log a word
        // and make a pause after it
        (function (i) {
            setTimeout(function () {
                // document.getElementById('text').innerHTML += splittedText[i];
                // console.log(values[i]);
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
        console.log('Connected');
        // client.write('40 | Hello');
    });
}

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});