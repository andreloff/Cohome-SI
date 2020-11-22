const mongoose = require('mongoose');

const taskListSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    tasks: [
        {
            taskName: {type : String, required: true}
        }
    ]
});

module.exports = mongoose.model('TaskList', taskListSchema);