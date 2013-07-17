var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

var GitHubApi = require("github");

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    timeout: 5000
});

github.repos.getFromUser({
    user: "rgerstenberger"
}, function(err, res) {
    console.log(JSON.stringify(res));
});

app.listen(3000);
console.log('Express server listening on port 3000');