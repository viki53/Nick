
NickApp.Channel = function (app, name, server) {
	console.log("Creating a new Channel", arguments);

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
	this.tab_content_input.addEventListener("keyup", this.onContentInputKeyUp.bind(this, this.tab_content_input), false);
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

NickApp.Channel.prototype.onContentInputKeyUp = function (elem, event) {
	if (event.which === 13) {
		if (elem.value.trim()) {

			if (elem.value.match(/^\/join/)) {
				this.server.joinNewChannel(elem.value.substring(5).trim());
				elem.value = "";
				return;
			}
			else if (elem.value.match(/^\/nick/)) {
				var newnickname = elem.value.substring(5).trim();
				this.server.client.send("NICK", newnickname);

				this.onUserNickChange(this.server.temp_nickname, newnickname);

				elem.value = "";
				return;
			}
			else if (elem.value.match(/^\/color/)) {
				var nickname = elem.value.substring(6).trim();

				if (nickname) {
					var user = this.app.filter(this.users, { name : nickname }, true);

					if (user) {
						user.resetColor();
					}
				}
				else {
					this.users.forEach(function (user) {
						user.resetColor();
					}, this);
				}

				elem.value = "";
				return;
			}

			this.server.client.say(this.name, elem.value);

			this.onMessage(this.server.temp_nickname, elem.value);

			elem.value = "";
		}
	}
}