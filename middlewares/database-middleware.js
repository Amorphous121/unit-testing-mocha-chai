const mongoose = require('mongoose');
const { dbUri } = require('../config');

const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    autoIndex: true,
};

const connect = async () => {
    mongoose.connect(dbUri, options)
        .then(() => { 
            if (process.env.NODE_ENV == 'development')
                console.log("**************** Database Connected Succesfully ****************** ")})
        .catch((err) => {
            console.log(err.message);
            throw new Error("Problem while connecting database");
        })
}

module.exports = {
    connect,
}
