var fs = require("fs");
var irc = require("irc");
var gui = require('nw.gui');


Number.prototype.pad = function () {
	if ( this < 10 ) {
		return '0' + this;
	}
	return this;
}

Date.prototype.toIRCformat = function() {
	return this.getFullYear().pad() + "-" + (this.getMonth() + 1).pad() + "-" + this.getDate().pad() + " " + (this.getHours() + 1).pad() + ":" + (this.getMinutes() + 1).pad() + ":" + (this.getSeconds() + 1).pad();
}

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
		this.servers.push(server);
	}, this);

	this.main_window = gui.Window.get();

	var nativeMenubar = new gui.Menu({ type: 'menubar' });
	
	try {
		nativeMenubar.createMacBuiltin("Nick");
		this.main_window.menu = nativeMenubar;
	} catch (ex) {
		console.log(ex.message);
	}

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
NickApp.prototype.setActiveTab = function (serverHostname, channelName, userName, elem) {
	if (elem.dataset.serverHostname != serverHostname) {
		elem.classList.remove("active");
		return;
	}
	if ((channelName && elem.dataset.channelName != channelName) || (!channelName && elem.dataset.channelName)) {
		elem.classList.remove("active");
		return;
	}
	if ((userName && elem.dataset.userName != userName) || (!userName && elem.dataset.userName)) {
		elem.classList.remove("active");
		return;
	}
	elem.classList.add("active");
	if (elem.parentNode.id === "irc-tabs") {
		elem.classList.remove("has-unread");
	}
}
NickApp.prototype.showTab = function (serverHostname, channelName, userName) {
	Array.prototype.forEach.call(this.elems.irc_tabs.children, this.setActiveTab.bind(this, serverHostname, channelName, userName));
	Array.prototype.forEach.call(this.elems.irc_tabs_contents.children, this.setActiveTab.bind(this, serverHostname, channelName, userName));
	Array.prototype.forEach.call(this.elems.irc_tabs_users.children, this.setActiveTab.bind(this, serverHostname, channelName, userName));
}
NickApp.prototype.onContentInputKeyUp = function (server, target, event) {
	if (event.which === 13) {
		if (this.value.trim()) {

			if (this.value.match(/^\/join/)) {
				server.joinNewChannel(this.value.substring(5).trim());
				this.value = "";
				return;
			}
			if (this.value.match(/^\/nick/)) {
				server.client.send("NICK", this.value.substring(5).trim());

				this.value = "";
				return;
			}

			server.client.say(target.name, this.value);

			if (target.onMessage) {
				target.onMessage(server.temp_nickname, this.value);
			}

			this.value = "";
		}
	}
}
NickApp.prototype.processMessageContent = function (li) {
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
	this.temp_nickname = nickname || this.app.config.nickname;
	this.client = new irc.Client(this.hostname, this.temp_nickname, { userName: this.temp_nickname, realName: this.temp_nickname + " (using Nick Client)" });

	this.channels_names = channels_names;
	this.channels = [];
	this.discussions = [];

	this.tab = document.createElement("li");
	this.tab.textContent = this.hostname;
	this.tab.dataset.serverHostname = this.hostname;
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this.hostname, null, null), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.tab_content = document.createElement("div");
	this.tab_content.className = "irc-tab-content";
	this.tab_content.dataset.serverHostname = this.hostname;
	this.app.elems.irc_tabs_contents.appendChild(this.tab_content);

	this.tab_content_list = document.createElement("ol");
	this.tab_content_list.className = "irc-tab-content-list";
	this.tab_content_list.reversed = true;
	this.tab_content.appendChild(this.tab_content_list);

	this.tab_channels_list = document.createElement("ul");
	this.tab_channels_list.className = "irc-tab-channels";
	this.tab_channels_list.dataset.serverHostname = this.hostname;
	this.app.elems.irc_tabs_users.appendChild(this.tab_channels_list);
	
	this.app.showTab(this.hostname, null, null);

	this.client.addListener("registered", this.onClientRegistered.bind(this));

	return this;
}
NickApp.Server.prototype.onClientRegistered = function (message) {
	var welcome_message = document.createElement("li");
	welcome_message.textContent = message.args[1];
	this.tab_content_list.appendChild(welcome_message);

	this.temp_nickname = message.args[0];

	this.client.addListener("names", this.onNicksReceive.bind(this));

	this.client.addListener("topic", this.onChannelTopic.bind(this));

	this.client.addListener("pm", this.onPrivateMessage.bind(this));

	this.client.addListener("nick", this.onUserNickChange.bind(this));

	this.client.addListener("error", this.onClientError.bind(this));

	this.client.addListener("quit", this.onUserQuit.bind(this));

	this.client.addListener("channellist", this.onChannelsList.bind(this));

	this.client.list();

	this.channels_names.forEach(this.joinNewChannel, this);
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
NickApp.Server.prototype.onChannelsList = function (channels_list) {
	channels_list.forEach(function(chan) {
		var channel_li = document.createElement("li");
		channel_li.textContent = chan.name;
		if (chan.topic) {
			channel_li.title = chan.topic;
		}
		if (chan.users) {
			channel_li.dataset.users_number = chan.users;
		}
		channel_li.addEventListener("dblclick", this.joinNewChannel.bind(this, chan.name), false);
		this.tab_channels_list.appendChild(channel_li);
	}, this);
}
NickApp.Server.prototype.onPrivateMessage = function (nickname, text, message) {
	var discussion = this.app.filter(this.discussions, { name : nickname }, true);

	if (!discussion) {
		discussion = new NickApp.PrivateDiscussion(this.app, this, nickname);
		this.discussions.push(discussion);
	}
	if (text) {
		discussion.onMessage(nickname, text, message);
	}
	else {
		this.app.showTab(this.hostname, null, nickname);
	}
}
NickApp.Server.prototype.onNicksReceive = function (channel_name, nicks) {
	var channel = this.app.filter(this.channels, { name: channel_name }, true);
	if (!channel) {
		console.error("Channel not found: " + channel_name);
		return false;
	}
	channel.onNicksReceive(nicks);
}
NickApp.Server.prototype.onUserNickChange = function (oldnickname, newnickname, channels, message) {
	channels.forEach(function (channel_name) {
		var channel = this.app.filter(this.channels, { name: channel_name }, true);

		if (!channel) {
			return false;
		}

		channel.onUserNickChange(oldnickname, newnickname, message);
	}, this);
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
	var channel = this.app.filter(this.channels, { name: channel_name }, true);
	if (!channel) {
		console.error("Channel not found: " + channel_name);
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
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this.server.hostname, this.name, null), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.close_button = document.createElement("span");
	this.close_button.className = "tab-close-button";
	this.close_button.textContent = "×";
	this.close_button.addEventListener("click", this.destroy.bind(this), false);
	this.tab.appendChild(this.close_button);

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
NickApp.Channel.prototype.destroy = function () {
	this.server.client.part(this.name);

	var index = this.server.channels.indexOf(this);

	if (index !== -1) {
		this.server.channels.splice(index, 1);
	}

	this.tab.parentNode.removeChild(this.tab);
	this.tab_content.parentNode.removeChild(this.tab_content);
	this.tab_users_list.parentNode.removeChild(this.tab_users_list);

	this.app.showTab(this.server.hostname, null, null);

	if (event) {
		event.stopPropagation();
	}

	delete this;
}
NickApp.Channel.prototype.mentionRegexp = function (nickname) {
	return new RegExp("(\\b)"+nickname+"(\\b)", "i");
}
NickApp.Channel.prototype.insertNicknameToInput = function (nickname) {
	this.tab_content_input.value += nickname;

	this.tab_content_input.focus();
}
NickApp.Channel.prototype.onChannelJoined = function (nickname) {
	this.app.showTab(this.server.hostname, this.name, null);

	this.tab_content_input.focus();

	this.server.client.addListener("message" + this.name, this.onMessage.bind(this));

	this.server.client.addListener("join" + this.name, this.onUserJoin.bind(this));

	this.server.client.addListener("part" + this.name, this.onUserQuit.bind(this));

	this.server.client.addListener("kick" + this.name, this.onUserKick.bind(this));
}
NickApp.Channel.prototype.onMessage = function (nickname, text, message) {
	var user = this.app.filter(this.users, { name: nickname }, true);
	if (!user) {
		return false;
	}

	var now = new Date();

	var item = document.createElement("li");
	item.className = "public-message";
	if (text.match(this.mentionRegexp(this.server.temp_nickname))) {
		item.classList.add("mentioned");

		this.app.main_window.requestAttention(true);
	}
	item.style.color = user.color;
	item.innerText = text;
	item.dataset.author = nickname;
	item.dataset.date = now.toIRCformat();
	this.tab_content_list.appendChild(item);

	this.app.processMessageContent(item);

	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight;

	if (!this.tab.classList.contains("active")) {
		this.tab.classList.add("has-unread");
	}
}
NickApp.Channel.prototype.onNicksReceive = function (nicks) {
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
		else {
			user_li.addEventListener("dblclick", this.server.onPrivateMessage.bind(this.server, user.name, null, null), false);
			user_li.addEventListener("click", this.insertNicknameToInput.bind(this, user.name));
		}

		this.users.push(user);

		this.tab_users_list.appendChild(user_li);
	}
}
NickApp.Channel.prototype.onUserJoin = function (nickname, message) {
	var user = new NickApp.User(this.app, nickname);

	this.users.push(user);

	var now = new Date();

	var item = document.createElement("li");
	item.className = "user-join";
	item.innerText = nickname + " joined ";
	item.style.color = user.color;
	item.dataset.author = nickname;
	item.dataset.date = now.toIRCformat();
	this.tab_content_list.appendChild(item);

	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight;

	var user_li = document.createElement("li");
	user_li.style.color = user.color;
	user_li.textContent = user.name;
	if (user.role) {
		user_li.dataset.userRole = user.role;
	}
	user_li.addEventListener("dblclick", this.server.onPrivateMessage.bind(this.server, user.name, null, null));
	user_li.addEventListener("click", this.insertNicknameToInput.bind(this, user.name));
	this.tab_users_list.appendChild(user_li);
}
NickApp.Channel.prototype.onUserNickChange = function (oldnickname, newnickname, message) {
	var user = this.app.filter(this.users, { name: oldnickname }, true);
	if (!user) {
		console.error("User not found", oldnickname);
		return false;
	}

	var now = new Date();

	user.name = newnickname;

	var item = document.createElement("li");
	item.className = "user-nick-change";
	item.style.color = user.color;
	item.innerText = oldnickname + " will now be called " + newnickname;
	item.dataset.author = newnickname;
	item.dataset.date = now.toIRCformat();
	this.tab_content_list.appendChild(item);

	Array.prototype.forEach.call(this.tab_users_list.children, function(li) {
		if (li.textContent != oldnickname) {
			return false;
		}
		var new_li = li.cloneNode(true);
		li.parentNode.replaceChild(new_li, li);

		new_li.textContent = newnickname;

		if (!new_li.classList.contains("me")) { 
			new_li.addEventListener("dblclick", this.server.onPrivateMessage.bind(this.server, user.name, null, null));
			new_li.addEventListener("click", this.insertNicknameToInput.bind(this, newnickname));
		}
		else {
			this.server.temp_nickname = newnickname;
			this.server.current_user.name = newnickname;
		}
	}, this);

	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight;
}
NickApp.Channel.prototype.onUserQuit = function (nickname, reason, message) {
	var user = this.app.filter(this.users, { name: nickname }, true);
	if (!user) {
		return false;
	}

	var index = this.users.indexOf(user);
	if (index === -1) {
		return false;
	}

	var now = new Date();

	this.users.splice(index, 1);

	var item = document.createElement("li");
	item.className = "user-quit";
	item.style.color = user.color;
	item.innerText = nickname + " has quit";
	if (reason) {
		item.innerText += ": " + reason;
	}
	item.dataset.author = nickname;
	item.dataset.date = now.toIRCformat();
	this.tab_content_list.appendChild(item);

	Array.prototype.forEach.call(this.tab_users_list.children, function(li) {
		if (li.textContent == nickname) {
			li.parentNode.removeChild(li);
		}
	});
}
NickApp.Channel.prototype.onUserKick = function (nickname, reason, message) {
	var user = this.app.filter(this.users, { name: nickname }, true);
	if (!user) {
		return false;
	}

	var index = this.users.indexOf(user);
	if (index === -1) {
		return false;
	}

	var now = new Date();

	this.users.splice(index, 1);

	var item = document.createElement("li");
	item.className = "user-kick";
	item.style.color = user.color;
	item.innerText = nickname + " has been kicked";
	if (reason) {
		item.innerText += ": " + reason;
	}
	item.dataset.author = nickname;
	item.dataset.date = now.toIRCformat();
	this.tab_content_list.appendChild(item);

	Array.prototype.forEach.call(this.tab_users_list.children, function(li) {
		if (li.textContent == nickname) {
			li.parentNode.removeChild(li);
		}
	});
}
NickApp.Channel.prototype.onTopicChange = function (topic, nickname, message) {
	this.tab_content_topic.textContent = topic;

	var now = new Date();

	var item = document.createElement("li");
	item.className = "channel-topic";
	item.innerText = "Topic is now " + topic;
	item.dataset.author = nickname;
	item.dataset.date = now.toIRCformat();
	this.tab_content_list.appendChild(item);

	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight;
}



NickApp.User = function (app, name, role) {
	this.app = app;

	this.name = name;
	if (role) {
		this.role = role;
	}
	this.color = this.app.colors[Math.floor(Math.random()*this.app.colors.length)];
}



NickApp.PrivateDiscussion = function (app, server, nickname) {
	this.app = app;

	user = new NickApp.User(this.app, nickname);

	this.name = nickname;
	this.server = server;
	this.user = user;

	this.tab = document.createElement("li");
	this.tab.textContent = this.name;
	this.tab.dataset.serverHostname = this.server.hostname;
	this.tab.dataset.userName = this.name;
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this.server.hostname, null, this.name), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.close_button = document.createElement("span");
	this.close_button.className = "tab-close-button";
	this.close_button.textContent = "×";
	this.close_button.addEventListener("click", this.destroy.bind(this), false);
	this.tab.appendChild(this.close_button);

	this.tab_content = document.createElement("div");
	this.tab_content.className = "irc-tab-content";
	this.tab_content.dataset.serverHostname = this.server.hostname;
	this.tab_content.dataset.userName = this.name;
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

	return this;
}
NickApp.PrivateDiscussion.prototype.destroy = function (event) {
	var index = this.server.discussions.indexOf(this);

	if (index !== -1) {
		this.server.discussions.splice(index, 1);
	}

	this.tab.parentNode.removeChild(this.tab);
	this.tab_content.parentNode.removeChild(this.tab_content);

	this.app.showTab(this.server.hostname, null, null);

	if (event) {
		event.stopPropagation();
	}

	delete this;
}
NickApp.PrivateDiscussion.prototype.onMessage = function (nickname, text, message) {
	var now = new Date();

	var item = document.createElement("li");
	item.className = "private-message";
	if (nickname !== this.server.temp_nickname) {
		item.style.color = this.user.color;
	}
	item.innerText = text;
	item.dataset.author = nickname;
	item.dataset.date = now.toIRCformat();
	this.tab_content_list.appendChild(item);

	this.app.processMessageContent(item);

	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight;

	if (!this.tab.classList.contains("active")) {
		this.tab.classList.add("has-unread");
	}

	this.app.main_window.requestAttention(true);

	return this;
}

var app = new NickApp();
