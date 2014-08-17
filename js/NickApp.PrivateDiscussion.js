
NickApp.PrivateDiscussion = function (app, server, nickname) {
	console.log("Creating a new PrivateDiscussion", arguments);
	
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
