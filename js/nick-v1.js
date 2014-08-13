var fs = require("fs");
var irc = require("irc");
var gui = require('nw.gui');

NickApp = function () {
	this.elems = {
		page_irc: document.getElementById("page-irc"),
		irc_tabs: document.getElementById("irc-tabs"),
		irc_tabs_contents: document.getElementById("irc-tabs-contents"),
		irc_tabs_users: document.getElementById("irc-tabs-users")
	}

	this.config_file = 'js/config.json';
	// this.config_file = 'js/config-test.json';

	this.config = {};

	this.servers = [];

	this.loadConfig();

	this.saveConfig();

	this.config.servers.forEach(function(serv) {
		var server = new NickApp.Server(this, serv.hostname, serv.nickname || this.config.nickname, serv.channels);

		console.dir(this);
		this.servers.push(server);
	}, this);

	this.main_window = gui.Window.get();

	this.main_window.menu = new gui.Menu({ type: 'menubar' });

	this.main_window.showDevTools();
	this.main_window.focus();

	// gui.Shell.openExternal("http://website.com") // Ouvre une fenêtre externe (pratique pour les liens)

	this.main_window.on('closed', this.onWindowClose.bind(this));
}
NickApp.prototype.onWindowClose = function () {
	this.servers.forEach(function (server) {
		server.client.disconnect("Nick client exit");
	});
}
NickApp.prototype.filter = function (array, predicate, returnFirst) {
	var results = [];

	loop_items:
	for (var i=0, nb=array.length; i<nb; i++){
		loop_properties:
		for (key in predicate) {
			if (array[i][key] !== predicate[key]) {
				continue loop_items;
			}
		}
		if (returnFirst) {
			return array[i];
		}
		results.push(array[i]);
	}

	if (returnFirst) {
		return;
	}

	return results;
}
NickApp.prototype.defaultConfig = {
	nickname: "user" + Date.now(),
	servers: [
		{
			hostname: "irc.smoothirc.net",
			channels: [
				"#nick_tests"
			]
		}
	]
}
NickApp.prototype.colors = [
	"#c41411",
	"#ad1457",
	"#6a1b9a",
	"#4527a0",
	"#283593",
	"#3b50ce",
	"#0277bd",
	"#00838f",
	"#00695c",
	"#056f00",
	"#558b2f",
	"#9e9d24",
	// "#f9a825",
	"#ff8f00",
	"#ef6c00",
	"#d84315",
	"#4e342e"
]
NickApp.prototype.loadConfig = function () {
	if (fs.existsSync(this.config_file)) {
		try {
			var conf = fs.readFileSync(this.config_file, { encoding: 'utf8' });

			if (!conf) {
				this.config = this.defaultConfig;
				return;
			}

			this.config = JSON.parse(conf) || this.defaultConfig;;
		}
		catch(e) {
			console.error(e);
			return false;
		}
	}
	else {
		this.config = this.defaultConfig;
	}
}
NickApp.prototype.saveConfig = function () {
	return fs.writeFileSync(this.config_file, JSON.stringify(this.config, null, '\t'), { encoding: 'utf8' });
}
NickApp.prototype.setActiveTab = function (serverHostname, channelName, elem) {
	if (elem.dataset.serverHostname != serverHostname) {
		elem.classList.remove('active');
		return;
	}
	if ((channelName && elem.dataset.channelName != channelName) || (!channelName && elem.dataset.channelName)) {
		elem.classList.remove('active');
		return;
	}
	elem.classList.add('active');
}
NickApp.prototype.showTab = function (serverHostname, channelName) {
	Array.prototype.forEach.call(this.elems.irc_tabs.children, this.setActiveTab.bind(null, serverHostname, channelName));
	Array.prototype.forEach.call(this.elems.irc_tabs_contents.children, this.setActiveTab.bind(null, serverHostname, channelName));
	Array.prototype.forEach.call(this.elems.irc_tabs_users.children, this.setActiveTab.bind(null, serverHostname, channelName));
}
NickApp.prototype.onContentInputKeyUp = function (server, target, event) {
	// console.dir(event);

	if (event.which === 13) {
		if (this.value.trim()) {
			server.client.say(target.name, this.value);

			if (target.onPublicMessage) {
				target.onPublicMessage(server.temp_nickname, this.value);
			}

			this.value = "";
		}
	}
}
NickApp.prototype.processMessageContent = function (li) {
	console.dir(li);

	li.innerHTML = li.innerHTML.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i, function(match, url) {
		console.dir(arguments);
		return url.link(url).replace(/<a href/, "<a onclick=\"app.openExternalLink(this.href); return false;\" href");
	});
}
NickApp.prototype.openExternalLink = function (href) {
	gui.Shell.openExternal(href);
}



