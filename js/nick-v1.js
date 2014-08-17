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
	return /*this.getFullYear().pad() + "-" + (this.getMonth() + 1).pad() + "-" + this.getDate().pad() + " " + */this.getHours().pad() + ":" + this.getMinutes().pad() + ":" + this.getSeconds().pad();
}

NickApp = function () {
	console.log("Creating a new App");

	this.elems = {
		page_irc: document.getElementById("page-irc"),
		irc_tabs: document.getElementById("irc-tabs"),
		irc_tabs_contents: document.getElementById("irc-tabs-contents"),
		irc_tabs_users: document.getElementById("irc-tabs-users"),
		page_config: document.getElementById("page-config"),
		page_config_content: document.getElementById("page-config-content"),
		config_open_button: document.getElementById("config-open-button"),
		config_close_button: document.getElementById("config-close-button")
	}

	this.elems.config_open_button.addEventListener("click", this.showConfigPage.bind(this), false);
	this.elems.config_close_button.addEventListener("click", this.hideConfigPage.bind(this), false);

	this.config_file = 'js/config.json';
	// this.config_file = 'js/config-test.json';

	this.config = {};

	this.servers = [];

	this.loadConfig();

	this.config.servers.forEach(function(serv) {
		var server = new NickApp.Server(this, serv.hostname, serv.nickname || this.config.nickname, serv.channels);
		this.servers.push(server);
		if (this.config.debug) {
			server.client.opt.debug = true;
		}
	}, this);

	this.main_window = gui.Window.get();

	var nativeMenubar = new gui.Menu({ type: 'menubar' });
	
	try {
		nativeMenubar.createMacBuiltin("Nick");
		this.main_window.menu = nativeMenubar;
	} catch (ex) {
		console.log(ex.message);
	}

	if (this.config.debug) {
		this.main_window.showDevTools();
		this.main_window.focus();
	}

	// gui.Shell.openExternal("http://website.com") // Ouvre une fenêtre externe (pratique pour les liens)

	this.main_window.on('closed', this.onWindowClose.bind(this));

	if (!this.config.hide_messages_details) {
		this.elems.page_irc.classList.add("show-messages-details");
	}
	if (!this.config.hide_users_list) {
		this.elems.page_irc.classList.add("show-users-list");
	}
}
NickApp.prototype.onWindowClose = function () {
	this.servers.forEach(function (server) {
		server.client.disconnect("Nick client exit");
	});

	this.saveConfig();
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
			channels: []
		}
	]
}
NickApp.prototype.roles = [
	"&", // Super-operator
	"@", // Operator
	"%", // Half-operator
	"+", // Voice
	"~", // Founder
]
NickApp.prototype.compareUsers = function (userA, userB) {
	if (userA.role && !userB.role) {
		return -1;
	}
	else if (!userA.role && userB.role) {
		return +1;
	}
	else if ((userA.role && userB.role) || (!userA.role && !userB.role)) {
		if (userA.name.toLowerCase() > userB.name.toLowerCase()) {
			return +1;
		}
		if (userA.name.toLowerCase() < userB.name.toLowerCase()) {
			return -1;
		}
		return 0;
	}
	else if (this.roles.indexOf(userA.role) > this.roles.indexOf(userB.role)) {
		return +1;
	}
	else if (this.roles.indexOf(userA.role) < this.roles.indexOf(userB.role)) {
		return -1;
	}
	return 0;
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
	if (this.config.save_servers_on_quit) {
		this.config.servers = [];

		this.servers.forEach(function(server) {
			var serv = {
				hostname: server.name,
				channels: []
			};

			server.channels.forEach(function(channel) {
				serv.channels.push(channel.name);
			});

			this.config.servers.push(serv);
		}, this);
	}

	return fs.writeFileSync(this.config_file, JSON.stringify(this.config, null, "\t"), { encoding: 'utf8' });
}
NickApp.prototype.setConfigPage = function() {
	this.elems.page_config_content.innerHTML = "";

	for (var opt in this.config) {
		var opt_elem = document.createElement("p");
		opt_elem.className = "option";

		var opt_label = document.createElement("label");
		var label = opt.split("_").join(" ");
		opt_label.textContent = label.substring(0, 1).toUpperCase() + label.substring(1);

		console.dir(typeof this.config[opt]);

		switch (typeof this.config[opt]) {
			case "boolean":
				opt_elem.classList.add("option-boolean");

				var opt_input = document.createElement("input");
				opt_input.type = "checkbox";
				opt_input.name = opt;
				opt_input.checked = this.config[opt];

				opt_input.addEventListener("change", (function(opt, event) { this.config[opt] = event.target.checked; }).bind(this, opt), false);
			break;

			case "array":
			case "object":
				opt_elem.classList.add("option-text");

				var opt_input = document.createElement("textarea");
				opt_input.name = opt;
				var value = JSON.stringify(this.config[opt], null, "\t");
				opt_input.value = value;
				opt_input.rows = value.split("\n").length;

				opt_input.addEventListener("change", (function(opt, event) { this.config[opt] = JSON.parse(event.target.value); }).bind(this, opt), false);
			break;

			case "string":
			default:
				opt_elem.classList.add("option-string");

				var opt_input = document.createElement("input");
				opt_input.type = "text";
				opt_input.name = opt;
				opt_input.value = this.config[opt];

				opt_input.addEventListener("change", (function(opt, event) { this.config[opt] = event.target.value; }).bind(this, opt), false);
			break;
		}
		opt_input.id = this.elems.page_config_content + "-option-" + opt;
		opt_label.setAttribute("for", opt_input.id);

		opt_elem.appendChild(opt_label);
		opt_elem.appendChild(opt_input);

		this.elems.page_config_content.appendChild(opt_elem);
	}
}
NickApp.prototype.showConfigPage = function() {
	this.elems.page_config.classList.add("show");
	this.setConfigPage();
	this.elems.config_open_button.blur();
}
NickApp.prototype.hideConfigPage = function() {
	this.elems.page_config.classList.remove("show");
	this.saveConfig();
	this.elems.config_close_button.blur();
}
NickApp.prototype.setActiveTab = function (target, elem) {
	elem.classList.remove("active");

	if (target instanceof NickApp.Channel && elem.dataset.channelName && elem.dataset.channelName === target.name) {
		elem.classList.add("active");
	}
	else if (target instanceof NickApp.PrivateDiscussion && elem.dataset.userName && elem.dataset.userName === target.name) {
		elem.classList.add("active");
	}
	else if (target instanceof NickApp.Server && elem.dataset.serverName && !elem.dataset.channelName && !elem.dataset.userName && elem.dataset.serverName === target.name) {
		elem.classList.add("active");
	}
}
NickApp.prototype.showTab = function (target) {
	Array.prototype.forEach.call(this.elems.irc_tabs.children, this.setActiveTab.bind(this, target));
	Array.prototype.forEach.call(this.elems.irc_tabs_contents.children, this.setActiveTab.bind(this, target));
	Array.prototype.forEach.call(this.elems.irc_tabs_users.children, this.setActiveTab.bind(this, target));

	if (target.resetUnread) {
		target.resetUnread();
	}
	if (target.refreshScroll) {
		target.refreshScroll();
	}

	if (target.tab_content_input) {
		target.tab_content_input.focus();
	}

	this.elems.page_irc.classList.remove("viewing-channel");
	this.elems.page_irc.classList.remove("viewing-private-discussion");
	this.elems.page_irc.classList.remove("viewing-server");

	if (target instanceof NickApp.Channel) {
		this.elems.page_irc.classList.add("viewing-channel");
	}
	else if (target instanceof NickApp.PrivateDiscussion) {
		this.elems.page_irc.classList.add("viewing-private-discussion");
	}
	else if (target instanceof NickApp.Server) {
		this.elems.page_irc.classList.add("viewing-server");
	}
}
NickApp.prototype.onContentInputKeyUp = function (server, target, elem, event) {
	if (event.which === 13) {
		if (elem.value.trim()) {

			if (elem.value.match(/^\/join/)) {
				server.joinNewChannel(elem.value.substring(5).trim());
				elem.value = "";
				return;
			}
			else if (elem.value.match(/^\/nick/)) {
				var newnickname = elem.value.substring(5).trim();
				server.client.send("NICK", newnickname);

				if (target instanceof NickApp.Channel) {
					target.onUserNickChange(server.temp_nickname, newnickname);
				}
				else if (server.current_user) {
					server.current_user.changeNickname(newnickname);
				}

				elem.value = "";
				return;
			}
			else if (elem.value.match(/^\/color/)) {
				if (target instanceof NickApp.Channel) {
					var nickname = elem.value.substring(6).trim();

					if (nickname) {
						if (target instanceof NickApp.Channel) {
							var user = this.filter(target.users, { name : nickname }, true);
						}
						else if (target instanceof NickApp.PrivateDiscussion) {
							var user = target.user;
						}

						if (user) {
							user.resetColor();
						}
					}
					else {
						if (target instanceof NickApp.Channel) {
							target.users.forEach(function (user) {
								user.resetColor();
							}, target);
						}
						else if (target instanceof NickApp.PrivateDiscussion) {
							target.user.resetColor();
						}
					}
				}

				elem.value = "";
				return;
			}

			server.client.say(target.name, elem.value);

			if (target.onMessage) {
				target.onMessage(server.temp_nickname, elem.value);
			}

			elem.value = "";
		}
	}
}
NickApp.prototype.processMessageContent = function (li) {
	li.innerHTML = li.innerHTML.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i, function(match, url) {
		return url.link(url).replace(/<a href/, "<a onclick=\"app.openExternalLink(this.href); return false;\" href");
	});
}
NickApp.prototype.openExternalLink = function (href) {
	gui.Shell.openExternal(href);
}



