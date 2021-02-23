/* eslint-disable func-names */
const app = require('../index')
const chai = require('chai')
const sinon = require('sinon')
const clean = require('./helper/clean')
const dbPatients = require('../db/patients')

describe('patientsController', function() {
  describe('create patient', function() {
    let insertPatientStub;
    beforeEach(async function(done) {
      insertPatientStub = sinon.stub(dbPatients, 'insertPatient')
        .returns(Promise.resolve([ {
          'firstNames': 'prenom',
          'lastName': 'nom',
          'INE': 'studentNumber'}
        ]))
      done()
    })

    afterEach(async function() {
      await clean.cleanAllPatients()
      return Promise.resolve()
    })

    //@TODO fix me
    it('should create patient', function(done) {
      const prenoms = 'Prénom'
      const nom = 'Nom'
      const studentNumber = '1234567'

      chai.request(app)
        .post('/creer-nouveau-patient')
        .redirects(0) // block redirects, we don't want to test them
        .type('form')
        .send({
          'firstNames': prenoms,
          'lastName': nom,
          'INE': studentNumber,
        })
        .end((err, res) => {
          sinon.assert.called(insertPatientStub)
          res.should.redirectTo('/mes-seances');

          done();
        })
    })
  })
})
