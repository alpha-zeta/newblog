//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const _ = require('lodash');
const he = require('he');
const time = require(__dirname + '/time.js');
const date = require(__dirname + '/date.js');
const https = require('https');
const request = require('request');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const upload = require('express-fileupload');
const flash = require('express-flash');
let k = 1;
let arr = [];

//app setup
const app = express();
app.use(upload());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.set('view engine', 'ejs');

//setting up express-session
app.use(
	session({
		secret            : process.env.SECRET,
		resave            : false,
		saveUninitialized : false
	})
);

//setting up passport.js
app.use(passport.initialize());
app.use(passport.session());
//mongoose setup
mongoose.connect(process.env.DB_LINK, {
	useFindAndModify   : false,
	useUnifiedTopology : true,
	useNewUrlParser    : true
});
mongoose.set('useCreateIndex', true);
// //change
// conn.once('open', function() {
// 	let gfs = Grid(conn.db, mongoose.mongo);
// 	gfs.collection('uploads');
// });
// //storage engine
// var storage = new GridFsStorage({
// 	url  : process.env.DB_LINK,
// 	file : (req, file) => {
// 		return new Promise((resolve, reject) => {
// 			crypto.randomBytes(16, (err, buf) => {
// 				if (err) {
// 					return reject(err);
// 				}
// 				const filename = buf.toString('hex') + path.extname(file.originalname);
// 				const fileInfo = {
// 					filename   : filename,
// 					bucketName : 'uploads'
// 				};
// 				resolve(fileInfo);
// 			});
// 		});
// 	}
// });
// const uploads = multer({ storage });

//Users schema
const usersSchema = new mongoose.Schema({
	email          : String,
	password       : String,
	googleId       : String,
	name           : String,
	profilePicLink : String,
	info           : String,
	gender         : String,
	age            : Number,
	status         : Number,
	block          : Boolean,
	facebookId     : String,
	twitterId      : String
});
usersSchema.plugin(passportLocalMongoose); //passport-local-mongoose setup
usersSchema.plugin(findOrCreate);

const User = new mongoose.model('User', usersSchema);

// passport.use(
// 	new LocalStrategy(function(username, password, done) {
// 		User.findOne({ username: username }, function(err, user) {
// 			if (err) {
// 				return done(err);
// 			}
// 			if (!user) {
// 				return done(null, false, { message: 'Incorrect username.' });
// 			}
// 			if (!user.validPassword(password)) {
// 				return done(null, false, { message: 'Incorrect password.' });
// 			}
// 			return done(null, user);
// 		});
// 	})
// );
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});
app.use(flash());
passport.use(
	new GoogleStrategy(
		{
			clientID       : process.env.CLIENT_ID,
			clientSecret   : process.env.CLIENT_SECRET,
			callbackURL    : 'https://safe-citadel-21836.herokuapp.com/auth/google/about',
			userProfileURL : 'https://www.googleapis.com/oauth2/v3/userinfo'
		},
		function(accessToken, refreshToken, profile, cb) {
			User.findOrCreate({ googleId: profile.id }, function(err, user) {
				if (!user.name) {
					user.name = profile.displayName;
					user.profilePicLink = profile._json.picture;
					user.email = profile._json.email;
					user.status = process.env.USER;
					user.block = false;
					user.save();
				}
				if (user.profilePicLink != profile._json.picture) {
					user.profilePicLink = profile._json.picture;
					user.save();
				}
				return cb(err, user);
			});
		}
	)
);
passport.use(
	new FacebookStrategy(
		{
			clientID      : process.env.FB_APP_ID,
			clientSecret  : process.env.FB_SECRET,
			callbackURL   : 'https://safe-citadel-21836.herokuapp.com/auth/facebook/about',
			profileFields : [
				'email',
				'name',
				'displayName',
				'picture'
			]
		},
		function(accessToken, refreshToken, profile, done) {
			console.log(profile);
			User.findOrCreate({ facebookId: profile.id }, function(err, user) {
				if (err) {
					return done(err);
				}
				if (!user.name) {
					user.name = profile.displayName;
					user.profilePicLink = profile.photos[0].value;
					user.status = process.env.USER;
					user.block = false;
					user.facebookId = profile.id;
					if (!profile._json.email) {
						user.username = profile._json.last_name + '@youcite.com';
					} else {
						user.username = profile._json.email;
					}
					if (!profile._json.email) {
						user.email = profile._json.last_name + '@youcite.com';
					} else {
						user.email = profile._json.email;
					}
					user.save();
				}
				if (user.profilePicLink != profile.photos[0].value) {
					user.profilePicLink = profile.photos[0].value;
					user.save();
				}
				done(null, user);
			});
		}
	)
);
passport.use(
	new TwitterStrategy(
		{
			consumerKey    : process.env.TW_APP_ID,
			consumerSecret : process.env.TW_SECRET,
			callbackURL    : 'https://safe-citadel-21836.herokuapp.com/auth/twitter/about'
		},
		function(token, tokenSecret, profile, done) {
			User.findOrCreate({ twitterId: profile.id }, function(err, user) {
				if (err) {
					return done(err);
				}
				if (!user.name) {
					user.name = profile.displayName;
					user.profilePicLink = profile.photos[0].value;
					user.status = process.env.USER;
					user.block = false;
					user.twitterId = profile.id;
					if (!profile._json.email) {
						user.username = profile._json.last_name + '@youcite.com';
					} else {
						user.username = profile._json.email;
					}
					if (!profile._json.email) {
						user.email = profile._json.last_name + '@youcite.com';
					} else {
						user.email = profile._json.email;
					}
					user.save();
				}
				if (user.profilePicLink != profile.photos[0].value) {
					user.profilePicLink = profile.photos[0].value;
					user.save();
				}
				done(null, user);
			});
		}
	)
);
//id schema
const linksSchema = new mongoose.Schema({
	link : Number
});
const Link = new mongoose.model('Identity', linksSchema);
//uncomment link.save() after dropping the DB to initialise indentities collection

