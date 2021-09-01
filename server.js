//jshint esversion:6
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const { ensureLoggedIn } = require("connect-ensure-login");
const flash = require("connect-flash");
const axios = require("axios").default;

const User = require("./model/userSchema");

const app = express();

app
  .use(express.static("public"))
  .set("view engine", "ejs")
  .use(
    express.urlencoded({
      extended: true,
    })
  )
  .use(cookieParser())
  .use(
    session({
      secret: "my secret code #4451122@%",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    })
  )
  .use(flash())

  .use(passport.initialize())
  .use(passport.session());

mongoose.connect(process.env.MONGODB_SRV, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const port = process.env.PORT || 8080;

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
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `/auth/google/login`,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async function (accessToken, refreshToken, profile, cb) {
      await User.findOrCreate(
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
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/login",
    },
    function (accessToken, refreshToken, profile, done) {
      let primaryEmail;
      axios
        .get(`https://api.github.com/user/emails`, {
          headers: { authorization: `token ${accessToken}` },
        })
        .catch((err) => {
          console.log(err);
        })
        .then((data) => {
          primaryEmail = data.data.filter((email) => email.primary == true)[0]
            .email;

          User.findOrCreate(
            {
              githubId: profile.id,
              name: profile.displayName,
              username: primaryEmail,
            },
            function (err, user) {
              return done(err, user);
            }
          );
        });
    }
  )
);
const loginRoute = require("./routes/login");
app.use("/", loginRoute);
app
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
