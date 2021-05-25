const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const JWTstretagy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;

const USER = require('../models/users-model')

passport.use('login', new localStrategy({
    usernameField: 'username',
    passwordField: 'password'
},
    async (username, password, done) => {
        try {
            const user = await USER.findOne({ username: username, isDeleted: false });
            if (!user) {
                return done(null, false, { message: "USER doesn't exist" });
            }
            const validate = await user.isValidPassword(password);
            if (!validate)
                return done(null, false, { message: 'Incorrect password' });
            return done(null, user, { message: "Logged In Successfull" });
        } catch (error) {
            done(error);
        }
    }
));

passport.use(
    new JWTstretagy(
        {
            secretOrKey: process.env.TOKEN_SECRET,
            jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken()
        },
        async (token, done) => {
                let user = await USER.findOne({ _id: token.user._id, isDeleted: false })
                            .populate({ path : 'role', select : { _id : 0, name : 1 }});
                
                if (user) { 
                    token.user.role = user.role.name;
                    return done(null, token.user);
                }   
                else return done(null, false, { message :" Invalid token"});
        }
    )
);