# GeosoftwareProject
Development of the final project of the course "Geosoftware I" by Luc N., Phil H. and Lukas B.

## GitHub Repository
[GeosoftwareProject](https://github.com/Delucse/GeosoftwareProject)

## Getting Started

1. [Download](https://github.com/Delucse/GeosoftwareProject/archive/master.zip) or clone the GitHub Repository
``git clone https://github.com/Delucse/GeosoftwareProject``

2. Create your own API-Tokens by getting registered on the websites below
   * Here (https://developer.here.com)
   * Movebank (https://www.movebank.org)
   * OpenWeatherMap (https://openweathermap.org)

3. Create the file ``token.js`` with the following content in the ``config`` folder:

```
GeosoftwareProject
└─┬ config
  └── token.js
```

```// hack to make "exports" available in the browser as globals
if(typeof exports == "undefined"){
  var exports = window;
}

// tokens tokens tokens...
exports.token = {
   secretSession: "your individual string", //for example "abc"
   HERE_APP_ID_TOKEN: "your here id token",
   HERE_APP_CODE_TOKEN: "your here code token",
   MOVEBANK_USERNAME: "your movebank username",
   MOVEBANK_PASSWORD: "your movebank password",
   OPENWEATHERMAP_TOKEN: "your openweathermap token"
};
```

* info: [sample data](../master/sampleData.txt) in folder ``data`` were created with the native MongoDB installation (version 4.2)


## Starting with Docker:

1. install Docker on your local machine
2. ensure that the data folder is shared
3. open shell and navigate to folder ``GeosoftwareProject``
4. run ``docker-compose up``


## Starting without Docker:
1. install [Node.js v10.xx](https://nodejs.org/en/) and [MongoDB v4.xx](https://www.mongodb.com/download-center/community?) on your local machine
2. open shell and create MongoDB (on Windows: ``"C:\Program Files\MongoDB\Server\4.2\bin\mongod.exe" --dbpath="C:\path_to_GeosoftwareProject\data"``)
3. open another shell and navigate to folder ``GeosoftwareProject``
4. run ``npm install``
5. run ``npm start``


## Credentials
   | username  | password |
   | --------- | -------- |
   | guest1    | 123      |
   | guest2    | 456      |


## Running tests
1. ensure that steps 1 - 4 of [Starting without Docker](../master/README.md#starting-without-docker) are completed
2. run ``npm test``


## JSDoc
the generated HTML pages of the JSDoc documentation are located in [``JSDoc``](../master/out)


## Annotations
* Phil made his Commits with InelliJ. He was linked to this repository, but his Commits does not count on his account. There must have been a mistake while work.
So he made Commits not listed in the statistics.
* We used the Leaflet Routing-Machine for our Creation of routes. For more information see [``here``](https://www.liedman.net/leaflet-routing-machine/). Thanks to Per Liedman.


## Task
further information about the task at [Termin13.pdf](https://sso.uni-muenster.de/LearnWeb/learnweb2/pluginfile.php/2000309/mod_resource/content/1/Termin%2013.pdf)


## Authors
   * Luc N.
   * Phil H.
   * Lukas B.
