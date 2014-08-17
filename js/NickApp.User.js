
NickApp.User = function (app, server, target, name, role) {
	console.log("Creating a new User", arguments);
	
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
