var PORT = 8008;
 
var express = require('express'); 
var app = express();
var server = require('http').Server(app); 
var io = require('socket.io')(server); 

server.listen(PORT, function() {
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
   date: String,
   online: Boolean
});

var usersMessageSchema = new mongoose.Schema({
   userName: String,
   userMess: String,
   me: Boolean,
   id: String,
   date: String,
   delete: Boolean
});

var modelU = mongoose.model('modelUser', userSchema);

var modelMess = mongoose.model('modelMessages', usersMessageSchema);

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

function registrUser (user, callback) {
    findUser(user, function (found) {
        if (found) {
            callback(false);
        } else {
            callback (true);
        }
    });
};

function checkUserOnline (user, password, callback) {
    modelU.find({userName: user}, function (err, users) {
        if(users.length == 0) {
            callback(false);
        };
        if(users.length != 0) {
            callback(users[0].online === true && users[0].userPass == password);
        };
    });   
};

//bug with server dissconnect :(
io.on('connection', function (client) {

    client.on('message', function (message) {
        modelMess.create({ userName: message.name, userMess: message.mess, me: message.me, id: message.id, date: message.time, delete: false }, function (err, message) {
            if (err) {
                return handleError(err);
            } else {
                client.emit('messageToMe', message);
                client.broadcast.emit('messageToAll', message);
            };
        });
    });

    client.on('deleteMess', function (index, login) {
        modelMess.find({ id: index, userName: login }, function (err, message) {
            if (err) {
                return handleError(err);
            } else {
                client.emit('deleteMessToMe', message);
                client.broadcast.emit('deleteMessToAll', message);
            }
        });
        modelMess.update({ id: index, userName: login }, { $set: { delete: true } }, function(err) {
            if (err) {
                return handleError(err);
            }
        });
    });

    client.on('authentication', function(info) { 
        checkUserOnline (info.login, info.password, function (success) {
            if(!success) {
                checkUser(info.login, info.password, function(success) {
                    if(success) {
                        console.log(info.login + info.password);

                        modelU.find({ userName: info.login }, function (err, user) {
                            if (err) {
                                return handleError(err);
                            } else {
                                client.emit('authIsSuccess', user);
                            };
                        });

                        modelU.update({ userName: info.login }, { $set: { online: true } }, function (err) {
                            if (err) {
                                return handleError(err);
                            } else {
                                modelU.find(function (err, users) {
                                    if (err) {
                                        return handleError(err);
                                    } else {
                                        client.emit('onlineUserList', users);
                                        client.broadcast.emit('onlineUserList', users);
                                    };
                                });
                            };
                        });

                        client.on('disconnect', function () { 
                            modelU.update({ userName: info.login }, { $set: { online: false } }, function (err) {
                                if (err) {
                                    return handleError(err);
                                } else {
                                    modelU.find(function (err, users) {
                                        if (err) {
                                            return handleError(err);
                                        } else {
                                            client.broadcast.emit('onlineUserList', users);
                                        };
                                    }); 
                                };
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
        registrUser(info.login, function(success) {
            if(success) {

                client.emit('registrIsSuccess');

                console.log(info.login + info.password);

                modelU.create({ userName: info.login, userPass: info.password, date: info.date, online: true }, function (err) {
                    if (err) {
                        return handleError(err);
                    } else {
                        modelU.find(function (err, users) {
                            if (err) {
                                return handleError(err);
                            } else {
                                client.emit('onlineUserList', users);
                                client.broadcast.emit('onlineUserList', users);
                            };
                        });
                    };
                });
    
                client.on('disconnect', function () { 
                    modelU.update({ userName: info.login }, { $set: { online: false } }, function (err) {
                        if (err) {
                            return handleError(err);
                        } else {
                            modelU.find(function(err, users) {
                                if (err) {
                                    return handleError(err);
                                } else {
                                    client.broadcast.emit('onlineUserList', users);
                                };
                            });
                        };  
                    });             
                });

            } else {
                client.emit('authIsNotSuccess', 'Имя занято');
            }
        });
    });

    client.on('loadMessHistory', function(user) {
        modelMess.find(function (err, messages) {
            if (err) {
                return handleError(err);
            } else {
                client.emit('messHistory', messages, user);
            };
        });  
    });
});

modelMess.find(function (err, users) {
    console.log(users);
});

modelU.find(function (err, users) {
    console.log(users);
});

modelMess.remove(function (err, users) {});
modelU.remove(function (err, users) {});