const link = Link({
	link : 1
});
// link.save();

//reply schema
const repliesSchema = new mongoose.Schema({
	linkID  : Number,
	replier : String,
	reply   : String,
	comDate : String,
	comTime : String
});
const Reply = new mongoose.model('Reply', repliesSchema);

//comments collection creation
const commentsSchema = new mongoose.Schema({
	linkID        : Number,
	commentator   : String,
	commentatorID : String,
	comment       : String,
	reply         : Array,
	comDate       : String,
	comTime       : String
});
const Comment = new mongoose.model('Comment', commentsSchema);

//notes collection creation
const notesSchema = new mongoose.Schema({
	linkID        : Number,
	type          : String,
	heading       : String,
	content       : String,
	date          : String,
	time          : String,
	thumbnailLink : String,
	about         : String,
	comments      : Array,
	userID        : String,
	tags          : Array,
	likes         : Array,
	dislikes      : Array,
	views_ip      : Array,
	views_signed  : Array,
	show          : Number
});
const Note = new mongoose.model('Note', notesSchema);

//users
//registration
app
	.route('/register')
	.get(function(req, res) {
		const user = req.user;
		let v = 0;
		if (user && user.status == process.env.ADMIN) {
			v = 1;
		}
		res.render('register', {
			user   : user,
			error  : [],
			status : v
		});
	})
	.post(function(req, res) {
		let errors = [];
		const user = req.user;
		let v = 0;
		if (user && user.status == process.env.ADMIN) {
			v = 1;
		}
		const email = req.body.username;
		const pass1 = req.body.password;
		const pass2 = req.body.password2;
		const passStat = req.body.passStat;
		if (passStat === 'Weak') {
			errors.push({
				msg : 'The password is too weak, try adding special chars, numbers, Upper & lower case chars'
			});
		}
		if (!email || !pass1 || !pass2) {
			errors.push({ msg: 'Enter all the deatails!' });
		}
		if (pass1 != pass2) {
			errors.push({ msg: "Ohh..the passwords don't match, enter carefully!" });
		}
		if (pass1.length < 8) {
			errors.push({ msg: 'Hey, your password is short put at least 8 characters!' });
		}
		User.register({ username: req.body.username }, req.body.password, function(err, user) {
			if (err) {
				errors.push({ msg: err.message });
				res.render('register', {
					user   : req.user,
					status : v,
					error  : errors
				});
			} else if (errors.length > 0) {
				res.render('register', {
					user   : req.user,
					status : v,
					error  : errors
				});
			} else {
				passport.authenticate('local')(req, res, function() {
					user.email = req.body.username;
					user.status = process.env.USER;
					user.block = false;
					user.save();
					res.redirect('/userinfo/about');
				});
			}
		});
	});
