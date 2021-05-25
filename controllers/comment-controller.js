const USER = require('../models/users-model');
const COMMENT = require('../models/comments-model');
const POST = require('../models/posts-model');
const APIError = require('../utils/APIError');
const {removeFields, toObject} = require('../utils/helper');

exports.findAll = async (req, res, next) => {

    const comments = await COMMENT.find({ isDeleted: false }, '_id comment user post')
        .populate({ path: 'user', match: { isDeleted: false }, select: { name: 1, username: 1 } })
        .populate({ path: 'post', match: { isDeleted: false }, select: { title: 1, content: 1 } });

    if (comments) return res.sendJson(200, comments)
    else throw new APIError({ message: "No comments availdable" });
}

exports.findOne = async (req, res, next) => {

    const comments = await COMMENT.findOne({ _id: req.params.id, isDeleted: false }, '_id comment user post')
        .populate({ path: 'user', match: { isDeleted: false }, select: { name: 1, username: 1 } })
        .populate({ path: 'post', match: { isDeleted: false }, select: { title: 1, content: 1 } })

    if (comments) return res.sendJson(200, comments)
    else throw new APIError({ status: 404, message: "No Such Comment Exists" });
}

exports.create = async (req, res, next) => {
    let payload = req.body;
    let comment = await COMMENT.create({
        post: payload.post,
        comment: payload.comment,
        user: req.user._id,
    });
    await USER.findOneAndUpdate({ _id: req.user._id, isDeleted: false }, { $addToSet: { comments: comment._id } });
    await POST.findOneAndUpdate({ _id: payload.post, isDeleted: false }, { $addToSet: { comments: comment._id } });
    return res.sendJson(200, removeFields(toObject(comment)));
}

exports.update = async (req, res, next) => {

    let commentInfo = await COMMENT.findOne({ _id: req.params.id, isDeleted: false });
    console.log(commentInfo.user, req.user._id)
    if (commentInfo.user == req.user._id) {
        let comment = await COMMENT.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { ...req.body, user: req.user._id }, { new: true });
        res.sendJson(200, removeFields(toObject(comment)));
    } else throw new APIError({ status: 401, message: "You can't update someone else's comment" });

}

exports.delete = async (req, res, next) => {

    let commentInfo = await COMMENT.findOne({ _id: req.params.id, isDeleted: false });
    let postInfo = await POST.findOne({ _id: commentInfo.post, isDeleted: false });
    if (postInfo) {
        if (postInfo.user == req.user._id || req.user.role == "admin") {
            const comment = await COMMENT.findOneAndUpdate({ _id: commentInfo._id, isDeleted: false }, { $set: { isDeleted: true, deletedBy: req.user._id, deletedAt: Date.now() } }, { new: true });
            await USER.findOneAndUpdate({ _id: req.user_id, isDeleted: false }, { $pull: { comments: req.params.id } });
            await POST.findOneAndUpdate({ _id: postInfo._id, isDeleted: false }, { $pull: { comments: req.params.id } });
            return res.sendJson(200, {message : "Comment deleted Successfully"})
        } else {
            if (commentInfo.user == req.user._id) {
                const comment = await COMMENT.findOneAndUpdate({ _id: req.params._id, isDeleted: false }, { $set: { isDeleted: true, deletedBy: req.user._id, deletedAt: Date.now() } }, { new: true });
                await USER.findOneAndUpdate({ _id: postInfo.user, isDeleted: false }, { $pull: { comments: req.params.id } });
                await POST.findOneAndUpdate({ _id: postInfo._id, isDeleted: false }, { $pull: { comments: req.params.id } });
                return res.sendJson(200, {message : "Comment deleted Successfully"})
            } else
                throw new APIError({ message: "You cannot delete someone's comment" });
        }
    } else
        throw new APIError({ status: 401, message: "You can only delete comments from own post's" })

}