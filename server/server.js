"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var app = express();
var port = 3000;
app.get('/', function (req, res) {
    res.send('Server is running!');
});
app.listen(port, function () {
    console.log("Server is listening on http://localhost:".concat(port));
});
