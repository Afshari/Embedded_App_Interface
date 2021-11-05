
//////////////////////////////////////
// ROBUST SUSPENSION
//////////////////////////////////////
ipcMain.on('robust_suspension:request:read', (event, filename) => {

    const filepath = `suspension/data/${filename}.txt`;
    readFile( filepath );
})

function readFile(filepath) {

    fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err){
            console.log("An error ocurred reading the file :" + err.message);
            return;
        }
    
        mainWindow.webContents.send('robust_suspension:draw', data.toString() );
        // console.log("The file content is : " + data);
    });
}


//////////////////////////////////////
// INVERTED PENDULUM
//////////////////////////////////////
ipcMain.on('inverted_pendulum:request:read', (event, filename) => {

    const filepath = `inverted_pendulum/data/${filename}.txt`;
    readFile( filepath );
})

function readFile(filepath) {

    fs.readFile(filepath, 'utf-8', (err, data) => {
        if(err){
            console.log("An error ocurred reading the file :" + err.message);
            return;
        }
    
        mainWindow.webContents.send( 'inverted_pendulum:draw', data );
    });
}

ipcRenderer.on('inverted_pendulum:draw', (event, values) => {

    values = values.split(';')
    counter_file = 0
    inverted_pendulum.y_file = []

    for(var i = 0; i < values.length; i++) {
        var curr_item = values[i].split(',')
        inverted_pendulum.y_file.push( [ curr_item[0], 0, curr_item[2], 0 ] )
    }

    isReadyToDraw_file = true;
    if(fileIndex < fileNames.length - 1)
        fileIndex += 1
})

w = new Matrix( w.data );
ms = new Matrix( ms.data );
for(var i = rnd; i < rnd + ITEM_PER_STEP; i++) {

    if(dataStr !== "")
        dataStr += ",";
    dataStr += `${w.get(0, i).toFixed(4)},${ms.get(0, i).toFixed(1)}`
}

// dataStr = `101:${dataStr}`
dataStr = `${code}:${dataStr}`
dataStr = `S${dataStr.length}:${dataStr}E`
// console.log('Data Length: ', dataStr.length)
client.write(dataStr)
