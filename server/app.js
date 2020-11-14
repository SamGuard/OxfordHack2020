const fs = require('fs');
const express = require('express');//Used for routing http requests

const app = express();
const bodyparse = require("body-parser");

app.use(bodyparse());
app.use(express.static("public"));//Allows public access to the public folder


//All routes are sent to this page as its a single page application

app.get("/", function (req, res, next) {
    fs.readFile(process.cwd() + "/routes/main.html", "utf8", function (err, data) {
        if (err) {
            res.send("<!DOCTYPE html><html>Error 500: File not found!</html>");
            return;
        }
        res.send(data);
    });
});

app.use(function (req, res, next) {
    fs.readFile(process.cwd() + "/routes/redirect.html", "utf8", function (err, data) {
        if (err) {
            res.send("<!DOCTYPE html><html>Error 500: File not found!</html>");
            return;
        }
        res.send(data);
    });
});

module.exports = app;