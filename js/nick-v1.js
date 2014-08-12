var irc = require("irc");

var client = new irc.Client("irc.smoothirc.net", "Nick_tests", {
    channels: ["#zestedesavoir"],
});

client.addListener('message', function (from, to, message) {
	console.dir(arguments);

	var p = document.createElement("p");

	p.innerText = from + " => " + to + " : " + message;

	document.body.appendChild(p);
});