/*

*/
const io = require('socket.io-client'),
	uuid = require('uuid/v4'),
	fs = require('fs'),
	Gpio = require('pigpio').Gpio,
	TWEEN = require('@tweenjs/tween.js'),
	EventEmitter = require('events'),
	Events = require('./EventTypes')
;

class Client{
	

	// INITIALIZATION
	constructor( config ){

		let th = this;
		this.interval = null;
		this.programs = [];
		this.events = [];
		this.eventEmitter = new EventEmitter();
		this.socket = null;

		// Default config
		this.config = {
			server : 'http://vibhub.io',
			debug : false,
			pwm_pins : [17,27,22,23],
			duty_min : 53,			// minimum duty cycle to produce a pulse
			fps : 100,				// FPS of updates
		};


		this.loadConfig()
		.then(() => {

			// Initialize GPIOs
			for( let pin of this.config.pwm_pins ){

				let n = new Gpio(pin, {mode : Gpio.OUTPUT});
				n.pwmWrite(0);
				
				let p = new Program(this, n);
				this.programs.push(p);
	
			}

			this.config.fps = Math.min(Math.max(this.config.fps,1), 100);	// limit between 1 and 100
	
			// Initialize
			this.getDeviceId()
			.then( () => {

				let socket = io.connect(th.config.server);
				this.socket = socket;

				socket.on('connect', () => {
					
					//console.log("Socket Connected, my device ID is ", "'"+th.id+"'");
					socket.emit('id', th.id);
					th.raise(Events.CONNECT);
	
				});
				
				socket.on('disconnect', () => { th.raise(Events.DISCONNECT); });
				
				// Vibration program received
				socket.on('vib', data => { th.onVibData(data); th.raise(Events.PROGRAM_DATA, data); });
	
				// Vibration level received
				socket.on('p', data => { th.onPwmData(data); th.raise(Events.PWM_DATA, data); });

				socket.on('app', data => { th.raise(Events.APP_CONNECTED, data); });

				socket.on('app_offline', data => { th.raise(Events.APP_DISCONNECTED, data); });

				socket.on('dCustom', data => { th.raise(Events.CUSTOM_MESSAGE, data); });
	
			}).catch(err => {
				console.error("Unable to start device", err);
			});
	
			// Start ticking
			this.interval = setInterval(() => {
				th.tick();
			}, 1000/this.config.fps);

		})
		.catch(err => {
			console.error("Unable to load config, using defaults", err);
		});

	}

	// Events for custom code
	on( evt, callback ){

		this.eventEmitter.on(evt, callback);
		return callback;

	}

	off( evt){
		this.eventEmitter.removeListener(evt, fn);
	}

	// evt, args
	raise( evt, args ){
		this.eventEmitter.emit.apply(this.eventEmitter, [evt].concat(args));
	}

	// CONFIGURATION
	getDeviceId(){

		let th = this;
		return new Promise((res, rej) => {

			fs.readFile(__dirname+'/device-id', 'utf8', (err, data) => {
			
				if( err ){

					if( err.code === 'ENOENT' ){

						// Generate a new device ID
						th.id = uuid();
						fs.writeFile(__dirname+'/device-id', th.id, (err) => {
							if( err )
								console.error("Unable to store persistent device ID", err);
						});

						return res();
					}

					return rej(err);

				}
				
				data = data.split(/\r?\n/).shift();
				th.id = data;
				res();
		
			});

		});

	}

	loadConfig(){

		let th = this;
		return new Promise((res, rej) => {

			// Get config and init
			fs.readFile(__dirname+'/config.json', 'utf8', (err, data) => {
				
				if( err )
					return rej("Unable to read config, using defaults: "+err.code);
				else{

					try{
						
						let json = JSON.parse(data);
						if( typeof json !== "object" )
							return rej("Config is not an object");
						else{
							
							for( let i in json ){

								if( th.config.hasOwnProperty(i) ){

									if( typeof th.config[i] === typeof json[i] )
										th.config[i] = json[i];
									else
										console.log("Invalid type of config", i, "got", typeof json[i], "expected", typeof th.config[i]);

								}
								else
									console.log("Unknown config property", i);

							}

						}

					}catch(e){
						console.error("Config read error, using defaults:", e.code);
					}

					

				}
				
				res();

			});

		});

	}

	// PROGRAM LOOP
	tick(){

		TWEEN.update();
		for( let p of this.programs )
			p.tick();

	}


	// Program(s) received
	onVibData( data ){

		// Contains programs
		if( !Array.isArray(data) )
			data = [data];

		for( let point of data ){
			
			let targ = point.port;
			
			if( isNaN(targ) )
				targ = -1;

			let targets = this.programs;
			if( targ > 0 ){

				for( let i = 0; i<this.programs.length; ++i ){
					
					if( targ&(1<<i) )
						targets.push(this.programs[targ]);
				
				}

			}

			for( let t of targets )
				t.set(point);

		}

	}

