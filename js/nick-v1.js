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

	this.config = {};

	this.servers = [];

	this.loadConfig();

	this.saveConfig();

	this.config.servers.forEach(function(serv) {
		var server = new NickApp.Server(this, serv.hostname, serv.nickname || this.config.nickname, serv.channels);

		console.dir(this);
		this.servers.push(server);
	}, this);

	console.dir(irc.colors.codes);

	this.main_window = gui.Window.get();

	this.main_window.showDevTools();
}
NickApp.prototype.filter = function (array, predicate) {
	var results = [];
	array.forEach(function(item){
		for (key in predicate) {
			if (item[key] !== predicate[key]) {
				return;
			}
		}
		results.push(item);
	});

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
NickApp.prototype.loadConfig = function() {
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
NickApp.prototype.saveConfig = function() {
	return fs.writeFileSync(this.config_file, JSON.stringify(this.config, null, '\t'), { encoding: 'utf8' });
}
NickApp.prototype.setActiveTab = function(serverHostname, channelName, elem) {
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
NickApp.prototype.showTab = function(serverHostname, channelName) {
	Array.prototype.forEach.call(this.elems.irc_tabs.children, this.setActiveTab.bind(null, serverHostname, channelName));
	Array.prototype.forEach.call(this.elems.irc_tabs_contents.children, this.setActiveTab.bind(null, serverHostname, channelName));
	Array.prototype.forEach.call(this.elems.irc_tabs_users.children, this.setActiveTab.bind(null, serverHostname, channelName));
}
NickApp.prototype.onContentInputKeyUp = function(server, target, event) {
	console.dir(event);

	if (event.which === 13 || event.keyIdentifier === "Enter") {
		server.client.say(target.name, this.value);

		var item = document.createElement("li");
		item.innerText = server.temp_nickname + " : " + this.value;
		target.tab_content_list.appendChild(item);
		
		this.value = "";
		
		target.tab_content.scrollTop = target.tab_content.scrollHeight;
	}
}



NickApp.Server = function(app, hostname, nickname, channels_names) {
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

	server = this;

	this.channels_names.forEach(function(name) {
		var channel = new NickApp.Channel(this.app, name, this);
		this.channels.push(channel);
	}, this);

	this.client.addListener("registered", this.onClientRegistered.bind(this));

	return this;
}
NickApp.Server.prototype.onClientRegistered = function (message) {
	console.log(this.constructor.name);
	console.log("registered : ", arguments);

	var welcome_message = document.createElement("li");
	welcome_message.textContent = message.args[1];
	this.tab_content_list.appendChild(welcome_message);

	this.temp_nickname = message.args[0];

	this.channels.forEach(function(channel) {
		this.client.join(channel.name, channel.onChannelJoined.bind(channel));
	}, this);

	this.client.addListener("names", this.onNicksReceive.bind(this));

	this.client.addListener("topic", this.onChannelTopic.bind(this));

	this.client.addListener("pm", this.onPrivateMessage.bind(this));

	this.client.addListener("nick", this.onNicksReceive.bind(this));

	this.client.addListener("error", this.onClientError.bind(this));

	// this.client.send("NICK", "Nick_tests_changed");
}
NickApp.Server.prototype.onClientError = function (message) {
	console.log("error : ", message);
}
NickApp.Server.prototype.onPrivateMessage = function (from, message) {
	console.log("pm : ", arguments);

	var item = document.createElement("li");
	item.innerText = from + " : " + message;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}
NickApp.Server.prototype.onNicksReceive = function (channel_name, nicks) {
	var channel = app.filter(this.channels, { name: channel_name });
	if (!channel) {
		console.error("Channel not found : " + channel_name);
		return false;
	}

	channel[0].onNicksReceive(nicks);
}
NickApp.Server.prototype.onUserNickChange = function (oldnickname, newnickname, channels, message) {
	console.log("nick : ", arguments);

	var item = document.createElement("li");
	item.innerText = oldnickname + " will now be called " + newnickname;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}
NickApp.Server.prototype.onChannelTopic = function (channel, topic, nick, message) {
	console.log("topic : ", arguments);

	var channel = this.app.filter(this.channels, { name: channel_name });
	if (!channel) {
		console.error("Channel not found : " + channel_name);
		return false;
	}
	
	channel[0].onTopicChange(topic, nick, message);
}



NickApp.Channel = function (app, name, server) {
	this.app = app;

	this.name = name;
	this.server = server;
	this.users = {};

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

	var channel = this;


	return this;
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

	var item = document.createElement("li");
	item.innerText = nickname + " : " + text;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}
NickApp.Channel.prototype.onNicksReceive = function (nicks) {
	console.log("names : ", arguments);

	this.users = nicks;

	for (var nickname in nicks) {
		var user_li = document.createElement("li");
		user_li.textContent = nickname;
		user_li.dataset.userType = nicks[nickname];
		// ~	: Owner
		// @	: OP
		// &	: Admin
		// %	: HOP
		// +	: Voice

		if (nickname == this.server.temp_nickname) {
			user_li.classList.add("me");
		}
		this.tab_users_list.appendChild(user_li);
	}
}
NickApp.Channel.prototype.onUserJoin = function (nickname, message) {
	console.log("join : ", arguments);

	var item = document.createElement("li");
	item.innerText = nickname + " joined ";
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}
NickApp.Server.prototype.onTopicChange = function (topic, nick, message) {
	console.log("topic : ", arguments);

	var item = document.createElement("li");
	item.innerText = channel + " topic is now " + topic;
	this.tab_content_list.appendChild(item);

	this.tab_content.scrollTop = this.tab_content.scrollHeight;
}

var app = new NickApp();