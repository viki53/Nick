
NickApp.Server = function (app, hostname, nickname, channels_names) {
	console.log("Creating a new Server", arguments);

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
