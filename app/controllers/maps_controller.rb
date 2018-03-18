class MapsController < ApplicationController
  def index
    @fallback_location = request&.location&.data || {}
  end
end
