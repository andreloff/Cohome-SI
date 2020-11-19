const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const familyRoutes = require('./api/routes/family');
const inviteRoutes = require('./api/routes/invite');
const userRoutes = require('./api/routes/user');

const MONGO_HOST = process.env.MONGO_HOST || 'localhost' ;
const MONGO_PORT = process.env.MONGO_PORT || '27017' ;
const mongoUrl = "mongodb://" + MONGO_HOST + ":" + MONGO_PORT + "/cohomedb";

mongoose.connect(
    mongoUrl,
    {
        //useMongoClient: true,
        useUnifiedTopology : true,
        useNewUrlParser : true
    }
)
.then(()=>{
    console.log("Connected to mongodb with url : " + mongoUrl);
})
.catch(err => {
    console.log("Connection to DB failed. Reason : " + err);
})

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers", 
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if(req.method === 'OPTIONS'){
        res.header('Acess-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

app.use('/user', userRoutes);
app.use('/family', familyRoutes);
app.use('/invite', inviteRoutes);

app.use((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
})

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

module.exports = app;