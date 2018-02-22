// Library of events you can bind
module.exports = {

	CONNECT : 'connect',				// Socket connected
	DISCONNECT : 'disconnect',			// Socket disconnected
	PWM_DATA : 'pwm',					// (obj)data | PWM received
	PROGRAM_DATA : 'program',			// (obj)data | Program data received

	APP_CONNECTED : 'appConnected',		// (str)appName, (str)connectionID | An app is now ready to send to this device
	APP_DISCONNECTED : 'appDisconnected',	// (str)appName, (str)connectionID | An app has disconnected

	CUSTOM_MESSAGE : 'dCustom',			// (str)appName, (str)connectionID, (var)data | Custom message received from the app



};
