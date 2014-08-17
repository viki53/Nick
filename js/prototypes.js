
Number.prototype.pad = function () {
	if ( this < 10 ) {
		return '0' + this;
	}
	return this;
}

Date.prototype.toIRCformat = function() {
	return /*this.getFullYear().pad() + "-" + (this.getMonth() + 1).pad() + "-" + this.getDate().pad() + " " + */this.getHours().pad() + ":" + this.getMinutes().pad() + ":" + this.getSeconds().pad();
}
