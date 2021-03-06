
const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');

const  net = require('net');
const  SerialPort = require('serialport');
const  ByteLength = require('@serialport/parser-byte-length');


let mainWindow
var _isActive = false;
var _isConnected = false;
let intervalObj;


// const SERVER_IP = '127.0.0.1';
// const SERVER_PORT = 5090;
const SERVER_IP = '192.168.1.15';
const SERVER_PORT = 5555;
var client = new net.Socket();

const UART_DATA_LENGTH = 300;
const UART_RECV_LENGTH = 30;

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


function sendCommandUart(data) {

    port.write(data, (err) => {
        if(err) 
            console.log('Error on write: ', err.message);
    });
}

ipcMain.on('kf_tracking:uart:send:measurements', (event, uart, code, measurement) => {


    if ( typeof port === 'undefined' ) {

        port = new SerialPort(uart, { baudRate: 115200 });
        const parser = port.pipe( new ByteLength( { length: UART_RECV_LENGTH } ) );

        port.on('error', function(err) {
            console.log('Error: ', err.message);
        });

        parser.on('data', function(data) {

            let currData = data.toString();
            console.log(currData);

            if( currData.indexOf("corrupted") !== -1 ) {

                mainWindow.webContents.send('kf_tracking:result', -1, -1);
                
            } else  {
        
                currData = currData.replace(/_/g,"");
                currData = currData.split(',');
                var x = parseInt( currData[0] )
                var y = parseInt( currData[1] )
                
                mainWindow.webContents.send('kf_tracking:result', x, y);

            } 
        });
    }

    let strData = `${code}:${measurement}`;
    strData = `${strData.length}:${strData}`;
    for(var i = strData.length; i < UART_DATA_LENGTH; i++) {
        strData += "_";
    }
    console.log(strData);
    sendCommandUart(strData);

});



ipcMain.on('kf_tracking:tcp:send:measurements', (event, code, measurement) => {

	console.log(measurement);

    if(_isConnected == false) {

        client.connect(SERVER_PORT, SERVER_IP, function() {
        
            _isConnected = true;
            console.log('Connected');

            let strData = `${code}:${measurement}`;
            strData = `${strData.length}:${strData}`;
            client.write(strData);
        });

    } else {

        let strData = `${code}:${measurement}`;
        strData = `${strData.length}:${strData}`;
        client.write(strData);
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














