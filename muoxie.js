"use strict";

(async function () {
	let fs = require("fs");
	let readline = require("readline");
	let util = require("util");
	let stringWidth = require("string-width"); // 4.2.2
	let terminal = require("terminal-kit").terminal;
	let promisify = function (f, self, args) {
		args = Array.from(args);
		return new Promise(function (resolve, reject) {
			let existCallback = false;
			for (let i = 0; i < args.length; i++) {
				if (args[i] === promisify.callback) {
					existCallback = true;
					args[i] = function () {
						resolve(arguments);
					};
				}
			}
			if (!existCallback) {
				args.push(function () {
					resolve(arguments);
				});
			}
			try {
				f.apply(self, args);
			} catch (e) {
				reject(e);
			}
		});
	};
	let input = function (prompt) {
		if (arguments.length) {
			process.stdout.write(prompt);
		}
		return new Promise(function (resolve) {
			let rlInterface = readline.createInterface({
				input: process.stdin
			});
			rlInterface.on("line", function (str) {
				rlInterface.close();
				resolve(str);
			});
		});
	};
	Object.defineProperty(Array.prototype, "len", {
		get: function () {
			return this.length;
		}
	});
	Object.defineProperty(arguments.__proto__, "len", {
		get: function () {
			return this.length;
		}
	});
	Object.defineProperty(Array.prototype, "last", {
		get: function () {
			return this[this.length - 1];
		}
	});
	let range = function range(start = 0, stop, step = 1) {
		if (arguments.len === 1) {
			stop = start;
			start = 0;
		}
		return {
			[Symbol.iterator]() {
				let current = start;
				return {
					next: function () {
						let ret;
						if (current < stop) {
							ret = {
								value: current,
								done: false
							}
						} else {
							ret = {
								value: undefined,
								done: true
							}
						}
						current += step;
						return ret;
					}
				};
			}
		};
	};
	let print = function (...args) {
		let temp;
		for (let i in args) {
			temp = args[i];
			if (temp instanceof Buffer) {
				let binary = false;
				for (let i of temp) {
					if (i > 127) {
						binary = true;
						break;
					}
				}
				if (binary) {
					temp = temp.toString("hex");
				} else {
					temp = temp.toString();
				}
				temp = "Buffer[" + temp + "]"
			}
			if (typeof (temp) === "string" || typeof (temp) === "number" || (temp instanceof Number) || (temp instanceof String)) {
				temp = temp.toString();
			} else {
				try {
					temp = JSON.stringify(temp, null, 4);
				} catch (e) {
					temp = temp.toString();
				}
			}
			args[i] = temp;
		}
		console.log.apply(console, args);
	};
	let sleep = function (n) {
		return new Promise(function (resolve) {
			setTimeout(resolve, n);
		});
	};
	String.prototype.format = function (...args) {
		args.unshift(String(this));
		return util.format.apply(util, args);
	};
	RegExp.escape = function (string) {
		return string.toString().replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
	};
	if (!String.prototype.replaceAll) {
		String.prototype.replaceAll = function (substr, newSubstr) {
			if (substr instanceof RegExp) {
				if (!substr.global) {
					throw (new TypeError("replaceAll must be called with a global RegExp"));
				}
				return String(this).replace(substr, newSubstr);
			}
			return String(this).replace(new RegExp(RegExp.escape(substr), "g"), newSubstr);
		};
	}
	let str = String;
	let num = Number;
	let base64 = function (n) {
		return Buffer.from(n).toString("base64");
	};
	let debase64 = function (n) {
		return Buffer.from(n, "base64").toString();
	};
	let alginFloat = function (n, after) {
		return Math.round(n * (10 ** after)) / (10 ** after);
	};
	let alginNumber = function (n, before, after) {
		n = String(alginFloat(n, after)).split(".");
		while (n[0].len < before) {
			n[0] = " " + n[0];
		}
		if (after === 0) {
			return n[0];
		}
		if (n.len === 1) {
			n[1] = "0";
		}
		while (n[1].len < after) {
			n[1] += "0";
		}
		return n.join(".");
	};
	let alginString = function (n, length, whiteSpace = " ", wSLen = whiteSpace.length, rightAlgin = false, truncateFromLeft = false) {
		n = str(n);
		let truncated = false
		while (stringWidth(n) > length) {
			truncated = true;
			if (truncateFromLeft) {
				n = n.slice(1);
			} else {
				n = n.slice(0, -1);
			}
		}
		if (truncated) {
			rightAlgin = truncateFromLeft;
		}
		for (let i of range((length - stringWidth(n)) / wSLen)) {
			if (rightAlgin) {
				n = whiteSpace + n;
			} else {
				n = n + whiteSpace;
			}
		}
		return n;
	};
	let Pending = class Pending {
		constructor(n = 1) {
			let self = this;
			this.counter = n;
			let resolve;
			this.promise = new Promise(function (r) {
				resolve = r;
			});
			self.promise.resolve = resolve;
			if (n <= 0) {
				resolve();
			}
		};
		resolve(n = 1) {
			this.counter -= n;
			if (this.counter <= 0) {
				this.promise.resolve();
			}
		};
		resolveAll(value) {
			self.promise.resolve(value);
		};
	};
	let Session = function (session, maxConnection = 64) {
		let queue = [], connection = 0;
		let ret = async function (url, options = {}) {
			if (connection > maxConnection) {
				queue.push(new Pending());
				await queue.last.promise;
			}
			if (!options.timeout) {
				options.timeout = 5000;
			}
			options.time = true;
			if (!options.stream) {
				connection++;
				let result = await promisify(session, this, [url, options]);
				connection--;
				if (queue.length) {
					queue.shift().resolve();
				}
				if (result[0]) {
					return [result[0], undefined];
				}
				if (result[1].statusCode >= 400) {
					let error = new Error("HTTP(S) request error " + result[1].statusCode + ": " + result[1].statusMessage);
					error.statusMessage = result[1].statusMessage;
					error.statusCode = result[1].statusCode;
					error.response = result[1];
					error.body = result[2];
					return [error, undefined];
				}
				if (options.parseJSON) {
					try {
						result[2] = JSON.parse(result[2]);
					} catch (e) {
						return [e, undefined];
					}
				}
				return [false, result[2]];
			} else {
				let origConnection = connection;
				try {
					connection++;
					let stream = session(url, options);
					stream.on("close", function () {
						connection--;
					});
					return [false, stream];
				} catch (e) {
					connection = origConnection;
					return [e, undefined];
				}
			}
		};
		return ret;
	};
	Math.average = function (array) {
		let ret = 0;
		for (let i of array) {
			ret += i;
		}
		return ret / array.len;
	};
	Array.prototype.repeat = function (n) {
		let ret = [];
		for (let i of range(n)) {
			ret = ret.concat(this);
		}
		return ret;
	};
	String.prototype.beginWith = function (n) {
		n = str(n);
		return (this.slice(0, n.len) === n);
	};
	String.prototype.endWith = function (n) {
		n = str(n);
		return (this.slice(-n.len) === n);
	};
	let clear = async function () {
		await new Promise((resolve) => { require("child_process").spawn("clear", [], { stdio: "inherit" }).once("exit", resolve); });
	};
	process.stdout.setDefaultEncoding("utf8");

	(async function main() {
		let db = [null, null, null, JSON.parse(fs.readFileSync("xgn4.json").toString())], vol = process.argv[3], les = process.argv[4];
		let dspWd = function (wd, n, m = 3) {
			terminal(((arguments.length < 2) ? ("") : (alginString(n, m, " ", 1))) + alginString(str(wd[0]).replaceAll("^", "^^") + "  ", 20, "^K.", 1) + "^:  ");
			let f = true;
			for (let i of wd[1]) {
				if (!f) {
					terminal(alginString("  |  ", 20, "^K.", 1) + "^:  ");
				} else {
					f = false;
				}
				terminal(alginString(str(i[0]).replaceAll("^", "^^"), 4) + alginString("/" + str(i[1][1]).replaceAll("^", "^^") + "/  ", 20, "^K.", 1) + "^:  " + str(i[2]).replaceAll("^", "^^") + "^:\n");
			}
		};
		if (process.argv[2] === "0") {
			terminal.clear();
			print("Lesson " + les);
			for (let i of range(db[vol][les].len)) {
				dspWd(db[vol][les][i], i);
			}
		} else {
			let Alist = [], Blist = [];
			for (let i of db[vol][les]) {
				Alist.push(i);
				i.qwe = 0;
			}
			let AB, list, wd, keepWd = false;
			let ptList = function (list) {
				for (let i of list) {
					print(i[0], i[1][0][0]);
				}
			}
			while (Alist.length || Blist.length) {
				terminal.clear();
				if (!keepWd) {
					AB = ((Math.random() > 0.1 && Alist.length || !Blist.length) && !(Alist.length === 1 && Blist.length > 1) || (Alist.length >= 1 && Blist.length === 1));
					list = (AB) ? (Alist) : (Blist);
					wd = Math.floor(Math.random() * (list.length - 1));
				} else {
					list = (AB) ? (Alist) : (Blist);
					wd = list.length - 1;
				}
				keepWd = false;
				for (let i of list[wd][1]) {
					print("     " + alginString(i[0], 4) + i[2]);
				}
				let ans = await input("> ");
				if (ans.beginWith(">")) {
					ans = ans.slice(1).split(" ");
					if (ans[0] === "ign") {
						list.splice(wd, 1);
					}
				} else {
					list.push(list.splice(wd, 1)[0]);
					wd = list.length - 1;
					if (ans !== list[wd][0]) {
						dspWd(list[wd], "^rWA:^:", 8);
						list[wd].qwe = 0;
						Alist.push(list.splice(wd, 1)[0]);
						AB = true;
						keepWd = true;
						await input();
					} else {
						if (AB && ++list[wd].qwe == 2) {
							list[wd].qwe = 0;
							Blist.push(list.splice(wd, 1)[0]);
						}
						if (!AB && ++list[wd].qwe == 1) {
							list.splice(wd, 1);
						}
					}
				}
			}
			terminal.clear();
		}
	})();
})();