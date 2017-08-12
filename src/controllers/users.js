import rollbar from 'rollbar';
import buildFormObj from '../lib/formObjectBuilder';
import logger from '../lib/logger';

const log = logger('app:users');

export default (router, { User }) => {
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
        rollbar.handleError(err);
        ctx.render('users/new', { f: buildFormObj(user, err) });
      }
    })
    .get('showUser', '/users/:id', async (ctx) => {
      const userId = Number(ctx.params.id);
      const user = await User.findById(userId);
      if (user && userId === ctx.session.userId) {
        ctx.render('users/show', { user });
      } else {
        ctx.flash.set('You need sign in to view this profile');
        ctx.redirect(router.url('newSession'));
      }
    })
    .get('editProfile', '/users/:id/edit', async (ctx) => {
      const userId = Number(ctx.params.id);
      if (ctx.session.userId === userId) {
        const user = await User.findById(userId);
        ctx.render('users/edit', { f: buildFormObj(user) });
      } else {
        ctx.flash.set('You need sign in to edit this profile');
        ctx.redirect(router.url('newSession'));
      }
    })
    .patch('updateProfile', '/users/:id', async (ctx) => {
      const userId = Number(ctx.params.id);
      const form = ctx.request.body.form;
      const user = await User.findById(userId);
      if (ctx.session.userId === userId) {
        try {
          await user.update({
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            password: form.password,
          }, { where: { id: userId } });
          ctx.flash.set('User profile was updated');
          ctx.redirect(`/users/${userId}`);
        } catch (err) {
          rollbar.handleError(err);
          ctx.render('users/edit', { f: buildFormObj(user, err) });
        }
      } else {
        ctx.flash.set('You need sign in to edit this profile');
        ctx.redirect(router.url('newSession'));
      }
    })
    .delete('deleteUser', '/users/:id', async (ctx) => {
      const userId = Number(ctx.params.id);
      if (ctx.session.userId === userId) {
        await User.destroy({
          where: { id: userId },
        });
        log('Current session object: %o', ctx.session);
        ctx.session = {};
        ctx.flash.set('You was deleted');
        ctx.redirect(router.url('root'));
      } else {
        ctx.flash.set('You need sing in to edit this profile');
        ctx.redirect(router.url('newSession'));
      }
    });
};
