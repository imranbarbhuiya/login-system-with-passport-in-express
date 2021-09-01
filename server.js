//jshint esversion:6
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { ensureLoggedIn } = require("connect-ensure-login");
const flash = require("connect-flash");

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
require("./oaths/oaths")(passport);
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
