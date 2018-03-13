window.addEventListener('load', function () {
  var mapId = "gmap";

  var mapExists = document.getElementById(mapId);
  if (!mapExists) return;

  var styles = [{
    featureType: 'poi',
    elementType: 'labels',
    stylers: [
      { visibility: 'off' }
    ]
  }];

  var handler = Gmaps.build('Google');
  var map = handler.buildMap(
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
      navigator
        .geolocation
        .getCurrentPosition(function (position) {
          var center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          map.serviceObject.setCenter(center);
        });
    }
  );
})
