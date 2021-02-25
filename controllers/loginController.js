const crypto = require('crypto');
const dbPsychologists = require('../db/psychologists');
const dbLoginToken = require('../db/loginToken');
const date = require('../utils/date');
const cookie = require('../utils/cookie');
const emailUtils = require('../utils/email');
const ejs = require('ejs');
const config = require('../utils/config');

function generateToken() {
  return crypto.randomBytes(256).toString('base64');
}

async function sendLoginEmail(email, loginUrl, token) {
  const user = await dbPsychologists.getPsychologistByEmail(email);

  if (!user) { //@TODO isValidUser(user)
    throw new Error(
      `Avez-vous une rempli la démarche pour devenir partenaire présente sur l'accueil du site ?`,
    );
  }

  const html = await ejs.renderFile('./views/emails/login.ejs', {
    loginUrlWithToken: `${loginUrl}?token=${encodeURIComponent(token)}`,
  });

  try {
    await emailUtils.sendMail(email, `Connexion à ${config.appName}`, html);
  } catch (err) {
    console.error(err);
    throw new Error("Erreur d'envoi de mail");
  }
}

async function saveToken(email, token) {
  try {
    const expiredAt = date.getDatePlusOneHour();
    await dbLoginToken.insert(token,email, expiredAt);

    console.log(`Login token créé pour ${email}`);
  } catch (err) {
    console.error(`Erreur de sauvegarde du token : ${err}`);
    throw new Error('Erreur de sauvegarde du token');
  }
}

module.exports.getLogin = async function getLogin(req, res) {
  // init params
  const nextPage = '/mes-seances';

  const sessionDurationHours = config.sessionDurationHours;
  const formUrl = config.demarchesSimplifieesUrl;
  const contactEmail = res.locals.contactEmail;

  // Save a token in cookie that expire after config.sessionDurationHours hours if user is logged
  if ( req.query.token ) {
    const token = req.sanitize(req.query.token);
    const dbToken = await dbLoginToken.getByToken(token);

    if( dbToken !== undefined ) {
      const psychologistData = await dbPsychologists.getPsychologistByEmail(dbToken.email);
      res.cookie('token', cookie.getJwtTokenForUser(dbToken.email, psychologistData));
      req.flash('info', `Vous êtes authentifié.e comme ${dbToken.email}`);

      return res.redirect(nextPage);
    }
  }

  res.render('login', {
    formUrl,
    contactEmail,
    sessionDurationHours
  });
};

//@TODO refactor me ?
function generateLoginUrl() {
  return config.hostnameWithProtocol + '/psychologue/login';
}

/**
 * Send a email with a login link if the email is already registered
 */
module.exports.postLogin = async function postLogin(req, res) {
  const email = req.sanitize(req.body.email);

  //@TODO check if email exists (express-validator)
  if( !email  ) {
    req.flash('error', "Désolé, l'email renseigné n'a pas le bon format.");
    return res.redirect(`/psychologue/login`);
  }

  try {
    const formUrl = config.demarchesSimplifieesUrl;
    const sessionDurationHours = config.sessionDurationHours;
    const contactEmail = res.locals.contactEmail;
    const emailExist = await dbPsychologists.getPsychologistByEmail(email);

    if( emailExist ) {
      const token = generateToken();
      const loginUrl = generateLoginUrl();
      await sendLoginEmail(email, loginUrl, token);
      await saveToken(email, token);
    } else {
      // eslint-disable-next-line max-len
      console.warn(`Email inconnu qui essaye d'accéder au service - ${email} - il est peut être en attente de validation`);
    }

    //@TODO fix me - infos not being displayed on first time
    req.flash('info',
     `Un lien de connexion a été envoyé à l'adresse ${email} si elle est connue de nos services.\nLe lien est valable une heure.`);

    res.render('login', {
      formUrl,
      sessionDurationHours,
      contactEmail
    });
  } catch (err) {
    console.error(err);
    req.flash('error', "Erreur dans l'authentification. Nos services ont été alertés et vont règler ça au plus vite.");
    return res.redirect(`/login`);
  }
};
