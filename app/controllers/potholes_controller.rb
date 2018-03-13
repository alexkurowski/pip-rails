class PotholesController < ApplicationController
  def in_bounds
    @potholes = Pothole.markers_in_bounds in_bounds_params
    render plain: @potholes.to_json
  end

  def create
    Pothole.create pothole_params
    render plain: 'ok'
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

    def in_bounds_params
      [
        [ params[:south], params[:west] ],
        [ params[:north], params[:east] ]
      ]
    end
end
