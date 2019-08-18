var express = require('express');
var router = express.Router();

const authorizationCheck = require('../middleware/authorizationCheck');


/* GET home page. */
router.get('/', authorizationCheck, (req, res, next) => {
 var id = res.locals.user._id;
  console.log(res.params);
  if(id !== null){
    User.find({}).select('_id username').exec().then(user => {
      Route.find({userId: id}).exec().then(userRoutes => {
        // result for all relevant user-user encounters for current user
        EncounterUser.find({$or: [{userId: id}, {comparedTo: id}]})
        // .populate('routeId', 'name')
        // .populate('comparedRoute', 'name')
        // .populate('userId', 'username')
        // .populate('comparedTo', 'username')
        .exec().then(encountersUser => {

          // result for all relevant user-animal encounters for current user
          EncounterAnimal.find({comparedTo: id})
          // .populate('routeId', 'individual_taxon_canonical_name')
          // .populate('comparedRoute', 'name')
          // .populate('comparedTo', 'username')
          .exec().then(encountersAnimal => {

            Animal.find().exec().then(animals => {

              res.render('index', {
                title: 'Start',
                userRoutes: userRoutes,
                userAll: user,
                encountersUser: encountersUser,
                encountersAnimal: encountersAnimal,
                animal: animals,
                message: req.flash('message')
              });
            })
            .catch(err => {
              console.log(1, err);
            });
          })
          .catch(err => {
            console.log(2, err);
          });
        })
        .catch(err => {
          console.log(3, err);
        });
      })
      .catch(err => {
        console.log(4, err);
      });
    })
    .catch(err => {
      console.log(5, err);
    });
  }
  else {
    res.render('index', {
      title: 'Start',
      message: {type: 'infoMsg', msg: 'Server-Fehler. Melden Sie sich nochmal an und versuchen Sie es erneut.'}
    });
  }
});

module.exports = router;
