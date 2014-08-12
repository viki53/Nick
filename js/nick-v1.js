var irc = require("irc");


var app = {};


app.client = new irc.Client("irc.smoothirc.net", "Nick", {
	channels: [
		// "#zestedesavoir",
		"#nick_tests",
	]
});

app.tabs = [];

app.client.addListener("message#", function (from, to, message) {
	console.log("message : ", arguments);

	var p = document.createElement("p");
	p.innerText = from + " (" + to + ") : " + message;
	document.body.appendChild(p);

	document.body.scrollTop = document.body.scrollHeight;
});

app.client.addListener("pm", function (from, message) {
	console.log("pm : ", arguments);

	var p = document.createElement("p");
	p.innerText = from + " : " + message;
	document.body.appendChild(p);

	document.body.scrollTop = document.body.scrollHeight;
});

app.client.addListener("names", function (channel, nicks) {
	console.log("names : ", arguments);
});

app.client.addListener("nick", function (oldnick, newnick, channels, message) {
	console.log("nick : ", arguments);

	var p = document.createElement("p");
	p.innerText = oldnick + " will now be called " + newnick;
	document.body.appendChild(p);

	document.body.scrollTop = document.body.scrollHeight;
});

app.client.addListener("join", function (channel, nick, message) {
	console.log("join : ", arguments);

	var p = document.createElement("p");
	p.innerText = nick + " joined " + channel;
	document.body.appendChild(p);

	document.body.scrollTop = document.body.scrollHeight;
});

app.client.addListener("error", function(message) {
	console.log("error : ", message);
});

console.dir(irc.colors.codes);

app.client.send("NICK", "Nick_tests_changed");