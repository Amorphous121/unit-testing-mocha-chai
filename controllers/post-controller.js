const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);

const APIError = require("../utils/APIError");
const { removeFields, toObject } = require("../utils/helper");
const USER = require("../models/users-model");
const POST = require("../models/posts-model");
const COMMENT = require("../models/comments-model");

exports.findAllPublic = async (req, res, next) => {

    const posts = await POST.find({ isDeleted: false }, "_id title content user" );
    if (posts) 
        return res.sendJson(200, posts);
    else 
        throw new APIError({ status: 404, message: "There is no Post left" });
};

exports.findOnePublic = async (req, res, next) => {
    const post = await POST.findOne( { _id: req.params.id, isDeleted: false }, "_id title content user");
    if (post) 
        res.sendJson(200, post);
    else
        throw new APIError({ status: 404, message: "There is no such post belong with given id." });
};

exports.getComments = async (req, res, next) => {

    let post = await POST
        .findOne({_id : req.params.id, isDeleted : false}, '_id title content user comments')
        .populate({
            path: "comments",
            match: { isDeleted: false },
            select: { user: 1, comment: 1, _id : 0 },
            populate: {
                path: "user",
                model: "user",
                select: { username: 1, _id : 0 },
            }})

    return res.sendJson(200, removeFields(toObject(post)));
}

exports.findAll = async (req, res, next) => {

    const posts = await POST.find( { user: { $ne: req.user._id }, isDeleted: false }, "_id title content user comments" )
        .populate({
            path: "comments",
            match: { isDeleted: false },
            select: { user: 1, comment: 1 },
            populate: {
                path: "user",
                model: "user",
                select: { _id: 0, username: 1 },
            }
        }).populate({
            path: "user",
            match: { isDeleted: false },
            select: { name: 1, username: 1, _id: 0 },
        });

    if (posts) 
        return res.sendJson(200, posts);
    else 
        throw new APIError({ status: 404, message: "There are no post left" });
};

exports.findOne = async (req, res, next) => {

    const post = await POST.findOne( { _id: req.params.id, isDeleted: false }, "_id title content user comments" )
        .populate({
            path: "comments",
            match: { isDeleted: false },
            select: { user: 1, comment: 1 },
            populate: {
                path: "user",
                model: "user",
                select: { _id: 0, username: 1 },
            },
        })
        .populate({
            path: "user",
            match: { isDeleted: false },
            select: { name: 1, username: 1, _id: 0 },
        });

    if (post) 
        return res.sendJson(200, post);
    else
        throw new APIError({ status: 404, message: "There is no such post belong to given id"});
};

exports.create = async (req, res, next) => {

    const payload = req.body;
    const post = await POST.create({
        title: payload.title,
        content: payload.content,
        user: req.user._id,
    });
    await USER.findOneAndUpdate( { _id: req.user._id, isDeleted: false }, { $addToSet: { posts: post._id } });
    res.sendJson(201, removeFields(toObject(post), ["comments"]));
};

exports.update = async (req, res, next) => {

    const postInfo = await POST.findOne({ _id: req.params.id, isDeleted : false });

    if (req.user.role == "admin" || postInfo.user == req.user._id) {
        const post = await POST.findOneAndUpdate( { _id: req.params.id, isDeleted: false }, { ...req.body }, { new: true });
        return res.sendJson(200, removeFields(toObject(post), ["comments"]));
    } else
        throw new APIError({status: 401,message: "You can't delete someone else's post",});
};

exports.delete = async (req, res, next) => {

    const postInfo = await POST.findOne({ _id: req.params.id, isDeleted : false });
    if (req.user.role == "admin" || postInfo.user == req.user._id) {

        await USER.findOneAndUpdate( { _id: req.user._id, isDeleted: false }, { $pull: { posts: req.params.id } });
        await COMMENT.updateMany( { post: req.params.id, isDeleted: false }, { $set: { isDeleted: true } });

        let post = await POST.findOneAndUpdate( { _id: req.params.id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: Date.now(), deletedBy: req.user._id}},{ new: true });
        
        if (post) 
            return res.sendJson(200, "Post Deleted Successfully");
        else
            throw new APIError({ status: 500, message: "Error while deleting post." });
    } else
        throw new APIError({ status: 401, message: "You can't delete someone else posts."});
};
