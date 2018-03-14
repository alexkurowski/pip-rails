class MapsController < ApplicationController
  def index
    @fallback_location = Geokit::Geocoders::GoogleGeocoder.geocode request.remote_ip
  end
end
