const mongoose = require('mongoose');

const inviteSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    inviteList: [
        {
            familyId: {type : mongoose.Schema.Types.ObjectId, ref: 'Family', required: true},
            familyName: {type: String, required: true}
        }
    ]
    /*family: {type : mongoose.Schema.Types.ObjectId, ref: 'Family', required: true},
    targetUser: {type : mongoose.Schema.Types.ObjectId, ref: 'User', required: true}*/
});

module.exports = mongoose.model('InviteList', inviteSchema);