//jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const _ = require('lodash');
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

//notes collection creation
const notesSchema = new mongoose.Schema({
	id      : Number,
	heading : String,
	content : String
});
const Note = new mongoose.model('Note', notesSchema);

//home
app.get('/', function(req, res) {
	Note.find({}, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			console.log(doc);
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
	const composed = req.body.cmp;
	const heading = req.body.head;
	const newNote = new Note({
		id      : k,
		heading : heading,
		content : composed
	});
	k++;
	newNote.save();
	res.redirect('/compose');
});

//:postID
app.get('/:postsID', function(req, res) {
	const postID = _.lowerCase(req.params.postsID);
	Note.findOne({ heading: postID }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (!doc) {
			res.render('post', {
				postHead    : 'Page not found',
				postContent : 'writting'
			});
		} else {
			console.log(doc);
			res.render('post', {
				postHead    : doc.heading,
				postContent : doc.content
			});
		}
	});
});

//listening
app.listen(process.env.PORT || 3000, function() {
	console.log('Server started on');
});
