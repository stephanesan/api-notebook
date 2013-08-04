CURRENT_BRANCH := $$(git rev-parse --abbrev-ref HEAD)

deploy:
	@grunt build
	@cd ./build && git init . && git add . && git commit -m \"Deploy\" && \
	git push "git@github.com:blakeembrey/jsnotebook.git" $(CURRENT_BRANCH):gh-pages --force && rm -rf .git
