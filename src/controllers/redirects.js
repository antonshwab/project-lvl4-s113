export default (router) => {
  router
    .get('403', '/403', async (ctx) => {
      ctx.status = 403;
      ctx.render('redirects/403');
    })
    .get('404', '/404', async (ctx) => {
      ctx.status = 404;
      ctx.render('redirects/404');
    });
};
