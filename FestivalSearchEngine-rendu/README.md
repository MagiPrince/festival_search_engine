# Festival Search Engine

## Installation

First, the packages npm, apache, apidoc and mongodb must be installed.

Then move the public stuff :

``` bash
sudo rm -rf /var/www/html/*
sudo cp -r web/* /var/www/html/
```

run the server with the doc :

``` bash
cd rest
npm install
rm -rf doc
apidoc -e node_modules
npm start
```

## Execution

Open `http://localhost` in your favorite browser.

To read the documentation : open `http://localhost:8080/doc` in your browser.