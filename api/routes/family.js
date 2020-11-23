const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Family = require('../models/family');
const User = require('../models/user');
const InviteList = require('../models/invite');
const BuyList = require('../models/buyList');
const TaskList = require('../models/taskList');
const checkAuth = require('../middleware/check-auth');

router.get('/',(req, res, next) => {

    //Pega todas as familias

    Family.find()
        .select("name admin _id members buyList")
        .exec()
        .then(docs => {
            const response = {
                count : docs.length,
                families : docs.map(hmm => {
                    return{
                        name: hmm.name,
                        admin: hmm.admin,
                        id: hmm._id,
                        buyList: hmm.buyList,
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
            res.status(500).json({error: err});
        });

})

router.get('/:familyId',checkAuth,(req, res, next) => {

    //Pega familia especifica pelo id

    const id = req.params.familyId;

    Family.findById(id)
        .exec()
        .then(doc => {
            if(doc){

                const result = {
                    name: doc.name,
                    id: doc._id,
                    admin: doc.admin,
                    buyList: doc.buyList,
                    taskList: doc.taskList,
                    members: doc.members.map(mem => {
                        return{
                            memberId: mem._id
                        }
                    })
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
            res.status(500).json({error: err});
        });

})

router.post('/',checkAuth, (req, res, next) => {

    //Cria nova familia, já atualizando o perfil do admin com a familia criada

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
                    });

                    const newTaskList = new TaskList({
                        _id: new mongoose.Types.ObjectId(),
                        tasks : []
                    });

                    const family = new Family({
                        _id: new mongoose.Types.ObjectId(),
                        name: req.body.name,
                        admin : req.body.admin,
                        members: newMembers,
                        buyList: newBuyList,
                        taskList : newTaskList
                    });

                    newBuyList.save()
                        .then()
                        .catch(err =>{
                            res.status(500).json({error: err});
                        });

                    newTaskList.save()
                        .then()
                        .catch(err =>{
                            res.status(500).json({error: err});
                        });

                    family.save()
                        .then(result => {

                            User.update({_id : req.body.admin}, { $set : {family : family._id}})
                                .exec()
                                .then(_result => {
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
            res.status(500).json({error: err});
        });

    
});

router.delete('/:familyId',checkAuth, (req, res, next) => {

    //Cria nova familia, já atualizando o perfil do admin com a familia criada

    var buyListId, taskListId;
    const familyId = req.params.familyId

    Family.findById(familyId)
        .exec()
        .then( _family => {
            if(_family){
                buyListId = _family.buyList;
                taskListId = _family.taskList;
                User.update({_id : _family.admin}, {$set : {family : null}})
                        .exec()
                        .then( () =>{
                            BuyList.remove({_id :buyListId})
                                .exec()
                                .then(() =>{
                                    TaskList.remove({_id :taskListId})
                                        .exec()
                                        .then(() =>{
                                            Family.remove({_id :familyId})
                                                .exec()
                                                .then(() => {
                                                    return res.status(200).json({
                                                        message : "Family deleted!"
                                                    })
                                                })
                                                .catch(err =>{
                                                    res.status(500).json({error: err});
                                                });
                                        })
                                        .catch(err =>{
                                            res.status(500).json({error: err});
                                        });
                                })
                                .catch(err =>{
                                    res.status(500).json({error: err});
                                });
                        })
                        .catch( err => {
                            res.status(500).json({error: err});
                        });
                
            }
            else{
                return res.status(404).json({
                    message: "Family not found with given Id"
                })
            }
        })
        .catch(err =>{
            res.status(500).json({error: err});
        });
});

router.post('/:familyId/invite',checkAuth,(req, res, next) => {

    //Cria novo convite da família e envia para o usuario, identificado pelo email, 
    // primeiro checando na lista de convites do usuario se ele ja nao foi convidado

    const _famId = req.params.familyId;

    User.find({email: req.body.email})
        .exec()
        .then(users => {
            if(users.length < 1) {
                return res.status(404).json({
                    message : 'No email found'
                });
            }
            const invListId = users[0].invites;
            var canInvite = true;

            InviteList.findById(invListId)
                .exec()
                .then(_invList => {
                    for(var i = 0 ; i < _invList.inviteList.length ; i++) 
                    {
                        if(_invList.inviteList[i].familyId == _famId){
                            canInvite = false;
                        }
                    }
                        

                    if(canInvite)
                    {
                        Family.findById(_famId)
                        .exec()
                        .then( _fam => {
                            const _invite = {
                                familyId: _famId,
                                familyName: _fam.name
                            }
                            InviteList.update(
                                { _id : invListId},
                                { $push : {inviteList : _invite}}
                            ).exec()
                            .then( result => {
                                res.status(200).json({
                                    message : "Invite created and sent!"
                                });
                            })
                            .catch(err =>{
                                return res.status(500).json({error: err});
                            });

                        })
                        .catch(err =>{
                            return res.status(500).json({error: err});
                        });
                        
                    }
                    else
                    {
                        const _error = "User already has this family's invite";
                        return res.status(409).json({error: _error});
                    }
                })
                .catch(err =>{
                    return res.status(500).json({error: err});
                });
        })
        .catch(err =>{
            res.status(500).json({error: err});
        });
});


router.get('/:familyId/members',checkAuth ,(req, res, next) => {

    //Pega todos os membros de uma familia especifica, dado o id da familia

    Family.findById(req.params.familyId)
        .exec()
        .then(family => {
            if(family){

                var returnMembers = {
                    membersList : []
                };
                User.find({
                    "_id" : { $in : family.members}
                }).exec()
                .then(members => {
                    returnMembers.membersList = members.map(member => {
                        return {
                            memberName : member.name,
                            memberId : member._id
                        };
                    });
                    return res.status(200).json(returnMembers);
                })
                .catch( err => {
                    _res.status(500).json({error: err});
                });

            }
            else{
                res.status(404).json({
                    message: "No family found with given Id."
                })
            }
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
});

router.post('/:familyId/members',checkAuth, (req, res, next) => {

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
                        if(_family){
                            if(_family.members.length <= 20){
                                InviteList.update({_id : _user.invites}, { $pull : { inviteList : {familyId : req.params.familyId}}})
                                    .exec()
                                    .then(_result => {
                                        User.update(
                                            {_id : _userId}, 
                                            { $set : {family : req.params.familyId}})
                                            .exec()
                                            .then(result => {
                                                
                                    
                                                Family.update({_id : req.params.familyId}, { $push : { members : req.body.userId}})
                                                    .exec()
                                                    .then(result => {
                                                        
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
                        }else{
                            return res.status(404).json({message: "Family not found with given Id"});
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

router.delete('/:familyId/members/:userId',checkAuth, (req, res, next) => {

    ///Adiciona membro na familia, primeiro checando se o usuario ja tem familia
    /// atualizando a lista de convites do usuario
    /// depois atualiza a familia no perfil do usuario,
    /// depois atualiza a lista da familia

    const _userId = req.params.userId;
    const _familyId = req.params.familyId;

    User.findById(_userId)
        .exec()
        .then( _user => {
            if(_user){
                if(_user.family != null){

                    User.update({_id : _userId}, {$set : {family : null}})
                        .exec()
                        .then( () =>{
                            Family.update({_id : _familyId} , {$pull : {members : _userId}})
                                .exec()
                                .then(() =>{
                                    return res.status(200).json({message : "User removed from family!"});
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
                    res.status(409).json({message: "User does not have a family!"});
                }
            }
            else{
                res.status(404).json({message: "User not found with given Id!"});
            }
        })
        .catch( err => {
            res.status(500).json({error: err});
        });

    
});

router.get('/:familyId/buylist',checkAuth,(req, res, next) => {

    //Pega a lista de compras de uma familia especifica, dado o id da familia

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 
            BuyList.findById(family.buyList)
                    .exec()
                    .then( _buyList => {
                        const result = {
                            count : _buyList.products.length,
                            products : _buyList.products.map(prod =>{
                                return {
                                    productName: prod.productName,
                                    productDesc: prod.productDesc
                                }
                            })
                        }
                        res.status(200).json(result);
                    })
                    .catch(err => {
                        
                        return res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});

router.post('/:familyId/buylist',checkAuth, (req, res, next) => {

    //Adiciona produtos a lista de compras da familia, ja atualizando

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 

            _newProducts = req.body.products;

            BuyList.update({_id : family.buyList}, { $push : {products : {$each : _newProducts}}})
                    .exec()
                    .then(result => {
                        
                        res.status(201).json({message : "Product created and list updated!"});
                    })
                    .catch( err => {
                        res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});

router.patch('/:familyId/buylist',checkAuth, (req, res, next) => {

    //Atualiza a lista de compras depois de uma mudança na lista atual, removendo itens
    // já comprados

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 

            BuyList.update({_id : family.buyList}, { $set : {products : req.body.products}})
                    .exec()
                    .then(result => {
                        
                        res.status(200).json({message: "Buy list updated!"});
                    })
                    .catch( err => {
                        res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});

router.get('/:familyId/taskList',checkAuth,(req, res, next) => {

    //Pega a lista de tarefas de uma familia especifica, dado o id da familia

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 
            TaskList.findById(family.taskList)
                    .exec()
                    .then( taskList => {
                        const result = {
                            count : taskList.tasks.length,
                            tasks : taskList.tasks.map(task =>{
                                return {
                                    taskName: task.taskName
                                }
                            })
                        }
                        res.status(200).json(result);
                    })
                    .catch(err => {
                        
                        return res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});

router.post('/:familyId/taskList',checkAuth, (req, res, next) => {

    //Adiciona tarefas a lista de tarefas da familia, ja atualizando

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 

            _newTasks = req.body.tasks;

            TaskList.update({_id : family.taskList}, { $push : {tasks : {$each : _newTasks}}})
                    .exec()
                    .then(result => {
                        
                        res.status(201).json({message : "Task created and list updated!"});
                    })
                    .catch( err => {
                        res.status(500).json({error: err});
                    });
        })
        .catch( err => {
            res.status(500).json({error: err});
        });
    
});

router.patch('/:familyId/taskList',checkAuth, (req, res, next) => {

    //Atualiza a lista de tarefas depois de uma mudança na lista atual, removendo itens
    // já feitos

    Family.findById(req.params.familyId)
        .exec()
        .then(family => { 

            TaskList.update({_id : family.taskList}, { $set : {tasks : req.body.tasks}})
                    .exec()
                    .then(result => {
                        
                        res.status(200).json({message: "Task list updated!"});
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