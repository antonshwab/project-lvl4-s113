import buildFormObj from '../lib/formObjectBuilder';
import { encrypt } from '../lib/secure';
import logger from '../lib/logger';

const log = logger('app:session');

export default (router, { User }) => {
  router
    .get('newSession', '/session/new', async (ctx) => {
      const data = {};
      ctx.render('sessions/new', { f: buildFormObj(data) });
    })
    .post('session', '/session', async (ctx) => {
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
        ctx.redirect(router.url('root'));
        return;
      }
      ctx.flash.set('email or password were wrong');
      ctx.render('sessions/new', { f: buildFormObj({ email }) });
    })
    .delete('session', '/session', (ctx) => {
      ctx.session = {};
      ctx.redirect(router.url('root'));
    });
};

