const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");

const userSchema = new mongoose.Schema({
  username: { type: String, require: true, unique: true },
  name: { type: String, required: true },
  password: String,
  googleId: String,
  githubId: String,
  quote: Array,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

module.exports = User;
