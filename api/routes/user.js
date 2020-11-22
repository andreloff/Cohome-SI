const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const InviteList = require('../models/invite');
const checkAuth = require('../middleware/check-auth');
const Family = require('../models/family');

router.get('/', (req, res, next) => {

    //Pega todos usuarios

    User.find()
        .select("_id name email family invites")
        .exec()
        .then(_users => {
            const response = {
                count : _users.length,
                users : _users.map(user => {
                    return{
                        name: user.name,
                        email: user.email,
                        id: user._id,
                        birthDate: user.birthDate,
                        family: user.family,
                        invites: user.invites
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

router.get('/:userId',checkAuth, (req, res, next) => {

    //Pega usuario especifico, identificado pelo id

    const id = req.params.userId;

    User.findById(id)
        .exec()
        .then(user => {
            console.log("From Database", user);
            if(user){

                Family.findById(user.family)
                    .exec()
                    .then(_fam => {

                        var result
                        if(_fam){
                            result = {
                                name: user.name,
                                email: user.email,
                                id: user._id,
                                birthDate: user.birthDate,
                                family: user.family,
                                familyName: _fam.name,
                                invites: user.invites
                            }
                        }
                        else{
                            result = {
                                name: user.name,
                                email: user.email,
                                id: user._id,
                                birthDate: user.birthDate,
                                family: user.family,
                                familyName: null,
                                invites: user.invites
                            }
                        }

                        res.status(200).json(result);
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({error: err});
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

router.patch('/:userId',checkAuth, (req, res, next) => {

    //Altera usuario especifico, identificado por :userId

    const id = req.params.userId;

    User.update({_id : id}, {$set : {name : req.body.name, birthDate : req.body.birthDate}})
        .exec()
        .then(() =>{
            res.status(201).json({message : "User updated!"});
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error: err});
        });

})

router.patch('/:userId/pw',checkAuth, (req, res, next) => {

    //Altera senha de usuario especifico, identificado por :userId

    const id = req.params.userId;
    const oldPw = req.body.oldPassword;
    const newPw = req.body.newPassword;

    User.findById(id)
        .exec()
        .then(user => {
            //console.log(user);
            if(!user) {
                return res.status(404).json({
                    message : 'No user with given Id'
                });
            }
            bcrypt.compare(oldPw, user.password, (err,result) => {
                if(err) {
                    return res.status(409).json({
                        message : 'Wrong old password'
                    });
                }
                if(result){
                    bcrypt.hash(newPw, 10, (err, hash) => {
                        if(err) {
                            return res.status(500).json({
                                errorCode: err.code,
                                errorMes: err.message
                            });
                        }else {
                            User.update({_id : id}, {$set : {password : hash}})
                                .exec()
                                .then( () =>{
                                    res.status(200).json({
                                        message : "Password changed with success!"
                                    })
                                })
                                .catch(err => {
                                    console.log(err);
                                    res.status(500).json({
                                        error: err
                                    });
                                });
                        }
                    });
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




router.get('/:userId/invites', checkAuth,(req, res, next) => {

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
                                    familyId: inv.familyId,
                                    familyName: inv.familyName
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

router.delete('/:userId/invites/:familyId', checkAuth, (req, res, next) => {

    //Retira um convite, especificado pelo familyId, da lista do usuario.

    User.findById(req.params.userId)
    .exec()
    .then(user => {
        const invListId = user.invites;

        InviteList.update({_id : invListId}, { $pull : { inviteList : {familyId : req.params.familyId}}})
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

    User.find({email: req.body.email})
    .exec()
    .then(user => {
        if(user.length >= 1){
            return res.status(409).json({
                message: 'Email já existente.'
            });
        }
        else{
            bcrypt.hash(req.body.password, 10, (err, hash) => {
                if(err) {
                    return res.status(500).json({
                        errorCode: err.code,
                        errorMes: err.message
                    });
                }else {
                    const _invites = new InviteList({
                        _id: new mongoose.Types.ObjectId(),
                        inviteList: []
                    })
        
                    const user = new User({
                        _id: new mongoose.Types.ObjectId(),
                        email: req.body.email,
                        password: hash,
                        name: req.body.name,
                        invites: _invites._id,
                        family : null,
                        birthDate: req.body.birthDate
                    }); 

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
                            console.log("Error in invite list creation " + err);
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
                    token: token,
                    id: user[0]._id
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