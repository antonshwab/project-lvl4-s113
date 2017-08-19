export default (router) => {
  router
    .get('403', '/403', async (ctx) => {
      ctx.status = 403;
      ctx.render('redirects/403');
    });
};
