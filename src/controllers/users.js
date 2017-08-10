import rollbar from 'rollbar';
import buildFormObj from '../lib/formObjectBuilder';

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
    .post('users', '/users', async (ctx) => {
      const form = ctx.request.body.form;
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
    .get('profile', '/users/:id', async (ctx) => {
      const userId = Number(ctx.params.id);
      const user = await User.findById(userId);
      if (user) {
        ctx.render('users/profile', { user });
      } else {
        ctx.redirect(router.url('newSession'));
      }
    })
    .get('editProfile', '/users/:id/edit', async (ctx) => {
      const userId = Number(ctx.params.id);
      const user = await User.findById(userId);
      ctx.render('users/editProfile', { f: buildFormObj(user) });
    })
    .patch('updateProfile', '/users/:id', async (ctx) => {
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
        ctx.flash.set('Profile was updated');
        ctx.redirect(`/users/${userId}`);
      } catch (err) {
        rollbar.handleError(err);
        ctx.render('users/editProfile', { f: buildFormObj(user, err) });
      }
    })
    .delete('deleteProfile', '/users/:id', async (ctx) => {
      const userId = Number(ctx.params.id);
      if (ctx.session.userId === userId) {
        await User.destroy({
          where: { id: userId },
        });
        ctx.session = {};
        ctx.redirect(router.url('root'));
      } else {
        ctx.flash.set('You can\'t delete other');
        ctx.redirect(router.url('root'));
      }
    });
};
