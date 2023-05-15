const Express = require('express');
const mongoose = require('mongoose');
const Path = require('path');
const app = Express();
const socket = require('socket.io');
const http = require('http');
const cors = require('cors');
const moment = require('moment/moment');

var users = [];
var sessions = [];

app.use(Express.json());

//Set static folder
app.use(Express.static(Path.join(__dirname,'dist/chat-app')));

app.post('/userSignup', (req, res) => {
    const user = new User({
        name: req.body.signupUsername.toLowerCase(),
        password: req.body.signupPassword,
        date_created: Date.now(),
        isAdmin: false
    });
    findUser(user).then(
        function(value){
            if(value){
                res.json({
                    statusCode: 409,
                    statusMessage: "User already registered!"
                });
            }
            else{
                saveUserinDB(user).then(
                    function(value){
                        console.log("success=", value);
                        res.json({
                            statusCode: 200,
                            statusMessage: "User created successfully. Please login to continue."
                        });
                    },
                    function(error){
                        console.log("error=", error);
                        res.json({
                            statusCode: 502,
                            statusMessage: "Couldn't connect to the Database!"
                        });
                    }
                )
            }
        },
        function(error){
            console.log("error=", error);
            res.json({
                statusCode: 502,
                statusMessage: "Couldn't connect to the Database!"
            });
        }
    );
});

app.post('/userLogin', (req, res) => {
    const user = new User({
        name: req.body.loginUsername.toLowerCase(),
        password: req.body.loginPassword,
        date_created: Date.now(),
        isAdmin: false
    });
    findUser(user).then(
        function(value){
            console.log(value);
            if(value){
                if(value.password == req.body.loginPassword){
                    res.json({
                        statusCode: 200,
                        statusMessage: "User logged in successfully.",
                        user: value
                    });
                }
                else{
                    res.json({
                        statusCode: 401,
                        statusMessage: "Invalid password!"
                    });
                }
            }
            else{
                res.json({
                    statusCode: 404,
                    statusMessage: "User not registered!"
                });
            }
        },
        function(error){
            console.log("error=", error);
            res.json({
                statusCode: 502,
                statusMessage: "Couldn't connect to the Database!"
            });
        }
    );
});

//Save the user in DB
async function saveUserinDB(user){
    try{
        const result = await user.save();
        console.log(result);
    }
    catch(ex){
        console.log(ex.message);
    }
}

//Save session in DB on disconnect
async function saveSessioninDB(session){
    try{
        const newSession = new Session({
            sessionId: session.sessionId,
            messages: session.messages
        });
        const result = await newSession.save();
        console.log("Session saved");
        console.log(result);
    }
    catch(ex){
        console.log("error while saving session =>"+ex.message);
    }
}

//Find a single user by name
async function findUser(user){
    return await User.findOne({ name : user.name});
}

//Connect to DB
mongoose.connect('mongodb://localhost/chat-app')
    .then( () => console.log('Connected to mongodb...'))
    .catch( () => console.log('Could not connect to mongodb...', err));

//Create user schema
const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    password: {type: String, required: true},
    date_created: {type: Date, default: Date.now},
    isAdmin: {type: Boolean, required: true}
});

//create user model
const User = mongoose.model('User', userSchema);

//Create session schema
const sessionSchema = new mongoose.Schema({
    sessionId: {type: String, required: true},
    messages: {type: Array, required: true}
});

//create session model
const Session = mongoose.model('Session', sessionSchema);

//===================SOCKET IO CODES========================

const server = http.createServer(app);

const io = socket(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

//Run when client connects
io.on('connection', socket => {
    console.log('New ws Connection...');
    var newSession = {
        sessionId: socket.id,
        messages: []
    }
    sessions.push(newSession);

    socket.on('joinChat', (username) => {
        //Welcome message to new user
        socket.emit('message', formatMessage('Chatbot','Welcome to chat group!'));

        //Add user
        addUser(socket.id, username);

        //Notify everyone when a new user joins except current user
        socket.broadcast.emit('message', formatMessage('Chatbot',`${username} has joined!`));
        
        //Broadcast users list to every users
        io.emit('users', users);
    })

    //Listen to chat messages
    socket.on('chatMessage', (msg) => {
        //broadcast every message to everyone
        var message = formatMessage(`${msg.user}`, msg.message);
        io.emit('message', message);
        sessions.map( s => {
            s.messages.push(message);
        });
    })

    //Notify everyone when a user disconnects
    socket.on('disconnect', () => {
        const removedUser = removeUser(socket.id);
        const removedSession = removeSession(socket.id);
        console.log(removedSession);
        saveSessioninDB(removedSession);
        console.log(sessions);
        io.emit('message', formatMessage('Chatbot',`${removedUser.username} has left!`));

        //Broadcast users list to every users
        io.emit('users', users);
    })
})

function formatMessage(username,message){
    return {
        username,
        message,
        time: moment().format('h.mm a')
    }
}

function addUser(sid, username){
    let newUser = {
        sid,
        username
    }
    users.push(newUser);
}

function removeUser(sid){
    const index = users.findIndex(user => user.sid === sid);

    if(index != -1){
        return users.splice(index,1)[0];
    }
}

function removeSession(id){
    const index = sessions.findIndex(session => session.sessionId === id);
    console.log(index);

    if(index != -1){
        return sessions.splice(index,1)[0];
    }
}
