const app = require('../index')
const chai = require('chai')
const clean = require('./helper/clean')
const cookie = require('../utils/cookie')
const dbPsychologists = require('../db/psychologists')
const dbUniversities = require('../db/universities')

describe('reimbursementController', () => {
  describe('updateConventionInfo', () => {
    let university

    beforeEach( async () => {
      university = await dbUniversities.insertUniversity('Cool U dude')
      return
    })

    afterEach(async () => {
      await clean.cleanAllPsychologists()
      await clean.cleanAllUniversities()
      return
    })

    it('should updateConventionInfo', async () => {
      const psyEmail = 'login@beta.gouv.fr'
      await dbPsychologists.savePsychologistInPG([clean.getOnePsy(psyEmail, 'accepte', false)])
      const psy = await dbPsychologists.getAcceptedPsychologistByEmail(psyEmail)
      // Check that the fields we are testing are unset before test
      chai.expect(psy.isConventionSigned).not.to.exist
      chai.expect(psy.payingUniversityId).not.to.exist

      return chai.request(app)
        .post('/psychologue/api/renseigner-convention')
        .set('Cookie', `token=${cookie.getJwtTokenForUser(psy.email, psy.dossierNumber)}`)
        .redirects(0) // block redirects, we don't want to test them
        .type('form')
        .send({
          signed: 'yes',
          university: university.id,
        })
        .then(async () => {
          const updatedPsy = await dbPsychologists.getAcceptedPsychologistByEmail(psyEmail)
          chai.expect(updatedPsy.isConventionSigned).to.equal(true)
          chai.expect(updatedPsy.payingUniversityId).to.equal(university.id)
        })
    })

    it('should not update if signed is missing', async () => {
      const psyEmail = 'login@beta.gouv.fr'
      await dbPsychologists.savePsychologistInPG([clean.getOnePsy(psyEmail, 'accepte', false)])
      const psy = await dbPsychologists.getAcceptedPsychologistByEmail(psyEmail)
      // Check that the fields we are testing are unset before test
      chai.expect(psy.isConventionSigned).not.to.exist
      chai.expect(psy.payingUniversityId).not.to.exist

      return chai.request(app)
        .post('/psychologue/api/renseigner-convention')
        .set('Cookie', `token=${cookie.getJwtTokenForUser(psy.email, psy.dossierNumber)}`)
        .redirects(0) // block redirects, we don't want to test them
        .type('form')
        .send({
          // signed: missing
          university: university.id,
        })
        .then(async () => {
          const updatedPsy = await dbPsychologists.getAcceptedPsychologistByEmail(psyEmail)
          console.log('updatedPsy', updatedPsy)
          chai.expect(updatedPsy.isConventionSigned).not.to.exist
          chai.expect(updatedPsy.payingUniversityId).not.to.exist
        })
    })

    it('should not update if universityId is missing', async () => {
      const psyEmail = 'login@beta.gouv.fr'
      await dbPsychologists.savePsychologistInPG([clean.getOnePsy(psyEmail, 'accepte', false)])
      const psy = await dbPsychologists.getAcceptedPsychologistByEmail(psyEmail)
      // Check that the fields we are testing are unset before test
      chai.expect(psy.isConventionSigned).not.to.exist
      chai.expect(psy.payingUniversityId).not.to.exist

      return chai.request(app)
        .post('/psychologue/api/renseigner-convention')
        .set('Cookie', `token=${cookie.getJwtTokenForUser(psy.email, psy.dossierNumber)}`)
        .redirects(0) // block redirects, we don't want to test them
        .type('form')
        .send({
          signed: 'yes',
          // university: missing
        })
        .then(async () => {
          const updatedPsy = await dbPsychologists.getAcceptedPsychologistByEmail(psyEmail)
          console.log('updatedPsy', updatedPsy)
          chai.expect(updatedPsy.isConventionSigned).not.to.exist
          chai.expect(updatedPsy.payingUniversityId).not.to.exist
        })
    })

  })
})