let map;
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: {lat: 46.801111, lng: 8.226667},
        zoom: 8,
        maxZoom: 16
    });

    addMarkers()

};

function getURLParam(param) {
    var params = decodeURIComponent(window.location.search.substring(1));
    var URLParams = params.split("&");
    var i;
    for(i = 0 ; i < URLParams.length ; i++) {
        var URLParam = URLParams[i].split("=");
        if(URLParam[0] === param)
            return URLParam[1];
    }

    return undefined;
};

function addMarkers() {
    var JSONQuery;
    var artistQuery = getURLParam("artistQuery");
    var locationQuery = getURLParam("locationQuery");
    
    if(artistQuery === undefined && locationQuery === undefined)
        JSONQuery = "http://localhost:8080/events/artist=/location=Switzerland";
    
    else if(artistQuery === undefined || artistQuery === "") {
        JSONQuery = "http://localhost:8080/events/artist=/location=" + locationQuery + "";
    }
    
    else if(locationQuery === undefined || locationQuery === "")
        JSONQuery = "http://localhost:8080/events/artist=" + artistQuery + "/location=";
    
        else {
        JSONQuery = "http://localhost:8080/events/artist=" + artistQuery + "/location=" + locationQuery;
    }

    $.getJSON(JSONQuery)
    .done(function(response) {
        var markers = [];
        var oms = new OverlappingMarkerSpiderfier(map, {
              markersWontMove: true,
              markersWontHide: true,
              basicFormatEvents: true,
            keepSpiderfied: true,
            nearbyDistance:1,
            legWeight:3
        });
        console.log(response);
        response.events.forEach(function (event) {
            var location = {
                lat: parseFloat(event.latitude),
                lng: parseFloat(event.longitude)
            };
            var marker = new google.maps.Marker({
                position: location,
                map: map,
                title: event.title
            });

            marker.addListener("click", function(){
                $("#event").html("");
                $("#audio").html("");
                $("#artist").html("");
                selectEvent(event);
            });
            oms.trackMarker(marker);
            markers.push(marker);
        });
        var markerCluster = new MarkerClusterer(map, markers, {
            imagePath: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
            maxZoom: 12
        });
    })
    .fail(function(error) {
        console.log("error in events request : ", error);
    });
};

function selectEvent(event) {

    var html = "<h2>Event : " + event.title + "</h2><p>";
    if (event.description)
        html += event.description;
    else
        html += "Pas de description disponible";
    html += "</p><p> nombres de gens interessés : ";
    if (event.watchers){
        html += event.watchers;
    } else {
        html += "Nombre indéfini";
    }
    html += "</p><p>" + event.url + "</p>";
    html += "<span>Date : " + event.start_time + "</span>";
    if (event.performers){
        html += "<h3>All artists :</h3>";
        multiplePerformers = Array.isArray(event.performers)
        if (multiplePerformers){
            event.performers.forEach(artist => {
                // html += "<span class='artist' artistID='" + i + "'>";
                // if(artist.thumb != "")
                //     html += "<img src='" + artist.thumb + "'>";
                // else if(artist.image != "")
                //     html += "<img src='" + artist.image + "'>";
            html += "<span><h4>" + artist.name + "</h4> " + artist.short_bio + " </span>";
            });
        }
        else{
            html += "<span><h4>" + event.performers.name + "</h4> " + event.performers.short_bio + " </span>";
        }
    }
    else {
        html+= "<h3>Ce festival n'a aucune information d'artistes</h3>";
    }

    $("#event").html(html);
    if (event.performers){
        performer = multiplePerformers ? event.performers[0] : event.performers; 
        playArtist(performer);
        getArtistInfos(performer);
    }
    $("#event").show();
}

function playArtist(artist) {
    $.getJSON("http://localhost:8080/tracks/artist=" + artist.name)
    .done(function(response) {
        console.log(response)
        var previewIndex = Math.floor((Math.random() * (response.tracks.length - 1)));
        while(response.tracks[previewIndex].preview_url == "")
            previewIndex = Math.floor((Math.random() * (response.tracks.length - 1)));
        var track = response.tracks[previewIndex];
        var html = "<audio autoplay><source src='" + track.preview_url + "' type='audio/mp3'></audio>";
        html += "<h2>Audio played</h2>";
        html += "song : " + track.name + " album : " + track.album;
        
        html += "<h3>All tracks : </h3>"
        html += "<ol>"
        for (i = 0;i < response.tracks.length;i++) {
            html += "<li>song : " + response.tracks[i].name + " album : " + response.tracks[i].album + "</li>";
        }
        html += "</ol>";
        $("#audio").html(html);
    })
    .fail(function(error) {
        console.log("Fail tracks");
    });
};

function getArtistInfos(artist){

    $.getJSON("http://localhost:8080/infos/artist=" + artist.name)
    .done(function(response) {
        console.log(response);
        var html = "<h2>Artist playing : ";
        html += response.infos.name + "</h2>";
        html += "<p>" + response.infos.disambiguation + "</p>";
        if(response.infos.type.toLowerCase() === "group") {
            if(! response.infos.ended)
                html += "This group is still in action";
            else{
                html += "This group ended in : ";
                html += response.infos.ended;
            }
        }
        $("#artist").html(html);
        $("#artist").show();
    })
    .fail(function(error) {
        console.log("Fail infos");
    });
}