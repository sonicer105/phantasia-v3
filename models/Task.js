const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    taskId: { type: Number, unique: true },
    description: { type: String, required: true },
    xp: { type: Number, required: true },
    xpType: { type: String, required: true },
    assignedTo: { type: String, required: true }
});

taskSchema.plugin(require('mongoose-sequence')(mongoose), { inc_field: 'taskId' });

module.exports = mongoose.model('Task', taskSchema);
