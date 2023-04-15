const Express = require('express');
const mongoose = require('mongoose');
const Path = require('path');
const app = Express();
//const socket = require('socket.io');


app.use(Express.json());
//const server = Http.createServer(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
                saveinDB(user).then(
                    function(value){
                        console.log("success=", value);
                        res.json({
                            statusCode: 200,
                            statusMessage: "User created successfully!"
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
                        statusMessage: "User logged in successfully!"
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

async function saveinDB(user){
    try{
        const result = await user.save();
        console.log(result);
    }
    catch(ex){
        console.log(ex.message);
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

//============================example to return the post response to client=================================
// app.post('/signup', async (req, res) => {

// const var1 = await User.find({email: req.body.email})
//     .then(res => {
//         if (res.length === 0) {
//             console.log('didnt find the email')

//             const id = uuidv4()
//             const code = '1234'

//             //I want to send this object as a response to the post request
//             const obj = {id, code}


//             Model.create(obj)

//             return obj

//         } else {
//             console.log('Error')
//         }
//     })
// return res.json(var1)
// }

//====================================================================

//===================SOCKET IO CODES========================
//const io = socket(server);

//middleware to authenticate
// io.use( (socket, next) => {
//     if(socket.handshake.headers.username === 'bbb'){
//         next();
//     }
// });

//Run when client connects
// io.on('connection', socket => {
//     console.log('New Connection...');
//     console.log(socket.server.engine.clientsCount);
// })





// Mongoose.connect('mongodb://localhost/chat-app')
//     .then( () => console.log('Connected to mongodb...'))
//     .catch( () => console.log('Could not connect to mongodb...', err));