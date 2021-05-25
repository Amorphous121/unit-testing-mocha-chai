const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const UserSchema =  new Schema({

    name            : { type  : String, required : true },
    username        : { type  : String, required : true, unique : true },
    isDeleted       : { type  : Boolean, default : false, required : true },
    password        : { type  : String, required : true, },
    posts           : [{ type : ObjectId, ref : 'post', default: null }],
    comments        : [{ type : ObjectId, ref : 'comment', default: null }],
    role            : { type  : ObjectId, ref : 'role',  default: null },
    deletedBy       : { type  : ObjectId, ref: 'user', default: null},
    deletedAt       : { type  : Date, default: null },

}, { versionKey: false, timestamps : true });


UserSchema.methods.isValidPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

UserSchema.pre('save', async function (next) {
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

UserSchema.pre('findOneAndUpdate', async function (next) {
    if (this._update.password) {
        this._update.password = await bcrypt.hash(this._update.password, 10);
        next();
    }
})


module.exports = mongoose.model('user', UserSchema, 'users');