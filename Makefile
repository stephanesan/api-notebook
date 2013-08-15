deploy:
	@grunt build
	@mkdir deploy
	@cp -r lib          deploy/lib
	@cp -r build        deploy/build
	@cp -r routes       deploy/routes
	@cp -r app.js       deploy/app.js
	@cp -r Procfile     deploy/Procfile
	@cp -r package.json deploy/package.json
	@cd deploy && git init . && git add . && git commit -m \"Deploy\" && \
	git push "git@heroku.com:stark-brook-6792.git" master:master --force
	@rm -rf deploy
