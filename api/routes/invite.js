const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Family = require('../models/family');
const User = require('../models/user');
const Invite = require('../models/invite');
const checkAuth = require('../middleware/check-auth');

/*
router.get('/', checkAuth,(req, res, next) => {
    Family.find()
        .select("name admin _id")
        .exec()
        .then(docs => {
            const response = {
                count : docs.length,
                users : docs.map(hmm => {
                    return{
                        name: hmm.name,
                        admin: hmm.email,
                        id: hmm._id
                    }
                })
            }

            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error: err});
        });

})
*/





router.delete('/:inviteId' ,(req, res, next) => {
    const id = req.params.inviteId;
    Invite.remove({_id: id}).exec()
        .then(result => {
            res.status(200).json({result});
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
});


module.exports = router;