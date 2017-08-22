import 'babel-polyfill';

import dotenv from 'dotenv';
import path from 'path';
import Koa from 'koa';
import Pug from 'koa-pug';
import Router from 'koa-router';
import koaLogger from 'koa-logger';
import serve from 'koa-static';
import middleware from 'koa-webpack';
import bodyParser from 'koa-bodyparser';
import session from 'koa-generic-session';
import flash from 'koa-flash-simple';
import _ from 'lodash';
import methodOverride from 'koa-methodoverride';
import rollbar from 'rollbar';

import getWebpackConfig from '../webpack.config.babel';
import addRoutes from './controllers';
import container from './container';
import logger from './lib/logger';

const log = logger('app:index');

export default () => {
  const app = new Koa();

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      log('Error from top error handler: %o', err);
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit('error', err, ctx);
    }
  });

  app.on('error', (err, ctx) => {
    log('Hello from error handling middleware!: %o', err);
    ctx.status = err.status;
    switch (err.status) {
      case 404:
        ctx.render('errors/404', { errMsg: ctx.body });
        break;
      case 403:
        ctx.flash.set(ctx.body);
        break;
      default:
        ctx.render('errors/500', { errMsg: ctx.body });
    }
  });

  app.keys = ['some secret hurr'];
  app.use(session(app));
  app.use(flash());
  app.use(async (ctx, next) => {
    ctx.state = {
      flash: ctx.flash,
      currentUser: {
        id: Number(ctx.session.userId),
        isSignedIn: () => ctx.session.userId !== undefined,
        hasRightsToViewUser: user => user.id === ctx.state.currentUser.id,
        hasRightsToEditTask: task =>
          task.creatorId === ctx.state.currentUser.id ||
          task.assignedToId === ctx.state.currentUser.id,
        hasRightsToDeleteTask: task =>
          task.creatorId === ctx.state.currentUser.id,
      },
    };
    await next();
  });
  app.use(bodyParser());
  app.use(methodOverride((req) => { // eslint-disable-line consistent-return
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      return req.body._method; // eslint-disable-line no-underscore-dangle
    }
  }));
  app.use(serve(path.join(__dirname, '..', 'public')));

  if (process.env.NODE_ENV !== 'test') {
    app.use(middleware({
      config: getWebpackConfig(),
    }));
  }

  app.use(koaLogger());
  const router = new Router();
  addRoutes(router, container);
  app.use(router.allowedMethods());
  app.use(router.routes());

  app.use(async (ctx) => {
    ctx.throw(404);
  });

  const pug = new Pug({
    viewPath: path.join(__dirname, 'views'),
    debug: true,
    pretty: true,
    compileDebug: true,
    locals: [],
    basedir: path.join(__dirname, 'views'),
    helperPath: [
      { _ },
      { urlFor: (...args) => router.url(...args) },
    ],
  });
  pug.use(app);

  dotenv.config();

  rollbar.init(process.env.ROLLBAR);
  rollbar.reportMessage('Hello!');
  app.use(rollbar.errorHandler(process.env.ROLLBAR));

  return app;
};
