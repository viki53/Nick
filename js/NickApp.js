
NickApp = function () {
	console.log("Creating a new App", arguments);

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
	// this.config_file = 'js/config-sample.json';

	this.config = {};

	this.servers = [];

	this.loadConfig();

	console.log("Loaded config", this.config);

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
	nickname: "user" + ("" + Date.now()).substring(-5),
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
				console.error("Config file not readable", conf);
				this.config = this.defaultConfig;
				return;
			}

			var config = JSON.parse(conf);

			if (!config) {
				console.error("Config file could not be parsed", conf);
				this.config = this.defaultConfig;
			}
			this.config = config;
		}
		catch(e) {
			console.error(e);
			return false;
		}
	}
	else {
		console.error("Config file not found");
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

	return fs.writeFileSync(this.config_file, JSON.stringify(this.config, null, "\t"), { encoding: "utf8", flag: "w" });
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
