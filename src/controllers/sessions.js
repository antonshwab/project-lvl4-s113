import buildFormObj from '../lib/formObjectBuilder';
import encrypt from '../lib/secure';
import logger from '../lib/logger';

const log = logger('app:session');

export default (router, { User }) => {
  router
    .get('newSession', '/session/new', async (ctx) => {
      const data = {};
      ctx.render('sessions/new', { f: buildFormObj(data) });
    })
    .post('session', '/session', async (ctx) => {
      log('Sign in form: %o', ctx.request.body.form);
      const { email, password } = ctx.request.body.form;
      log('Sign in with email: %s, password: %s', email, password);
      const user = await User.findOne({
        where: {
          email,
        },
      });
      log('User: %o', user);
      if (user && user.passwordDigest === encrypt(password)) {
        ctx.session.userId = user.id;
        ctx.flash.set('You singed in');
        ctx.redirect(router.url('root'));
        return;
      }
      log('email or password were wrong or user don\'t exist');
      ctx.flash.set('email or password were wrong');
      ctx.state.flashNowMsg = 'email or password were wrong';
      log('current ctx.state: %o', ctx.state);

      ctx.render('sessions/new', { f: buildFormObj({ email }) });
    })
    .delete('session', '/session', (ctx) => {
      log('Current session object: %o', ctx.session);
      ctx.session = {};
      ctx.flash.set('You signed out');
      ctx.redirect(router.url('root'));
    });
};

