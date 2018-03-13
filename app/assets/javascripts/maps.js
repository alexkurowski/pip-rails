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
  var newMarker = null;

  function addDraggableMarker (handler, lat, lng) {
    if (newMarker) return;

    newMarker = handler.addMarkers([{
      lat: lat,
      lng: lng
    }], {
      draggable: true
    });
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

  var handler = Gmaps.build('Google');
  var gmap = handler.buildMap(
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
        });

      // Create a draggable marker on click
      map.addListener('click', function (event) {
        addDraggableMarker(
          handler,
          event.latLng.lat(),
          event.latLng.lng()
        );
        showOverlay();
      })
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

        var marker = newMarker[0].serviceObject;
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
            marker.setDraggable(false);
            newMarker = null;
            hideOverlay();
          },
          error: function (response) {
            console.log("Error occured while creating a pothole record");
          }
        });
      });
    });
})
