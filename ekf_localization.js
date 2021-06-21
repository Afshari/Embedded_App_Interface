const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const { app, BrowserWindow, ipcMain } = require('electron')
const  fs = require('fs')
const net = require('net')


let mainWindow;
const SERVER_IP = '127.0.0.1';
const SERVER_PORT = 5091;
var client = new net.Socket();
let port;


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
        client.write('29:-');
        client.end();
        client.destroy();
    }
}
 

var client = new net.Socket();

function connect() {

    client.connect(SERVER_PORT, SERVER_IP, function() {
        _isConnected = true;
        console.log('Connected');
    });
}


ipcMain.on('ekf_localization:tcp:send:prior', (event, u, std_vel, std_steer, std_range, std_bearing, 
    prior_cov_pos, prior_cov_angle) => {

    // data.splice(2, 1)
    // client.write(`27:10|20:4, 1:${data[0]},0.1,${data[1]},0.1|21:4, 4:0.5,0,0,0,  0,0.1,0,0,  0,0,0.5,0,  0,0,0,0.1`)
    client.write(`100:${u},${std_vel},${std_steer},${std_range},${std_bearing},1.5,${prior_cov_pos},${prior_cov_angle}`);
})

ipcMain.on('ekf_localization:tcp:send:measurements', (event, u) => {

    // strData = "22"
    // data.forEach(function(item, index, array) {
    //     strData += `:23:2, 1:${item[0]},${item[1]}|89:`
    // })

    // console.log(data);
    client.write(`101:${u}`)
})


function sendMeasurement(measurement, dt) {
    client.write(measurement + '|24:' + dt + '|89:')
}


client.on('data', function(data) {

    data = data.toString().split(',');
    // console.log(data);
    // data = data.toString().replace('\\n', '').split('|')[0]
    // data = data.replaceAll('[', '').replaceAll(']', '').split('\n')

    var x = parseInt( parseFloat( data[0] ) * 10 )
    var y = parseInt( parseFloat( data[1] ) * 10 )
    
    mainWindow.webContents.send('ekf_localization:draw', x, y );
})



client.on('close', function() {
	console.log('Connection closed');
});