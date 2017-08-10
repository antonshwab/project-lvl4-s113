export default (router) => {
  router.get('root', '/', (ctx) => {
    ctx.render('welcome/index', { session: ctx.session });
  });
};
