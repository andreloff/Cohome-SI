const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: { 
        type : String, 
        required: true, 
        unique: true, 
        match: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    },
    password: {type : String, required: true},
    name: {type : String , required : true},
    //birthTime: {type : Date , required : true},
    family: {type : mongoose.Schema.Types.ObjectId, ref: 'Family'},
    invites: {type : mongoose.Schema.Types.ObjectId, ref: 'Invite', required: true}
});

module.exports = mongoose.model('User', userSchema);