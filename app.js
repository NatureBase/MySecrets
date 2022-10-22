require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const Config = require("./config");

const app = express();

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: Config.sessionSecret,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://"+Config.mongoUsername+":"+Config.mongoPassword+"@ac-0rfmptd-shard-00-00.x1tr5i2.mongodb.net:27017,ac-0rfmptd-shard-00-01.x1tr5i2.mongodb.net:27017,ac-0rfmptd-shard-00-02.x1tr5i2.mongodb.net:27017/userDB?replicaSet=atlas-6cglxv-shard-0&ssl=true&authSource=admin", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: Array
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: Config.googleAuth.clientId,
    clientSecret: Config.googleAuth.clientSecret,
    callbackURL: "/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ username: profile.displayName, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
passport.use(new FacebookStrategy({
    clientID: Config.facebookAuth.appId,
    clientSecret: Config.facebookAuth.appSecret,
    callbackURL: "https://damp-escarpment-29000.herokuapp.com/auth/facebook/secrets",
    profileFields: ["id", "name"],
    proxy: true
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.route("/")
    .get(function(req, res) {
        res.render("home");
    });
app.route("/auth/google")
    .get(passport.authenticate("google", { scope: ["profile"] }
    ));
app.route("/auth/google/secrets")
    .get(passport.authenticate(
        "google", { failureRedirect: "/login" }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect("/secrets");
        });
app.route("/auth/facebook")
    .get(passport.authenticate("facebook")
    );
app.route("/auth/facebook/secrets")
    .get(passport.authenticate(
        "facebook", { failureRedirect: "/login" }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect("/secrets");
        });
app.route("/login")
    .get(function(req, res) {
        res.render("login");
    })
    .post(
        passport.authenticate(
        "local", {successRedirect: "/secrets", failureRedirect: "/"}),
        function(req, res) {
            const user = new User({
                username: req.body.username,
                password: req.body.pasdsword
            });
            req.login(user, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect("/secrets");
                }
            });
        });
app.route("/register")
    .get(function(req, res) {
        res.render("register");
    })
    .post(function(req, res) {
        User.register({username: req.body.username}, req.body.password, function(err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function() {
                    res.redirect("/secrets");
                });
            }
        });
    });
app.route("/secrets")
    .get(function(req, res) {
        res.set(
            'Cache-Control', 
            'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
        );
        User.find({"secret": {$ne: null}}, function(err, foundUsers) {
            if (err) {
                console.log(err);
            } else {
                if (foundUsers) {
                    res.render("secrets", {usersWithSecret: foundUsers});
                }
            }
        });
    });
app.route("/logout")
    .get(function(req, res) {
        req.logout(function(err) {
            if (err) {
                console.log(err);
            } else {
                res.redirect("/");
            }
        });
    });
app.route("/submit")
    .get(function(req, res) {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post(function(req, res) {
        const submittedSecret = req.body.secret;
        User.findById(req.user.id, function(err, foundUser) {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    foundUser.secret.push(submittedSecret);
                    foundUser.save(function() {
                        res.redirect("/secrets");
                    });
                }
            }
        });
    });

app.listen(Config.port, function() {
    console.log("Server has successfully started");
});