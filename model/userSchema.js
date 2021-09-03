const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, require: true, unique: true },
  name: { type: String, required: true },
  password: String,
  googleId: String,
  githubId: String,
  facebookId: String,
  quote: Array,
  resetPasswordToken: String,
  resetPasswordExpire: String,
});

userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);

module.exports = User;
