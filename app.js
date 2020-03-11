//jshint esversion:6

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
let k = 1;
//mongoose setup
mongoose.connect('mongodb+srv://Admin-Anish:13ANN%23MAJ13@mycluster0-tyf2i.mongodb.net/blogDB', {
	useFindAndModify   : false,
	useUnifiedTopology : true,
	useNewUrlParser    : true
});
//app setup
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

//default content creation for home, about, contact
const homeStartingContent =
	'Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.';
const aboutContent =
	'Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.';
const contactContent =
	'Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.';
//reply schema
const repliesSchema = new mongoose.Schema({
	id      : Number,
	replier : String,
	reply   : String,
	comDate : String,
	comTime : String
});
const Reply = new mongoose.model('Reply', repliesSchema);
//comments collection creation
const commentsSchema = new mongoose.Schema({
	id          : Number,
	commentator : String,
	comment     : String,
	reply       : Array,
	comDate     : String,
	comTime     : String
});
const Comment = new mongoose.model('Comment', commentsSchema);

//notes collection creation
const notesSchema = new mongoose.Schema({
	heading       : String,
	content       : String,
	date          : String,
	time          : String,
	thumbnailLink : String,
	imageLinks    : String,
	comments      : Array
});
const Note = new mongoose.model('Note', notesSchema);

//home
app.get('/', function(req, res) {
	Note.find({}, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			res.render('home', {
				content : homeStartingContent,
				array   : doc
			});
		}
	});
});

//about
app.get('/about', function(req, res) {
	res.render('about', {
		content1 : aboutContent
	});
});

//contact
app.get('/contact', function(req, res) {
	res.render('contact', {
		content2 : contactContent
	});
});

//compose
app.get('/compose', function(req, res) {
	res.render('compose');
});
app.post('/compose', function(req, res) {
	const composed = he.decode(req.body.cmp);
	const heading = req.body.head;
	const thumb = req.body.thumb;
	const imgL = req.body.imgL;
	const newNote = new Note({
		id            : k,
		heading       : heading,
		content       : composed,
		date          : date(),
		time          : time(),
		thumbnailLink : thumb,
		imageLinks    : imgL
	});
	k++;
	newNote.save(function(err) {
		if (err) {
			console.log(err);
		} else {
			res.redirect('/compose');
		}
	});
});
//:postID
app.get('/:postsID', function(req, res) {
	const postID = he.decode(req.params.postsID);
	if (postID === 'newsLetter') {
		res.render('page');
	} else {
		Note.findOne({ heading: postID }, function(err, doc) {
			if (err) {
				console.log(err);
			} else if (!doc) {
				res.render('post', {
					postHead    : 'Page not found',
					postContent : 'Go back to the home page!',
					imgL        : 'https://i.redd.it/t0rlgz5c1uf31.png'
				});
			} else {
				res.render('post', {
					postHead    : postID,
					postContent : doc.content,
					imgL        : doc.thumbnailLink,
					date        : doc.date,
					time        : doc.time,
					id          : doc._id,
					array       : doc.comments,
					objID       : doc._id
				});
			}
		});
	}
});

//delete
app.post('/delete', function(req, res) {
	const title = req.body.headings;
	Note.findOneAndRemove({ _id: title }, function(err, doc) {
		res.redirect('/');
	});
});

//comments
app.post('/comments', function(req, res) {
	const postId = req.param.postsId;
	let commentator = req.body.commentator;
	if (commentator === '') {
		commentator = 'Anonymous';
	}
	const comment = req.body.comment;
	const title = req.body.titleID;
	const id = req.body.ID;
	const newComment = new Comment({
		commentator : commentator,
		comment     : comment,
		comDate     : date(),
		comTime     : time()
	});
	newComment.save();
	Note.findOneAndUpdate({ _id: id }, { $push: { comments: newComment } }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (!doc) {
			res.redirect('/' + title);
			alert('404 file not found');
		} else {
			res.redirect('/' + title);
		}
	});
});

//replies
app.post('/reply', function(req, res) {
	const title = req.body.title;
	const comID = req.body.replyBtn;
	const replier = req.body.replier;
	const reply = req.body.reply;
	const objID = req.body.objID;
	const newReply = new Reply({
		replier : replier,
		reply   : reply,
		comDate : date(),
		comTime : time()
	});
	newReply.save();
	Comment.findOneAndUpdate(
		{ _id: comID },
		{
			$push : { reply: newReply }
		},
		function(err, doc) {
			if (err) {
				console.log(err);
			} else if (!doc) {
				console.log('page not found 404');
				res.redirect('/' + title);
			}
		}
	);
	Comment.find({}, function(err, docu) {
		if (err) {
			console.log(err);
		} else if (!docu) {
			console.log('page not found 404');
			res.redirect('/' + title);
		} else {
			Note.findOneAndUpdate({ _id: objID }, { comments: docu }, function(err, docs) {
				if (err) {
					console.log(err);
				} else if (!docs) {
					console.log('page not found 404');
					res.redirect('/' + title);
				} else {
					res.redirect('/' + title);
				}
			});
		}
	});
});
//Newsletter
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
			res.render('success', { name: Fname, title: 'Success!' });
		} else {
			res.render('fail', { name2: Fname, title: 'fail!' });
		}
	});
	request.write(JSONdata);
	request.end();
});
//listening
app.listen(process.env.PORT || 3000, function() {
	console.log('Server started on');
});