NickApp.Server = function (app, hostname, nickname, channels_names) {
	this.app = app;

	this.hostname = hostname;
	this.client = new irc.Client(hostname, nickname || this.app.config.nickname);
	this.temp_nickname = nickname || this.app.config.nickname;

	this.channels_names = channels_names;
	this.channels = [];

	this.tab = document.createElement("li");
	this.tab.textContent = this.hostname;
	this.tab.dataset.serverHostname = this.hostname;
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this.hostname, null), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.tab_content = document.createElement("div");
	this.tab_content.className = "irc-tab-content";
	this.tab_content.dataset.serverHostname = this.hostname;
	this.app.elems.irc_tabs_contents.appendChild(this.tab_content);

	this.tab_content_list = document.createElement("ol");
	this.tab_content_list.className = "irc-tab-content-list";
	this.tab_content_list.reversed = true;
	this.tab_content.appendChild(this.tab_content_list);
	
	this.app.showTab(this.hostname, null);

	this.client.addListener("registered", this.onClientRegistered.bind(this));

	return this;
}
NickApp.Server.prototype.onClientRegistered = function (message) {
	console.log("registered : ", arguments);

	var welcome_message = document.createElement("li");
	welcome_message.textContent = message.args[1];
	this.tab_content_list.appendChild(welcome_message);

	this.temp_nickname = message.args[0];

	this.client.addListener("names", this.onNicksReceive.bind(this));

	this.client.addListener("topic", this.onChannelTopic.bind(this));

	this.client.addListener("pm", this.onPrivateMessage.bind(this));

	this.client.addListener("nick", this.onNicksReceive.bind(this));

	this.client.addListener("error", this.onClientError.bind(this));

	this.client.addListener("quit", this.onUserQuit.bind(this));

	this.channels_names.forEach(this.joinNewChannel, this);

	// this.client.send("NICK", "Nick_tests_changed");
}
NickApp.Server.prototype.joinNewChannel = function (name) {
	if (!name) {
		name = prompt("Nom du channel à rejoindre", "#zestedesavoir");
	}

	var channel = new NickApp.Channel(this.app, name, this);
	this.channels.push(channel);
}
NickApp.Server.prototype.onClientError = function (message) {
	console.log("error : ", message);
}
NickApp.Server.prototype.onPrivateMessage = function (from, message) {
	console.log("pm : ", arguments);

	var item = document.createElement("li");
	item.className = "private-message";
	item.innerText = from + " : " + message;
	item.dataset.author = nickname;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}
NickApp.Server.prototype.onNicksReceive = function (channel_name, nicks) {
	var channel = this.app.filter(this.channels, { name: channel_name }, true);
	if (!channel) {
		console.error("Channel not found : " + channel_name);
		return false;
	}
	console.log(channel.constructor.name);
	channel.onNicksReceive(nicks);
}
NickApp.Server.prototype.onUserNickChange = function (oldnickname, newnickname, channels, message) {
	console.log("nick : ", arguments);

	var item = document.createElement("li");
	item.className = "user-nick-change";
	item.innerText = oldnickname + " will now be called " + newnickname;
	item.dataset.author = newnickname;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}
NickApp.Server.prototype.onUserQuit = function (nickname, reason, channels, message) {
	channels.forEach(function (channel_name) {
		var channel = this.app.filter(this.channels, { name: channel_name }, true);

		if (!channel) {
			return false;
		}

		channel.onUserQuit(nickname, reason, message);
	}, this);
}
NickApp.Server.prototype.onChannelTopic = function (channel_name, topic, nick, message) {
	console.log("topic : ", arguments);

	var channel = this.app.filter(this.channels, { name: channel_name }, true);
	if (!channel) {
		console.error("Channel not found : " + channel_name);
		return false;
	}
	
	channel.onTopicChange(topic, nick, message);
}



