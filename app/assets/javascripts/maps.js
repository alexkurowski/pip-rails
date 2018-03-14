window.addEventListener('load', function () {
  var mapId = "gmap";

  /*
   * Ensure we have a #gmap element
   */
  var mapEl = document.getElementById(mapId);
  var mapOverlayEl = document.querySelector('.gmap .gmap-overlay');
  if (!mapEl) return;


  var markers = [];
  var newMarker = null;
  var loadingMarkersTimeout = null;
  var loadMarkersDelay = 500;
  var showFixedPotholes = false;

  /*
   * Marker context menu actions
   */
  function potholeNotFixed () {
  }

  function potholeFixed (id) {
    var data = {
      pothole: {
        id: id,
        fixed_at: new Date
      }
    }

    Rails.ajax({
      type: 'PUT',
      url: '/potholes',
      data: $.param(data),
      success: function (response) {
        var marker = markers.find(function (marker) {
          return marker.id == id;
        })

        if (marker) {
          removeMarker(marker);
        }
      },
      error: function (response) {
        console.log("Error occured while updating a pothole record", response);
      }
    })
  }

  $('#gmap').on('click', '.info-btn', function () {
    if (this.dataset.hasOwnProperty('fixed')) {
      potholeFixed(this.dataset.record);
    } else
    if (this.dataset.hasOwnProperty('notFixed')) {
      potholeNotFixed();
    }

    var parent = this.parentNode.parentNode.parentNode.parentNode;
    parent.lastChild.click();
  });

  /*
   * Helper functions
   */
  function moveViewport (lat, lng) {
    map.setCenter({
      lat: +lat,
      lng: +lng
    });
    loadMarkers();
  }

  function parsePotholes (data) {
    var getIcon = function (alertLevel, fixed) {
      if (fixed)
        return mapEl.dataset.iconGreen;
      else
        return mapEl.dataset['iconRed-' + alertLevel];
    }

    var getInfowindow = function (pothole) {
      if (pothole.fixed) {
        return undefined;
      } else {
        return "<div class='info-btn' data-not-fixed>Still Here</div>" +
               "<div class='info-btn' data-fixed data-record='" + pothole.id + "'>Pothole Fixed</div>";
      }
    }

    return JSON
      .parse(data)
      .map(function (pothole) {
        return {
          lat: pothole.lat,
          lng: pothole.lng,
          picture: {
            url: getIcon(pothole.alertLevel, pothole.fixed),
            width: 64,
            height: 43
          },
          infowindow: getInfowindow(pothole),

          id: pothole.id,
          label: {
            text: pothole.label,
            color: 'white',
            fontSize: '13px',
            fontWeight: 'bold'
          }
        }
      })
  }

  function loadMarkers () {
    var data = map.getBounds().toJSON();
    data.fixed = showFixedPotholes;

    Rails.ajax({
      type: 'POST',
      url: '/potholes/in_bounds',
      data: $.param(data),
      success: function (response) {
        var potholes = parsePotholes(response);

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
            removeMarker(marker);
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

  function removeMarker (marker) {
    if (marker && marker.serviceObject) {
      marker.serviceObject.setVisible(false);
      marker.serviceObject.setMap(null);
      marker.serviceObject = null;
    }
  }

  function createNewMarker (lat, lng) {
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
      newMarker.panTo = function () {};

      newMarker.serviceObject.addListener('dblclick', function () {
        submitNewMarker();
      });

      mapOverlayEl.classList.add('placing-new-marker');
    }
  }

  function removeNewMarker () {
    if (newMarker) {
      removeMarker(newMarker);
      newMarker = null;

      mapOverlayEl.classList.remove('placing-new-marker');
    }
  }

  function submitNewMarker () {
    var position = newMarker.serviceObject.position;
    var data = {
      pothole: {
        latitude:  position.lat(),
        longitude: position.lng(),
      }
    };

    Rails.ajax({
      type: 'POST',
      url: '/potholes',
      data: $.param(data),
      success: function (response) {
        removeNewMarker();
        loadMarkers();
      },
      error: function (response) {
        console.log("Error occured while creating a pothole record", response);
      }
    });
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

      mapOverlayEl.classList.remove('hidden');

      // Move viewport to visitor's geo location
      if (navigator.geolocation) {
        navigator
          .geolocation
          .getCurrentPosition(
            function (position) {
              moveViewport(
                position.coords.latitude,
                position.coords.longitude
              );
            },
            function (error) {
              moveViewport(
                mapEl.dataset.fallbackLat,
                mapEl.dataset.fallbackLng
              );
            });
      } else {
        moveViewport(
          mapEl.dataset.fallbackLat,
          mapEl.dataset.fallbackLng
        );
      }

      // Update pothole markers on viewport change
      map.addListener('bounds_changed', function () {
        if (loadingMarkersTimeout)
          clearTimeout(loadingMarkersTimeout);

        loadingMarkersTimeout =
          setTimeout(loadMarkers, loadMarkersDelay);
      });

      // Create a draggable marker on click
      map.addListener('click', function (event) {
        createNewMarker(
          event.latLng.lat(),
          event.latLng.lng()
        );
      });
    }
  );

  /*
   * Initialize buttons functionality
   */
  $('#show-fixed-toggle').on('change', function (event) {
    showFixedPotholes = !showFixedPotholes;
    loadMarkers();
  });

  $('.add-pothole-new').on('click', function (event) {
    event.preventDefault();

    createNewMarker(
      map.center.lat(),
      map.center.lng()
    );
  });

  $('.add-pothole-submit').on('click', function (event) {
    event.preventDefault();
    submitNewMarker();
  });

  $('.add-pothole-cancel').on('click', function (event) {
    event.preventDefault();
    removeNewMarker();
  });

  $(window).on('keydown', function (event) {
    if (event.key == 'Escape' || event.keyCode == 27) {
      if (newMarker) {
        removeNewMarker();
      }
    }
  });
})
