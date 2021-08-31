//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const { ensureLoggedIn } = require("connect-ensure-login");
const app = express();

app
  .use(express.static("public"))
  .set("view engine", "ejs")
  .use(
    express.urlencoded({
      extended: true,
    })
  )

  .use(
    session({
      secret: "my secret code #4451122@%",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    })
  )

  .use(passport.initialize())
  .use(passport.session());

mongoose.connect(process.env.MONGODB_SRV, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  name: String,
  password: String,
  googleId: String,
  quote: Array,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const port = process.env.PORT || 8080;
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: `/auth/google/quote`,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate(
        {
          googleId: profile.id,
          name: profile._json.given_name,
          username: profile._json.email,
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app
  .get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["email", "profile"],
    })
  )

  .get(
    "/auth/google/quote",
    passport.authenticate("google", {
      failureRedirect: "/login",
    }),
    function (req, res) {
      res.redirect("/");
    }
  )

  .get("/login", function (req, res) {
    res.render("login");
  })
  .get("/register", function (req, res) {
    res.render("register");
  })

  .get("/", function (req, res) {
    User.find({ quote: { $ne: null } }, function (err, users) {
      if (err) {
        console.log(err);
      } else {
        if (users) {
          res.render("quotes", {
            usersWithQuotes: users,
            login: req.isAuthenticated(),
          });
        }
      }
    });
  })

  .get("/submit", ensureLoggedIn("/login"), function (req, res) {
    res.render("submit");
  })

  .get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
  })

  .post("/register", function (req, res) {
    User.register(
      {
        username: req.body.username,
        name: req.body.name,
      },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/");
          });
        }
      }
    );
  })
  .post(
    "/login",
    passport.authenticate("local", {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login",
    }),
    function (req, res) {
      console.log(err);
      res.redirect("/login");
    }
  )
  .post("/submit", function (req, res) {
    const quote = req.body.quote;

    User.findById(req.user.id, function (err, user) {
      if (err) {
        console.log(err);
      } else {
        if (user) {
          user.quote.push(quote);
          user.save(function () {
            res.redirect("/");
          });
        }
      }
    });
  })
  .listen(port, () => {
    console.log(`Server started at port ${port}`);
  });
