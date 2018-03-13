window.addEventListener('load', function () {
  var mapId = "gmap";

  var mapEl = document.getElementById(mapId);
  if (!mapEl) return;

  if (!navigator.geolocation) {
    mapEl.innerHTML = "<div class='geolocation-error'>Geolocation is not supported by your browser</div>";
    return;
  }

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

      navigator
        .geolocation
        .getCurrentPosition(function (position) {
          var center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          map.setCenter(center);
        });
    }
  );
})
