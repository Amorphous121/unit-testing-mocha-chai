const passport = require('passport');
const { generateJwt, toObject, removeFields } = require('../utils/helper');
const APIError = require('../utils/APIError');
const USER = require('../models/users-model');
const POST = require('../models/posts-model');
const COMMENT = require('../models/comments-model');
const ROLE = require('../models/role-model');


exports.register = async (req, res, next) => {

    const role = await ROLE.findOne({ name: new RegExp('user', 'i') }, '_id');
    if (!role) throw new APIError({ status: 500, message: "System roles are not generated yet." });
    const payload = req.body;
    payload.role = role._id;
    const user = await USER.create({
        name: payload.name,
        username: payload.username,
        password: payload.password,
        role: payload.role
    });
    return res.sendJson(201, removeFields(toObject(user), ['comments', 'posts', 'password']));
}

exports.login = async (req, res, next) => {
    passport.authenticate('login', async (err, user, info) => {
        if (err || !user) {
            const error = new Error('Invalid Credentials');
            return next(error);
        }
        req.login(user, { session: false }, async (err) => {
            if (err) return next(err.message);
            const body = { _id: user._id, username: user.username, role: user.role };
            const token = generateJwt({ user: body })
            return res.sendJson(200, { token });
        })
    })(req, res, next)
}

exports.findAll = async (req, res, next) => {

    const users = await USER.find({ isDeleted: false }, { isDeleted: 0, password: 0, deletedAt: 0, createdAt: 0, updatedAt: 0, deletedBy: 0, role: 0 })
        .populate({ path: 'posts', match: { isDeleted: false }, select: '_id title content' })
        .populate({ path: 'comments', match: { isDeleted: false }, select: '_id comment' });
    if (users) return res.sendJson(200, users);
    else throw new APIError({ status: 404, message: "There is no users left" })
}

exports.findOne = async (req, res, next) => {

    const user = await USER.findOne({ _id: req.params.id, isDeleted: false })
        .populate({ path: 'posts', match: { isDeleted: false }, select: '_id title content' })
        .populate({ path: 'comments', match: { isDeleted: false }, select: '_id comment' });

    if (user) return res.sendJson(200, removeFields(toObject(user), ['password', 'role']));
    else throw APIError({ status: 404, message: "No user were found with given id." });
    
}

exports.update = async (req, res, next) => {

    if (req.params.id == req.user._id) {
        const user = await USER.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { ...req.body }, { new: true });
        return res.sendJson(200, removeFields(toObject(user), ['password', 'role', "comments", "posts"]));
    } else
        throw new APIError({ status: 401, message: "You can't update another user's details" })
}

exports.delete = async (req, res, next) => {

    if (req.params.id == req.user._id || req.user.role == "admin") {
        const user = await USER.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: Date.now(), deletedBy: req.user._id } }, { new: true });

        await POST.updateMany({ user: user._id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: Date.now(), deletedBy: req.user._id } });
        await COMMENT.updateMany({ user: user._id, isDeleted: true }, { $set: { isDeleted: true, deletedAt: Date.now(), deletedBy: req.user._id } });

        return res.sendJson(200, "User deleted succssfully" );
    } else
        throw new APIError({ status: 401, message: "You can't delete another user's details" })
}