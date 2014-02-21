QUnit.module("ForeverFrame Facts", testUtilities.transports.foreverFrame.enabled);

QUnit.asyncTimeoutTest("foreverFrame transport does not throw when it exceeds its iframeClearThreshold while in connecting.", testUtilities.defaultTestTimeout, function (end, assert, testName) {
    var connection = testUtilities.createHubConnection(end, assert, testName),
        savedThreshold = $.signalR.transports.foreverFrame.iframeClearThreshold,
        savedReceived = $.signalR.transports.foreverFrame.receive,
        echoHub = connection.createHubProxies().echoHub,
        echoCount = 0,
        start = function () {
            connection.start({ transport: "foreverFrame" }).done(function () {
                if (++echoCount > 2) {
                    assert.comment("No error was thrown via foreverFrame transport.");
                    end();
                }
                else {
                    echoHub.server.echoCallback("hello world");
                }
            });
        };

    echoHub.client.echo = function (msg) {
        connection.stop();
        start();
    };

    // Always clear the dom
    $.signalR.transports.foreverFrame.iframeClearThreshold = 0;

    $.signalR.transports.foreverFrame.receive = function () {
        try {
            savedReceived.apply(this, arguments);
        }
        catch (e) {
            assert.fail("Receive threw.");
            end();
        }
    };

    start();

    // Cleanup
    return function () {
        $.signalR.transports.foreverFrame.iframeClearThreshold = savedThreshold;
        $.signalR.transports.foreverFrame.receive = savedReceived;
        connection.stop();
    };
});

QUnit.asyncTimeoutTest("foreverFrame transport does not trigger verifyLastActive when connection doesn't successfully start.", testUtilities.defaultTestTimeout, function (end, assert, testName) {
    var connection = testUtilities.createHubConnection(end, assert, testName),
        savedVerifyLastActive = $.signalR.transports._logic.verifyLastActive,
        savedOnFailedTimeoutHandle = connection._.onFailedTimeoutHandle,
        savedParse = connection._parseResponse;

    connection._parseResponse = function (response) {
        var result = savedParse.call(this, response);
        $.network.disconnect();
        return result;
    }

    $.signalR.transports._logic.verifyLastActive = function (connection) {
        assert.fail("verifyLastActive should not be called.");
        end();
    };

    connection._.onFailedTimeoutHandle = window.setTimeout(function () {
        assert.ok(true, "FailedTimeoutHandle is called.");
        end();
    }, 100);

    connection.start({ transport: "foreverFrame" }).done(function () {
        assert.fail("Connection should not be connected.");
        end();
    });

    // Cleanup
    return function () {
        $.signalR.transports._logic.verifyLastActive = savedVerifyLastActive;
        connection._.onFailedTimeoutHandle = savedOnFailedTimeoutHandle;
        connection._parseResponse = savedParse;
        $.network.connect();
        connection.stop();
    };
});