app.get('/users', function(req, res) {
	res.redirect('/users/' + req.user._id);
});
//Login
app
	.route('/login')
	.get(function(req, res) {
		const user = req.user;
		let v = 0;
		if (user && user.status == process.env.ADMIN) {
			v = 1;
		}
		res.render('login', {
			user   : user,
			status : v
		});
	})
	.post(function(req, res, next) {
		const email = req.body.username;
		const pass1 = req.body.password;
		let errors = [];
		const user = new User({
			username : req.body.username,
			password : req.body.password
		});
		User.findOne({ username: email }, function(err, doc) {
			if (err) {
				console.log(err);
			} else if (doc) {
				if (doc.status != process.env.ADMIN) {
					req.login(user, function(err) {
						if (err) {
							console.log(err);
						} else {
							passport.authenticate('local', {
								failureRedirect : '/login',
								failureFlash    : true,
								failureMessage  : 'wrong username or password'
							})(req, res, function(err) {
								if (err) {
									console.log(err);
									res.redirect('/login');
								} else {
									res.redirect('/users/' + user._id);
								}
							});
						}
					});
				} else {
					res.redirect('/login');
				}
			} else if (!doc) {
				res.redirect('/login');
			}
		});
	});

//google login
app.get(
	'/auth/google',
	passport.authenticate('google', {
		scope : [
			'profile',
			'email'
		]
	})
);
app.get(
	'/auth/facebook',
	passport.authenticate('facebook', {
		scope : [
			'public_profile',
			'email'
		]
	})
);
app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/google/about', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
	if (!req.user.info) {
		res.redirect('/userinfo/about');
	} else {
		res.redirect('/users/' + req.user._id);
	}
});

app.get(
	'/auth/facebook/about',
	passport.authenticate('facebook', {
		failureRedirect : '/login'
	}),
	function(req, res) {
		if (!req.user.info) {
			res.redirect('/userinfo/about');
		} else {
			res.redirect('/users/' + req.user._id);
		}
	}
);
app.get(
	'/auth/twitter/about',
	passport.authenticate('twitter', {
		failureRedirect : '/login'
	}),
	function(req, res) {
		if (!req.user.info) {
			res.redirect('/userinfo/about');
		} else {
			res.redirect('/users/' + req.user._id);
		}
	}
);

//logout
app.get('/logout', function(req, res) {
	if (req.isAuthenticated()) {
		req.logout();
		res.redirect('/');
	} else {
		res.redirect('/');
	}
});
//User profile page
app.route('/users/:postID').get(function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	Note.find({ userID: req.user._id }, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			res.render('user', {
				array  : doc,
				user   : user,
				status : v
			});
		}
	});
});
//userinfo
app
	.route('/userinfo/about')
	.get(function(req, res) {
		const user = req.user;
		let v = 0;
		if (user && user.status == process.env.ADMIN) {
			v = 1;
		}
		res.render('info', {
			user   : user,
			status : v
		});
	})
	.post(function(req, res) {
		const info = req.body.info;
		const name = req.body.name;
		const gender = req.body.gender;
		const age = req.body.age;
		req.user.gender = gender;
		req.user.info = info;
		req.user.name = name;
		req.user.age = age;
		req.user.save();
		res.redirect('/users');
	});
