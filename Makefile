install: install-deps

console:
	npm run gulp console

init:
	npm run gulp init

start:
	DEBUG="app:*" npm run nodemon -- --watch src --ext '.js,.pug' --exec npm run gulp -- server

install-deps:
	yarn

build:
	rm -rf dist
	npm run build

test:
	NODE_ENV=test npm test

lint:
	npm run eslint -- src __tests__

publish:
	npm publish

.PHONY: test
