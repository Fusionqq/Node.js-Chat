var PORT = 8008;
 
var express = require('express'); 
var app = express();
var server = require('http').Server(app); 
var io = require('socket.io')(server); 

server.listen(PORT, function(){
    console.log('listening at port ' + PORT);
});

app.use('/static', express.static(__dirname + '/static'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
 
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/main.html');
});

var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('moongose connecting');
});

var userSchema = new mongoose.Schema({
   userName: String,
   userPass: String,
   date: String
});

var usersMessageSchema = new mongoose.Schema({
   userName: String,
   userMess: String,
   me: Boolean,
   id: String,
   date: String
});

var usersOnlineSchema = new mongoose.Schema({
    userName: String,
    userPass: String,
    online: String
});

var modelU = mongoose.model('modelUser', userSchema);

var modelMess = mongoose.model('modelMessages', usersMessageSchema);

var modelOnline = mongoose.model('modelUserOnline', usersOnlineSchema);

function findUser (user, callback) {
    modelU.find({userName: user}, function (err, users) {
        callback(users.length !== 0);
    });
};

function checkUser (user, password, callback) {
    findUser(user, function (found) {
        if (found) {
            modelU.find({userName: user}, function (err, users) {
                if(users[0].userPass  === password) {
                    callback(true);
                } else {
                    callback(false);
                }
            });
        } else {
            callback(false);
        }
    });
};

function registrUser (user, password, now, callback) {
    findUser(user, function (found) {
        if (found) {
            callback(false);
        } else {
            var newUser = new modelU ({
                userName: user, 
                userPass: password,
                date: now
            });
            newUser.save(function (err) {
                if (err) {
                    return handleError(err);
                };
            });
            callback (true);
        }
    });
};

function checkUserOnline (user, password, callback) {
    modelOnline.find({userName: user}, function (err, users) {
        callback(users.length !== 0  && users[0].userPass == password);
    });   
};

modelMess.remove(function (err, users) {});
modelU.remove(function (err, users) {});
modelOnline.remove(function (err, users) {});

io.on('connection', function (client) {

    client.on('message', function (message) {
        client.emit('messageToMe', message);
        client.broadcast.emit('messageToAll', message);
    });

    client.on('messageToSave', function(mess) {
        var newMessage = new modelMess({
            userName: mess.userName,
            userMess: mess.userMess,
            me: mess.me,
            id: mess.id,
            date: mess.date
        });
        newMessage.save(function (err) {
            if (err) {
                return handleError(err);
            };
        });
    });

    client.on('authentication', function(info) {
        checkUserOnline (info.login, info.password, function (success) {
            if(!success) {
                checkUser(info.login, info.password, function(success) {
                    if(success) {
                        modelOnline.create({userName: info.login, userPass: info.password, online: 'online'}, function (err) {
                            if (err) {
                                return handleError(err);
                            };
                            modelOnline.find(function (err, users) {
                                if (err) {
                                    return handleError(err);
                                };
                                client.emit('onlineUserList', users);
                                client.broadcast.emit('onlineUserList', users);
                            });
                        });

                        console.log(info.login + info.password);

                        modelU.find(function (err, users) {
                            if (err) {
                                return handleError(err);
                            };
                            client.emit('authIsSuccess', users, info.login);
                        });

                        client.on('disconnect', function () { 
                            modelOnline.remove({userName: info.login}, function (err) { 
                                if (err) {
                                    return handleError(err);
                                };
                            }); 
                            modelOnline.find(function(err, users) {
                                if (err) {
                                    return handleError(err);
                                };
                                client.broadcast.emit('onlineUserList', users);
                            });         
                        });
                    } else {
                        client.emit('authIsNotSuccess', 'Неверное имя или пароль');
                    }
                });
            } else {
                client.emit('authIsNotSuccess', 'Вы уже online');
            }
        });
    });

    client.on('registration', function(info) {
        registrUser(info.login, info.password, info.date,  function(success) {
            if(success) {
                modelOnline.create({userName: info.login, userPass: info.password, online: 'online'}, function (err) {
                    if (err) {
                        return handleError(err);
                    };
                    modelOnline.find(function (err, users) {
                        if (err) {
                            return handleError(err);
                        };
                        client.emit('onlineUserList', users);
                        client.broadcast.emit('onlineUserList', users);
                    });
                });

                console.log(info.login + info.password);

                client.emit('registrIsSuccess');

                client.on('disconnect', function () { 
                    modelOnline.remove({userName: info.login}, function (err) {
                        if (err) {
                            return handleError(err);
                        };
                    }); 
                    modelOnline.find(function(err, users) {
                        if (err) {
                            return handleError(err);
                        };
                        client.broadcast.emit('onlineUserList', users);
                    });         
                });
            } else {
                client.emit('authIsNotSuccess', 'Имя занято');
            }
        });
    });

    client.on('loadMessHistory', function(users, name) {
        modelMess.find(function (err, messages) {
            if (err) {
                return handleError(err);
            };
            client.emit('messageToSave', messages, users, name);
        });  
    });
});

modelMess.find(function (err, users) {
    console.log(users);
});

modelOnline.find(function (err, users) {
    console.log(users);
});

modelU.find(function (err, users) {
    console.log(users);
});