//profile pic change
app.get('/upload/images', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	res.render('image', {
		user   : user,
		status : v
	});
});
app.post('/upload', function(req, res) {
	const file = req.files;
	console.log(req.files);
	res.json(file);
});
//viewuser
app.get('/viewuser/:postID', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	const id = req.params.postID;
	if (user && id == user._id) {
		res.redirect('/users/' + id);
	} else if (!user || id != user._id) {
		User.findOne({ _id: id }, function(err, docu) {
			if (err) {
				console.log(err);
			} else {
				Note.find({ userID: id }, function(err, doc) {
					if (err) {
						console.log(err);
					} else {
						res.render('viewuser', {
							array  : doc,
							user   : user,
							author : docu,
							status : v
						});
					}
				});
			}
		});
	}
});
//Admin page
app.get('/admin/login', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	res.render('Adminlogin', {
		user   : user,
		status : v
	});
});
app.post('/admin/login', function(req, res) {
	const email = req.body.username;
	const pass1 = req.body.password;
	let errors = [];
	let x = '' + he.decode(req.body.key);
	let y = 0;
	const user = new User({
		username : req.body.username,
		password : req.body.password
	});
	User.findOne({ username: email }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (doc) {
			y = parseInt(doc.status);
			if (x === '' + process.env.CHABI && y == process.env.ADMIN) {
				req.login(user, function(err) {
					if (err) {
						console.log(err);
					} else {
						passport.authenticate('local', {
							failureFlash    : true,
							failureMessage  : 'Incorrect email or password.',
							failureRedirect : '/admin/login'
						})(req, res, function(err) {
							if (err) {
								console.log(err);
								res.redirect('/admin/login');
							} else {
								res.redirect('/admin/' + user._id);
							}
						});
					}
				});
			} else {
				res.redirect('/admin/login');
			}
		}
	});
});
app.get('/admin/:postID', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	Note.find({ userID: req.user._id }, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			res.render('Admin', {
				array  : doc,
				user   : req.user,
				status : v
			});
		}
	});
});
app.get('/lists', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	if (v == 1) {
		User.find({}, function(err, docs) {
			if (err) {
				console.log(err);
			} else if (docs) {
				res.render('adminList', {
					list   : docs,
					user   : user,
					status : v
				});
			} else if (!docs) {
				res.redirect('/admin/' + user._id);
			}
		});
	} else {
		res.redirect('/');
	}
});
app.post('/lists', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	const search = req.body.search;
	res.redirect('/lists/searchresult/' + search);
});
app.get('/lists/searchresult/:postID', function(req, res) {
	const user = req.user;
	const search = he.decode(req.params.postID);
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	if (v == 1) {
		User.find({ name: search }, function(err, doc) {
			if (err) {
				console.log(err);
				res.redirect('/lists');
			} else if (doc) {
				res.render('searchResult', {
					user   : user,
					status : v,
					query  : doc
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

//block/unblock
app.get('/block/:postID', function(req, res) {
	const user = req.user;
	const id = req.params.postID;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	if (v == 1) {
		User.findOneAndUpdate({ _id: id }, { block: true }, function(err, doc) {
			if (err) {
				console.log(err);
			} else if (doc) {
				res.redirect('/lists');
			} else if (!doc) {
				console.log('no doc found');
				res.redirect('/lists');
			}
		});
	}
});
app.get('/unblock/:postID', function(req, res) {
	const user = req.user;
	const id = req.params.postID;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	if (v == 1) {
		User.findOneAndUpdate({ _id: id }, { block: false }, function(err, doc) {
			if (err) {
				console.log(err);
			} else if (doc) {
				res.redirect('/lists');
			} else if (!doc) {
				console.log('no doc found');
				res.redirect('/lists');
			}
		});
	} else {
		console.log('you are not an admin');
		res.redirect('/');
	}
});
app.get('/adminview/:postID', function(req, res) {
	const id = req.params.postID;
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	if (v == 1) {
		if (user && id == user._id) {
			res.redirect('/admin/' + id);
		} else if (!user || id != user._id) {
			User.findOne({ _id: id }, function(err, docu) {
				if (err) {
					console.log(err);
				} else if (docu) {
					Note.find({ userID: id }, function(err, doc) {
						if (err) {
							console.log(err);
							res.redirect('/lists');
						} else if (doc) {
							res.render('adminUser', {
								array  : doc,
								user   : user,
								author : docu,
								status : v
							});
						} else if (!doc) {
							console.log('no document found');
							res.redirect('/lists');
						}
					});
				} else if (!docu) {
					console.log('no document found');
					res.redirect('/lists');
				}
			});
		}
	} else {
		console.log('you are not an admin');
		res.redirect('/');
	}
});
app.get('/public/:postID', function(req, res) {
	const x = he.decode(req.params.postID);
	const arr = x.split('+');
	const noteID = arr[0];
	const authID = arr[1];
	Note.findOne({ _id: noteID }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (!doc) {
			console.log('doc not found');
			res.redirect('/adminview/' + authID);
		} else if (doc) {
			if (doc.show == 1 || doc.show == 2) {
				doc.show = 3;
				doc.save();
				res.redirect('/adminview/' + authID);
			} else {
				doc.show = 2;
				doc.save();
				res.redirect('/adminview/' + authID);
			}
		}
	});
});
//edit article
app.get('/edit/:postID', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	const objID = req.params.postID;
	Note.findOne({ _id: objID }, function(err, doc) {
		if (err) {
			console.log(err);
			res.redirect('/users/' + user._id);
		} else if (!doc) {
			res.send('404 not found');
		} else if (doc) {
			res.render('editArt', {
				user   : user,
				id     : objID,
				artCol : doc,
				status : v
			});
		}
	});
});

//home
app.get('/', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	Note.find({}, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			res.render('home', {
				array  : doc,
				user   : user,
				status : v
			});
		}
	});
});

//contact
app.get('/contact', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	res.render('contact', {
		user   : user,
		status : v
	});
});

//about
app.get('/about', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	res.render('about', {
		user   : user,
		status : v
	});
});

//compose
app
	.route('/compose')
	.get(function(req, res) {
		const user = req.user;
		let v = 0;
		if (user && user.status == process.env.ADMIN) {
			v = 1;
		}
		if (req.isAuthenticated() && user.block == false) {
			Link.find({}, function(err, doc) {
				if (err) {
					console.log(err);
				} else {
					res.render('compose', {
						user   : user,
						status : v
					});
				}
			});
		} else if (req.isAuthenticated() && user.block != false) {
			res.render('block', {
				user   : user,
				status : v
			});
		} else {
			res.redirect('/login');
		}
	})
	.post(function(req, res) {
		const composed = req.body.cmp;
		const heading = req.body.head;
		const thumb = req.body.thumb;
		const abt = req.body.abt;
		const type = req.body.type;
		const author = req.user.name;
		const timeZone = req.body.timeZone;
		const user = req.user;
		let view = 0;
		if (req.body.view === 'Public') {
			view = 1;
		} else if (req.body.view === 'Private') {
			view = 2;
		}
		const userView = [];
		userView.push('' + req.user._id);
		const tags = req.body.tags;
		const arr = tags.split(',');
		for (let i = 0; i < arr.length; i++) {
			arr[i] = _.lowerCase(arr[i]);
		}
		const noteID = req.body.check;

		if (noteID === '') {
			Link.find({}, function(err, doc) {
				if (err) {
					console.log(err);
				} else {
					const linkID = doc[0].link;
					const newNote = new Note({
						linkID        : linkID,
						heading       : heading,
						content       : composed,
						date          : date(timeZone),
						time          : time(timeZone),
						thumbnailLink : thumb,
						about         : abt,
						type          : type,
						author        : author,
						userID        : req.user._id,
						tags          : arr,
						views_signed  : userView,
						show          : view
					});
					Link.findOneAndUpdate({ link: parseInt(linkID) }, { link: parseInt(linkID) + 1 }, function(
						err,
						doc
					) {
						if (err) {
							console.log(err);
						}
					});
					newNote.save(function(err) {
						if (err) {
							console.log(err);
						} else {
							res.redirect('/compose');
						}
					});
				}
			});
		} else {
			Note.findOne({ _id: noteID }, function(err, doc) {
				if (err) {
					console.log(err);
					res.redirect('/users/' + req.user._id);
				} else if (doc) {
					doc.heading = heading;
					doc.content = composed;
					doc.date = date(timeZone);
					doc.time = time(timeZone);
					doc.thumbnailLink = thumb;
					doc.about = abt;
					doc.type = type;
					doc.author = author;
					doc.userID = req.user._id;
					doc.tags = arr;
					if (doc.show != 3) {
						doc.show = view;
					}
					doc.save();
					res.redirect('/users/' + req.user._id);
				}
			});
		}
	});

//:postID
app.get('/contents/:postsID', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	const postID = he.decode(req.params.postsID);
	let x = 'black';
	let y = 'black';
	Note.findOne({ heading: postID }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (!doc) {
			res.render('post', {
				postHead    : 'Page not found',
				postContent : 'Go back to the home page!',
				imgL        : 'https://i.redd.it/t0rlgz5c1uf31.png',
				date        : '0',
				time        : '0',
				id          : '0',
				array       : [],
				objID       : 0,
				noteID      : 0,
				user        : user,
				status      : v,
				author      : 'no author',
				pic         :
					'https://img.favpng.com/7/5/8/computer-icons-font-awesome-user-font-png-favpng-YMnbqNubA7zBmfa13MK8WdWs8.jpg',
				info        : 'no info',
				authorID    : 0,
				likeArr     : [],
				dislikeArr  : [],
				likeCol     : x,
				dislikeCol  : y
			});
		} else {
			if (
				!req.user &&
				!doc.views_ip.includes(
					req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress
				)
			) {
				doc.views_ip.push(
					req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress
				);
				doc.save();
			}
			if (req.user && !doc.views_signed.includes('' + req.user._id)) {
				doc.views_signed.push(req.user._id);
				doc.save();
			}
			if (req.user) {
				if (doc.likes.includes('' + req.user._id)) {
					x = '#323edd';
				}
				if (doc.dislikes.includes('' + req.user._id)) {
					y = '#c70039';
				}
			}
			User.findOne({ _id: doc.userID }, function(err, docu) {
				if (err) {
					console.log(err);
				} else if (!docu) {
					res.render('post', {
						postHead    : 'Page not found',
						postContent : 'Go back to the home page!',
						imgL        : 'https://i.redd.it/t0rlgz5c1uf31.png',
						date        : '0',
						time        : '0',
						id          : '0',
						array       : [],
						objID       : 0,
						noteID      : 0,
						user        : user,
						status      : v,
						author      : 'no author',
						pic         :
							'https://img.favpng.com/7/5/8/computer-icons-font-awesome-user-font-png-favpng-YMnbqNubA7zBmfa13MK8WdWs8.jpg',
						info        : 'no info',
						authorID    : 0,
						likeArr     : [],
						dislikeArr  : [],
						likeCol     : x,
						dislikeCol  : y
					});
				} else if (docu) {
					res.render('post', {
						postHead    : postID,
						postContent : doc.content,
						imgL        : doc.thumbnailLink,
						date        : doc.date,
						time        : doc.time,
						id          : doc._id,
						array       : doc.comments,
						objID       : doc._id,
						noteID      : doc.linkID,
						user        : user,
						status      : v,
						author      : docu.name,
						pic         : docu.profilePicLink,
						info        : docu.info,
						authorID    : doc.userID,
						likeArr     : doc.likes,
						dislikeArr  : doc.dislikes,
						likeCol     : x,
						dislikeCol  : y
					});
				}
			});
		}
	});
});

