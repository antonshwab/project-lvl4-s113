import rollbar from 'rollbar';
import buildFormObj from '../lib/formObjectBuilder';
import logger from '../lib/logger';
import {
  getRequiredAuth,
  getRequiredRights,
} from '../lib/helpers';

const log = logger('app:users');

export default (router, { User }) => {
  const reqAuth = getRequiredAuth(router);
  const reqRights = getRequiredRights(
    'hasRightsToViewUser',
    User,
    'You have no rights to view or change this user');

  router
    .get('users', '/users', async (ctx) => {
      const users = await User.findAll();
      ctx.render('users', { users });
    })

    .get('newUser', '/users/new', (ctx) => {
      const user = User.build();
      ctx.render('users/new', { f: buildFormObj(user) });
    })

    .post('newUser', '/users', async (ctx) => {
      const form = ctx.request.body.form;
      log('form: %o', ctx.request.body.form);
      const user = User.build(form);
      try {
        await user.save();
        ctx.flash.set('User has been created');
        ctx.redirect(router.url('root'));
      } catch (err) {
        log('newUser err:', err);
        rollbar.handleError(err);
        ctx.render('users/new', { f: buildFormObj(user, err) });
      }
    })

    .get('showUser', '/users/:id', reqAuth, reqRights, async (ctx) => {
      const userId = Number(ctx.params.id);
      const user = await User.findById(userId);
      ctx.render('users/show', { user });
    })

    .get('editProfile', '/users/:id/edit', reqAuth, reqRights, async (ctx) => {
      const userId = Number(ctx.params.id);
      const user = await User.findById(userId);
      ctx.render('users/edit', { f: buildFormObj(user) });
    })

    .patch('updateProfile', '/users/:id', reqAuth, reqRights, async (ctx) => {
      const userId = Number(ctx.params.id);
      const form = ctx.request.body.form;
      const user = await User.findById(userId);
      try {
        await user.update({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
        }, { where: { id: userId } });
        ctx.flash.set('User profile was updated');
        ctx.redirect(router.url('showUser', userId));
      } catch (err) {
        rollbar.handleError(err);
        ctx.render('users/edit', { f: buildFormObj(user, err) });
      }
    })

    .delete('deleteUser', '/users/:id', reqAuth, reqRights, async (ctx) => {
      const userId = Number(ctx.params.id);
      await User.destroy({
        where: { id: userId },
      });
      log('Current session object: %o', ctx.session);
      ctx.session = {};
      ctx.flash.set('You was deleted');
      ctx.redirect(router.url('root'));
    });
};