NickApp.Channel = function (app, name, server) {
	this.app = app;

	this.name = name;
	this.server = server;
	this.users = [];

	this.tab = document.createElement("li");
	this.tab.textContent = this.name;
	this.tab.dataset.serverHostname = this.server.hostname;
	this.tab.dataset.channelName = this.name;
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this.server.hostname, this.name), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.tab_content = document.createElement("div");
	this.tab_content.className = "irc-tab-content";
	this.tab_content.dataset.serverHostname = this.server.hostname;
	this.tab_content.dataset.channelName = this.name;
	this.app.elems.irc_tabs_contents.appendChild(this.tab_content);

	this.tab_content_topic = document.createElement("h1");
	this.tab_content_topic.className = "irc-tab-content-topic";
	this.tab_content.appendChild(this.tab_content_topic);

	this.tab_content_list = document.createElement("ol");
	this.tab_content_list.className = "irc-tab-content-list";
	this.tab_content_list.reversed = true;
	this.tab_content.appendChild(this.tab_content_list);

	this.tab_content_input = document.createElement("input");
	this.tab_content_input.type = "text";
	this.tab_content_input.className = "irc-tab-content-input";
	this.tab_content_input.addEventListener("keyup", this.app.onContentInputKeyUp.bind(this.tab_content_input, this.server, this), false);
	this.tab_content.appendChild(this.tab_content_input);

	this.tab_users_list = document.createElement("ul");
	this.tab_users_list.className = "irc-tab-users";
	this.tab_users_list.dataset.serverHostname = this.server.hostname;
	this.tab_users_list.dataset.channelName = this.name;
	this.app.elems.irc_tabs_users.appendChild(this.tab_users_list);

	try{
		this.server.client.join(this.name, this.onChannelJoined.bind(this));
	}
	catch(e){
		console.error(e);
	}
	return this;
}
NickApp.Channel.prototype.mentionRegexp = function (nickname) {
	return new RegExp("(\\b)"+nickname+"(\\b)", "i");
}
NickApp.Channel.prototype.onChannelJoined = function (nickname) {
	console.log("joined channel : ", arguments);

	this.app.showTab(this.server.hostname, this.name);

	this.tab_content_input.focus();

	this.server.client.addListener("message" + this.name, this.onPublicMessage.bind(this));

	this.server.client.addListener("join" + this.name, this.onUserJoin.bind(this));
}
NickApp.Channel.prototype.onPublicMessage = function (nickname, text, message) {
	console.log("message : ", arguments);

	var user = this.app.filter(this.users, { name: nickname }, true);
	if (!user) {
		return false;
	}

	var item = document.createElement("li");
	item.className = "public-message";
	if (text.match(this.mentionRegexp(this.server.temp_nickname))) {
		item.classList.add("mentioned");

		this.app.main_window.requestAttention(true);
	}
	item.style.color = user.color;
	item.innerText = text;
	item.dataset.author = nickname;
	this.tab_content_list.appendChild(item);

	this.app.processMessageContent(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}
NickApp.Channel.prototype.onNicksReceive = function (nicks) {
	console.log("names : ", arguments);

	for (var nickname in nicks) {
		var user = new NickApp.User(this.app, nickname, nicks[nickname]);

		var user_li = document.createElement("li");
		user_li.textContent = user.name;
		user_li.style.color = user.color;
		if (user.role) {
			user_li.dataset.userRole = user.role;
		}
		// ~	: Owner
		// @	: OP
		// &	: Admin
		// %	: HOP
		// +	: Voice

		if (user.name == this.server.temp_nickname) {
			user_li.classList.add("me");

			this.server.current_user = user;
		}

		this.users.push(user);

		this.tab_users_list.appendChild(user_li);
	}
}
NickApp.Channel.prototype.onUserJoin = function (nickname, message) {
	console.log("join : ", arguments);

	var user = new NickApp.User(this.app, nickname);

	this.users.push(user);

	var item = document.createElement("li");
	item.className = "user-join";
	item.innerText = nickname + " joined ";
	item.style.color = user.color;
	item.dataset.author = nickname;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;

	var user_li = document.createElement("li");
	user_li.textContent = user.name;
	if (user.role) {
		user_li.dataset.userRole = user.role;
	}
	this.tab_users_list.appendChild(user_li);
}
NickApp.Channel.prototype.onUserQuit = function (nickname, reason, message) {
	console.log("quit : ", arguments);

	var user = this.app.filter(this.users, { name: nickname }, true);
	if (!user) {
		return false;
	}

	var index = this.users.indexOf(user[0]);
	if (index === -1) {
		return false;
	}

	this.users.splice(index, 1);

	var item = document.createElement("li");
	item.className = "user-quit";
	item.innerText = nickname + " has quit";
	if (reason) {
		item.innerText += " (" + reason + ")";
	}
	item.dataset.author = nickname;
	this.tab_content_list.appendChild(item);

	Array.prototype.forEach.call(this.tab_users_list.children, function(li) {
		if (li.textContent == nickname) {
			li.parentNode.removeChild(li);
		}
	});
}
NickApp.Channel.prototype.onTopicChange = function (topic, nickname, message) {
	console.log("topic : ", arguments);

	this.tab_content_topic.textContent = topic;
	
	var item = document.createElement("li");
	item.className = "channel-topic";
	item.innerText = "Topic is now " + topic;
	item.dataset.author = nickname;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}

NickApp.User = function (app, name, role) {
	this.app = app;

	this.name = name;
	if (role) {
		this.role = role;
	}
	this.color = this.app.colors[Math.floor(Math.random()*this.app.colors.length)];
}

var app = new NickApp();
