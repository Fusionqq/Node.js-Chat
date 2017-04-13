var app = angular.module('myApp', []);
var socket = io.connect();

app.controller('appController', function($scope) {
    var vm = this;
    vm.count = 0;
    vm.countOnline = 0;
    vm.mess = [];
    vm.usersOnline = [];

    vm.registrToChat = function() {
        var dateNow = new Date().toString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        socket.emit('registration', {password: vm.yourPass, login: vm.yourLogin, date: dateNow});
        //добавить проверку пустой строки
    };

    vm.enterToChat = function() {
        socket.emit('authentication', {password: vm.yourPass, login: vm.yourLogin});
       //добавить проверку пустой строки
    };

    socket.on('authIsSuccess', function(users, login) {
        vm.authError = false;
        vm.hideLogPage = true;
        vm.showChatPage = true;
        socket.emit('loadMessHistory', users, login);
    });

    socket.on('registrIsSuccess', function() {
        vm.mess.splice(0, vm.mess.length);
        vm.authError = false;
        vm.hideLogPage = true;
        vm.showChatPage = true;
        $scope.$apply();
    });

    socket.on('authIsNotSuccess', function(text) {
        vm.loginStatusInfo = text;
        vm.authError = true;
        $scope.$apply();
    });

    socket.on('onlineUserList', function(users) {
        vm.usersOnline.splice(0, vm.usersOnline.length);
        for(var i = 0; i < users.length; i++) {
            vm.usersOnline.push({
                name: users[i].userName,
                online: users[i].online
            });
        }
        $scope.$apply();
    });

    socket.on('messageToSave', function(messages, users, login) {
        var userTime;

        vm.mess.splice(0, vm.mess.length);
    
        for(var j = 0; j < users.length; j++) {
            if(users[j].userName == login) {
                userTime = users[j].date;
            }
        };
        
        for(var i = 0; i < messages.length; i++) {
            var check = (userTime < messages[i].date);
        
            if(messages[i].id != 'none' && messages[i].userName == login && check) {
                vm.mess.push({
                    name: messages[i].userName,
                    text: messages[i].userMess,
                    me: true,
                    id: messages[i].id,
                    date: messages[i].date
                });
            };
            if(messages[i].userName != login && check) {
                vm.mess.push({
                    name: messages[i].userName,
                    text: messages[i].userMess,
                    me: false,
                    id: 'none',
                    date: messages[i].date
                });
            };
        };
        $scope.$apply();
    });

    vm.sendMess = function() {
        var dateNow = new Date().toString().replace(/.*(\d{2}:\d{2}).*/, "$1");
        if(vm.yourMess.length != 0) { //bug!!!
            socket.emit('message', {message: vm.yourMess, name: vm.yourLogin, time: dateNow});
        }
        vm.yourMess = "";
    };

    socket.on('messageToMe', function(data) {
        vm.count++;
        vm.mess.push({
            name: data.name,
            text: data.message,
            me: true,
            id: vm.count,
            date: data.time
        });
        $scope.$apply();
        socket.emit('messageToSave', {userName: data.name, userMess: data.message, me: true, id: vm.count, date: data.time});
    });

    socket.on('messageToAll', function(data) {
        vm.mess.push({
            name: data.name,
            text: data.message,
            me: false,
            id: 'none',
            date: data.time
        });
        $scope.$apply();
    });

    vm.setDelMess = function(getId) {
        if(getId == vm.mess.id); {
            var indexToRemove = vm.mess.findIndex(obj => obj.id == getId);
            vm.mess.splice(indexToRemove, 1, {name: 'Сообщение удалено', del: true});
            console.log(indexToRemove);
            //setTimeout(function(){$scope.mess.splice(indexToRemove, 1);}, 1000);
        }
    };
});


