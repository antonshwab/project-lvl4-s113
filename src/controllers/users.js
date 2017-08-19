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
      if (!ctx.session.userId) {
        ctx.flash.set('You need sign in to view this profile');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const userId = Number(ctx.params.id);

      if (ctx.session.userId !== userId) {
        ctx.flash.set('You can not view this profile');
        ctx.redirect(router.url('403'));
        return;
      }
      const user = await User.findById(userId);
      ctx.render('users/show', { user });
    })

    .get('editProfile', '/users/:id/edit', async (ctx) => {
      if (!ctx.session.userId) {
        ctx.flash.set('You need sign in to edit this profile');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const userId = Number(ctx.params.id);

      if (ctx.session.userId !== userId) {
        ctx.flash.set('You can not edit this profile');
        ctx.redirect(router.url('403'));
        return;
      }
      const user = await User.findById(userId);
      ctx.render('users/edit', { f: buildFormObj(user) });
    })

    .patch('updateProfile', '/users/:id', async (ctx) => {
      if (!ctx.session.userId) {
        ctx.flash.set('You need sign in to update this profile');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const userId = Number(ctx.params.id);

      if (ctx.session.userId !== userId) {
        ctx.flash.set('You can not update this profile');
        ctx.redirect(router.url('403'));
        return;
      }

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
        ctx.redirect(`/users/${userId}`);
      } catch (err) {
        rollbar.handleError(err);
        ctx.render('users/edit', { f: buildFormObj(user, err) });
      }
    })

    .delete('deleteUser', '/users/:id', async (ctx) => {
      if (!ctx.session.userId) {
        ctx.flash.set('You need sign in to delete this profile');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const userId = Number(ctx.params.id);

      if (ctx.session.userId !== userId) {
        ctx.flash.set('You can not delete this profile');
        ctx.redirect(router.url('403'));
        return;
      }

      await User.destroy({
        where: { id: userId },
      });
      log('Current session object: %o', ctx.session);
      ctx.session = {};
      ctx.flash.set('You was deleted');
      ctx.redirect(router.url('root'));
    });
};
