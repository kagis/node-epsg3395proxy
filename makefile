.PHONY: run
run:
	docker build --tag node-epsg3395proxy-dev .
	docker run -it --rm -p 8000:80 node-epsg3395proxy-dev