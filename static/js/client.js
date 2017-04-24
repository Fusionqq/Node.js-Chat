var app = angular.module('myApp', ['ngAnimate', 'ngRoute']);
var socket = io.connect();

app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
    
    $routeProvider
    .when('/test', {
        templateUrl: 'static/views/test.html'
    });
    $locationProvider.html5Mode(true);  
}]);

app.filter('filterByName', function () {
  return function (items, nick) {
    var filtered = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (items[i].name != nick) {
            filtered.push(item);
        }
    }
    return filtered;
  };
});

app.controller('appController', function($scope) {
    var vm = this;
    vm.count = 0;
    vm.countOnline = 0;
    vm.mess = [];
    vm.usersOnline = [];
    vm.yourMess = '';
    vm.yourLogin = '';
    vm.yourPass = '';
    vm.tab = 1;

    vm.changeInput = function() {
        vm.authError = false; 
    };

    vm.setTab = function(newValue) {
        vm.yourLogin = '';
        vm.yourPass = '';
        vm.authError = false;
        vm.tab = newValue;
    };

    vm.isSet = function(tabName) {
        return vm.tab === tabName;
    };

    vm.registrToChat = function() {
        var dateNow = new Date().toString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");

        if(vm.yourLogin.length !== 0 && vm.yourPass.length !== 0) {
            vm.yourLogin = vm.yourLogin.toLowerCase();
            vm.myLogin = vm.yourLogin.replace(vm.yourLogin.charAt(0), vm.yourLogin.charAt(0).toUpperCase());
            socket.emit('registration', { password: vm.yourPass, confirmPass: vm.yourConfirmPass, login: vm.yourLogin.toLowerCase(), date: dateNow });
        } else {
            vm.authError = true;
            vm.loginStatusInfo = "Don't use an empty name or password";
        }
    };

    vm.enterToChat = function() {
        vm.yourLogin = vm.yourLogin.toLowerCase();
        vm.myLogin = vm.yourLogin.replace(vm.yourLogin.charAt(0), vm.yourLogin.charAt(0).toUpperCase());
        socket.emit('authorization', { password: vm.yourPass, login: vm.yourLogin.toLowerCase() });
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

    socket.on('onlineUsersList', function(users) {
        vm.usersOnline.splice(0, vm.usersOnline.length);
        vm.countOnline = 0;

        for(var i = 0; i < users.length; i++) {
            if(users[i].online == true) {
                vm.usersOnline.push({
                    name: users[i].userName.replace(users[i].userName.charAt(0), users[i].userName.charAt(0).toUpperCase()),
                    online: 'static/css/pic/online.png'
                });
                vm.countOnline++;
            }
            if(users[i].online == false) {
                vm.usersOnline.push({
                    name: users[i].userName.replace(users[i].userName.charAt(0), users[i].userName.charAt(0).toUpperCase()),
                    online: 'static/css/pic/offline.png'
                });
            }
        }
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
                        name: messages[i].userName.replace(messages[i].userName.charAt(0), messages[i].userName.charAt(0).toUpperCase()),
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
                    name: messages[i].userName.replace(messages[i].userName.charAt(0), messages[i].userName.charAt(0).toUpperCase()),
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

        if(vm.yourMess.length !== 0) { 
            socket.emit('message', {mess: vm.yourMess, name: vm.yourLogin.toLowerCase(), me: true, id: vm.count, time: dateNow});
            vm.count++;
        }
        vm.yourMess = "";
    };

    socket.on('messageToMe', function(data) {
        vm.mess.push({
            name: data.userName.replace(data.userName.charAt(0), data.userName.charAt(0).toUpperCase()),
            text: data.userMess,
            me: true,
            id: data.id,
            date: data.date
        });
        $scope.$apply();
    });

    socket.on('messageToAll', function(data) {
        vm.mess.push({
            name: data.userName.replace(data.userName.charAt(0), data.userName.charAt(0).toUpperCase()),
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
                vm.mess[i].text = 'Message delete';
                vm.mess[i].del = true;
                delete vm.mess[i].me;
                delete vm.mess[i].id; 
            }
        }
        $scope.$apply();
    });

    socket.on('deleteMessToAll', function(message) {
        var a = message[0].userName.replace(message[0].userName.charAt(0), message[0].userName.charAt(0).toUpperCase());
        for(var i = 0; i < vm.mess.length; i++) {
            if(vm.mess[i].id == ('none' + message[0].id) && vm.mess[i].name == a) {
                vm.mess[i].text = 'Message delete';
                vm.mess[i].del = true;
                delete vm.mess[i].me;
                delete vm.mess[i].id;
            }
        }
        $scope.$apply();
    });

    vm.setDelMess = function(getId) {
        console.log(getId);
        socket.emit('deleteMess', getId, vm.yourLogin.toLowerCase());
    };
});


