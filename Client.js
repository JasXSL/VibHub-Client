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
		this.interval = null;
		this.programs = [];
		
		for( let pin of config.pwm_pins ){


			let n = new Gpio(pin, {mode : Gpio.OUTPUT});
			n.pwmWrite(0);
			
			let p = new Program(this, n);
			this.programs.push(p);

		}

		this.duty_min = config.duty_min;
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

				let view = new Uint8Array(buffer);
				for( let i = 0; i<this.programs.length; ++i ){
					
					let duty = view[i];
					this.programs[i].duty = Math.max(0, Math.min(duty, 255));
					this.programs[i].out();

				}

			});

		}).catch(err => {
			console.error("Unable to start device", err);
		});

		// Start ticking
		this.interval = setInterval(() => {
			th.tick();
		}, 1000/this.fps);

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

	tick(){

		TWEEN.update();
		for( let p of this.programs )
			p.tick();

	}

	onVibData( data ){

		if( !Array.isArray(data) )
			data = [data];

		for( let point of data ){
			
			let targ = data.port;
			if( isNaN(targ) )
				targ = -1;

			let targets = this.programs;
			if( targ > -1 ){

				if( this.programs.length <= targ )
					continue;

				targets = [this.programs[targ]];

			}

			for( let t of targets )
				t.set(point);


		}

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

			th.buildTweenChain(stages);
			
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

	// Converts a percentage of 0 to 100 to an intensity 0 to 255
	convertDuty( input ){

		if( isNaN(input) || input < 1 )
			return 0;

		// Convert to minimum duty cycle
		let perc = input/255;
		let min = this.parent.duty_min/255;
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