//interactions page
//like
app.post('/like/:postID', function(req, res) {
	const noteID = req.params.postID;
	let x = 0;
	let y = 0;
	const userID = req.user._id;
	Note.findOne({ _id: noteID }, function(err, doc) {
		if (err) {
			console.log(err);
			res.redirect('/');
		} else if (doc) {
			const like = doc.likes;
			const dislike = doc.dislikes;
			if (like.includes('' + userID)) {
				x = x + 1;
			}
			if (dislike.includes('' + userID)) {
				y = y + 1;
			}
			if (x == 0 && y == 0) {
				doc.likes.push(userID);
				doc.save();
			}
			if (x == 0 && y > 0) {
				doc.likes.push(userID);
				doc.dislikes.splice(doc.dislikes.indexOf(userID), 1);
				doc.save();
			}
			if (x > 0 && y == 0) {
				doc.likes.splice(doc.likes.indexOf(userID), 1);
				doc.save();
			}
			if (x > 0 && y > 0) {
				doc.dislikes.splice(doc.dislikes.indexOf(userID), 1);
				doc.likes.splice(doc.likes.indexOf(userID), 1);
				doc.save();
			}
			res.redirect('/contents/' + doc.heading);
		}
	});
});

//dislike
app.post('/dislike/:postID', function(req, res) {
	const noteID = req.params.postID;
	let x = 0;
	let y = 0;
	const userID = req.user._id;
	Note.findOne({ _id: noteID }, function(err, doc) {
		if (err) {
			console.log(err);
			res.redirect('/');
		} else if (doc) {
			const like = doc.likes;
			const dislike = doc.dislikes;
			if (like.includes('' + userID)) {
				x = x + 1;
			}
			if (dislike.includes('' + userID)) {
				y = y + 1;
			}
			if (x == 0 && y == 0) {
				doc.dislikes.push(userID);
				doc.save();
			}
			if (x == 0 && y > 0) {
				doc.dislikes.splice(doc.dislikes.indexOf(userID), 1);
				doc.save();
			}
			if (x > 0 && y == 0) {
				doc.dislikes.push(userID);
				doc.likes.splice(doc.likes.indexOf(userID), 1);
				doc.save();
			}
			if (x > 0 && y > 0) {
				doc.dislikes.splice(doc.dislikes.indexOf(userID), 1);
				doc.likes.splice(doc.likes.indexOf(userID), 1);
				doc.save();
			}
			res.redirect('/contents/' + doc.heading);
		}
	});
});

