const fs = require('fs'),
	Client = require('./Client'),
	config = {
		server : 'http://vibhub.dangly.parts',
		debug : false,
		fwd_pin : 22,
		pwm_pin : 17,
		duty_min : 21,			// minimum duty cycle to produce a pulse
		fps : 60,				// FPS of updates
	}
;


// Get config and init
fs.readFile(__dirname+'/config.json', 'utf8', (err, data) => {
	
	if( err )
		console.error("Unable to read config, using defaults:", err.code);
	else{

		try{
			
			let json = JSON.parse(data);
			if( typeof json !== "object" )
				throw Error("Config is not an object");
			else{
				
				for( let i in json ){

					if( config.hasOwnProperty(i) ){

						if( typeof config[i] === typeof json[i] )
							config[i] = json[i];
						else
							console.log("Invalid type of config", i, "got", typeof json[i], "expected", typeof config[i]);

					}
					else
						console.log("Unknown config property", i);

				}

			}

		}catch(e){
			console.error("Config read error, using defaults:", e.code);
		}

		

	}
	
	new Client(config);

});



