const mongoose = require('mongoose');

const buyListSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    products: [
        {
            productName: {type : String, required: true},
            productDesc: {type : String, required: true}
        }
    ]
    /*family: {type : mongoose.Schema.Types.ObjectId, ref: 'Family', required: true},
    targetUser: {type : mongoose.Schema.Types.ObjectId, ref: 'User', required: true}*/
});

module.exports = mongoose.model('BuyList', buyListSchema);