//delete
app.post('/delete', function(req, res) {
	const ID = req.body.ID;
	const comID = req.body.comID;
	const linkID = req.body.noteID;
	const name = req.user.name;
	Note.findOneAndRemove({ _id: ID }, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			Comment.deleteMany({ linkID: linkID }, function(err) {
				if (err) {
					console.log(err);
				} else {
					Reply.deleteMany({ linkID: linkID }, function(err) {
						if (err) {
							console.log(err);
						} else {
							res.redirect('/users/' + name);
						}
					});
				}
			});
		}
	});
});

//comments
app.post('/comments', function(req, res) {
	const postId = req.param.postsId;
	const noteID = req.body.noteID;
	const authID = req.body.authID;
	const timezone = req.body.comTime;
	let commentator = req.user.name;
	if (commentator === '') {
		commentator = 'Anonymous';
	}
	const comment = req.body.comment;
	const title = req.body.titleID;
	const comID = req.body.ID;
	const newComment = new Comment({
		linkID        : noteID,
		commentator   : commentator,
		comment       : comment,
		comDate       : date(timezone),
		comTime       : time(timezone),
		commentatorID : authID
	});
	newComment.save();
	Note.findOneAndUpdate({ _id: comID }, { $push: { comments: newComment } }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (!doc) {
			res.redirect('/contents/' + title);
			alert('404 file not found');
		} else {
			res.redirect('/contents/' + title);
		}
	});
});

