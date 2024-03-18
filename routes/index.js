var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const storyModel = require("./story");
const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");

passport.use(new localStrategy(userModel.authenticate()));

//app.get ni router.get hai i.e session generate se banaye hai usme kafi kuc default se mil gya
//khud se ek ek folder banate toh app.get likhte
//views ke andar jitne v files hai sb render krenge unke correspinding router pe

//req.session.passport.username = user jo loggin in hai currently
//req.body.username = form/req se jo read kr rhe

//server pe data store in session and browser.clent pe in form of cookies
//res.send sends the response from server on the route you are sending it

router.get("/", function (req, res) {
  res.render("index", { footer: false });   //rendering index.ejs on home page
});        //rendering sirf views folder ke andar ka content (*.ejs ka hi krte hai )

//isLoggedIn is our function
router.get("/story/:number", isLoggedIn, async function (req, res) {
  const storyuser = await userModel.findOne({ username: req.session.passport.user })
  .populate("stories")

  const image = storyuser.stories[req.params.number];

  if(storyuser.stories.length > req.params.number){
    res.render("story", { footer: false, storyuser: storyuser, storyimage : image, number: req.params.number });
  }
  else{
    res.redirect("/feed");   //feed me reverse order me access krenge to get most updated feeds first
  }
});

router.get("/story/:id/:number", isLoggedIn, async function (req, res) {
  const storyuser = await userModel.findOne({ _id: req.params.id })
  .populate("stories")

  const image = storyuser.stories[req.params.number];

  if(storyuser.stories.length > req.params.number){
    res.render("story", { footer: false, storyuser: storyuser, storyimage : image, number: req.params.number });
  }
  else{
    res.redirect("/feed");
  }

});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/feed", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const posts = await postModel.find()
  .populate('user')

  const stories = await storyModel.find({user: {$ne: user._id}})
  .populate('user');

  var obj = {};
  const packs = stories.filter(function(story){
    if(!obj[story.user._id]){
      obj[story.user._id] = "ascbvjanscm";
      return true;
    }
  })

  res.render("feed", { footer: true, posts, user, stories: packs });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user})
  .populate('posts')

  res.render("profile", { footer: true, user: user });
});

//updating profile image:
router.post("/upload/profilepic", isLoggedIn, upload.single("image"), async function (req, res) {  
  const user = await userModel.findOne({username: req.session.passport.user});   ////wo bnda milega jiska dp change krna hai  => joki currently loggedIn hai
  user.profilepicture = req.file.filename;         //user ne jo file uplload kri
  await user.save();  //asynchronous task
  res.redirect("/profile");
});

router.get("/search", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render("search", { footer: true, user });
});

router.get("/user/:username", isLoggedIn, async function (req, res) {
  var val = req.params.username;
  const users = await userModel.find({username: new RegExp('^'+val, 'i')});
  res.json(users);
});

router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render("edit", { footer: true, user });  //rendering edit.ejs is route pe
});

router.get("/save/:postid", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  user.saved.push(req.params.postid);
  await user.save();
  res.json(user);
});

router.post("/update", isLoggedIn, async function (req, res) {   //updating username,name and bio
  const user = await userModel.findOneAndUpdate(
    {username: req.session.passport.user},  //find by username
    {username: req.body.username, name: req.body.name, bio: req.body.bio},  //update by req me jo value aayi
    {new: true}
  );

  req.logIn(user, function(err){    //he req.logIn() function is a function exposed by Passport.js on the req object. It's primarily used when users sign up
    res.redirect("/profile");
    if(err) throw err;
  })
});

router.get("/upload", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render("upload", { footer: true, user });   //rendering upload.ejs
});

router.get("/like/:postid", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.findOne({_id: req.params.postid})
  if(post.likes.indexOf(user._id) === -1){
    post.likes.push(user._id);
  }
  else{
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }
  await post.save();
  res.json(post);
});

router.post("/upload", isLoggedIn, upload.single('image'), async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});    
  if(req.body.type === "post"){
    const post = await postModel.create({
      caption: req.body.caption,
      image: req.file.filename,
      user: user._id   //loggedIn bande ki ID
    })
    user.posts.push(post._id);  //user ke posts array schema me push is post ki id
  }
  else if(req.body.type === "story"){
    const story = await storyModel.create({
      image: req.file.filename,
      user: user._id
    })
    user.stories.push(story._id);
  }

  await user.save();     //khud se kr rhe
  res.redirect("/feed");
});

router.post("/register", function (req, res) {
  var userDets = new userModel({    //index.ejs me form will submit data to the "/register" route using the HTTP POST method, http method is post bcz '/register' route ka wahi defined hai
    username: req.body.username,    //req.body is jo tmne form me bhara UI pe 
    name: req.body.name,
    email: req.body.email
  });
//passqword v aaya hai
  userModel.register(userDets, req.body.password)    //register is a method provided by Passport.js for user registration. It is used to register a new user with the application.
  .then(function(reg){                               //It returns a promise. This method is typically associated with passport-local-mongoose, a Mongoose plugin that simplifies building username and password login with Passport.
    passport.authenticate("local")(req, res, function(){
      res.redirect("/feed");
    })
  });
});

router.post("/login", passport.authenticate("local", {    //passport.authenticate("local") is a function used in Passport.js for authenticating requests using the "local" strategy
  successRedirect: "/feed",
  failureRedirect: "/login"
}), function(req, res){});

router.get("/logout", function(req, res, next){
  req.logout(function(err) {        //passport ki dpcumentation se
    if (err) { return next(err); }
    res.redirect('/');
  });
})

//sare route me use other than register or login:
function isLoggedIn(req, res, next){   //protected route function tmne banaya using passport
  if(req.isAuthenticated()){    //This method is provided by Passport.js, and it returns true if the user is authenticated (i.e., if the user's session contains valid login credentials), and false otherwise.
    return next();    //request to proceed to the next route.
  }
  else res.redirect('/login');
}

module.exports = router;
