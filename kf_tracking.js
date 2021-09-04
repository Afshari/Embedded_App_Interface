
const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');

const  net = require('net');


let mainWindow
var _isActive = false;
var _isConnected = false;
let intervalObj;

// const SERVER_IP = '127.0.0.1';
// const SERVER_PORT = 5090;
const SERVER_IP = '192.168.1.15';
const SERVER_PORT = 5555;
var client = new net.Socket();
let port;


module.exports = {
    init,
    connect,
    isActive,
    deactivate
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


function init(win) {

    mainWindow = win;
	_isActive = true;
}


function deactivate() {
    _isActive = false;
	clearInterval(intervalObj);
}

function isActive() {
    return _isActive;
}


function connect() {

    client.connect(SERVER_PORT, SERVER_IP, function() {
        _isConnected = true;
        console.log('Connected');
    });
}


ipcMain.on('kf_tracking:tcp:send:measurements', (event, code, measurement) => {

	console.log(measurement);

    if(_isConnected == false) {

        client.connect(SERVER_PORT, SERVER_IP, function() {
        
            _isConnected = true;
            console.log('Connected');

            let strData = `${code}:${measurement}`
            client.write(`${strData.length}:${strData}`);
        
        });

    } else {

        let strData = `${code}:${measurement}`
        client.write(`${strData.length}:${strData}`);
    }
});



client.on('data', function(data) {

    data = data.toString();
    console.log(data);

    if(data === "corrupted") {

        mainWindow.webContents.send('kf_tracking:result', -1, -1);
        
    } else {

        data = data.toString().split(',');
        var x = parseInt( data[0] )
        var y = parseInt( data[1] )
        
        mainWindow.webContents.send('kf_tracking:result', x, y);
    }

})



client.on('close', function() {

    _isConnected = false;
	console.log('Connection closed');

});














