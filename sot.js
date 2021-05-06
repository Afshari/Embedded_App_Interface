const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;

module.exports = {
    init,
    // readDataFile,
    connect,
    isActive,
    deactivate
}

var _isActive = false;
var _isConnected = false;

function init(win) {

    mainWindow = win

    const timeoutObj = setTimeout(function () {
        
        connect()
        
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
        client.write('29:-');
        client.end();
        client.destroy();
    }
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


var client = new net.Socket();

function connect() {
    client.connect(6060, '127.0.0.1', function() {
        _isConnected = true;
        console.log('Connected');
    });
}



ipcMain.on('tracking:send:prior', (event, data) => {

    // data = data.replace(',measure', '')
    data.splice(2, 1)
    // client.write('20:2, 1:' + data)
    client.write(`27:10|20:4, 1:${data[0]},0.1,${data[1]},0.1|21:4, 4:0.5,0,0,0,  0,0.1,0,0,  0,0,0.5,0,  0,0,0,0.1`)
})

ipcMain.on('tracking:send:measurements', (event, data) => {

    strData = "22"
    data.forEach(function(item, index, array) {
        strData += `:23:2, 1:${item[0]},${item[1]}|89:`
    })

    // console.log(strData)
    client.write(strData)
})


function sendMeasurement(measurement, dt) {
    client.write(measurement + '|24:' + dt + '|89:')
}


client.on('data', function(data) {

    data = data.toString().replace('\\n', '').split('|')[0]
    data = data.replaceAll('[', '').replaceAll(']', '').split('\n')
    // console.log( parseInt( parseFloat( data[0] ) ) )
    // console.log( parseInt( parseFloat( data[2] ) ) )
    // console.log()
    // console.log(parseInt(data[0]), parseInt(data[1]))
    mainWindow.webContents.send('sot:draw', parseInt( parseFloat( data[0] ) ), parseInt( parseFloat( data[2] ) ));
})



client.on('close', function() {
	console.log('Connection closed');
});