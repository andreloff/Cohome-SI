const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const InviteList = require('../models/invite');
const checkAuth = require('../middleware/check-auth');

router.get('/', (req, res, next) => {

    //Pega todos usuarios

    User.find()
        .select("_id name email family invites")
        .exec()
        .then(docs => {
            const response = {
                count : docs.length,
                users : docs.map(hmm => {
                    return{
                        name: hmm.name,
                        email: hmm.email,
                        id: hmm._id,
                        //birthTime: hmm.birthTime,
                        family: hmm.family,
                        invites: hmm.invites
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

router.get('/:userId', (req, res, next) => {

    //Pega usuario especifico, identificado pelo id

    const id = req.params.userId;

    User.findById(id)
        .exec()
        .then(doc => {
            console.log("From Database", doc);
            if(doc){

                const result = {
                    name: doc.name,
                    email: doc.email,
                    id: doc._id,
                    //birthTime: doc.birthTime,
                    family: doc.family,
                    invites: doc.invites
                }

                res.status(200).json(result);
            }
            else{
                res.status(404).json({
                    message: "No valid entry found for ID"
                });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error: err});
        });
})

router.get('/:userId/invites', (req, res, next) => {

    //Pega lista de convites de um usuario especifico identificado pelo id

    const id = req.params.userId;

    User.findById(id)
        .exec()
        .then(user => {
            console.log("From Database", user);
            if(user){

                InviteList.findById(user.invites)
                    .exec()
                    .then( invList => {

                        //const invitesSet = new Set(invList.inviteList);

                        const result = {
                            count : invList.inviteList.length,
                            invites : invList.inviteList.map(inv =>{
                                return {
                                    familyId: inv.familyId
                                }
                            })
                        }

                        res.status(200).json(result);
                    })
                    .catch(err => {
                        console.log(err);
                        return res.status(500).json({error: err});
                    });
            }
            else{
                res.status(404).json({
                    message: "No valid entry found for ID"
                });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error: err});
        });
})

router.delete('/:userId/invites', (req, res, next) => {

    //Retira um convite, especificado pelo familyId (passado no body), da lista do usuario.

    User.findById(req.params.userId)
    .exec()
    .then(user => {
        const invListId = user.invites;

        InviteList.update({_id : invListId}, { $pull : { inviteList : {familyId : req.body.familyId}}})
                .exec()
                .then(_result => {
                    console.log("Family's invite removed from user's list!");
                    res.status(200).json({
                        message: "Invite removed from user's list!"
                    });
                })
                .catch( err => {
                    res.status(500).json({error: err});
                });
    })
    .catch(err =>{
        console.log(err);
        res.status(500).json({error: err});
    });
})





router.post('/signup', (req, res, next) => {

    //Cadastro de um novo usuário

    console.log("saske1");

    User.find({email: req.body.email})
    .exec()
    .then(user => {
        //console.log(user);
        if(user.length >= 1){
            return res.status(409).json({
                message: 'Mail exists'
            });
        }
        else{
            console.log("saske2");
            bcrypt.hash(req.body.password, 10, (err, hash) => {
                if(err) {
                    console.log("saske7");
                    return res.status(500).json({
                        errorCode: err.code,
                        errorMes: err.message
                    });
                }else {
                    console.log("saske3");
                    const _invites = new InviteList({
                        _id: new mongoose.Types.ObjectId(),
                        inviteList: []
                    })
                    console.log("saske4");
        
                    const user = new User({
                        _id: new mongoose.Types.ObjectId(),
                        email: req.body.email,
                        password: hash,
                        name: req.body.name,
                        invites: _invites._id,
                        family : null
                        //birthTime: req.body.birthTime
                    }); 

                    console.log("saske5");

                    user.save()
                    .then(result => {
                        console.log(result);

                        _invites.save()
                        .then(result => {
                            console.log("Invite list created" + result);
                            res.status(201).json({
                                message: 'User created'
                            });
                        })
                        .catch(err => {
                            console.log("Error in invite list creation" + err);
                            return res.status(500).json({error: err});
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({error: err});
                    });

                    
                }
            });
        }
    })
    .catch(err => {
        console.log("saske6");
        console.log(err);
        res.status(500).json({error: err});
    });

    
});

router.post('/login', (req, res, next) => {

    //Login de um usuário
    
    User.find({email: req.body.email})
    .exec()
    .then(user => {
        //console.log(user);
        if(user.length < 1) {
            return res.status(401).json({
                message : 'Auth failed'
            });
        }
        bcrypt.compare(req.body.password, user[0].password, (err,result) => {
            if(err) {
                return res.status(401).json({
                    message : 'Auth failed'
                });
            }
            if(result){
                const token = jwt.sign({
                    email:  user[0].email,
                    userId: user[0]._id
                }, "saske", 
                {
                    expiresIn: "1h"
                }
                );
                return res.status(200).json({
                    message: 'Auth successful',
                    token: token
                })
            }
            return res.status(401).json({
                message : 'Auth failed'
            });
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });


})

/*
router.delete('/:userId', checkAuth,(req, res, next) => {
    User.remove({_id: req.params.userId}).exec()
    .then(result => {
        res.status(200).json({
            message : 'User deleted'
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
})
*/



module.exports = router;