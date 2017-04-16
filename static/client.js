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

    socket.on('authIsSuccess', function(user) {
        socket.emit('loadMessHistory', user);
        vm.authError = false;
        vm.hideLogPage = true;
        vm.showChatPage = true;
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
            if(users[i].online == true) {
                vm.usersOnline.push({
                    name: users[i].userName,
                    online: 'online'
                });
            }
        }
        vm.countOnline = vm.usersOnline.length;
        $scope.$apply();
    });

    socket.on('messHistory', function(messages, user) {
        vm.mess.splice(0, vm.mess.length);

        var userTime = user[0].date;

        for(var i = 0; i < messages.length; i++) {
            var check = (userTime < messages[i].date);

            if( (messages[i].userName == user[0].userName) && (check) ) {
                if(messages[i].delete == true) {
                    vm.count++;
                } else {
                    vm.mess.push({
                        name: messages[i].userName,
                        text: messages[i].userMess,
                        me: true,
                        id: messages[i].id,
                        date: messages[i].date
                    });
                    vm.count++;
                }  
            };

            if( (messages[i].userName != user[0].userName) && (messages[i].delete == false) && (check) ) {
                vm.mess.push({
                    name: messages[i].userName,
                    text: messages[i].userMess,
                    me: false,
                    id: 'none' + messages[i].id,
                    date: messages[i].date
                });
            };
        };
        $scope.$apply();
    });

    vm.sendMess = function() {
        var dateNow = new Date().toString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        //bug!!!!!!!!!!
        if(vm.yourMess.length !== 0) { 
            socket.emit('message', {mess: vm.yourMess, name: vm.yourLogin, me: true, id: vm.count, time: dateNow});
            vm.count++;
        }
        vm.yourMess = "";
    };

    socket.on('messageToMe', function(data) {
        vm.mess.push({
            name: data.userName,
            text: data.userMess,
            me: true,
            id: data.id,
            date: data.date
        });
        $scope.$apply();
    });

    socket.on('messageToAll', function(data) {
        vm.mess.push({
            name: data.userName,
            text: data.userMess,
            me: false,
            id: 'none' + data.id,
            date: data.date
        });
        $scope.$apply();
    });

    
    socket.on('deleteMessToMe', function(message) {
        for(var i = 0; i < vm.mess.length; i++) {
            if(vm.mess[i].id == message[0].id) {
                vm.mess[i].text = 'Сообщение удалено';
                vm.mess[i].del = true;
                delete vm.mess[i].me;
                delete vm.mess[i].id;
            }
        }
        $scope.$apply();
    });

    socket.on('deleteMessToAll', function(message) {
        for(var i = 0; i < vm.mess.length; i++) {
            if(vm.mess[i].id == ('none' + message[0].id) && vm.mess[i].name == message[0].userName) {
                vm.mess[i].text = 'Сообщение удалено';
                vm.mess[i].del = true;
                delete vm.mess[i].me;
                delete vm.mess[i].id;
            }
        }
        $scope.$apply();
    });

    vm.setDelMess = function(getId) {
        console.log(getId);
        socket.emit('deleteMess', getId, vm.yourLogin);
    };
});