	// Pwm hex received
	onPwmData( data ){

		let buffer = Buffer.from(data, "hex");

		let view = new Uint8Array(buffer);
		for( let i = 0; i<this.programs.length; ++i ){
			
			
			let duty = view[i];
			this.programs[i].stopTicking(true);
			this.programs[i].duty = Math.max(0, Math.min(duty, 255));
			this.programs[i].out();

		}

	}
	
	// Send custom data to an app by name
	sendCustomToApp( appName, data ){

		this.socket.emit("aCustom", [appName, data]);

	}

}



// Program is a tween cycle for the vib, input for set is:
/*
{
	stages : (arr)stages 	| See ProgramStage
	repeats : (int)repeats	| Nr times the sequence should repeat, -1 for infinity
}
*/
class Program{

	constructor( client, gpio ){
		
		this.parent = client;
		this.gpio = gpio;

		this.duty = 0;				// Between 0 and 255	
		this.repeats = 0;
		this.tweens = [];			// Workaround for broken tween.js chain stopping

		this.out();

	}

	index(){
		return this.parent.programs.indexOf(this);
	}

	out(){

		// Clamp to 0 if value is below threshold
		this.gpio.pwmWrite(this.convertDuty(this.duty));

	}

	set( data ){

		let th = this;

		if( typeof data !== 'object' || !data.stages || !Array.isArray(data.stages) || !data.stages.length )
			return console.error("Invalid data received", data);

		let stages = [];
		for( let stage of data.stages )
			stages.push(new ProgramStage(this, stage));

		if( isNaN(data.repeats) )
			data.repeats = 0;

		this.repeats = data.repeats;		

		this.buildTweenChain(stages);

	}

	// Builds and plays a tween chain
	// This is a circular function since tween.js repeats are borked
	buildTweenChain( stages ){
		
		this.stopTicking(true);

		let th = this;

		// Build the tween
		let tweens = [];
		for( let stage of stages ){
			
			let tw = new TWEEN.Tween(this)
				.to({duty:stage.duty}, stage.duration)
				.easing(stage.easing)
				.repeat(stage.repeats)
				.yoyo(stage.yoyo)
			;

			// First stage
			if( tweens.length )
				tweens[tweens.length-1].chain(tw);
			
			tweens.push(tw);

		}

		this.tweens = tweens;

		tweens[tweens.length-1].onComplete(() => {
			
			if( th.repeats >= 0 && th.repeats-- === 0 )
				return th.stopTicking(false);

			setTimeout(() => {
				th.buildTweenChain(stages);
			}, 1);
			
			
		});

		this.tweens[0].start();

	}



	stopTicking( immediate ){

		this.out();

		let th = this;
		
		if( immediate )
			return this.clearTweens();

		setTimeout(() => {
			th.clearTweens();
		}, 1);

	}

	clearTweens(){

		this.tweens.map(tw => {
			if( tw._isPlaying )
				tw.stop();
		});
		this.tweens = [];
	}
	


	tick(){

		if( this.tweens.length )
			this.out();

	}

	// Converts the duty cycle to a percentage within threshold.
	convertDuty( input ){

		if( isNaN(input) || input < 1 )
			return 0;

		// Convert to minimum duty cycle
		let perc = input/255;
		let min = this.parent.config.duty_min/255;
		let max = 1.0;
		perc = perc*(max-min)+min;

		let intensity = Math.round(perc*255);
		if( isNaN(intensity) || intensity < 0 ) 
			intensity = 0;
		
		if( intensity > 255 )
			intensity = 255;


		return intensity;

	}
	

}

// A step in the program
// Data is
/*
{
	i : (int)duty	 		| 0-255
	d : (int)duration 		| milliseconds
	e : (str)easing_type 	| Linear.None
	r : (int)nr_repeats		| Needs to be 0 or above, default 0
	y : (bool)yoyo 			| Use yoyo
}
*/
class ProgramStage{

	constructor( parent, data ){

		this.parent = parent;

		// Defaults
		this.duty = 0;		// between 0 and 255
		this.duration = 0;
		this.easing = TWEEN.Easing.Linear.None;
		this.repeats = 0;
		this.yoyo = false;

		if( typeof data !== "object" )
			console.error("Invalid stage received", data);
		else{

			if( !isNaN(data.i) )
				this.duty = data.i;
			
			if( data.d > 0 )
				this.duration = Math.floor(data.d);

			if( data.r > 0 )
				this.repeats = Math.floor(data.r);

			this.yoyo = (data.y == true);

			if( typeof data.e === 'string' ){

				try{

					let tw = data.e.split('.').reduce((o,i) => o[i], TWEEN.Easing);
					if( tw )
						this.easing = tw;

				}catch(err){
					console.error(err);
				}

			}

		}
			
		
	}
	
	

}


module.exports = Client;