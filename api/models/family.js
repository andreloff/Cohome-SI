const mongoose = require('mongoose');

const familySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: {type : String , required : true},
    //size: {type : Number, required : true},
    admin: {type : mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    members: [{type : mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    buyList: {type : mongoose.Schema.Types.ObjectId, ref: 'BuyList', required: true },
    taskList: {type : mongoose.Schema.Types.ObjectId, ref: 'TaskList', required: true }
});

module.exports = mongoose.model('Family', familySchema);