//replies
app.post('/reply', function(req, res) {
	const title = req.body.title;
	const comID = req.body.replyBtn;
	const replier = req.user.name;
	const reply = req.body.reply;
	const timezone = req.body.repTime;
	const objID = req.body.objID;
	const commentID = req.body.commentID;
	const newReply = new Reply({
		linkID  : commentID,
		replier : replier,
		reply   : reply,
		comDate : date(timezone),
		comTime : time(timezone)
	});
	newReply.save();
	Comment.findOneAndUpdate({ _id: comID }, { $push: { reply: newReply } }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (!doc) {
			console.log('page not found 404');
			res.redirect('/contents/' + title);
		}
	});
	res.redirect('/reply/' + commentID + '+' + objID);
});
app.get('/reply/:postID', function(req, res) {
	const postID = he.decode(req.params.postID);
	const arr = postID.split('+');
	const commentID = arr[0];
	const objID = arr[1];
	let title = 0;
	Comment.find({ linkID: commentID }, function(err, docs) {
		if (err) {
			console.log(err);
		} else if (docs) {
			Note.findOneAndUpdate({ _id: objID }, { comments: docs }, function(err, doc) {
				if (err) {
					console.log(err);
				} else if (!doc) {
					console.log('page not found 404');
					res.redirect('/');
				} else if (doc) {
					title = doc.heading;
					res.redirect('/contents/' + title);
				}
			});
		}
	});
});
//Newsletter
app.get('/newsLetter', function(req, res) {
	const user = req.user;
	let v = 0;
	if (user && user.status == process.env.ADMIN) {
		v = 1;
	}
	res.render('page', {
		user   : user,
		status : v
	});
});
app.post('/newsLetter', function(req, res) {
	const email = req.body.email;
	const Fname = req.body.Fname;
	const Lname = req.body.Lname;

	const data = {
		members : [
			{
				email_address : email,
				status        : 'subscribed',
				merge_fields  : {
					FNAME : Fname,
					LNAME : Lname
				}
			}
		]
	};
	const JSONdata = JSON.stringify(data);

	const url = 'https://us4.api.mailchimp.com/3.0/lists/5272ed54ff';
	const options = {
		method : 'POST',
		auth   : 'Anish1:e0feddbea6c937ed04fd83301a6dedec-us4'
	};

	const request = https.request(url, options, function(response) {
		if (response.statusCode === 200) {
			res.render('success', { name: Fname, title: 'Success!', user: req.user });
		} else {
			res.render('fail', { name2: Fname, title: 'fail!', user: req.user });
		}
	});
	request.write(JSONdata);
	request.end();
});

//listening
app.listen(process.env.PORT || 3000, function() {
	console.log('Server started on');
});
