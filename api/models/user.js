const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: { 
        type : String, 
        required: true, 
        unique: true
    },
    password: {type : String, required: true},
    name: {type : String , required : true},
    //birthTime: {type : Date , required : true},
    family: {type : mongoose.Schema.Types.ObjectId, ref: 'Family'},
    invites: {type : mongoose.Schema.Types.ObjectId, ref: 'Invite', required: true}
});

module.exports = mongoose.model('User', userSchema);