const path = require("path");

express = require('express'),
app = express(),

axios = require('axios'),

fs = require('fs'),
Log = require("log"),
log = new Log("debug"),

cors = require('cors'),

db = require('monk')('mongodb://localhost:27017/admin'),

app.use(cors());
app.use("/doc", express.static(path.join(__dirname, "doc")));

app.get("/doc", function(req, res) {
    log.debug("doc");
    res.sendFile(path.join(__dirname, "doc/index.html"));
});

spotify_url = "https://api.spotify.com/v1/search",
SpotifyWebApi = require('spotify-web-api-node'),
clientId = '10478038411746cb8e99a390a8d918df',
clientSecret = 'clientSecret',
// Create the api object with the credentials
spotifyApi = new SpotifyWebApi({
    clientId : clientId,
    clientSecret : clientSecret
}),
manage_token = {
    access_token: "",
    expires_in: 0
},

key_eventful = "WSpR5fzQ69N3w2FL",
eventful_url = "http://api.eventful.com/json/events/search",
page_size = 250,

bands_in_town_url = "https://rest.bandsintown.com/artists/",
bands_in_town_key = "key",
music_brainz_url = "http://musicbrainz.org/ws/2/artist/",

is_defined = function(str) {
    return str != null || str != undefined ? str : "";
};

// Create URL for BandsInTown
url_bands_in_town = function(artist, app_id) {
    return bands_in_town_url + artist + "?app_id=" + bands_in_town_key;
};

