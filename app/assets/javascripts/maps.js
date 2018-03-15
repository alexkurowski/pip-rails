window.addEventListener('load', function () {
  var mapId = "gmap";

  /*
   * Ensure we have a #gmap element
   */
  var mapEl = document.getElementById(mapId);
  var mapOverlayEl = document.querySelector('.gmap .gmap-overlay');
  if (!mapEl) return;


  var potholes              = [];
  var markers               = [];
  var newMarker             = null;
  var loadingMarkersTimeout = null;
  var loadMarkersDelay      = 500;
  var updateHashTimeout     = null;
  var updateHashDelay       = 500;
  var showFixedPotholes     = false;

  /*
   * Marker context menu actions
   */
  function findPothole (id) {
    return potholes.find(function (pothole) {
      return pothole.id == id;
    });
  }

  function potholeNotFixed (id) {
    var pothole = findPothole(id);
    if (!pothole.fixed) return;

    var data = {
      pothole: {
        id: id,
        fixed_at: null
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
          marker.id = null;
          setTimeout(loadMarkers, loadMarkersDelay);
        }
      },
      error: function (response) {
        console.log("Error occured while updating a pothole record", response);
      }
    });
  }

  function potholeFixed (id) {
    var pothole = findPothole(id);
    if (pothole.fixed) return;

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
          marker.id = null;
          setTimeout(loadMarkers, loadMarkersDelay);
        }
      },
      error: function (response) {
        console.log("Error occured while updating a pothole record", response);
      }
    });
  }

  $('#gmap').on('click', '.info-btn', function () {
    if (this.dataset.hasOwnProperty('fixed')) {
      potholeFixed(this.dataset.record);
    } else
    if (this.dataset.hasOwnProperty('notFixed')) {
      potholeNotFixed(this.dataset.record);
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

  function updateAddressHash () {
    if (!map) return;

    window.location.hash =
      map.center.lat() + ',' +
      map.center.lng() + ',' +
      map.zoom;
  }

  function parsePotholes (data) {
    var getIcon = function (alertLevel, fixed) {
      if (fixed)
        return mapEl.dataset['iconGreen-' + alertLevel];
      else
        return mapEl.dataset['iconRed-' + alertLevel];
    }

    var getInfowindow = function (pothole) {
      if (pothole.fixed) {
        return "<div class='info-btn' data-not-fixed data-record='" + pothole.id + "'>Still Here</div>";
      } else {
        return "<div class='info-btn' data-not-fixed data-record='" + pothole.id + "'>Still Here</div>" +
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
            text: '',
            color: 'white',
            fontSize: '13px',
            fontWeight: 'bold'
          },
          createdAt: pothole.createdAt,
          fixedAt:   pothole.fixedAt,
          fixed:     pothole.fixed
        }
      })
  }

  function updateLabel (marker) {
    var day = 86400000;
    var hour = 3600000;
    var minute = 60000;

    var pad = function (val) {
      if (val < 10)
        return '0' + val;
      else
        return val;
    }

    var timeStart = new Date(marker.pothole.createdAt * 1000);
    var timeEnd   = new Date();
    if (marker.pothole.fixed) {
      timeEnd = new Date(marker.pothole.fixedAt * 1000);
    }

    var time = Math.max(0, timeEnd - timeStart);

    var days    = Math.floor( time / day );
    var hours   = Math.floor( ( time - days * day ) / hour );
    var minutes = Math.floor( ( time - days * day - hours * hour ) / minute );

    if (days <= 99) {
      marker.pothole.label.text = pad(days) + ':' + pad(hours) + ':' + pad(minutes);
    } else {
      marker.pothole.label.text = days + ' days';
    }

    marker.serviceObject.setLabel(marker.pothole.label);
  }

  function loadMarkers () {
    var data = map.getBounds().toJSON();
    data.fixed = showFixedPotholes;

    Rails.ajax({
      type: 'POST',
      url: '/potholes/in_bounds',
      data: $.param(data),
      success: function (response) {
        potholes = parsePotholes(response);

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
          marker.pothole = markersToAdd[index];

          updateLabel(marker);

          marker.labelInterval =
            setInterval(function () {
              updateLabel(marker);
            }, 10000);
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
      if (marker.labelInterval) {
        clearInterval(marker.labelInterval);
        marker.labelInterval = null;
      }

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

      // Update pothole markers on viewport change
      map.addListener('bounds_changed', function () {
        if (loadingMarkersTimeout)
          clearTimeout(loadingMarkersTimeout);
        loadingMarkersTimeout =
          setTimeout(loadMarkers, loadMarkersDelay);

        if (updateHashTimeout)
          clearTimeout(updateHashTimeout);
        updateHashTimeout =
          setTimeout(updateAddressHash, updateHashDelay);
      });

      // Create a draggable marker on click
      map.addListener('click', function (event) {
        createNewMarker(
          event.latLng.lat(),
          event.latLng.lng()
        );
      });

      if (window.location.hash) {
        try {
          var coords = window
            .location
            .hash
            .substr(1)
            .split(',')
            .map(function (val) {
              return Number(val)
            });

          if ( !isNaN(coords[0]) &&
               !isNaN(coords[1]) ) {
            moveViewport(coords[0], coords[1]);
            if ( !isNaN(coords[2]) ) {
              map.setZoom(coords[2]);
            }
            return;
          }
        } catch (error) {
          console.log(error);
        }
      }

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
