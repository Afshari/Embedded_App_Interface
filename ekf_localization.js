const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;
const SERVER_IP = '127.0.0.1';
// const SERVER_IP = '192.168.1.106';
const SERVER_PORT = 5091;
var client = new net.Socket();
let port;


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

    const timeoutObj = setTimeout(function () {
        
        // connect()
        
        _isActive = true;
        clearTimeout(timeoutObj)

    }, 1000)
}

function isActive() {
    return _isActive;
}

function deactivate() {

    if(_isActive == true)        
        _isActive = false;

    if(_isConnected == true) {

        _isConnected = false;
        // client.write('29:-');
        client.end();
        client.destroy();
    }
}
 

var client = new net.Socket();

function connect(ip, port) {

    console.log(ip, port);
    client.connect(port, ip, function() {
        _isConnected = true;
        console.log('Connected');
    });
}


ipcMain.on('ekf_localization:tcp:send:prior', (event, u, std_vel, std_steer, std_range, std_bearing, start_angle,
    prior_cov_pos, prior_cov_angle, observations, lands) => {

    if(_isConnected == true) {
        client.write(
            `100:${u},${std_vel},${std_steer},${std_range},${std_bearing},${start_angle},${prior_cov_pos},${prior_cov_angle}:${observations}:${lands}`);
    }
})

ipcMain.on('ekf_localization:tcp:send:measurements', (event, u, observations) => {

    if(_isConnected == true) {
        client.write(`101:${u}:${observations}`)
    }
})

ipcMain.on('ekf_localization:tcp:connect', (event, ip, port) => {

    connect(ip, port);
});


// function sendMeasurement(measurement, dt) {
//     client.write(measurement + '|24:' + dt + '|89:')
// }


client.on('data', function(data) {

    data = data.toString().split(',');

    var x = parseInt( parseFloat( data[0] ) * 10 )
    var y = parseInt( parseFloat( data[1] ) * 10 )
    var angle = parseFloat( data[2] )
    
    mainWindow.webContents.send('ekf_localization:draw', x, y, angle );
})


client.on('close', function() {
    _isConnected = false;
	console.log('Connection closed');
});