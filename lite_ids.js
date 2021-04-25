const { app, BrowserWindow, ipcMain } = require('electron');
const ejse = require('ejs-electron');
const contextMenu = require('electron-context-menu');
const SerialPort = require('serialport');
const fs = require('fs');
const lineReader = require('line-reader');
var linearAlgebra = require('linear-algebra')(),  
					Vector = linearAlgebra.Vector,
					Matrix = linearAlgebra.Matrix;


let port;
var inputData = [];
var outputData = [];
var dataIndex = 0;


let mainWindow
var _isActive = false
let intervalObj;


module.exports = {
	init,
	// isActive,
	// deactivate
}					


function init(win) {

    mainWindow = win
	_isActive = true
}

function sendCommand(data) {

    port.write(data, (err) => {
        if(err) 
            console.log('Error on write: ', err.message);
    });
}

function sendData() {


    values = [];
    strValues = "";
    inputData[dataIndex].split(',').forEach( (value) => {

        let fValue = parseFloat(value);

        if(fValue >= 0) {
            value = value.replace('-', '');
            value = "+" + value;
        }
        value = value.substr(0, 8)
        // console.log("Data to send: " + value);
        sendCommand(value);
        // if(strValues != "")
            // strValues += ","
        // strValues += value

        // values.push(value)
    });

    // var valueIndex = 0;
    // console.log(strValues)

    // timerknock = setInterval(function() {

    //     console.log(valueIndex, values[valueIndex])
    //     sendCommand(values[valueIndex]);

    //     valueIndex += 1;
    //     if(valueIndex >= values.length)
    //         clearTimeout(timerknock);

    // }, 1000);


}


ipcMain.on('data:submit', (event, input_path, output_path, uart) => {

    if ( typeof port === 'undefined' ) {

        port = new SerialPort(uart, { baudRate: 115200 });

        port.on('error', function(err) {
            console.log('Error: ', err.message);
        });

        port.on('data', function(data) {

            let result = data.toString()
            // console.log("index: " + dataIndex);
            // console.log("Result: " + result);
            // console.log(inputData[dataIndex]);

            if(result == outputData[dataIndex]) {
                // console.log("Correct")
                if(result == "1,0") {
                    event.reply('TBL:update', 1);
                } else {
                    event.reply('TBL:update', 4);
                }
            } else {
                console.log("Wrong")
                console.log(result)
                if(result == "1,0") {
                    event.reply('TBL:update', 3);
                } else {
                    event.reply('TBL:update', 2);
                }
            }

            // console.log("-----------");

            dataIndex += 1;

            if(dataIndex >= inputData.length) {
                // clearInterval(intervalObj);
                console.log("Finished");
            } else {
                sendData();
            }

        });

    }

    


    if(inputData.length === 0) {

        function readInputFile() {
            lineReader.eachLine(input_path, function(line, last) {
                inputData.push(line);
                if(last) {
                    readOutputFile();
                }
            });
        }

        function readOutputFile() {
            lineReader.eachLine(output_path, function(line, last) {
                outputData.push(line);

                if(last) {

                    sendData();

                    // intervalObj = setInterval(() => {
                    //     sendData();
                    // }, 1000);
                }
            });
        }

        readInputFile();

    } else {

        sendData();
    }

});