const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// This is just for saving temporarily member data when member registers but has not been paid yet

const TempMemberSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    utuAccount: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        lowercase: true,
        required: true,
    },
    hometown: {
        type: String,
        required: true,
    },
    tyyMember: {
        type: Boolean,
        required: true,
    },
    tiviaMember: {
        type: Boolean,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
});

// Hash password
TempMemberSchema.pre('save', function(next) {
    let user = this;

    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                console.log(err);
                return next(err);
            }

            bcrypt.hash(user.password, salt, (err, hash) => {
                if (err) {
                    console.log(err);
                    return next(err);
                }

                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

module.exports = mongoose.model('TempMember', TempMemberSchema);
