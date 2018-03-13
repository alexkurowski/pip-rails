class PotholesController < ApplicationController
  def create
    Pothole.create pothole_params
  end

  def update
  end

  private

    def pothole_params
      params
        .require(:pothole)
        .permit(
          :category,
          :latitude,
          :longitude,
          :fixed_at
        )
    end
end
