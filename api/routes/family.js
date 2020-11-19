const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Family = require('../models/family');
const User = require('../models/user');
const InviteList = require('../models/invite');
const BuyList = require('../models/buyList');
const checkAuth = require('../middleware/check-auth');

router.get('/',(req, res, next) => {

    //Pega todas as familias

    Family.find()
        .select("name admin _id members")
        .exec()
        .then(docs => {
            const response = {
                count : docs.length,
                families : docs.map(hmm => {
                    return{
                        name: hmm.name,
                        admin: hmm.admin,
                        id: hmm._id,
                        membersCount : hmm.members.length,
                        members: hmm.members.map(mem => {
                            return{
                                memberId: mem._id
                            }
                        })
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

router.get('/:familyId',(req, res, next) => {

    //Pega familia especifica pelo id

    const id = req.params.familyId;

    User.findById(id)
        .exec()
        .then(doc => {
            console.log("From Database", doc);
            if(doc){

                const result = {
                    name: doc.name,
                    id: doc._id,
                    admin: doc.admin,
                    members: doc.members
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

router.post('/', (req, res, next) => {

    //Cria nova familia, já atualizando o perfil do admin com a familia criada

    //console.log(req.file);

    User.findById(req.body.admin)
        .exec()
        .then( _user => {
            if(_user){
                ///Tem usuario com esse id
                if(_user.family === null){
                    ///Usuario ainda nao tem familia
                    const newMembers = [];
                    newMembers.push(req.body.admin);

                    const newBuyList = new BuyList({
                        _id: new mongoose.Types.ObjectId(),
                        products : []
                    })

                    const family = new Family({
                        _id: new mongoose.Types.ObjectId(),
                        name: req.body.name,
                        admin : req.body.admin,
                        members: newMembers,
                        buyList: newBuyList
                    });

                    newBuyList.save()
                        .then()
                        .catch(err =>{
                            console.log(err);
                            res.status(500).json({error: err});
                        });

                    family.save()
                        .then(result => {

                            User.update({_id : req.body.admin}, { $set : {family : family._id}})
                                .exec()
                                .then(_result => {
                                    console.log("Family in user profile updated!");
                                    res.status(201).json({
                                        message: "Family created!",
                                        createdFamily: {
                                            name: result.name,
                                            admin: result.admin,
                                            _id: result._id
                                        }
                                    })
                                })
                                .catch( err => {
                                    res.status(500).json({error: err});
                                });
                        })
                        .catch(err =>{
                            console.log(err);
                            res.status(500).json({error: err});
                        });
                }
                else{
                    ///Usuario ja tem familia
                    res.status(409).json({message : "User already has a family!"});
                }
            }
            else{
                ///Nao tem usuario com esse id
                res.status(404).json({message: "No user with given Id."});
            }
        })
        .catch(err =>{
            console.log(err);
            res.status(500).json({error: err});
        });

    
});

router.post('/:familyId/invite', (req, res, next) => {

    //Cria novo convite da família e envia para o usuario, identificado pelo email, 
    // primeiro checando na lista de convites do usuario se ele ja nao foi convidado

    const _famId = req.params.familyId;

    const _invite = {
        familyId: _famId
    }

    //console.log("bateu aq 1");

    User.find({email: req.body.email})
        .exec()
        .then(users => {
            //console.log("bateu aq 2");
            if(users.length < 1) {
                return res.status(404).json({
                    message : 'No email found'
                });
            }
            //console.log("bateu aq 3");
            const invListId = users[0].invites;
            var canInvite = true;

            InviteList.findById(invListId)
                .exec()
                .then(_invList => {
                    for(var i = 0 ; i < _invList.inviteList.length ; i++) 
                    {
                        console.log("list : " + _invList.inviteList[i].familyId + " famId : " + _famId);

                        if(_invList.inviteList[i].familyId == _famId){
                            canInvite = false;
                        }
                    }
                        

                    if(canInvite)
                    {
                        InviteList.update(
                            { _id : invListId},
                            { $push : {inviteList : _invite}}
                        ).exec()
                        .then( result => {
                            //console.log("bateu aq 4" + result);
                            res.status(200).json({
                                message : "Invite created and sent!"
                            });
                        })
                        .catch(err =>{
                            console.log(err);
                            return res.status(500).json({error: err});
                        });
                    }
                    else
                    {
                        const _error = "User already has this family's invite";
                        console.log(_error);
                        return res.status(409).json({error: _error});
                    }
                })
                .catch(err =>{
                    console.log(err);
                    return res.status(500).json({error: err});
                });
            //console.log(invListId);
        })
        .catch(err =>{
            console.log(err);
            res.status(500).json({error: err});
        });
});


router.get('/:familyId/members', (req, res, next) => {

    //Pega todos os membros de uma familia especifica, dado o id da familia

    Family.findById(req.params.familyId)
        .exec()
        .then(family => {
            
            const _members = {
                membersCount : family.members.length,
                members: family.members.map ( member => {
                    return {
                        memberId: member._id
                    }
                })
            }

            res.status(200).json(_members);
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
});

router.post('/:familyId/members', (req, res, next) => {

    ///Adiciona membro na familia, primeiro checando se o usuario ja tem familia
    /// atualizando a lista de convites do usuario
    /// depois atualiza a familia no perfil do usuario,
    /// depois atualiza a lista da familia

    const _userId = req.body.userId

    User.findById(_userId)
        .exec()
        .then( _user => {

            if(_user.family === null){

                Family.findById(req.params.familyId)
                    .exec()
                    .then( _family => {
                        if(_family.members.length <= 13){
                            InviteList.update({_id : _user.invites}, { $pull : { inviteList : {familyId : req.params.familyId}}})
                                .exec()
                                .then(_result => {
                                    console.log("Family's invite removed from user's list!")
                                    User.update(
                                        {_id : _userId}, 
                                        { $set : {family : req.params.familyId}})
                                        .exec()
                                        .then(result => {
                                            console.log("Family in user profile updated!");
                                
                                            Family.update({_id : req.params.familyId}, { $push : { members : req.body.userId}})
                                                .exec()
                                                .then(result => {
                                                    console.log("User added to the family");
                                                    res.status(200).json({
                                                        message: "User's family updated and User added to the family!"
                                                    });
                                                })
                                                .catch( err => {
                                                    res.status(500).json({error: err});
                                                })
                                        })
                                        .catch( err => {
                                            res.status(500).json({error: err});
                                        });
                                })
                                .catch( err => {
                                    res.status(500).json({error: err});
                                });
                        }
                        else{
                            res.status(409).json({message: "Family with max amount of members!"});
                        }
                    })
                    .catch( err => {
                        res.status(500).json({error: err});
                    });
                
            }
            else{
                res.status(409).json({message: "User already has a family!"});
            }
            
        })
        .catch( err => {
            res.status(500).json({error: err});
        });

    
});

router.get('/:familyId/buylist', (req, res, next) => {

    //Pega a lista de compras de uma familia especifica, dado o id da familia

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 
            BuyList.findById(family.buyList)
                    .exec()
                    .then( _buyList => {
                        const result = {
                            count : _buyList.inviteList.length,
                            invites : _buyList.products.map(prod =>{
                                return {
                                    productName: prod.productName,
                                    productDesc: prod.productDesc
                                }
                            })
                        }
                        res.status(200).json(result);
                    })
                    .catch(err => {
                        console.log(err);
                        return res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});

router.post('/:familyId/buylist', (req, res, next) => {

    //Adiciona produtos a lista de compras da familia, ja atualizando

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 

            _newProducts = req.body.products;

            BuyList.update({_id : family.buyList}, { $push : {products : {$each : _newProducts}}})
                    .exec()
                    .then(result => {
                        console.log("Buy list updated!");
                    })
                    .catch( err => {
                        res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});

router.patch('/:familyId/buylist', (req, res, next) => {

    //Atualiza a lista de compras depois de uma mudança na lista atual, removendo itens
    // já comprados

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 

            BuyList.update({_id : family.buyList}, { $set : {products : req.body.products}})
                    .exec()
                    .then(result => {
                        console.log("Buy list updated!");
                    })
                    .catch( err => {
                        res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});



module.exports = router;