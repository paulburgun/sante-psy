const { check } = require('express-validator');
const dbPatient = require('../db/patients')
const { validationResult } = require('express-validator');

module.exports.newPatient = async (req, res) => {
  res.render('newPatient', { pageTitle: 'Nouveau patient' })
}

module.exports.createNewPatientValidators = [
  // todo : do we html-escape here ? We already escape in templates.
  check('firstnames')
    .trim().not().isEmpty()
    .withMessage('Vous devez spécifier le.s prénom.s du patient.'),
  check('lastname')
    .trim().not().isEmpty()
    .withMessage('Vous devez spécifier le nom du patient.'),
]

module.exports.createNewPatient = async (req, res) => {
  // todo protection against injections
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errors.array().forEach(error => {
      req.flash('error', error.msg)
    })
    return res.redirect('/nouveau-patient')
  }

  const firstNames = req.body['firstnames']
  const lastName = req.body['lastname']
  // Todo test empty studentNumber
  const INE = req.body['ine']

  try {
    await dbPatient.insertPatient(firstNames, lastName, INE)
    req.flash('info', `Le patient ${firstNames} ${lastName} a bien été créé.`)
    return res.redirect('/mes-seances')
  } catch (err) {
    req.flash('error', 'Erreur. Le patient n\'a pas été créé. Pourriez-vous réessayer ?')
    console.error('Erreur pour créer le patient', err)
    return res.redirect('/nouveau-patient')
  }
}
