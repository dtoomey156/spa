const express = require("express");
const app = express();
const User = require("./models/User");
// const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const bcrypt = require("bcrypt");
const bcryptSalt = bcrypt.genSaltSync(10);
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URL);

// this db variable is only used to log out the connection success or failure
const db = mongoose.connection;

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());

app.use(cookieParser());

// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );

app.post("/logout", (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).json("ok");
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
  const createdUser = await User.create({
    username: username,
    password: hashedPassword,
  });
  jwt.sign(
    { userId: createdUser._id, username },
    jwtSecret,
    {},
    (err, token) => {
      if (err) throw err;
      res
        .cookie("token", token, { sameSite: "none", secure: true })
        .status(201)
        .json({
          id: createdUser._id,
        });
    }
  );
});

app.post("/login", async (req, res) => {
  const { password, username } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          res
            .cookie("token", token, {
              sameSite: "none",
              secure: true,
            })
            .json({
              id: foundUser._id,
            });
        }
      );
    }
  }
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(201);
  }
});

db.once("open", (_) => {
  console.log(`Database connected on ${process.env.MONGO_URL}`);
});

db.on("error", (err) => {
  console.error("Database connection error", err);
});

app.listen(process.env.SERVER_PORT, () => {
  console.log(`server running on ${process.env.SERVER_PORT}`);
});
