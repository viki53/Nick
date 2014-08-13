var fs = require("fs");
var irc = require("irc");
var gui = require('nw.gui');

var app = {};

app.elems = {
	page_irc: document.getElementById("page-irc"),
	irc_tabs: document.getElementById("irc-tabs"),
	irc_tabs_contents: document.getElementById("irc-tabs-contents"),
	irc_tabs_users: document.getElementById("irc-tabs-users")
}


app.config_file = 'js/config.json';

app.config = {};

app.defaultConfig = {
	nickname: "user" + Date.now(),
	servers: [
		{
			hostname: "irc.smoothirc.net",
			channels: [
				"#nick_tests"
			]
		}
	]
};

app.init = function () {
	app.loadConfig();

	app.saveConfig();
}

app.loadConfig = function() {
	if (fs.existsSync(app.config_file)) {
		try {
			var conf = fs.readFileSync(app.config_file, { encoding: 'utf8' });

			console.dir(conf);
			if (!conf) {
				app.config = app.defaultConfig;
				return;
			}

			app.config = JSON.parse(conf) || app.defaultConfig;;
		}
		catch(e) {
			console.error(e);
			return false;
		}
	}
	else {
		app.config = app.defaultConfig;
	}
}

app.saveConfig = function() {
	return fs.writeFileSync(app.config_file, JSON.stringify(app.config, null, '\t'), { encoding: 'utf8' });
}

app.init();

app.setActiveTab = function(serverHostname, channel, elem) {
	if (elem.dataset.serverHostname != serverHostname) {
		elem.classList.remove('active');
		return;
	}
	if ((channel && elem.dataset.channel != channel) || (!channel && elem.dataset.channel)) {
		elem.classList.remove('active');
		return;
	}
	elem.classList.add('active');
}
app.showTab = function(serverHostname, channel) {
	Array.prototype.forEach.call(app.elems.irc_tabs.children, app.setActiveTab.bind(null, serverHostname, channel));
	Array.prototype.forEach.call(app.elems.irc_tabs_contents.children, app.setActiveTab.bind(null, serverHostname, channel));
	Array.prototype.forEach.call(app.elems.irc_tabs_users.children, app.setActiveTab.bind(null, serverHostname, channel));
}

app.config.servers.forEach(function(server){
	try{
		var client = new irc.Client(server.hostname, server.nickname || app.config.nickname);
	}
	catch(e) {
		console.error(e);
		return;
	}

	var tab = document.createElement("li");
	tab.textContent = server.hostname;
	tab.dataset.serverHostname = server.hostname;
	tab.addEventListener("click", app.showTab.bind(tab, server.hostname, null), false);
	app.elems.irc_tabs.appendChild(tab);

	var content = document.createElement("div");
	content.className = "irc-tab-content";
	content.dataset.serverHostname = server.hostname;
	app.elems.irc_tabs_contents.appendChild(content);

	client.addListener("registered", function(message) {
		app.showTab(server.hostname, null);

		server.channels.forEach(function(channel) {
			client.join(channel, function(nickname) {
				console.log("joined channel : ", arguments);

				server.temp_nickname = nickname;

				var tab = document.createElement("li");
				tab.textContent = channel;
				tab.dataset.serverHostname = server.hostname;
				tab.dataset.channel = channel;
				tab.addEventListener("click", app.showTab.bind(tab, server.hostname, channel), false);
				app.elems.irc_tabs.appendChild(tab);

				var content = document.createElement("div");
				content.className = "irc-tab-content";
				content.dataset.serverHostname = server.hostname;
				content.dataset.channel = channel;
				app.elems.irc_tabs_contents.appendChild(content);

				var users_list = document.createElement("ul");
				users_list.className = "irc-tab-users";
				users_list.dataset.serverHostname = server.hostname;
				users_list.dataset.channel = channel;
				app.elems.irc_tabs_users.appendChild(users_list);

				app.showTab(server.hostname, channel);

				client.addListener("message" + channel, function (nickname, text, message) {
					console.log("message : ", arguments);

					var p = document.createElement("p");
					p.innerText = nickname + " : " + text;
					content.appendChild(p);

					content.scrollTop = content.scrollHeight;
				});

				client.addListener("join" + channel, function (nickname, message) {
					console.log("join : ", arguments);

					var p = document.createElement("p");
					p.innerText = nickname + " joined ";
					content.appendChild(p);

					content.scrollTop = content.scrollHeight;
				});

				client.addListener("names", function (channel, nicks) {
					console.log("names : ", arguments);

					for (var nickname in nicks) {
						var user_li = document.createElement("li");
						user_li.textContent = nickname;
						user_li.dataset.userType = nicks[nickname];

						if (nickname == server.temp_nickname) {
							user_li.classList.add("me");
						}
						// ~	: Owner
						// @	: OP
						// &	: Admin
						// %	: HOP
						// +	: Voice
						users_list.appendChild(user_li);
					}
				});
			});
		})

		client.addListener("pm", function (from, message) {
			console.log("pm : ", arguments);

			var p = document.createElement("p");
			p.innerText = from + " : " + message;
			content.appendChild(p);

			content.scrollTop = content.scrollHeight;
		});

		client.addListener("nick", function (oldnickname, newnickname, channels, message) {
			console.log("nick : ", arguments);

			var p = document.createElement("p");
			p.innerText = oldnickname + " will now be called " + newnickname;
			content.appendChild(p);

			content.scrollTop = content.scrollHeight;
		});

		client.addListener("error", function(message) {
			console.log("error : ", message);
		});

		// client.send("NICK", "Nick_tests_changed");
	});
});

console.dir(irc.colors.codes);

gui.Window.get().showDevTools();