let a = JSON.parse(require("fs").readFileSync(process.argv[2]).toString()), b = [];
for (let i of a) {
	b = b.concat(i);
}
let saveList = async function (list, file) {
	let s = "";
	for (let i of list) {
		s += JSON.stringify(i) + ",\n";
	}
	s = s.slice(0, -2);
	require("fs").writeFileSync(file, s);
};
saveList(b, process.argv[3])