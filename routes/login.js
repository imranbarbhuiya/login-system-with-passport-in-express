const { ensureLoggedIn } = require("connect-ensure-login");
const express = require("express");
const passport = require("passport");
const User = require("../model/userSchema");

const route = express.Router();

route
  .get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["email", "profile"],
    })
  )

  .get(
    "/auth/google/login",
    passport.authenticate("google", {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login",
      failureFlash: true,
    })
  )
  .get("/auth/github", passport.authenticate("github", { scope: ["user"] }))
  .get(
    "/auth/github/login",
    passport.authenticate("github", {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login",
      failureFlash: true,
    }),
    function (req, res) {
      res.redirect("/");
    }
  )
  .get("/login", function (req, res) {
    res.locals.message = req.flash();
    res.render("login");
  })
  .get("/register", function (req, res) {
    res.locals.message = req.flash();
    res.render("register");
  })
  .get("/change", ensureLoggedIn("/login"), function (req, res) {
    res.render("change");
  })
  .get("/reset", function (req, res) {
    res.redirect("/login");
  })
  .get("/reset/:token", function (req, res) {
    if (!req.params.token) {
      res.sendStatus(401);
    } else {
      res.render("reset", { token: req.params.token });
    }
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
          req.flash("error", err.message);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect(req.session.returnTo || "/");
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
      failureFlash: true,
    })
  )
  .post("/reset", function (req, res) {
    User.findOne({ token: req.params.token }, function (err, sanitizedUser) {
      if (sanitizedUser) {
        sanitizedUser.setPassword(req.body.password, function () {
          sanitizedUser.save();
        });
        res.locals.message = req.flash("success", "Password reset successful");
      } else {
        res.locals.message = req.flash("error", "Invalid token");
      }
      res.redirect("/login");
    });
  })
  .post("change", function (req, res) {
    User.findOne(
      { username: req.user.username },
      function (err, sanitizedUser) {
        if (sanitizedUser) {
          sanitizedUser.changePassword(
            req.body.oldPassword,
            req.body.newPassword,
            function () {
              sanitizedUser.save();
            }
          );
        }
      }
    );
  });

module.exports = route;
