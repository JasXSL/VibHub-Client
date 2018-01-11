const TWEEN = require('@tweenjs/tween.js');
let obj = {x:0};
let repeats = 2;
let interval = setInterval(function(){
	TWEEN.update();
}, 10);
let tween = new TWEEN.Tween(obj).to({x:1}, 1000).onComplete(() => {
	console.log("ONE on complete");
});

let two = new TWEEN.Tween(obj).to({x:0}, 1000).onComplete(() => {

	console.log("TWO on complete");
	if( repeats > 0 && --repeats === 0 ){
		setTimeout(() => {
			console.log("Stopping chain");
			TWEEN.remove(tween);
		}, 1);
		
	}
	
});

tween.chain(two);
two.chain(tween);

tween.start();
