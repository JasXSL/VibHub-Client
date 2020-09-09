const Client = require('./Client'),
	Events = require('./EventTypes')
;

let client = new Client();

client.on(Events.CONNECT, () => {

	console.log("Client connected!");

});

client.on(Events.DISCONNECT, () => {

	console.log("Client disconnected");

});

client.on(Events.APP_CONNECTED, (name, id) => {

	console.log("App connected", name, id);
	//console.log("Sending custom message");
	//client.sendCustomToApp(name, "ITWERKS!");

});

client.on(Events.APP_DISCONNECTED, (name, id) => {

	console.log("App disconnected", name, id);

});

client.on(Events.CUSTOM_MESSAGE, (name, id, data) => {

	console.log("Custom data received", name, id, data);

});

 // These may be sent very frequently

client.on(Events.PROGRAM_DATA, program => {
	
	console.log("Program received", program);

});

client.on(Events.PWM_DATA, data => {
	
	console.log("Pwm data received", data);

});

