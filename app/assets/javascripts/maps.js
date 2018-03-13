window.addEventListener('load', function () {
  var mapId = "gmap";

  /*
   * Ensure we have a #gmap element and are able to work with it
   */
  var mapEl = document.getElementById(mapId);
  if (!mapEl) return;

  if (!navigator.geolocation) {
    mapEl.innerHTML = "<div class='geolocation-error'>Geolocation is not supported by your browser</div>";
    return;
  }

  /*
   * Helper functions
   */
  var markers = [];
  var newMarker = null;
  var loadingMarkersTimeout = null;
  var loadMarkersDelay = 500;

  function loadMarkers () {
    var data = map.getBounds().toJSON();

    Rails.ajax({
      type: 'POST',
      url: '/potholes/in_bounds',
      data: $.param(data),
      success: function (response) {
        var data = JSON.parse(response);
        var potholes = data.map(function (pothole) {
          return {
            lat: pothole.lat,
            lng: pothole.lng,
            infowindow: "<div class='info-btn'>Still Here</div>" +
                        "<div class='info-btn'>Pothole Fixed</div>",

            id: pothole.id,
            label: pothole.label,
          }
        });

        var oldMarkerIds =
          markers.map(function (marker) {
            return marker.id;
          });

        var newMarkerIds =
          potholes.map(function (pothole) {
            return pothole.id;
          });

        // Remove markers that are out of bounds
        markers.forEach(function (marker, index) {
          if ( !newMarkerIds.includes(marker.id) ) {
            marker.serviceObject.setMap(null);
            markers[index] = null;
          }
        });

        var markersToAdd =
          potholes.filter(function (pothole) {
            return !oldMarkerIds.includes(pothole.id);
          });

        // Create new markers
        var addedMarkers = gmapHandler.addMarkers(markersToAdd);
        addedMarkers.forEach(function (marker, index) {
          marker.id = markersToAdd[index].id;
          marker.serviceObject.setLabel(markersToAdd[index].label);
        });

        // Update markers list
        markers =
          markers
            .filter(function (marker) {
              return marker;
            })
            .concat(addedMarkers);
      },
      error: function (response) {
        console.log("Error occured while retrieving pothole records", response);
      }
    });
  }

  function addDraggableMarker (lat, lng) {
    if (newMarker) {
      newMarker.serviceObject.setPosition({
        lat: lat,
        lng: lng
      });
    } else {
      newMarker = gmapHandler.addMarker({
        lat: lat,
        lng: lng
      }, {
        draggable: true
      });
    }
  }

  function showOverlay () {
    document
      .querySelector('.gmap-overlay')
      .classList
      .remove('hidden');
  }

  function hideOverlay () {
    document
      .querySelector('.gmap-overlay')
      .classList
      .add('hidden');
  }

  /*
   * Initialize google maps widget
   */
  var styles = [{
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }, {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }];

  window.gmapHandler = Gmaps.build('Google');
  var gmap = gmapHandler.buildMap(
    {
      provider: {
        disableDefaultUI: true,
        zoom: 16,
        zoomControl: true,
        styles: styles,
      },
      internal: {
        id: mapId
      }
    },
    function () {
      window.map = gmap.serviceObject;

      // Move viewport to visitor's geo location
      navigator
        .geolocation
        .getCurrentPosition(function (position) {
          var center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          map.setCenter(center);
          loadMarkers();
        });

      // Update pothole markers on viewport change
      map.addListener('bounds_changed', function () {
        if (loadingMarkersTimeout)
          clearTimeout(loadingMarkersTimeout);

        loadingMarkersTimeout =
          setTimeout(loadMarkers, loadMarkersDelay);
      });

      // Create a draggable marker on click
      map.addListener('click', function (event) {
        addDraggableMarker(
          event.latLng.lat(),
          event.latLng.lng()
        );
        showOverlay();
      });
    }
  );

  /*
   * Initialize buttons functionality
   */
  document
    .querySelectorAll('.add-pothole')
    .forEach(function (node) {
      node.addEventListener('click', function (event) {
        event.preventDefault();

        var marker = newMarker.serviceObject;
        var data = {
          pothole: {
            latitude:  marker.position.lat(),
            longitude: marker.position.lng(),
          }
        };

        Rails.ajax({
          type: 'POST',
          url: '/potholes',
          data: $.param(data),
          success: function (response) {
            marker.setMap(null);
            newMarker = null;
            hideOverlay();
            loadMarkers();
          },
          error: function (response) {
            console.log("Error occured while creating a pothole record", response);
          }
        });
      });
    });
})
