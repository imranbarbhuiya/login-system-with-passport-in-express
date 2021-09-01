const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../model/userSchema");
const axios = require("axios").default;
module.exports = (passport) => {
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
      async function (accessToken, refreshToken, profile, done) {
        let primaryEmail;
        await axios
          .get(`https://api.github.com/user/emails`, {
            headers: { authorization: `token ${accessToken}` },
          })
          .catch((err) => {
            console.log(err);
          })
          .then(async (data) => {
            primaryEmail = data.data.filter((email) => email.primary == true)[0]
              .email;

            await User.findOrCreate(
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
};
