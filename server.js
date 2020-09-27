var express = require('express');
var fs = require('fs');

var app = express();
var port = 8080;

app.use('/public', express.static(__dirname + '/public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));

// app.use(function(req, res, next) {
//    if (req.secure) {
//        next();
//    } else {
//        res.redirect("https://" + req.headers.host + req.url);
//    }
// })

app.all('*', (res, req, next) => {
    let protocol = req.headers['x-forwarded-proto'] || req.protocol;

    if (protocol == 'https') {
        next();
    } else {
        let from = `${protocol}://${req.hostname}${req.url}`;
        let to = `https://'${req.hostname}${req.url}`;

        console.log(`[${req.method}]: ${from} -> ${to}`);
        res.redirect(to);
    }
});

var server = app.listen(port, function() {
    console.log('Server Start, Port : ' + port);
});

app.io = require('socket.io').listen(server);                                // 서버 업로드 후 동작이 안될 수 있음  
app.io.on('connection', socket => {
    function log() {
        let array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('message', message => {
        log('Client said:', message);
        socket.broadcast.emit('message', message);
    });

    socket.on('create or join', room => {
        let clientsInRoom = app.io.sockets.adapter.rooms[room];
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        log('Room ' + room + ' now has ' + numClients + ' client(s)');
        
        if (numClients === 0) {
            console.log('create room!');
            socket.join(room);
            log('Client ID ' + socket.id + ' created room ' + room);
            socket.emit('created', room, socket.id);
        } else if (numClients === 1) {
        // } else if (numClients > 0) {
            console.log('join room!');
            log('Client ID ' + socket.id + ' joined room ' + room);
            app.io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            app.io.sockets.in(room).emit('ready');
        } else {
            socket.emit('full', room);
        }
    });

    socket.on('disconnect', room => {
       log('Client ID ' + socket.id + ' disconnected from ' + room);
    });
});

app.get('/relayInfo', function(req, res) {
    var mode = parseInt(req.query.mode);

    switch (mode) {
        case 0:                                                         // 촬영 시퀀스
            fs.readFile('pose.html', function(error, data) {
                if (error) {
                    console.log(error);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(data);
                }
            });

            break;
        case 1:                                                         // 영상 확인 시퀀스
            fs.readFile('rtc.html', function(error, data) {
                if (error) {
                    console.log(error);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(data);
                }
            });

            break;
    }
});