class PotholesController < ApplicationController
  def in_bounds
    @potholes = Pothole
      .excluding_unfixed(params[:unfixed] == 'false')
      .excluding_fixed(params[:fixed] == 'false')
      .markers_in_bounds(in_bounds_params)
    render plain: @potholes.to_json
  end

  def create
    Pothole.create pothole_params
    render plain: 'ok'
  end

  def update
    pothole = Pothole.find params[:pothole][:id]
    pothole.update pothole_params
    render plain: 'ok'
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
