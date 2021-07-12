
const { SuspensionEstimator, DrawHelper, HandleWorkFlow } = require('../classes/cls_kf_passive_suspension');


describe( ' Draw Helper ', () => {

    test(' Suspension and Tyre Offst ', () => {

        // Arrange
        let estimator = new SuspensionEstimator();
        let drawHelper = new DrawHelper( estimator, 900 );
        
        // Act & Assert
        expect( drawHelper.suspensionOffset() ).toBe( -225 );
        expect( drawHelper.tyreOffset() ).toBe( -50 );
    });


    test(' Draw Top Suspension ', () => {

        // Arrange
        let estimator = new SuspensionEstimator();
        let drawHelper = new DrawHelper( estimator, 900 );

        global.window = {
            line: jest.fn()
        }

        // Act
        drawHelper.drawTopSuspension(1);

        // Assert
        expect( global.window.line ).toHaveBeenCalledTimes(2);
    });


    test(' Draw Bottom Suspension ', () => {

        // Arrange
        let estimator = new SuspensionEstimator();
        let drawHelper = new DrawHelper( estimator, 900 );

        global.window = {
            line: jest.fn(),
            stroke: jest.fn(),
            fill: jest.fn(),
            rectMode: jest.fn(),
            rect: jest.fn()
        }

        // Act
        drawHelper.drawBottomSuspension(1);

        // Assert
        expect( global.window.line ).toHaveBeenCalledTimes(2);
        expect( global.window.stroke ).toHaveBeenCalledTimes(1);
        expect( global.window.fill ).toHaveBeenCalledTimes(1);
        expect( global.window.rectMode ).toHaveBeenCalledTimes(1);
        expect( global.window.rect ).toHaveBeenCalledTimes(1);
    });

});

describe( ' Handle Connect ', () => {

    test.skip(' Handle Connect in Ready State ', () => {

        // Arrange
        let estimator = new SuspensionEstimator();
        ipcRenderer = {
            send: jest.fn()
        }
        let handleWorkFlow = new HandleWorkFlow( estimator, ipcRenderer, 900 );

        // Act
        handleWorkFlow.handleConnect();

        // Assert
        expect( ipcRenderer.send ).toHaveBeenCalledTimes(1);
    });

    test.skip(' Handle Connect in Running State ', () => {

    });

});

describe( ' Handle Step ', () => {

    test.skip(' Handle Pause in Ready State ', () => {
    });

    test(' Handle Step in Pause State ', () => {

        // Arrange
        let estimator = new SuspensionEstimator();
        let handleWorkFlow = new HandleWorkFlow( estimator, null, 900 );
        handleWorkFlow.isStatePause = jest.fn( () => true );
        let counter = handleWorkFlow.counter;

        // Act
        handleWorkFlow.handleStep();

        // Assert
        expect( handleWorkFlow.isStatePause ).toHaveBeenCalledTimes(1);
        expect( handleWorkFlow.counter ).toBe( counter + 15 );

    });

    test(' Handle Step in Pause State & At the Top of Counter ', () => {

        // Arrange 
        let estimator = new SuspensionEstimator();
        let handleWorkFlow = new HandleWorkFlow( estimator, null, 900 );
        handleWorkFlow.isStatePause = jest.fn( () => true );

        let counter = 12000-5;
        handleWorkFlow.counter = counter;

        // Act
        handleWorkFlow.handleStep();

        // Assert
        expect( handleWorkFlow.isStatePause ).toHaveBeenCalledTimes(1);
        expect( handleWorkFlow.counter ).toBe( counter );

    });

    test(' Handle Step in Running State ', () => {

        // Arrange
        let estimator = new SuspensionEstimator();
        let handleWorkFlow = new HandleWorkFlow( estimator, null, 900 );
        handleWorkFlow.isStatePause = jest.fn( () => false );
        handleWorkFlow.isStateRunning = jest.fn( () => true );
        let counter = handleWorkFlow.counter;

        global.window = {
            showFlashMessage: jest.fn()
        }

        // Act
        handleWorkFlow.handleStep();

        // Assert
        expect( handleWorkFlow.isStatePause ).toHaveBeenCalledTimes(1);
        expect( handleWorkFlow.counter ).toBe( counter );
        expect( global.window.showFlashMessage ).toHaveBeenCalledTimes(1);
    });

    test.skip(' Handle Step in SendingMeasurements State ', () => {

    });

    test.skip(' Handle Step in Finish State ', () => {

    });

});

describe( ' Handle Pause ', () => {

    test.skip(' Handle Pause in Ready State ', () => {
    });

    test.skip(' Handle Pause in Running State ', () => {

    });

    test.skip(' Handle Pause in Finish State ', () => {

    });

});


describe( ' Handle Reset ', () => {

    test.skip(' Handle Reset in Finish State ', () => {
    });

    test.skip(' Handle Reset in Other States ', () => {
    });

});






