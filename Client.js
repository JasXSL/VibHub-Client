/*

*/
const io = require('socket.io-client'),
	uuid = require('uuid/v4'),
	fs = require('fs'),
	Gpio = require('pigpio').Gpio,
	TWEEN = require('@tweenjs/tween.js')
;

class Client{
	
	constructor( config ){

		let th = this;
		this.server = config.server;

		this.fwd_pin = new Gpio(config.fwd_pin, {mode : Gpio.OUTPUT});
		this.pwm_pin = new Gpio(config.pwm_pin, {mode : Gpio.OUTPUT});
		this.fwd_pin.digitalWrite(1);
		this.pwm_pin.pwmWrite(0);
		this.duty_min = config.duty_min;
		this.program = new Program(this);
		this.fps = Math.min(Math.max(config.fps,1), 100);	// limit between 1 and 100

		// Initialize
		this.getDeviceId()
		.then( () => {

			console.log("Connecting to ", th.server);
			let socket = io.connect(th.server);

			socket.on('connect', () => {
				
				console.log("Socket Connected, my ID is ", th.id);
				socket.emit('id', th.id);

			});
			
			socket.on('disconnect', () => {
				console.log("Socket Connection lost!");
			});
			
			// Vibration program received
			socket.on('vib', data => {
				th.onVibData(data);
			});

			// Vibration level received
			socket.on('p', buffer => {

				if( !buffer || buffer.constructor !== Buffer )
					return;

				let view = new Int8Array(buffer),
					task = view[0],
					data = view[1]
				;

				if( task === 0 ){

					// Stop tweening, P overrides
					if( this.program.interval )
						this.program.stopTicking( true );
					
					
					this.program.intensity = Math.max(0, Math.min(data, 100));
					this.program.out();

				}

			});

		}).catch(err => {
			console.error("Unable to start device", err);
		});

	}

	// Gets a new device ID
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


	onVibData( data ){

		this.program.set(data);

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

	constructor( client ){
		
		this.parent = client;

		this.intensity = 0;				// Between 0 and 100
		this.tween = null;
		this.interval = null;
		this.repeats = 0;
		
		this.out();

	}

	out(){

		// Clamp to 0 if value is below threshold
		this.parent.pwm_pin.pwmWrite(this.convertIntensity(this.intensity));

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
		this.stopTicking(true);
		

		// Build the tween
		let tweens = [];
		for( let stage of stages ){
			
			//console.log(stage.intensity, stage.duration, stage.repeats);
			let tw = new TWEEN.Tween(this)
				.to({intensity:stage.intensity}, stage.duration)
				.easing(stage.easing)
				.repeat(stage.repeats)
				.yoyo(stage.yoyo)
			;
			
			// First stage
			if( this.tween === null )
				this.tween = tw;
			else
				tweens[tweens.length-1].chain(tw);
			
			tweens.push(tw);
		}


		tweens[tweens.length-1].chain(this.tween).onComplete(() => {
			
			if( th.repeats < 0 )
				return;

			if( th.repeats-- === 0 )
				th.stopTicking();

		});


		this.tween.start();
		this.startTicking();

	}


	startTicking(){

		let th = this;
		this.interval = setInterval(() => {
			th.tick();
		}, 1000/this.parent.fps);

	}


	stopTicking( immediate ){

		let th = this;
		// Stop the interval
		clearInterval(this.interval);
		this.interval = null;

		if( immediate )
			this.clearTween();
		else
			setTimeout(() => { th.clearTween(); }, 1);

		this.out();	// Fixes tween.js broken fuckery
	}
	
	clearTween(){

		if( this.tween ){
			this.tween.stop();
			TWEEN.removeAll();
		}
		this.tween = null;

	}

	tick(){

		this.out();
		TWEEN.update();		

	}

	// Converts a percentage of 0 to 100 to an intensity 0 to 255
	convertIntensity( input ){

		if( isNaN(input) || input < 1 )
			return 0;

		// Convert to minimum duty cycle
		let perc = input/100;
		let min = this.parent.duty_min/100;
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
	i : (int)intensity 		| 0-100
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
		this.intensity = 0;		// between 0 and 100, use getDuty()
		this.duration = 0;
		this.easing = TWEEN.Easing.Linear.None;
		this.repeats = 0;
		this.yoyo = false;

		if( typeof data !== "object" )
			console.error("Invalid stage received", data);
		else{

			if( !isNaN(data.i) )
				this.intensity = data.i;
			
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