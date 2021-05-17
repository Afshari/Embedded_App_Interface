const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs');
const  net = require('net')


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

    // const timeoutObj = setTimeout(function () {
        
    //     connect()
        
    //     _isActive = true;
    //     clearTimeout(timeoutObj)

    // }, 2000)
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
 


var client = new net.Socket();

function connect() {
    client.connect(5551, '127.0.0.1', function() {
        _isConnected = true;
        console.log('Connected');
    });
}


var stepIndex = 0;
ipcMain.on('siamfc:send:step', (event, dataset_idx, run_type) => {

    if(dataset_idx != -1) {
        stepIndex = 0;

        if(_isConnected == false) {
            client.connect(5551, '127.0.0.1', function() {
                _isConnected = true;
                console.log('Connected');

                client.write(`101:${stepIndex}:${dataset_idx}:${run_type}`);
                stepIndex += 1;
            });
        } else {

            client.write(`101:${stepIndex}:${dataset_idx}:${run_type}`);
            stepIndex += 1;
        }

    } else {

        client.write(`101:${stepIndex}:${dataset_idx}:${run_type}`);
        stepIndex += 1;
    }


})



const datasetPath = "siamfc/data/test"

ipcMain.on('dataset:reload', (event) => {

    try {
        const data = fs.readFileSync(`${datasetPath}/list.txt`, 'utf8')
        // const fileNames = fs.readdirSync(`${datasetPath}/GOT-10k_Test_000001`);
        // console.log(fileNames[0])
        event.reply('dataset:data', data);
      } catch (err) {
        console.error(err)
      }
	
});



client.on('data', function(data) {

    box = data.toString();
    // console.log(box);
    mainWindow.webContents.send('siamfc:show:image', box);

    // data = data.toString().replace('\\n', '').split('|')[0]
    // data = data.replaceAll('[', '').replaceAll(']', '').split('\n')

    // mainWindow.webContents.send('sot:draw', parseInt( parseFloat( data[0] ) ), parseInt( parseFloat( data[2] ) ));
})



client.on('close', function() {
    _isConnected = false;
	console.log('Connection closed');
});