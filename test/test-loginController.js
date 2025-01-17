/* eslint-disable func-names */
const rewire = require('rewire');
const sinon = require('sinon');
const chai = require('chai');
const app = require('../index')
const loginController = rewire('../controllers/loginController');
const dbLoginToken = require('../db/loginToken');
const dbPsychologists = require('../db/psychologists');
const emailUtils = require('../utils/email');
const cookie = require('../utils/cookie');
const config = require('../utils/config');
const testUtils = require('./helper/utils');

describe('loginController', async function() {
  let _csrf;
  let cookies;

  describe('generateLoginUrl', () => {
    it('should create a login url to send in a email', function() {
      const generateLoginUrl = loginController.__get__('generateLoginUrl');
      const output = generateLoginUrl();

      output.should.equal("http://localhost:8080/psychologue/login");
    })
  })

  describe('generateToken', () => {
    it('should generate a token', function() {
      const generateToken = loginController.__get__('generateToken');
      const output = generateToken("localhost:8080");
      output.length.should.equal(128);
    })

    it('should generate a different token everytime the function is called', function() {
      const generateToken = loginController.__get__('generateToken');
      const output1 = generateToken("localhost:8080");
      const output2 = generateToken("localhost:8080");

      output1.length.should.not.equal(output2);
    })
  })

  describe('login page', () => {
    const token = cookie.getJwtTokenForUser("email");
    const email = "prenom.nom@beta.gouv.fr";

    describe('getLogin', () => {
      let getByTokenStub;
      let deleteTokenStub;
      let getAcceptedPsychologistByEmailStub;
      beforeEach(async function() {
        deleteTokenStub = sinon.stub(dbLoginToken, 'delete')
          .returns(Promise.resolve());

        getAcceptedPsychologistByEmailStub = sinon.stub(dbPsychologists, 'getAcceptedPsychologistByEmail')
          .returns(Promise.resolve({
            email: email,
            state: 'accepte',
          }));
      })

      afterEach(function(done) {
        getByTokenStub.restore();
        deleteTokenStub.restore();
        getAcceptedPsychologistByEmailStub.restore();
        done();
      })

      it('should log someone in', function(done) {
        getByTokenStub = sinon.stub(dbLoginToken, 'getByToken')
        .returns(Promise.resolve(
          {
            token: token,
            email : email
          }
        ));

        chai.request(app)
        .get(`/psychologue/login?token=${encodeURIComponent(token)}`)
        .redirects(0)
        .end((err, res) => {
          sinon.assert.called(getByTokenStub)
          sinon.assert.called(deleteTokenStub)
          sinon.assert.called(getAcceptedPsychologistByEmailStub)
          res.should.have.cookie('token');
          res.should.redirectTo('/psychologue/mes-seances')
          done();
        })
      });

      it('should NOT log someone in', function(done) {
        getByTokenStub = sinon.stub(dbLoginToken, 'getByToken')
        .returns(Promise.resolve());

        chai.request(app)
        .get(`/psychologue/login?token=${encodeURIComponent("pizza_for_token")}`)
        .redirects(0)
        .end((err, res) => {
          sinon.assert.called(getByTokenStub)
          sinon.assert.notCalled(deleteTokenStub)
          sinon.assert.notCalled(getAcceptedPsychologistByEmailStub)
          res.should.not.have.cookie('token');
          done();
        })
      });
    });

    describe('postLogin', () => {
      let insertTokenStub;
      let getAcceptedPsychologistByEmailStub;
      let getNotYetAcceptedPsychologistStub;
      let sendMailStub;

      beforeEach(async function() {
        insertTokenStub = sinon.stub(dbLoginToken, 'insert')
          .returns(Promise.resolve());

        sendMailStub = sinon.stub(emailUtils, 'sendMail')
          .returns(Promise.resolve());
      })

      afterEach(function(done) {
        insertTokenStub.restore();
        getAcceptedPsychologistByEmailStub.restore();
        sendMailStub.restore();
        if( getNotYetAcceptedPsychologistStub ) {
          getNotYetAcceptedPsychologistStub.restore();
        }
        done();
      })

      it('send a login email', function(done) {
        getAcceptedPsychologistByEmailStub = sinon.stub(dbPsychologists, 'getAcceptedPsychologistByEmail')
        .returns(Promise.resolve({
          email: email,
          state: 'accepte',
        }));

        chai.request(app)
        .get(`/psychologue/login`)
        .end(function(err, res){
          _csrf = testUtils.getCsrfTokenHtml(res);
          cookies = testUtils.getCsrfTokenCookie(res);
          chai.request(app)
          .post('/psychologue/login')
          .type('form')
          .set('cookie',cookies)
          .send({
            'email': 'prenom.nom@beta.gouv.fr',
            '_csrf': _csrf,
          })
          .end((err, res) => {
            sinon.assert.called(getAcceptedPsychologistByEmailStub);
            sinon.assert.called(sendMailStub);
            sinon.assert.called(insertTokenStub);
            done();
          })
        });
      });

      it('send a not accepted yet email', function(done) {
        getAcceptedPsychologistByEmailStub = sinon.stub(dbPsychologists, 'getAcceptedPsychologistByEmail')
        .returns(Promise.resolve(undefined));

        getNotYetAcceptedPsychologistStub = sinon.stub(dbPsychologists, 'getNotYetAcceptedPsychologistByEmail')
        .returns(Promise.resolve({
          email: email,
          state: 'en_construction',
        }));

        chai.request(app)
        .get(`/psychologue/login`)
        .end(function(err, res){
          _csrf = testUtils.getCsrfTokenHtml(res);
          cookies = testUtils.getCsrfTokenCookie(res);
          chai.request(app)
          .post('/psychologue/login')
          .type('form')
          .set('cookie',cookies)
          .send({
            'email': 'prenom.nom@beta.gouv.fr',
            '_csrf': _csrf,
          })
          .end((err, res) => {
            sinon.assert.called(getAcceptedPsychologistByEmailStub);
            sinon.assert.called(getNotYetAcceptedPsychologistStub);
            sinon.assert.called(sendMailStub);
            sinon.assert.notCalled(insertTokenStub);
            done();
          })
        });
      });

      it('send no email if unknowned email or refuse or sans suite', function(done) {
        getAcceptedPsychologistByEmailStub = sinon.stub(dbPsychologists, 'getAcceptedPsychologistByEmail')
        .returns(Promise.resolve(undefined));

        getNotYetAcceptedPsychologistStub = sinon.stub(dbPsychologists, 'getNotYetAcceptedPsychologistByEmail')
        .returns(Promise.resolve());

        chai.request(app)
        .get(`/psychologue/login`)
        .end(function(err, res){
          _csrf = testUtils.getCsrfTokenHtml(res);
          cookies = testUtils.getCsrfTokenCookie(res);
          chai.request(app)
          .post('/psychologue/login')
          .type('form')
          .set('cookie',cookies)
          .send({
            'email': 'prenom.nom@beta.gouv.fr',
            '_csrf': _csrf,
          })
          .end((err, res) => {
            sinon.assert.called(getAcceptedPsychologistByEmailStub);
            sinon.assert.called(getNotYetAcceptedPsychologistStub);
            sinon.assert.notCalled(sendMailStub);
            sinon.assert.notCalled(insertTokenStub);
            done();
          })
        });
      });

      it('should refuse login if csrf token is invalid', function(done) {
        getAcceptedPsychologistByEmailStub = sinon.stub(dbPsychologists, 'getAcceptedPsychologistByEmail')
        .returns(Promise.resolve({
          email: email,
          state: 'accepte',
        }));

        chai.request(app)
        .get(`/psychologue/login`)
        .end(function(err, res){
          _csrf = testUtils.getCsrfTokenHtml(res);
          cookies = testUtils.getCsrfTokenCookie(res);
          chai.request(app)
          .post('/psychologue/login')
          .type('form')
          .set('cookie',cookies)
          .send({
            'email': 'prenom.nom@beta.gouv.fr',
            '_csrf': 'fake_token__csrf',
          })
          .end((err, res) => {
            if( config.useCSRF ) {
              sinon.assert.notCalled(getAcceptedPsychologistByEmailStub);
              sinon.assert.notCalled(sendMailStub);
              sinon.assert.notCalled(insertTokenStub);
            } else {
              sinon.assert.called(getAcceptedPsychologistByEmailStub);
              sinon.assert.called(sendMailStub);
              sinon.assert.called(insertTokenStub);
            }
            done();
          })
        });
      });

      it('should say that email is invalid', function(done) {
        getAcceptedPsychologistByEmailStub = sinon.stub(dbPsychologists, 'getAcceptedPsychologistByEmail')
        .returns(Promise.resolve({
          email: email,
          state: 'accepte',
        }));

        chai.request(app)
        .get(`/psychologue/login`)
        .end(function(err, res){
          _csrf = testUtils.getCsrfTokenHtml(res);
          cookies = testUtils.getCsrfTokenCookie(res);

          chai.request(app)
          .post('/psychologue/login')
          .type('form')
          .set('cookie',cookies)
          .send({
            'email': 'fake_it',
            '_csrf': _csrf,
          })
          .redirects(0)
          .end((err, res) => {
            sinon.assert.notCalled(getAcceptedPsychologistByEmailStub);
            sinon.assert.notCalled(sendMailStub);
            sinon.assert.notCalled(insertTokenStub);
            res.should.redirectTo('/psychologue/login');
            done();
          })
        });
      });
    });
  });
})