// Check if token Spotify is already valid, else reach a new one.
check_spotify_token = function() {
    if (manage_token.expires_in <= (new Date().getTime() / 1000)) {
        log.debug("new token");
        return spotifyApi.clientCredentialsGrant()
        .then(data => {
            manage_token.access_token = data.body.access_token;
            manage_token.expires_in = (new Date().getTime() / 1000) + data.body.expires_in;
            return spotifyApi.setAccessToken(data.body['access_token']);
        });
    }
    else {
        log.debug("token existent");                
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
};

check_spotify_token();

const dbEvents = db.get("events");
const time = 24 * 3600;
dbEvents.createIndex({ "createdAt": 1 }, { expireAfterSeconds: time });

events = function(req, res){
    try{
        let artist = req.params.artist;
        let location = req.params.location;
        res.type('json');

        if (artist === undefined){
            let doc = dbEvents.findOne({artist: artist, location: location});
            
            if (doc.events){
                res.status(200).end(JSON.stringify({events: doc.events}));
            }
            else{
    
                let events = [];
                axios.get(eventful_url, {
                    params: {
                        app_key: key_eventful,
                        location: location,
                        category: "music,festivals_parades",
                        date: "future",
    
                    }
                })
                .then(response => {
                    if (response.data) {
                        response.data.events.event.forEach(event => {
                            let performers = undefined;
                            if (event.performers){
                                performers = event.performers.performer
                            }
                            events.push({
                                watchers: event.going_count,
                                latitude: event.latitude,
                                longitude: event.longitude,
                                title: event.title,
                                url: event.url,
                                start_time: event.start_time,
                                description: event.description,
                                performers: performers
                            })
                        });
                        
                }
                })
                .then(response => {
                    res.status(200).end(JSON.stringify({events: events}));
        
                    dbEvents.insert({
                        location: location,
                        artist: artist,
                        events: events,
                        createdAt: new Date()
                    });
                })
                .catch(error => {
                    console.log(error.message)
                });
    
            }
        }
        else {
            let doc = dbEvents.findOne({artist: artist, location: location});
            if (doc.events){
                res.status(200).end(JSON.stringify({events: doc.events}));
            }
            else{
    
                let events = [];
                axios.get(bands_in_town_url + artist + "/events", {
                    params: {
                        app_id: bands_in_town_key,
                        date: "upcoming"    
                    }
                })
                .then(response => {
                    if (response.data) {
                        response.data.forEach(event => {
                            events.push({
                                watchers: undefined,
                                latitude: event.venue.latitude,
                                longitude: event.venue.longitude,
                                title: event.venue.name,
                                url: event.url,
                                start_time: event.datetime,
                                description: event.description,
                                performers: {
                                    name: event.lineup[0],
                                    short_bio: "bio indisponible"
                                }
                            })
                        });
                        
                }
                })
                .then(response => {
                    res.status(200).end(JSON.stringify({events: events}));
        
                    dbEvents.insert({
                        location: location,
                        artist: artist,
                        events: events,
                        createdAt: new Date()
                    });
                })
                .catch(error => {
                    console.log(error.message)
                });
    
            }
        }

    }
    catch (error) {
        res.status(500).send(error);
    }
}

app.get("/events/artist=:artist?/location=:location?", events);

const dbTracks = db.get("tracks");
dbTracks.createIndex({ "createdAt": 1 }, { expireAfterSeconds: time });

tracks = function(req, res){
    check_spotify_token();
    
    try{
        
        let artist = req.params.artist;
        res.type('json');

        let doc = dbTracks.findOne({artist: artist});
        if (doc.tracks){
            res.status(200).end(JSON.stringify({tracks: doc.tracks}));
        }
        else{

            let tracks = [];
            axios.get(spotify_url, {
                params: {
                    q: artist,
                    type: "track",
                    access_token: manage_token.access_token
                }
            })
            .then(response => {
                if (response.data) {
                    response.data.tracks.items.forEach(item => {
                        tracks.push({
                            preview_url: item.preview_url,
                            name: item.name,
                            album: item.album.name
                        })
                    })
                }
            })
            .then(response => {
                res.status(200).end(JSON.stringify({tracks: tracks}));
    
                dbTracks.insert({
                    artist: artist,
                    tracks: tracks,
                    createdAt: new Date()
                });
            
            })
            .catch(error => {
                console.log(error.message)
            });

        }

    }
    catch (error) {
        res.status(500).send(error);
    }
}

app.get("/tracks/artist=:artist?", tracks);

const dbInfos = db.get("infos");
dbInfos.createIndex({ "createdAt": 1 }, { expireAfterSeconds: time });

infos = function(req, res){
    try{
        
        let artist = req.params.artist;
        res.type('json');

        let doc = dbInfos.findOne({artist: artist});
        if (doc.infos){
            res.status(200).end(JSON.stringify({infos: doc.infos}));
        }
        else{

            let infos;
            axios.get(music_brainz_url, {
                params: {
                    fmt: "json",
                    query: artist
                }
            })
            .then(response => {
                if (response.data) {
                    art = response.data.artists[0];
                    infos = {
                        name: art.name,
                        type: art.type,
                        ended: art['life-span'].ended,
                        disambiguation: art.disambiguation
                    }
                }
            })
            .then(response => {
                res.status(200).end(JSON.stringify({infos: infos}));
    
                dbTracks.insert({
                    artist: artist,
                    infos: infos,
                    createdAt: new Date()
                });
            })
            .catch(error => {
                console.log(error.message)
            });

        }

    }
    catch (error) {
        res.status(500).send(error);
    }
}

app.get("/infos/artist=:artist?", infos);

app.all("*", function(req, res) {
	log.error("Requested:", req.url);
	res.status(404).send("404 Page not found.");
});

app.listen(8080);


/**
 * @api {get} /events/artist=:artist?/location=:location? 
 * 
 * @apiName GetEvents
 * @apiGroup events
 * @apiVersion  0.1.0
 * 
 * @apiDescription Return futur events in function of artist and location from Eventful and BandsInTown,
 * with API methods <a href="http://api.eventful.com/docs/events/search">/events/search</a> and 
 * <a href="https://app.swaggerhub.com/apis/Bandsintown/PublicAPI/3.0.0#/single_artist_information/artist">/artists/{artistname}</a> respectively.
 * Fix the name of the artist by making a request to <a href="https://developer.spotify.com/web-api/search-item/">Spotify Search</a>.
 * Artist and location params cannot be empty at same time (no_params_provided error).
 * To note that all string fields can be string empty ("").
 * 
 * @apiParam  {String} artist Optional artist name
 * @apiParam  {String} location Optional location name
 *
 * @apiSuccess {Object[]} events Array of events
 * @apiSuccess {String}   events.watchers Event's going count
 * @apiSuccess {String}   events.latitude Event's latitude
 * @apiSuccess {String}   events.longitude Event's longitude
 * @apiSuccess {String}   events.title Event's title
 * @apiSuccess {String}   events.url Event's URL from Eventful
 * @apiSuccess {String}   events.start_time Event's date"
 * @apiSuccess {String}   events.description Event's description
 *
 * @apiSuccess {Object[]} events.performers Event's performers
 * @apiSuccess {String}   events.performers.name Performer's name
 * @apiSuccess {String}   events.performers.short_bio Performer's kind of music (short)
 *
 * @apiError no_events {Boolean} No events found
 * 
 * @apiParamExample  {json} Request-Example:
 * {
 *   "location": "geneve"
 * }
 *
 */


 /**
 * @api {get} /tracks/artist=:artist
 * 
 * @apiName GetTracks
 * @apiGroup tracks
 * @apiVersion  0.1.0
 *
 * @apiDescription Return the top-tracks infos for this artist from Spotify.
 * Also contains the track preview's URL if existent (<a href="https://developer.spotify.com/web-api/get-artists-top-tracks/">Top tracks</a> route).
 * 
 * @apiParam  {String} artist The artist name
 *
 * @apiSuccess {Object[]} tracks Array of tracks
 * @apiSuccess {String}   tracks.preview_url URL of the track preview
 * @apiSuccess {String}   tracks.name Tracks's title
 * @apiSuccess {String}   tracks.album Name of the album the track's in
 *
 * @apiError artist_not_found {Boolean} The given artist wasn't found
 * @apiError no_artist_and_code_provided {Boolean} No artist and code was given to the API 
 * @apiError preview_not_found {Boolean} No top tracks has preview
 * 
 * @apiParamExample  {json} Request-Example:
 * {
 *   "artist": "Olivier Giacomotto",
 * }
 *
 */

 /**
 * @api {get} /infos/artist=:artist 
 * 
 * @apiName GetInfos
 * @apiGroup infos
 * @apiVersion  0.1.0
 * 
 * @apiDescription Return infos about artist from 
 * <a href="https://musicbrainz.org/doc/Development/JSON_Web_Service">MusicBrainz</a> 
 * 
 * @apiParam  {String} artist Artist name
 *
 * @apiSuccess {Object}    artist Artist object
 * @apiSuccess {String}    artist.name Artist's name
 * @apiSuccess {String}    artist.type Information to know if it's a band or single artist
 * @apiSuccess {String}    artist.disambiguation Artist's disambiguation = kind of music
 * @apiSuccess {Boolean}   artist.ended If the artist/group don't exist anymore
 * 
 * @apiError artist_not_found {Boolean} The given artist wasn't found
 * @apiError no_artist_provided {Boolean} No artist was given to the API
 *
 * @apiParamExample  {json} Request-Example:
 * {
 *   "artist": "Olivier Giacomotto"
 * }
 *
 */
