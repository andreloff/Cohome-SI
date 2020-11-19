const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const familyRoutes = require('./api/routes/family');
const inviteRoutes = require('./api/routes/invite');
const userRoutes = require('./api/routes/user')

mongoose.connect(
    "mongodb+srv://node-shop:"
    + process.env.MONGO_ATLAS_PW + 
    "@cohome.myct4.mongodb.net/"
    + process.env.MONGO_ATLAS_NAME + 
    "?retryWrites=true&w=majority",
    {
        //useMongoClient: true,
        useUnifiedTopology : true,
        useNewUrlParser : true
    }
);

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