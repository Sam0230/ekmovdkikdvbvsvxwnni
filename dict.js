(function () {
	"use strict";
	let dict = JSON.parse(require("zlib").brotliDecompressSync(require("fs").readFileSync("oxford-adv-eng-chs-dict-9.json.br")).toString());
	//let dict = global.dict;
	let selbyn = function (obj, n) {
		if (!obj) {
			return [];
		}
		let ret = [];
		for (let i of obj) {
			if (i?.n == n) {
				ret.push(i);
			}
		}
		return ret;
	}
	let fstbyn = function (obj, n) {
		if (!obj) {
			return undefined;
		}
		for (let i of obj) {
			if (i?.n == n) {
				return i;
			}
		}
	}
	let query = function (dict, keyword) {
		let ret = [];
		let n = 0;
		if (dict?.e?.[0]?.e)  for (let i of dict.e[0].e) {
			if (i?.e)  for (let j of i?.e) {
				if (j?.n === "d:index") {
					if (j?.a?.["d:value"] === keyword) {
						ret.push([i, String(i?.a?.["d:title"])]);
					}
				}
			}
		}
		return ret;
	};
	let readText = function (o) {
		let ret = "";
		if (o?.t) {
			ret += o.t;
		}
		if (o?.e instanceof Array) {
			for (let i of o?.e) {
				ret += readText(i);
			}
		}
		return ret;
	};
	let findPOS = function (o) {
		if (o?.n == "div" && o?.a?.class == "cixing_part") {
			return [o?.a?.id];
		}
		let ret = [];
		if (o?.n == "pos") {
			ret.push(readText(o));
		}
		if (o?.e instanceof Array) {
			for (let i of o?.e) {
				ret = ret.concat(findPOS(i));
			}
		}
		return ret;
	};
	let findVP = function (o) {
		let ret = [];
		if (o?.n == "vp-g") {
			ret.push(o?.a?.form);
		}
		if (o?.e instanceof Array) {
			for (let i of o?.e) {
				ret = ret.concat(findVP(i));
			}
		}
		return ret;
	};
	let findPL = function (o) {
		let ret = [];
		if (o?.n == "form") {
			ret.push(readText(o));
		}
		if (o?.e instanceof Array) {
			for (let i of o?.e) {
				ret = ret.concat(findPL(i));
			}
		}
		return ret;
	};
	let queryPron = function (o, parent, parent2) {
		let ret = [];
		for (let Ae0e7d3d7 = true; Ae0e7d3d7;) {
			if (o?.n == "pron" || o?.n == "pron-gs") {
				let bre, name;
				if (o?.e)  for (let i of o?.e) {
					if (fstbyn(i?.e, "brelabel")) {
						bre = readText(fstbyn(fstbyn(fstbyn(fstbyn(fstbyn(fstbyn(i?.e, "a")?.e, "audio-gb")?.e, "pron-g")?.e, "a")?.e, "phon-blk")?.e, "phon"));
					}
					if (fstbyn(i?.e, "namelabel")) {
						name = readText(fstbyn(fstbyn(fstbyn(fstbyn(fstbyn(fstbyn(i?.e, "a")?.e, "audio-us")?.e, "pron-g")?.e, "a")?.e, "phon-blk")?.e, "phon"));
					}
				}
				let word = o?.a?.wd, pos, trans;
				for (let posfs of [o, parent, parent2]) {
					trans = [null];
					pos = findPOS(posfs);
					if (pos.length > 1) {
						ret.push([bre, name, word, "ERROR", trans]);
						Ae0e7d3d7 = false;
						break;
					}
					if (pos.length) {
						ret.push([bre, name, word, pos[0], trans[0]]);
						Ae0e7d3d7 = false;
						break;
					}
					trans = findVP(posfs);
					if (trans.length > 1) {
						ret.push([bre, name, word, pos[0], "ERROR"]);
						Ae0e7d3d7 = false;
						break;
					}
					if (trans.length) {
						ret.push([bre, name, word, "verb", trans[0]]);
						Ae0e7d3d7 = false;
						break;
					}
					trans = findPL(posfs);
					if (trans.length > 1) {
						ret.push([bre, name, word, pos[0], "ERROR"]);
						Ae0e7d3d7 = false;
						break;
					}
					if (trans.length) {
						ret.push([bre, name, word, "noun", trans[0]]);
						Ae0e7d3d7 = false;
						break;
					}
				}
				if (!Ae0e7d3d7) {
					break;
				}
				ret.push([bre, name, word, null, null]);
				Ae0e7d3d7 = false;
				break;
			}
			break;
		}
		if (o?.e instanceof Array) {
			for (let i of o?.e) {
				ret = ret.concat(queryPron(i, o, parent));
			}
		}
		return ret;
	};
	module.exports.dict = dict;
	module.exports.query = query;
	module.exports.queryPron = queryPron;
	dict = module.exports;
	//let e = dict.query(dict.dict, "maxima");
	//console.log(JSON.stringify(e[0][0],4,4));
	//console.log(dict.queryPron(e[0][0]));
})();