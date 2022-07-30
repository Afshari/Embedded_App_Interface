
const { ipcMain } = require('electron');

var mainWindow;
var _isActive = false;
var _isConnected = false;


module.exports = {
    init,
    isActive,
    deactivate
}
		

function isActive() { return _isActive; }

function deactivate() { _isActive = false; }

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


function init(win) {

    mainWindow = win;
	_isActive = true;
}