NickApp.Server = function (app, hostname, nickname, channels_names) {
	console.log("Creating a new Server");

	this.app = app;

	this.name = hostname;
	this.temp_nickname = nickname || this.app.config.nickname;
	this.client = new irc.Client(this.name, this.temp_nickname, { userName: this.temp_nickname, realName: this.temp_nickname + " (using Nick Client)" });

	this.channels_names = channels_names;
	this.channels = [];
	this.discussions = [];

	this.tab = document.createElement("li");
	this.tab.className = "tab server";
	this.tab.textContent = this.name;
	this.tab.dataset.serverName = this.name;
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.tab_content = document.createElement("div");
	this.tab_content.className = "irc-tab-content server";
	this.tab_content.dataset.serverName = this.name;
	this.app.elems.irc_tabs_contents.appendChild(this.tab_content);

	this.tab_content_list = document.createElement("ol");
	this.tab_content_list.className = "irc-tab-content-list";
	this.tab_content_list.reversed = true;
	this.tab_content.appendChild(this.tab_content_list);

	this.tab_channels_list = document.createElement("ul");
	this.tab_channels_list.className = "irc-tab-channels server";
	this.tab_channels_list.dataset.serverName = this.name;
	this.app.elems.irc_tabs_users.appendChild(this.tab_channels_list);
	
	this.app.showTab(this);

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
	while (name === "") {
		name = prompt("Nom du channel à rejoindre", "");
	}

	if (!name) {
		return false;
	}

	var channel = new NickApp.Channel(this.app, name, this);
	this.channels.push(channel);
}
NickApp.Server.prototype.onClientError = function (message) {
	console.log("error : ", message);
}
NickApp.Server.prototype.onChannelsList = function (channels_list) {
	channels_list.sort();

	channels_list.forEach(function(chan) {
		var channel_li = document.createElement("li");
		channel_li.textContent = chan.name;
		if (chan.topic) {
			channel_li.title = chan.topic;
		}
		if (chan.users) {
			channel_li.dataset.usersNumber = chan.users;
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
		this.app.showTab(discussion);
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
NickApp.Server.prototype.onMessageOfTheDay = function (motd) {
	this.addMessage(motd, "message-of-the-day");
}
NickApp.Server.prototype.onChannelTopic = function (channel_name, topic, nick, message) {
	var channel = this.app.filter(this.channels, { name: channel_name }, true);
	if (!channel) {
		console.error("Channel not found: " + channel_name);
		return false;
	}
	
	channel.onTopicChange(topic, nick, message);
}
NickApp.Server.prototype.addMessage = function (content, type, author) {
	var now = new Date();

	var shouldRefreshScroll = this.tab_content_list.scrollTop === this.tab_content_list.scrollHeight - this.tab_content_list.clientHeight;

	var item = document.createElement("li");

	item.className = type;
	item.innerText = content;
	item.dataset.date = now.toIRCformat();
	if (author) {
		item.dataset.author = author.name;
		item.style.color = author.color;
	}

	this.tab_content_list.appendChild(item);
	
	if (!this.tab.classList.contains("active")) {
		this.tab.classList.add("has-unread");
	}
	else if(shouldRefreshScroll) {
		this.refreshScroll();
	}

	return item;
}
NickApp.Server.prototype.resetUnread = function () {
	this.tab.classList.remove("has-unread");
}
NickApp.Server.prototype.refreshScroll = function () {
	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight - this.tab_content_list.clientHeight;
}



NickApp.Channel = function (app, name, server) {
	console.log("Creating a new Channel");

	this.app = app;

	this.name = name;
	this.server = server;
	this.users = [];

	this.tab = document.createElement("li");
	this.tab.className = "tab channel";
	this.tab.textContent = this.name;
	this.tab.dataset.serverName = this.server.name;
	this.tab.dataset.channelName = this.name;
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.close_button = document.createElement("span");
	this.close_button.className = "tab-close-button";
	this.close_button.textContent = "×";
	this.close_button.addEventListener("click", this.destroy.bind(this), false);
	this.tab.appendChild(this.close_button);

	this.tab_content = document.createElement("div");
	this.tab_content.className = "irc-tab-content channel";
	this.tab_content.dataset.serverName = this.server.name;
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
	this.tab_content_input.addEventListener("keyup", this.app.onContentInputKeyUp.bind(this.app, this.server, this, this.tab_content_input), false);
	this.tab_content.appendChild(this.tab_content_input);

	this.tab_users_list = document.createElement("ul");
	this.tab_users_list.className = "irc-tab-users channel";
	this.tab_users_list.dataset.serverName = this.server.name;
	this.tab_users_list.dataset.channelName = this.name;
	this.app.elems.irc_tabs_users.appendChild(this.tab_users_list);

	this.app.showTab(this);

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

	if (index > 0) {
		this.app.showTab(this.server.channels[index-1]);
	}
	else if (this.server.channels[index]) {
		this.app.showTab(this.server.channels[index]);
	}
	else {
		this.app.showTab(this.server);
	}

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
	this.tab_content_input.focus();

	this.server.client.addListener("message" + this.name, this.onMessage.bind(this));

	this.server.client.addListener("join" + this.name, this.onUserJoin.bind(this));

	this.server.client.addListener("part" + this.name, this.onUserQuit.bind(this));

	this.server.client.addListener("kick" + this.name, this.onUserKick.bind(this));

	this.server.client.addListener("kill" + this.name, this.onUserKilled.bind(this));
}
NickApp.Channel.prototype.onMessage = function (nickname, text, message) {
	var user = this.app.filter(this.users, { name: nickname }, true);
	if (!user) {
		return false;
	}

	var item = this.addMessage(text, "public-message", user);

	this.app.processMessageContent(item);

	if (text.match(this.mentionRegexp(this.server.temp_nickname))) {
		item.classList.add("mentioned");
		this.app.main_window.requestAttention(true);
	}
}
NickApp.Channel.prototype.onNicksReceive = function (nicks) {
	this.tab_users_list.innerHTML = "";

	for (var nickname in nicks) {
		var usr = { name: nickname, role: nicks[nickname] };
		var user = new NickApp.User(this.app, this.server, this, nickname, nicks[nickname]);

		if (user.name === this.server.temp_nickname) {
			user.li.classList.add("me");

			this.server.current_user = user;
		}

		this.users.push(user);
	}

	this.users.sort(this.app.compareUsers.bind(this.app));

	this.users.forEach(function (user) {
		this.tab_users_list.appendChild(user.li);
	}, this);
}
NickApp.Channel.prototype.onUserJoin = function (nickname, message) {
	var user = new NickApp.User(this.app, this.server, this, nickname);

	this.users.push(user);
	
	this.users.sort(this.app.compareUsers.bind(this.app));

	this.users.forEach(function (user) {
		this.tab_users_list.appendChild(user.li);
	}, this);

	this.addMessage(nickname + " joined", "user-join", user);
}
NickApp.Channel.prototype.onUserNickChange = function (oldnickname, newnickname, message) {
	var user = this.app.filter(this.users, { name: oldnickname }, true);
	if (!user) {
		console.error("User not found", oldnickname);
		return false;
	}

	user.changeNickname(newnickname);

	if (oldnickname === this.server.temp_nickname) {
		this.server.temp_nickname = newnickname;
		this.server.current_user.name = newnickname;
	}

	this.addMessage(oldnickname + " will now be called " + newnickname, "user-nick-change", user);
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

	this.users.splice(index, 1);
	user.destroy();

	var content = nickname + " has quit";
	if (reason) {
		content += ": " + reason;
	}
	this.addMessage(content, "user-quit", user);
}
NickApp.Channel.prototype.onUserKilled = function (nickname, reason, message) {
	var user = this.app.filter(this.users, { name: nickname }, true);
	if (!user) {
		return false;
	}

	var index = this.users.indexOf(user);
	if (index === -1) {
		return false;
	}

	this.users.splice(index, 1);

	user.destroy();

	var content = nickname + " has been killed";
	if (reason) {
		content += ": " + reason;
	}
	this.addMessage(content, "user-kill", user);

	if (nickname === this.server.temp_nickname) {
		this.server.joinNewChannel(this.name);
		this.destroy();
	}
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

	this.users.splice(index, 1);
	user.destroy();

	this.addMessage(nickname + " has been kicked", "user-kick", user);
}
NickApp.Channel.prototype.onTopicChange = function (topic, nickname, message) {
	this.tab_content_topic.textContent = topic;

	this.addMessage("Topic is now " + topic, "channel-topic");
}
NickApp.Channel.prototype.addMessage = function (content, type, author) {
	var now = new Date();

	var shouldRefreshScroll = this.tab_content_list.scrollTop === this.tab_content_list.scrollHeight - this.tab_content_list.clientHeight;

	var item = document.createElement("li");

	item.className = type;
	item.innerText = content;
	item.dataset.date = now.toIRCformat();
	if (author) {
		item.dataset.author = author.name;
		item.style.color = author.color;
	}

	this.tab_content_list.appendChild(item);
	
	if (!this.tab.classList.contains("active")) {
		this.tab.classList.add("has-unread");
	}
	else if(shouldRefreshScroll) {
		this.refreshScroll();
	}

	return item;
}
NickApp.Channel.prototype.resetUnread = function () {
	this.tab.classList.remove("has-unread");
}
NickApp.Channel.prototype.refreshScroll = function () {
	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight - this.tab_content_list.clientHeight;
}



NickApp.User = function (app, server, target, name, role) {
	console.log("Creating a new User");
	
	this.app = app;
	this.server = server;
	this.target = target;

	this.name = name;

	this.resetColor();

	if (role) {
		this.role = role;
	}

	if (this.target.tab_users_list) {
		this.li = document.createElement("li");
		this.li.style.color = this.color;
		this.li.textContent = this.name;

		if (this.role) {
			this.li.dataset.userRole = this.role;
		}
		this.li.addEventListener("dblclick", this.server.onPrivateMessage.bind(this.server, this.name, null, null));
		this.li.addEventListener("click", this.target.insertNicknameToInput.bind(this.target, this.name));
	}
}
NickApp.User.prototype.resetColor = function () {
	this.color = this.app.colors[Math.floor(Math.random()*this.app.colors.length)];

	if (this.li) {
		this.li.style.color = this.color;
	}
}
NickApp.User.prototype.changeNickname = function (newnickname) {

	this.name = newnickname;

	if (this.li) {
		var new_li = this.li.cloneNode(true);
		this.li.parentNode.replaceChild(new_li, this.li);

		new_li.textContent = newnickname;

		if (!new_li.classList.contains("me")) { 
			new_li.addEventListener("dblclick", this.server.onPrivateMessage.bind(this.server, this.name, null, null));
			new_li.addEventListener("click", this.target.insertNicknameToInput.bind(this.target, newnickname));
		}

		this.li = new_li;
	}
}
NickApp.User.prototype.destroy = function () {
	if (this.li) {
		this.li.parentNode.removeChild(this.li);
	}

	delete this;
}


NickApp.PrivateDiscussion = function (app, server, nickname) {
	console.log("Creating a new PrivateDiscussion");
	
	this.app = app;
	this.server = server;

	this.name = nickname;

	this.user = new NickApp.User(this.app, this.server, this, nickname);

	this.tab = document.createElement("li");
	this.tab.className = "tab private-discussion";
	this.tab.textContent = this.name;
	this.tab.dataset.serverName = this.server.name;
	this.tab.dataset.userName = this.name;
	this.tab.addEventListener("click", this.app.showTab.bind(this.app, this), false);
	this.app.elems.irc_tabs.appendChild(this.tab);

	this.close_button = document.createElement("span");
	this.close_button.className = "tab-close-button";
	this.close_button.textContent = "×";
	this.close_button.addEventListener("click", this.destroy.bind(this), false);
	this.tab.appendChild(this.close_button);

	this.tab_content = document.createElement("div");
	this.tab_content.className = "irc-tab-content private-discussion";
	this.tab_content.dataset.serverName = this.server.name;
	this.tab_content.dataset.userName = this.name;
	this.app.elems.irc_tabs_contents.appendChild(this.tab_content);

	this.tab_content_list = document.createElement("ol");
	this.tab_content_list.className = "irc-tab-content-list";
	this.tab_content_list.reversed = true;
	this.tab_content.appendChild(this.tab_content_list);

	this.tab_content_input = document.createElement("input");
	this.tab_content_input.type = "text";
	this.tab_content_input.className = "irc-tab-content-input";
	this.tab_content_input.addEventListener("keyup", this.app.onContentInputKeyUp.bind(this.app, this.server, this, this.tab_content_input), false);
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

	if (index > 0) {
		this.app.showTab(this.server.discussions[index-1]);
	}
	else if (this.server.discussions[index]) {
		this.app.showTab(this.server.discussions[index]);
	}
	else {
		this.app.showTab(this.server);
	}

	if (event) {
		event.stopPropagation();
	}

	delete this;
}
NickApp.PrivateDiscussion.prototype.onMessage = function (nickname, text, message) {
	var item = this.addMessage(text, "private-message", nickname == this.server.temp_nickname ? this.server.current_user : this.user);

	this.app.processMessageContent(item);

	this.app.main_window.requestAttention(true);

	return this;
}
NickApp.PrivateDiscussion.prototype.addMessage = function (content, type, author) {
	var now = new Date();
	
	var shouldRefreshScroll = this.tab_content_list.scrollTop === this.tab_content_list.scrollHeight - this.tab_content_list.clientHeight;

	var item = document.createElement("li");

	item.className = type;
	item.innerText = content;
	item.dataset.date = now.toIRCformat();
	if (author) {
		item.dataset.author = author.name;
		item.style.color = author.color;
	}

	this.tab_content_list.appendChild(item);
	
	if (!this.tab.classList.contains("active")) {
		this.tab.classList.add("has-unread");
	}
	else if(shouldRefreshScroll) {
		this.refreshScroll();
	}

	return item;
}
NickApp.PrivateDiscussion.prototype.resetUnread = function () {
	this.tab.classList.remove("has-unread");
}
NickApp.PrivateDiscussion.prototype.refreshScroll = function () {
	this.tab_content_list.scrollTop = this.tab_content_list.scrollHeight - this.tab_content_list.clientHeight;
}

var app = new NickApp();
