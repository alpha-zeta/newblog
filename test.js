let arr = [
	[
		1,
		2
	],
	[
		3,
		5
	],
	[
		6,
		2
	],
	[
		7,
		5
	],
	[
		11,
		2
	],
	[
		1,
		5
	],
	[
		6,
		5
	],
	[
		11,
		5
	],
	[
		7,
		2
	],
	[
		3,
		2
	]
];
let v = 0,
	Result = null;
let x1 = [],
	x2 = [],
	x3 = [],
	x4 = [];
arr.forEach((obj1) => {
	x1 = obj1;
	arr.forEach((obj) => {
		if (x1[1] == obj[1] && x1 != obj) {
			if (x3.length == 0) {
				x3 = obj;
			} else if (x3.length != 0 && Math.abs(x1[0] - x3[0]) > Math.abs(x1[0] - obj[0])) {
				x3 = obj;
			}
		}
		if (x1[0] == obj[0] && x1 != obj) {
			if (x4.length == 0) {
				x4 = obj;
			} else if (x4.length != 0 && Math.abs(x1[1] - x4[1]) > Math.abs(x1[1] - obj[1])) {
				x4 = obj;
			}
		}
	});
	arr.forEach((obj) => {
		if (obj[0] == x3[0] && obj[1] == x4[1]) {
			x2 = obj;
		}
	});
	if (x2.length == 0 || x3.length == 0 || x4.length == 0 || x1.length == 0) {
		console.log('no combination possible in this way');
	} else if (x2.length != 0) {
		if (!Result) {
			Result = Math.abs((x1[1] - x4[1]) * (x1[0] - x3[0]));
		} else if (Result > Math.abs((x1[1] - x4[1]) * (x1[0] - x3[0]))) {
			Result = Math.abs((x1[1] - x4[1]) * (x1[0] - x3[0]));
		}
	}
	(x1 = []), (x2 = []), (x3 = []), (x4 = []);
});
console.log('the smallest area is:', Result);
