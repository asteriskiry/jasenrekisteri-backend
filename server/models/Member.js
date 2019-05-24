const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MemberSchema = new mongoose.Schema({
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
        unique: true,
        required: true,
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
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
    role: {
        type: String,
        enum: ['Admin', 'Board', 'Functionary', 'Member'],
        default: 'Member',
        required: true,
    },
    accessRights: {
        type: Boolean,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    membershipStarts: {
        type: Date,
    },
    membershipEnds: {
        type: Date,
    },
    accountCreated: {
        type: Date,
        required: true,
    },
    accepted: {
        type: Boolean,
        required: true,
    },
});

MemberSchema.pre('save', function(next) {
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

MemberSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.password !== '' && update.password !== undefined) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(update.password, salt, (err, hash) => {
                this.getUpdate().password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

MemberSchema.methods.comparePassword = function(pw, cb) {
    bcrypt.compare(pw, this.password, function(err, isMatch) {
        if (err) {
            return cb(err);
        }

        cb(null, isMatch);
    });
};

module.exports = mongoose.model('Member', MemberSchema);
